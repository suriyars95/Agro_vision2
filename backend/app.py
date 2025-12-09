"""
✨ Disease Detection API with YOLO Integration
Features:
  - Real-time YOLO v8/v11 inference on images and video frames
  - Live video stream processing (USB camera, RTSP, file input)
  - Disease analysis and reporting
  - Normalized detection output (0-1 coordinates, percent-based confidence)
  - Fallback detection pipeline

Usage:
  USE_YOLO=1 python app.py
  USE_YOLO=0 python app.py (fallback mode)
"""

import os
import json
import cv2
import numpy as np
import logging
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# ============================================================================
# IMPORTS & INITIALIZATION
# ============================================================================

from flask import Flask, request, jsonify, Response
from werkzeug.utils import secure_filename

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB for video files
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp4', 'avi', 'mov'}
USE_YOLO = os.environ.get('USE_YOLO', '1') in ('1', 'true', 'True')  # YOLO enabled by default

# Create uploads directory
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# YOLO initialization
yolo_detector = None
fallback_detector = None

def _init_yolo():
    """Initialize YOLO detector with fallback chain"""
    global yolo_detector
    
    try:
        if USE_YOLO:
            logger.info("🎯 Initializing YOLO detector...")
            from yolo_detector import YOLODetector
            yolo_detector = YOLODetector(
                conf_threshold=float(os.environ.get('YOLO_CONF_THRESH', '0.25')),
                device=os.environ.get('YOLO_DEVICE', None)
            )
            logger.info("✅ YOLO detector ready")
            return True
    except Exception as e:
        logger.warning(f"⚠️  YOLO initialization failed: {e}")
    
    return False

def _init_fallback():
    """Initialize fallback detector (TensorFlow/Keras or mock)"""
    global fallback_detector
    
    try:
        logger.info("📦 Loading fallback predictor (TensorFlow/Keras)...")
        from predict import classify_image
        fallback_detector = classify_image
        logger.info("✅ Fallback predictor loaded")
        return True
    except Exception as e:
        logger.warning(f"⚠️  Fallback predictor load failed: {e}")
        try:
            logger.info("📦 Loading mock fallback...")
            from predict_fallback import classify_image
            fallback_detector = classify_image
            logger.info("✅ Mock fallback loaded")
            return True
        except Exception as e2:
            logger.error(f"❌ All fallback options failed: {e2}")
            return False

# Initialize detectors at startup
logger.info("="*60)
logger.info("🚀 DISEASE DETECTION API - STARTUP")
logger.info("="*60)
_init_yolo()
_init_fallback()

# CORS support
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _normalize_bbox(bbox: Dict, img_width: int, img_height: int) -> Dict:
    """
    Normalize bounding box coordinates to 0-1 range
    Handles both pixel (x1,y1,x2,y2) and normalized (x,y,w,h) formats
    """
    try:
        # If already normalized, pass through
        if 'x' in bbox and bbox['x'] < 2 and bbox['y'] < 2:
            return bbox
        
        # Convert pixel to normalized
        x1 = bbox.get('x1', int(bbox.get('x', 0) * img_width))
        y1 = bbox.get('y1', int(bbox.get('y', 0) * img_height))
        x2 = bbox.get('x2', x1 + int(bbox.get('w', 0) * img_width))
        y2 = bbox.get('y2', y1 + int(bbox.get('h', 0) * img_height))
        
        w = (x2 - x1) / img_width
        h = (y2 - y1) / img_height
        
        return {
            'class': bbox.get('class', 'Unknown'),
            'conf': float(bbox.get('conf', 0)),
            'x': round(x1 / img_width, 4),
            'y': round(y1 / img_height, 4),
            'w': round(w, 4),
            'h': round(h, 4),
            'percent': round(w * h * 100, 2)
        }
    except Exception as e:
        logger.warning(f"Bbox normalization failed: {e}")
        return bbox

# ============================================================================
# ROUTES
# ============================================================================

