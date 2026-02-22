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

from dotenv import load_dotenv
load_dotenv()

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

# Optimized Async Model Loading with Model Registry
import threading
import time
from model_registry import ModelRegistry

# Initialize Registry
from model_registry import ModelRegistry
from llm_registry import LLMRegistry

model_registry = ModelRegistry()
llm_registry = LLMRegistry()

# Global status tracking
model_status = {
    "active_model_id": model_registry.active_model_id,
    "status": "initializing",
    "details": "Starting model loader...",
    "start_time": time.time()
}

def load_active_model_async():
    """Load the currently active model from registry"""
    global yolo_detector, fallback_detector
    
    active_model = model_registry.get_active_model()
    if not active_model:
        logger.error("❌ No active model found in registry!")
        model_status["status"] = "error"
        model_status["details"] = "No active model configuration"
        return

    logger.info(f"🧵 [Background] Loading active model: {active_model.name} ({active_model.id})")
    model_status["status"] = "loading"
    model_status["active_model_id"] = active_model.id
    
    try:
        # Clear existing models to free memory
        yolo_detector = None
        fallback_detector = None
        
        # Simulate small delay for server responsiveness
        time.sleep(1)

        if active_model.type == 'yolo':
            logger.info(f"   Type: YOLO | Path: {active_model.path}")
            from yolo_detector import YOLODetector
            
            yolo_detector = YOLODetector(
                model_path=active_model.path,
                conf_threshold=float(os.environ.get('YOLO_CONF_THRESH', '0.25')),
                device=os.environ.get('YOLO_DEVICE', None)
            )
            model_status["status"] = "ready"
            model_status["details"] = f"Loaded {active_model.name}"
            logger.info(f"✅ [Background] Model ready: {active_model.name}")
            
        elif active_model.type == 'fallback':
            logger.info(f"   Type: Fallback/Keras | Path: {active_model.path}")
            # Note: The fallback implementation in predict.py might need path adjustment
            # For now, we reuse the existing _init_fallback logic but mapped to this model
            if _init_fallback():
                model_status["status"] = "ready"
                model_status["details"] = f"Loaded {active_model.name}"
                logger.info(f"✅ [Background] Model ready: {active_model.name}")
            else:
                raise RuntimeError("Fallback initialization failed")
                
    except Exception as e:
        logger.error(f"❌ [Background] Model load failed: {e}")
        model_status["status"] = "error"
        model_status["details"] = str(e)

def _init_fallback():
    """Initialize fallback detector (TensorFlow/Keras or mock)"""
    global fallback_detector
    
    try:
        # Check if we should use mock directly (faster dev)
        if os.environ.get('USE_MOCK_FALLBACK', '0') == '1':
             raise ImportError("Forced mock fallback")

        logger.info("📦 Loading Keras/TensorFlow fallback...")
        from predict import classify_image
        fallback_detector = classify_image
        return True
    except Exception as e:
        logger.warning(f"⚠️  Fallback predictor load failed: {e}")
        try:
            logger.info("📦 Loading mock fallback...")
            from predict_fallback import classify_image
            fallback_detector = classify_image
            return True
        except Exception as e2:
            logger.error(f"❌ All fallback options failed: {e2}")
            return False

# Initialize detectors in background
logger.info("="*60)
logger.info("🚀 DISEASE DETECTION API - MANAGED MODEL SYSTEM")
logger.info(f"👉 Active Model: {model_registry.active_model_id}")
logger.info("="*60)

# Start background thread
loading_thread = threading.Thread(target=load_active_model_async, daemon=True)
loading_thread.start()

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
# MODEL MANAGEMENT ROUTES
# ============================================================================

@app.route('/models', methods=['GET'])
def list_models():
    """List all available models"""
    return jsonify({
        'success': True,
        'models': model_registry.list_models()
    }), 200

@app.route('/models/active', methods=['GET'])
def get_active_model_info():
    """Get active model details"""
    return jsonify({
        'success': True,
        'active_model': model_registry.get_active_model()
    }), 200

@app.route('/models/switch', methods=['POST'])
def switch_model():
    """Switch active model at runtime"""
    data = request.get_json() or {}
    model_id = data.get('model_id')
    
    if not model_id:
        return jsonify({'success': False, 'error': 'Current model_id is required'}), 400
    
    if model_registry.set_active_model(model_id):
        # Trigger reload in background
        threading.Thread(target=load_active_model_async, daemon=True).start()
        
        return jsonify({
            'success': True,
            'message': f'Switched to model: {model_id}',
            'active_model': model_id
        }), 200
    else:
        return jsonify({'success': False, 'error': 'Invalid model_id'}), 400

