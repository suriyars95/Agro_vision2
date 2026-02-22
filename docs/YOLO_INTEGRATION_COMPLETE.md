# YOLO Integration Complete Guide - AgroVision AI

## Overview
This guide provides step-by-step instructions to integrate a custom YOLO model for real-time crop disease detection with live webcam and drone video feeds.

## Table of Contents
1. [YOLO Model Setup](#yolo-model-setup)
2. [Backend Integration](#backend-integration)
3. [Frontend Integration](#frontend-integration)
4. [Real-time Processing Pipeline](#real-time-processing-pipeline)
5. [Testing & Deployment](#testing--deployment)

---

## YOLO Model Setup

### Option 1: Use Pre-trained Model (Fastest)

```bash
# Download YOLOv8 pre-trained model
cd backend/model
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt
# OR manually download and place in backend/model/yolov8n.pt
```

**Available Models** (speed vs accuracy tradeoff):
- `yolov8n.pt` - Nano (fastest, lightest)
- `yolov8s.pt` - Small
- `yolov8m.pt` - Medium
- `yolov8l.pt` - Large
- `yolov8x.pt` - Extra Large (slowest, most accurate)

### Option 2: Train Custom Model on Your Data

#### Step 1: Prepare Dataset
```
dataset/
├── images/
│   ├── train/
│   │   ├── img001.jpg
│   │   ├── img002.jpg
│   │   └── ...
│   └── val/
│       ├── img101.jpg
│       └── ...
├── labels/
│   ├── train/
│   │   ├── img001.txt  (YOLO format: class_id x_center y_center width height)
│   │   └── ...
│   └── val/
│       └── ...
└── data.yaml
```

**data.yaml format**:
```yaml
path: /path/to/dataset
train: images/train
val: images/val
nc: 15  # number of disease classes
names: ['Aphid', 'Black Rust', 'Blast', 'Brown Rust', 'Common Root Rot', 'Fusarium Head Blight', 'Healthy', 'Leaf Blight', 'Mildew', 'Mite', 'Septoria', 'Smut', 'Stem fly', 'Tan spot', 'Yellow Rust']
```

#### Step 2: Train Model
```python
from ultralytics import YOLO

# Load a pretrained model
model = YOLO('yolov8n.pt')

# Train the model
results = model.train(
    data='path/to/data.yaml',
    epochs=100,
    imgsz=640,
    device=0,  # GPU device ID, or -1 for CPU
    patience=20,  # early stopping
    save=True,
    conf=0.25  # confidence threshold
)

# Export best model
model = YOLO('runs/detect/train/weights/best.pt')
model.export(format='pt')  # Export to .pt format
```

#### Step 3: Deploy Model
```bash
# Copy trained model to project
cp runs/detect/train/weights/best.pt backend/model/yolo_disease_detector.pt

# Or place anywhere and set environment variable
export YOLO_MODEL_PATH=/path/to/model.pt
```

---

## Backend Integration

### Step 1: Install Dependencies

```bash
cd backend
pip install ultralytics torch torchvision opencv-python pillow numpy flask flask-cors
```

**For GPU Acceleration** (NVIDIA CUDA):
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install ultralytics
```

### Step 2: Updated app.py

Create/update `backend/app.py`:

```python
"""
AgroVision AI - YOLO-based Disease Detection API
Full real-time processing with live video stream support
"""
import os
import json
import logging
import cv2
import numpy as np
from threading import Thread, Lock
from collections import deque
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, Response
from werkzeug.utils import secure_filename
import torch

# Import YOLO detector
from yolo_detector import YOLODetector
from stream_handler import StreamProcessor

# ============ SETUP ============

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file
app.config['UPLOAD_FOLDER'] = 'uploads'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create uploads directory
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# Initialize YOLO Detector (singleton)
try:
    detector = YOLODetector(
        model_path=os.environ.get('YOLO_MODEL_PATH'),
        conf_threshold=float(os.environ.get('YOLO_CONF_THRESH', '0.25')),
        device=os.environ.get('YOLO_DEVICE', '0' if torch.cuda.is_available() else 'cpu')
    )
    logger.info(f"✓ YOLO Detector initialized. Device: {detector.device}")
except Exception as e:
    logger.error(f"❌ Failed to initialize YOLO: {e}")
    detector = None

# Initialize Stream Processor
stream_processor = StreamProcessor(detector)

# CORS Handling
@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

# ============ HEALTH & INFO ENDPOINTS ============

@app.route('/', methods=['GET'])
def health():
    """API health check and system info"""
    return jsonify({
        'status': 'OK',
        'service': 'AgroVision Disease Detection API',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'yolo_enabled': detector is not None,
        'device': detector.device if detector else 'N/A',
        'gpu_available': torch.cuda.is_available(),
        'endpoints': {
            'predict': 'POST /predict - Single image detection',
            'stream_info': 'POST /stream/info - Get video properties',
            'stream_detect': 'POST /stream/detect - Live stream detection (WebSocket)',
            'models': 'GET /models - List available models'
        }
    }), 200

@app.route('/models', methods=['GET'])
def list_models():
    """List available YOLO models"""
    model_dir = Path('backend/model')
    models = []
    
    if model_dir.exists():
        for pt_file in model_dir.glob('*.pt'):
            models.append({
                'name': pt_file.name,
                'path': str(pt_file),
                'size_mb': pt_file.stat().st_size / (1024*1024)
            })
    
    return jsonify({
        'available_models': models,
        'current_model': detector.model_path if detector else None
    }), 200

# ============ PREDICTION ENDPOINTS ============

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    """
    Single image prediction
    Input: file (image)
    Output: detections with disease info
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    if not detector:
        return jsonify({'error': 'YOLO detector not available'}), 503
    
    try:
        # Save and process image
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{datetime.now().timestamp()}_{filename}")
        file.save(filepath)
        
        logger.info(f"Processing: {filepath}")
        
        # Run detection
        results = detector.predict(filepath)
        
        # Format response
        response_data = {
            'fileReceived': True,
            'timestamp': datetime.now().isoformat(),
            'filename': filename,
            'detections': results['detections'],
            'summary': {
                'total_objects': len(results['detections']),
                'diseases_found': list(set(d['class_name'] for d in results['detections'])),
                'avg_confidence': np.mean([d['confidence'] for d in results['detections']]) if results['detections'] else 0,
                'image_size': results.get('image_shape', [0, 0])
            }
        }
        
        # Clean up
        os.remove(filepath)
        
        return jsonify(response_data), 200
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

# ============ STREAM ENDPOINTS ============

@app.route('/stream/info', methods=['POST', 'OPTIONS'])
def stream_info():
    """Get video stream properties"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json() or {}
        source = data.get('source', '0')
        
        cap = cv2.VideoCapture(int(source) if source.isdigit() else source)
        
        if not cap.isOpened():
            return jsonify({'error': 'Cannot open video source'}), 400
        
        info = {
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'codec': int(cap.get(cv2.CAP_PROP_FOURCC))
        }
        
        cap.release()
        return jsonify(info), 200
    
    except Exception as e:
        logger.error(f"Stream info error: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/stream/detect', methods=['POST', 'OPTIONS'])
def stream_detect():
    """
    Live stream detection (JSONL output)
    Input: {source, max_frames, conf_thresh}
    Output: Stream of JSON lines
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    if not detector:
        return jsonify({'error': 'YOLO detector not available'}), 503
    
    try:
        data = request.get_json() or {}
        source = data.get('source', '0')
        max_frames = int(data.get('max_frames', 300))
        
        def generate_detections():
            """Generator for stream detection results"""
            for result in stream_processor.process_stream(source, max_frames):
                yield json.dumps(result) + '\n'
        
        return Response(generate_detections(), mimetype='application/jsonlines')
    
    except Exception as e:
        logger.error(f"Stream detection error: {e}")
        return jsonify({'error': str(e)}), 500

# ============ ANALYSIS & REPORTS ============

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze detections and generate report
    Input: detections array
    Output: structured analysis
    """
    try:
        data = request.get_json() or {}
        detections = data.get('detections', [])
        
        if not detections:
            return jsonify({'error': 'No detections provided'}), 400
        
        # Analyze detections
        disease_freq = {}
        for det in detections:
            disease = det.get('class_name', 'Unknown')
            disease_freq[disease] = disease_freq.get(disease, 0) + 1
        
        # Generate report
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_detections': len(detections),
            'unique_diseases': len(disease_freq),
            'disease_distribution': disease_freq,
            'high_confidence': [d for d in detections if d['confidence'] > 0.8],
            'recommendations': _generate_recommendations(disease_freq)
        }
        
        return jsonify(report), 200
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': str(e)}), 500

def _generate_recommendations(disease_freq):
    """Generate treatment recommendations based on detected diseases"""
    recommendations = {}
    
    treatment_map = {
        'Aphid': {'treatment': 'Spray insecticidal soap', 'medicines': ['Imidacloprid', 'Neem Oil']},
        'Black Rust': {'treatment': 'Apply fungicide', 'medicines': ['Azoxystrobin', 'Propiconazole']},
        'Blast': {'treatment': 'Apply triazole fungicide', 'medicines': ['Tebuconazole']},
        'Yellow Rust': {'treatment': 'Spray fungicide immediately', 'medicines': ['Propiconazole']},
        'Mildew': {'treatment': 'Apply sulfur or potassium bicarbonate', 'medicines': ['Sulfur']},
    }
    
    for disease in disease_freq:
        if disease in treatment_map:
            recommendations[disease] = treatment_map[disease]
    
    return recommendations

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# ============ STARTUP ============

if __name__ == '__main__':
    logger.info("="*60)
    logger.info("🚀 AgroVision AI - YOLO Detection API")
    logger.info(f"🎯 YOLO Model: {detector.model_path if detector else 'None'}")
    logger.info(f"🖥️  Device: {detector.device if detector else 'CPU'}")
    logger.info("📍 Running on http://0.0.0.0:5000")
    logger.info("="*60)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
```

### Step 3: Create Optimized yolo_detector.py

```python
"""
YOLO Detector Module - Handles model loading and inference
"""
import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict
import logging
import torch
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class YOLODetector:
    """Singleton YOLO detector with lazy model loading"""
    
    def __init__(self, model_path=None, conf_threshold=0.25, device=None):
        self.conf_threshold = conf_threshold
        self.device = device or ('0' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.model_path = None
        
        # Find model
        self.model_path = self._find_model(model_path)
        logger.info(f"✓ Model path: {self.model_path}")
        
        # Load model
        self._load_model()
    
    def _find_model(self, model_path=None):
        """Find YOLO model file with priority order"""
        
        # 1. Explicit path from env/parameter
        if model_path and os.path.exists(model_path):
            logger.info(f"Found model at: {model_path}")
            return model_path
        
        # 2. Search common directories
        search_paths = [
            'backend/model',
            'backend/Models',
            'model',
            'Models'
        ]
        
        for dir_path in search_paths:
            if os.path.exists(dir_path):
                for file in os.listdir(dir_path):
                    if file.endswith('.pt'):
                        full_path = os.path.join(dir_path, file)
                        logger.info(f"Found model: {full_path}")
                        return full_path
        
        # 3. Fallback to YOLOv8 nano (will auto-download)
        logger.warning("No local model found, using yolov8n.pt (will auto-download)")
        return 'yolov8n.pt'
    
    def _load_model(self):
        """Load YOLO model"""
        try:
            logger.info(f"Loading model: {self.model_path}")
            self.model = YOLO(self.model_path)
            self.model.to(self.device)
            logger.info(f"✓ Model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise
    
    def predict(self, image_path: str, return_image=False) -> Dict:
        """
        Run YOLO inference on image
        
        Args:
            image_path: Path to image file
            return_image: Whether to return annotated image
        
        Returns:
            Dict with detections and metadata
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Cannot read image: {image_path}")
            
            h, w = img.shape[:2]
            
            # Run inference
            results = self.model.predict(
                source=image_path,
                conf=self.conf_threshold,
                device=self.device,
                verbose=False
            )
            
            # Extract detections
            detections = []
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                for box in boxes:
                    # Get coordinates
                    xyxy = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu())
                    cls_id = int(box.cls[0].cpu())
                    
                    # Get class name
                    class_name = result.names[cls_id]
                    
                    # Normalize coordinates
                    x1, y1, x2, y2 = xyxy
                    norm_x = float(x1 / w)
                    norm_y = float(y1 / h)
                    norm_w = float((x2 - x1) / w)
                    norm_h = float((y2 - y1) / h)
                    
                    # Calculate area percentage
                    area_percent = (norm_w * norm_h) * 100
                    
                    detections.append({
                        'class_id': int(cls_id),
                        'class_name': str(class_name),
                        'confidence': round(float(conf), 3),
                        'bbox': {
                            'x': round(norm_x, 4),
                            'y': round(norm_y, 4),
                            'width': round(norm_w, 4),
                            'height': round(norm_h, 4)
                        },
                        'pixel_bbox': {
                            'x1': int(x1),
                            'y1': int(y1),
                            'x2': int(x2),
                            'y2': int(y2)
                        },
                        'area_percent': round(area_percent, 2)
                    })
            
            result_dict = {
                'image_path': image_path,
                'image_shape': [h, w],
                'detections': detections,
                'detection_count': len(detections)
            }
            
            # Optionally return annotated image
            if return_image:
                annotated_img = self._draw_boxes(img, detections)
                result_dict['annotated_image'] = annotated_img
            
            return result_dict
        
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise
    
    def predict_frame(self, frame: np.ndarray) -> Dict:
        """
        Run YOLO inference on video frame
        
        Args:
            frame: np.ndarray BGR image
        
        Returns:
            Detections dict
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        try:
            h, w = frame.shape[:2]
            
            # Run inference
            results = self.model.predict(
                source=frame,
                conf=self.conf_threshold,
                device=self.device,
                verbose=False
            )
            
            # Extract detections
            detections = []
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                for box in boxes:
                    xyxy = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu())
                    cls_id = int(box.cls[0].cpu())
                    class_name = result.names[cls_id]
                    
                    x1, y1, x2, y2 = xyxy
                    
                    detections.append({
                        'class_name': str(class_name),
                        'confidence': round(float(conf), 3),
                        'x1': int(x1),
                        'y1': int(y1),
                        'x2': int(x2),
                        'y2': int(y2),
                        'width': int(x2 - x1),
                        'height': int(y2 - y1)
                    })
            
            return {
                'frame_shape': [h, w],
                'detections': detections
            }
        
        except Exception as e:
            logger.error(f"Frame prediction error: {e}")
            return {'frame_shape': [h, w], 'detections': []}
    
    @staticmethod
    def _draw_boxes(image: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw bounding boxes on image"""
        img = image.copy()
        
        for det in detections:
            bbox = det['pixel_bbox']
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            
            # Draw box
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw label
            label = f"{det['class_name']} {det['confidence']:.2f}"
            cv2.putText(img, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return img
```

---

## Frontend Integration

### Step 1: Update LiveCameraPredictor.tsx

Create optimized component:

```typescript
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, X, Download, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

interface Detection {
  class_name: string;
  confidence: number;
  x1: number;  // pixel coordinates
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  timestamp: number;
}

interface StreamReport {
  startTime: number;
  endTime: number;
  duration: number;
  totalFramesProcessed: number;
  totalDetections: number;
  diseaseFrequency: Record<string, number>;
  averageConfidencePerDisease: Record<string, number>;
  detections: Detection[];
}

export default function LiveCameraPredictor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [streamStats, setStreamStats] = useState({
    totalFrames: 0,
    totalDetections: 0,
    avgConfidence: 0
  });
  
  const streamStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Start camera
  const startCamera = async () => {
    try {
      console.log('🎬 Requesting camera access...');
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener('canplay', onCanPlay);
            resolve(null);
          };
          
          videoRef.current?.addEventListener('canplay', onCanPlay);
          videoRef.current?.play().catch(reject);
        });

        setIsStreaming(true);
        streamStartTimeRef.current = Date.now();
        toast.success('✓ Camera started');
        
        // Start rendering and detection loops
        startRenderLoop();
        startDetectionLoop();
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      toast.error(`Camera error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    
    setIsStreaming(false);
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  // Render loop - 60 FPS canvas drawing
  const startRenderLoop = useCallback(() => {
    const render = () => {
      if (!isStreaming || !videoRef.current || !detectionCanvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const video = videoRef.current;
      const canvas = detectionCanvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.videoWidth === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw detections
      drawDetectionsOnCanvas(ctx, canvas.width, canvas.height);

      // Update FPS
      fpsCounterRef.current.frames++;
      const now = Date.now();
      if (now - fpsCounterRef.current.lastTime > 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  }, [isStreaming]);

  // Draw detections on canvas
  const drawDetectionsOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    detections.forEach(det => {
      // Determine color based on confidence
      const color = det.confidence > 0.8 ? '#FF4444' : det.confidence > 0.6 ? '#FFAA00' : '#00FF00';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(det.x1, det.y1, det.width, det.height);

      // Draw label background
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(1)}%`;
      const textMetrics = ctx.measureText(label);
      const textHeight = 20;
      const padding = 5;

      ctx.fillStyle = color;
      ctx.fillRect(
        det.x1,
        det.y1 - textHeight - padding * 2,
        textMetrics.width + padding * 2,
        textHeight + padding * 2
      );

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(label, det.x1 + padding, det.y1 - padding - 2);
    });
  };

  // Detection loop - process frames at 1 FPS
  const startDetectionLoop = useCallback(() => {
    detectionIntervalRef.current = setInterval(async () => {
      if (isStreaming && !isProcessing && videoRef.current && canvasRef.current) {
        await processFrame();
      }
    }, 1000); // 1 second interval
  }, [isStreaming, isProcessing]);

  // Process single frame
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and send to backend
      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result.detections && result.detections.length > 0) {
        setDetections(result.detections);
        setStreamStats({
          totalFrames: frameCount + 1,
          totalDetections: streamStats.totalDetections + result.detections.length,
          avgConfidence: (streamStats.avgConfidence * frameCount + 
                          result.detections.reduce((sum: number, d: Detection) => sum + d.confidence, 0) / result.detections.length) / (frameCount + 1)
        });
      }

      setFrameCount(prev => prev + 1);
    } catch (error) {
      console.error('Frame processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate report
  const generateReport = (): StreamReport => {
    const diseaseFreq: Record<string, number> = {};
    const confidenceSum: Record<string, { total: number; count: number }> = {};

    detections.forEach(det => {
      diseaseFreq[det.class_name] = (diseaseFreq[det.class_name] || 0) + 1;
      if (!confidenceSum[det.class_name]) {
        confidenceSum[det.class_name] = { total: 0, count: 0 };
      }
      confidenceSum[det.class_name].total += det.confidence;
      confidenceSum[det.class_name].count += 1;
    });

    const avgConfidence: Record<string, number> = {};
    Object.entries(confidenceSum).forEach(([disease, data]) => {
      avgConfidence[disease] = data.total / data.count;
    });

    return {
      startTime: streamStartTimeRef.current,
      endTime: Date.now(),
      duration: (Date.now() - streamStartTimeRef.current) / 1000,
      totalFramesProcessed: frameCount,
      totalDetections: detections.length,
      diseaseFrequency: diseaseFreq,
      averageConfidencePerDisease: avgConfidence,
      detections: detections
    };
  };

  // Download report
  const downloadReport = () => {
    const report = generateReport();
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disease_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✓ Report downloaded');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Live Crop Disease Detection</CardTitle>
          <CardDescription>Real-time YOLO-based detection with disease bounding boxes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Display */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            <div className="aspect-video relative">
              <canvas
                ref={detectionCanvasRef}
                className="w-full h-full block bg-black"
              />
              
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <p className="text-white text-lg">📹 Camera Off</p>
                    <p className="text-gray-300 text-sm">Click start to begin detection</p>
                  </div>
                </div>
              )}

              {/* FPS Counter */}
              {isStreaming && (
                <div className="absolute top-3 left-3 bg-blue-600/80 text-white px-3 py-1 rounded text-sm font-bold">
                  FPS: {fps}
                </div>
              )}

              {/* Detection Count */}
              {isStreaming && (
                <div className="absolute top-3 right-3 bg-green-600/80 text-white px-3 py-1 rounded text-sm font-bold">
                  Detections: {detections.length}
                </div>
              )}

              {/* Timer */}
              {isStreaming && (
                <div className="absolute bottom-3 left-3 bg-yellow-600/80 text-white px-3 py-1 rounded text-sm font-bold">
                  ⏱️ {Math.floor((Date.now() - streamStartTimeRef.current) / 1000)}s
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isStreaming ? (
              <Button onClick={startCamera} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
                <Button onClick={downloadReport} disabled={detections.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </>
            )}
          </div>

          {/* Statistics */}
          {isStreaming && detections.length > 0 && (
            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-100 rounded">
              <div>
                <p className="text-xs font-semibold">Total Objects</p>
                <p className="text-2xl font-bold">{detections.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {((detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold">Frames</p>
                <p className="text-2xl font-bold">{frameCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Real-time Processing Pipeline

### Stream Handler (stream_handler.py)

```python
"""
Real-time video stream processing
Handles USB camera, RTSP streams, and video files
"""
import cv2
import logging
from collections import deque
from typing import Generator, Dict

logger = logging.getLogger(__name__)

class StreamProcessor:
    def __init__(self, detector, max_queue_size=30):
        self.detector = detector
        self.frame_queue = deque(maxlen=max_queue_size)
    
    def process_stream(self, source: str, max_frames: int = 300) -> Generator[Dict, None, None]:
        """Process video stream and yield detections"""
        
        source_int = int(source) if source.isdigit() else source
        cap = cv2.VideoCapture(source_int)
        
        if not cap.isOpened():
            logger.error(f"Cannot open: {source}")
            return
        
        frame_num = 0
        
        while frame_num < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Skip frames for performance (every Nth frame)
            if frame_num % 2 == 0:  # Process every 2nd frame
                try:
                    result = self.detector.predict_frame(frame)
                    yield {
                        'frame_num': frame_num,
                        'timestamp': cv2.getTickCount(),
                        'detections': result['detections']
                    }
                except Exception as e:
                    logger.error(f"Frame {frame_num} error: {e}")
                    yield {'frame_num': frame_num, 'error': str(e)}
            
            frame_num += 1
        
        cap.release()
```

---

## Testing & Deployment

### Test Script

```bash
# 1. Start backend
cd backend
$env:USE_YOLO='1'
python app.py

# 2. In another terminal, test API
python -c "
import requests
import cv2

# Test health
resp = requests.get('http://localhost:5000/')
print('Health:', resp.json()['status'])

# Test image prediction
with open('test.jpg', 'rb') as f:
    resp = requests.post('http://localhost:5000/predict', files={'file': f})
    print('Detections:', len(resp.json()['detections']))
"
```

### Quick Start Commands

```bash
# Full project setup
git clone <repo>
cd backend
pip install -r requirements.txt

# Training (optional)
python train_yolo.py --data path/to/data.yaml

# Run backend
$env:USE_YOLO='1'
$env:YOLO_MODEL_PATH='backend/model/best.pt'
python app.py

# Run frontend (new terminal)
cd ../Frontend
npm install
npm run dev

# Open http://localhost:5175
```

---

## Summary

This integration provides:
- ✅ **Real-time detection**: 60 FPS rendering + 1 FPS YOLO inference
- ✅ **Multiple sources**: Webcam, RTSP, video files, drone feeds
- ✅ **Disease labeling**: Bounding boxes with confidence % + area %
- ✅ **Live reports**: JSON download with full analysis
- ✅ **Production ready**: Error handling, GPU support, threading

**Next Steps**:
1. Place or train a YOLO model in `backend/model/`
2. Start backend with `$env:USE_YOLO='1'; python app.py`
3. Open frontend at `http://localhost:5175`
4. Click "Start Camera" to begin live detection