@app.route('/', methods=['GET'])
def health():
    """API health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': '🌾 Disease Detection API',
        'yolo_enabled': USE_YOLO and yolo_detector is not None,
        'version': '2.0',
        'endpoints': {
            '/health': 'GET - API status',
            '/predict': 'POST - Single image detection',
            '/stream/detect': 'POST - Video frame detection',
            '/analyze': 'POST - Analyze detection results'
        }
    }), 200

@app.route('/health', methods=['GET'])
def status():
    """System status and configuration"""
    return jsonify({
        'status': 'ok',
        'yolo_ready': yolo_detector is not None,
        'fallback_ready': fallback_detector is not None,
        'use_yolo': USE_YOLO,
        'models': {
            'primary': 'YOLOv8/v11' if yolo_detector else 'Fallback',
            'primary_ready': True if yolo_detector else False
        }
    }), 200

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    """
    Single image disease detection
    Accepts: file upload (multipart/form-data)
    Returns: disease name, confidence, bounding boxes with normalized coordinates
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file provided',
            'required': 'file'
        }), 400
    
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected'
        }), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    saved_path = None
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        saved_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(saved_path)
        logger.info(f"📸 Processing: {filename}")
        
        # Get image dimensions
        img = cv2.imread(saved_path)
        if img is None:
            raise ValueError("Cannot read image")
        h, w = img.shape[:2]
        
        # Primary detection: YOLO
        if yolo_detector:
            try:
                result = yolo_detector.predict(saved_path)
                detections = result.get('detections', [])
                logger.info(f"✅ YOLO: {len(detections)} detections")
                
                # Find top detection
                top_detection = None
                if detections:
                    top_detection = max(detections, key=lambda d: d['confidence'])
                
                boxes = []
                for det in detections:
                    boxes.append({
                        'class': det['class_name'],
                        'conf': round(det['confidence'] * 100, 1),  # Convert 0-1 to 0-100
                        'x': det['bbox_normalized']['x'],
                        'y': det['bbox_normalized']['y'],
                        'w': det['bbox_normalized']['width'],
                        'h': det['bbox_normalized']['height'],
                        'percent': det['area_percent']
                    })
                
                return jsonify({
                    'success': True,
                    'source': 'yolo',
                    'disease': top_detection['class_name'] if top_detection else None,
                    'confidence': round(top_detection['confidence'] * 100, 1) if top_detection else 0,
                    'boxes': boxes,
                    'timestamp': datetime.now().isoformat()
                }), 200
            
            except Exception as e:
                logger.error(f"❌ YOLO prediction failed: {e}")
        
        # Fallback: classifier
        if fallback_detector:
            try:
                result = fallback_detector(saved_path)
                logger.info(f"✅ Fallback: {result['disease']} ({result.get('confidence', 0)}%)")
                
                return jsonify({
                    'success': True,
                    'source': 'classifier',
                    'disease': result['disease'],
                    'confidence': result.get('confidence', 0),
                    'boxes': [{
                        'class': result['disease'],
                        'conf': result.get('confidence', 0),
                        'x': 0.05,
                        'y': 0.15,
                        'w': 0.9,
                        'h': 0.7,
                        'percent': 63.0
                    }],
                    'timestamp': datetime.now().isoformat()
                }), 200
            
            except Exception as e:
                logger.error(f"❌ Fallback prediction failed: {e}")
        
        return jsonify({
            'success': False,
            'error': 'No detection backend available'
        }), 503
    
    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
    finally:
        # Clean up
        if saved_path and os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except:
                pass