# ============================================================================
# LLM MANAGEMENT ROUTES
# ============================================================================

@app.route('/llm/models', methods=['GET'])
def list_llm_models():
    """List all available LLM models"""
    return jsonify({
        'success': True,
        'models': llm_registry.list_models()
    }), 200

@app.route('/llm/active', methods=['GET'])
def get_active_llm():
    """Get active LLM details"""
    return jsonify({
        'success': True,
        'active_model': llm_registry.get_active_model()
    }), 200

@app.route('/llm/switch', methods=['POST'])
def switch_llm():
    """Switch active LLM at runtime"""
    data = request.get_json() or {}
    model_id = data.get('model_id')
    
    if not model_id:
        return jsonify({'success': False, 'error': 'Current model_id is required'}), 400
    
    if llm_registry.set_active_model(model_id):
        return jsonify({
            'success': True,
            'message': f'Switched to LLM: {model_id}',
            'active_model': model_id
        }), 200
    else:
        return jsonify({'success': False, 'error': 'Invalid model_id'}), 400

@app.route('/llm/generate_report', methods=['POST', 'OPTIONS'])
def generate_llm_report():
    """Generate LLM report from analysis data"""
    if request.method == 'OPTIONS':
        return '', 204
    
    data = request.get_json() or {}
    analysis_data = data.get('analysis_data')
    if not analysis_data:
        return jsonify({'success': False, 'error': 'No analysis data provided'}), 400
        
    try:
        report = llm_registry.generate_report(analysis_data)
        return jsonify({
            'success': True,
            'report': report
        }), 200
    except Exception as e:
        logger.error(f"Failed to generate LLM report: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
    active_model = model_registry.get_active_model()
    return jsonify({
        'status': 'ok',
        'model_status': model_status.get("status"),
        'active_model': {
            'id': active_model.id if active_model else 'unknown',
            'name': active_model.name if active_model else 'unknown',
            'type': active_model.type if active_model else 'unknown'
        },
        'loading_details': model_status.get("details"),
        'uptime_seconds': round(time.time() - model_status["start_time"]),
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
        
    # Check if models are still loading
    if model_status.get("status") != "ready":
        return jsonify({
            'success': False,
            'error': f'AI Model is initializing: {model_status.get("details")}',
            'loading_status': model_status
        }), 503
    
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
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    """
    Upload a file for processing
    Returns: file_path (server-side path)
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Create unique filename to avoid collisions
        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(save_path)
        
        logger.info(f"💾 File uploaded: {save_path}")
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file_path': os.path.abspath(save_path),
            'filename': unique_filename
        }), 200
    
    return jsonify({'error': 'File type not allowed'}), 400


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
            
            if not frame_data:
                 logger.warning("⚠️  Received empty frame data")
                 return jsonify({'success': False, 'error': 'Empty frame data'}), 400

            nparr = np.frombuffer(frame_data, np.uint8)
            
            if nparr.size == 0:
                 logger.warning("⚠️  Decoded frame buffer is empty")
                 return jsonify({'success': False, 'error': 'Empty frame buffer'}), 400

            try:
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except cv2.error as e:
                logger.error(f"❌ OpenCV decode error: {e}")
                return jsonify({'success': False, 'error': 'Frame decode failed'}), 400

            if frame is None:
                return jsonify({
                    'success': False,
                    'detections': [],
                    'error': 'Invalid frame image'
                }), 400
            
            h, w = frame.shape[:2]
            
            h, w = frame.shape[:2]
            
            # Use whichever detector is loaded
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
            elif fallback_detector:
                 # Fallback detector usually only handles files, not raw frames efficiently
                 # For now, return empty or implement frame-based fallback if possible
                 return jsonify({
                    'success': True,
                    'detections': [],
                    'note': 'Fallback model does not support real-time frame detection',
                    'frame_size': [h, w]
                }), 200
            else:
                # No detector available
                return jsonify({
                    'success': False,
                    'detections': [],
                    'error': f'Model initializing or unavailable: {model_status.get("details")}'
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