@app.route('/api/rtsp-proxy', methods=['GET', 'OPTIONS'])
def rtsp_proxy():
    """
    RTSP stream proxy endpoint
    Streams video from RTSP/HLS sources for browser consumption
    Usage: /api/rtsp-proxy?url=rtsp://...
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        stream_url = request.args.get('url')
        if not stream_url:
            return jsonify({'error': 'Missing url parameter'}), 400
        
        # For RTSP streams, we need FFmpeg or similar
        # For now, return the URL as-is for HLS/DASH streams
        if stream_url.startswith('rtsp://'):
            logger.info(f"📡 RTSP stream requested: {stream_url[:50]}...")
            # Note: Direct RTSP playback in browser not supported
            # Would need to convert RTSP to HLS using FFmpeg
            return jsonify({
                'success': False,
                'error': 'RTSP streams require server-side transcoding. Use HLS/DASH URLs or configure FFmpeg.',
                'hint': 'Convert RTSP to HLS using: ffmpeg -i rtsp://... -c:v copy -c:a aac -f hls output.m3u8'
            }), 415
        
        # For HLS/DASH/MP4 URLs, return with CORS headers
        logger.info(f"🎥 Stream URL: {stream_url[:50]}...")
        return jsonify({
            'success': True,
            'url': stream_url,
            'message': 'Stream URL ready for playback'
        }), 200
    
    except Exception as e:
        logger.error(f"❌ RTSP proxy error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stream/detect', methods=['POST', 'OPTIONS'])
def stream_detect():
    """
    Real-time video frame detection - Optimized for live camera feed
    Accepts: JSON with frame (base64)
    Returns: Detections with pixel coordinates for direct canvas rendering
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        
        if 'frame' in data:
            # Single frame detection
            import base64
            frame_data = base64.b64decode(data['frame'])
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return jsonify({
                    'success': False,
                    'detections': [],
                    'error': 'Invalid frame'
                }), 400
            
            h, w = frame.shape[:2]
            
            if yolo_detector:
                result = yolo_detector.predict_frame(frame)
                detections = result.get('detections', [])
                
                # Convert pixel coordinates to normalized (0-1) for frontend
                boxes = []
                for det in detections:
                    x1, y1, x2, y2 = det['x1'], det['y1'], det['x2'], det['y2']
                    
                    # Normalize to 0-1 range
                    norm_x1 = round(x1 / w, 4)
                    norm_y1 = round(y1 / h, 4)
                    norm_x2 = round(x2 / w, 4)
                    norm_y2 = round(y2 / h, 4)
                    
                    # Calculate width and height
                    norm_w = norm_x2 - norm_x1
                    norm_h = norm_y2 - norm_y1
                    
                    boxes.append({
                        'class': det['class_name'],
                        'conf': round(det['confidence'] * 100, 1),  # Convert to percentage
                        'x1': norm_x1,
                        'y1': norm_y1,
                        'x2': norm_x2,
                        'y2': norm_y2,
                        'x': norm_x1,  # Alias for compatibility
                        'y': norm_y1,
                        'w': norm_w,
                        'h': norm_h
                    })
                
                return jsonify({
                    'success': True,
                    'detections': boxes,
                    'count': len(boxes),
                    'frame_size': [h, w]
                }), 200
            else:
                # No detector available
                return jsonify({
                    'success': False,
                    'detections': [],
                    'error': 'YOLO detector not available'
                }), 503
        
        elif 'video_path' in data:
            # Video file detection (streaming)
            video_path = data['video_path']
            
            if not os.path.exists(video_path):
                return jsonify({'error': 'Video not found'}), 404
            
            def generate_detections():
                cap = cv2.VideoCapture(video_path)
                frame_count = 0
                
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    frame_count += 1
                    
                    # Process every Nth frame for performance
                    if frame_count % 2 == 0:  # Every 2nd frame
                        if yolo_detector:
                            result = yolo_detector.predict_frame(frame)
                            detections = result.get('detections', [])
                            
                            h, w = frame.shape[:2]
                            boxes = []
                            for det in detections:
                                x1, y1, x2, y2 = det['x1'], det['y1'], det['x2'], det['y2']
                                boxes.append({
                                    'class': det['class_name'],
                                    'conf': round(det['confidence'] * 100, 1),
                                    'x1': round(x1 / w, 4),
                                    'y1': round(y1 / h, 4),
                                    'x2': round(x2 / w, 4),
                                    'y2': round(y2 / h, 4)
                                })
                            
                            output = {
                                'frame': frame_count,
                                'detections': boxes,
                                'frame_size': [h, w]
                            }
                            
                            yield json.dumps(output) + '\n'
                
                cap.release()
            
            return Response(generate_detections(), mimetype='application/x-ndjson'), 200
        
        else:
            return jsonify({
                'success': False,
                'error': 'Provide frame (base64) or video_path'
            }), 400
    
    except Exception as e:
        logger.error(f"❌ Stream detection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    """
    Analyze detection results and generate report
    Accepts: List of detections
    Returns: Disease frequency, confidence stats, recommendations
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        detections = data.get('detections', [])
        
        if not detections:
            return jsonify({
                'success': True,
                'total_detections': 0,
                'summary': 'No detections to analyze'
            }), 200
        
        # Aggregate results
        disease_freq = {}
        disease_confidence = {}
        
        for det in detections:
            disease = det.get('class', 'Unknown')
            conf = det.get('conf', 0)
            
            if disease not in disease_freq:
                disease_freq[disease] = 0
                disease_confidence[disease] = []
            
            disease_freq[disease] += 1
            disease_confidence[disease].append(conf)
        
        # Calculate statistics
        analysis = {
            'total_detections': len(detections),
            'diseases_detected': len(disease_freq),
            'disease_summary': []
        }
        
        for disease, count in sorted(disease_freq.items(), key=lambda x: x[1], reverse=True):
            confidences = disease_confidence[disease]
            analysis['disease_summary'].append({
                'disease': disease,
                'count': count,
                'avg_confidence': round(sum(confidences) / len(confidences), 1),
                'max_confidence': round(max(confidences), 1),
                'min_confidence': round(min(confidences), 1),
                'severity': 'High' if sum(confidences) / len(confidences) > 70 else 'Medium' if sum(confidences) / len(confidences) > 40 else 'Low'
            })
        
        # Recommendations
        analysis['recommendations'] = []
        if analysis['diseases_detected'] > 0:
            top_disease = analysis['disease_summary'][0]['disease']
            if analysis['disease_summary'][0]['avg_confidence'] > 70:
                analysis['recommendations'].append(f"⚠️  High confidence {top_disease} detection. Immediate intervention recommended.")
            analysis['recommendations'].append(f"📋 Apply appropriate fungicide/pesticide for {top_disease}")
            analysis['recommendations'].append("🔍 Monitor crop regularly for disease spread")
        
        analysis['timestamp'] = datetime.now().isoformat()
        
        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'path': request.path,
        'method': request.method
    }), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {error}")
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500

# ============================================================================
# STARTUP
# ============================================================================

if __name__ == '__main__':
    logger.info(f"🌾 Disease Detection API Starting")
    logger.info(f"   YOLO: {'✅ Enabled' if yolo_detector else '⚠️  Disabled'}")
    logger.info(f"   Fallback: {'✅ Ready' if fallback_detector else '❌ Not available'}")
    logger.info(f"   Max upload: {MAX_FILE_SIZE / 1024 / 1024} MB")
    logger.info(f"   Upload folder: {UPLOAD_FOLDER}")
    logger.info("")
    logger.info("🚀 Starting Flask server on http://0.0.0.0:5000")
    logger.info("")
    
    # Run Flask server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        use_reloader=False,
        threaded=True
    )
