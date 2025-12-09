"""
YOLO Detector Module - Handles model loading and real-time inference
Optimized for crop disease detection with Ultralytics YOLOv8/v11
"""
import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
import logging
import torch

logger = logging.getLogger(__name__)

class YOLODetector:
    """
    Singleton YOLO detector with lazy model loading and inference optimization
    Supports both image and frame inference
    """
    
    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.25, device: Optional[str] = None):
        """
        Initialize YOLO detector
        
        Args:
            model_path: Path to YOLO model (.pt file)
            conf_threshold: Confidence threshold (0-1)
            device: 'cpu', '0' (GPU), or 'cuda'
        """
        self.conf_threshold = conf_threshold
        self.device = device or ('0' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.model_path = None
        
        # Find and load model
        self.model_path = self._find_model(model_path)
        logger.info(f"🎯 Model path identified: {self.model_path}")
        
        self._load_model()
    
    def _find_model(self, model_path: Optional[str]) -> str:
        """
        Find YOLO model file with priority order:
        1. Explicit path (parameter)
        2. Environment variable
        3. yolo11n.pt (preferred model for this project)
        4. Other .pt files in model directory
        5. Fallback to auto-download
        """
        
        # 1. Explicit path from parameter
        if model_path and os.path.exists(model_path):
            logger.info(f"✓ Found model at parameter: {model_path}")
            return model_path
        
        # 2. Environment variable
        env_path = os.environ.get('YOLO_MODEL_PATH')
        if env_path and os.path.exists(env_path):
            logger.info(f"✓ Found model at YOLO_MODEL_PATH: {env_path}")
            return env_path
        
        # 3. Search common directories with yolo11n.pt priority
        search_dirs = [
            'backend/model',
            'backend/Models',
            'model',
            'Models',
            './model',
            './models'
        ]
        
        for dir_path in search_dirs:
            if os.path.isdir(dir_path):
                logger.info(f"🔍 Searching: {dir_path}")
                
                # First, check for yolo11n.pt (preferred)
                yolo11n_path = os.path.join(dir_path, 'yolo11n.pt')
                if os.path.exists(yolo11n_path):
                    logger.info(f"✓ Found preferred model: {yolo11n_path}")
                    return yolo11n_path
                
                try:
                    # Then check for any other .pt files
                    for file in sorted(os.listdir(dir_path)):
                        if file.endswith(('.pt', '.pth', '.onnx')):
                            full_path = os.path.join(dir_path, file)
                            logger.info(f"✓ Found model: {full_path}")
                            return full_path
                except PermissionError:
                    continue
        
        # 4. Fallback to default (will auto-download)
        logger.warning("⚠️  No local model found. Using yolov11n.pt (will auto-download from Ultralytics)")
        return 'yolov11n.pt'
    
    def _load_model(self):
        """Load YOLO model to specified device"""
        try:
            from ultralytics import YOLO
            
            logger.info(f"📦 Loading YOLO model: {self.model_path}")
            logger.info(f"🖥️  Device: {self.device} (GPU available: {torch.cuda.is_available()})")
            
            self.model = YOLO(self.model_path)
            self.model.to(self.device)
            
            # Test inference to ensure model is ready
            logger.info("🧪 Running test inference...")
            test_frame = np.zeros((640, 640, 3), dtype=np.uint8)
            _ = self.model.predict(test_frame, conf=0.5, verbose=False)
            
            logger.info(f"✅ Model loaded successfully!")
            logger.info(f"   Model: {self.model.model_name if hasattr(self.model, 'model_name') else 'YOLO'}")
            logger.info(f"   Classes: {len(self.model.names)}")
            logger.info(f"   Task: {self.model.task if hasattr(self.model, 'task') else 'detect'}")
        
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")
    
    def predict(self, image_path: str, conf_threshold: Optional[float] = None) -> Dict:
        """
        Run YOLO inference on single image
        
        Args:
            image_path: Path to image file
            conf_threshold: Optional override of confidence threshold
        
        Returns:
            Dict containing:
                - image_path: Input path
                - image_shape: [height, width]
                - detections: List of detection dicts
                - detection_count: Number of detections
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Cannot read image: {image_path}")
            
            h, w = img.shape[:2]
            conf = conf_threshold or self.conf_threshold
            
            # Run inference
            results = self.model.predict(
                source=image_path,
                conf=conf,
                device=self.device,
                verbose=False
            )
            
            # Extract detections
            detections = self._extract_detections(results, h, w)
            
            return {
                'image_path': str(image_path),
                'image_shape': [h, w],
                'detections': detections,
                'detection_count': len(detections)
            }
        
        except Exception as e:
            logger.error(f"❌ Prediction error for {image_path}: {e}")
            raise
    
    def predict_frame(self, frame: np.ndarray, conf_threshold: Optional[float] = None) -> Dict:
        """
        Run YOLO inference on video frame (optimized for speed)
        
        Args:
            frame: np.ndarray BGR image from OpenCV
            conf_threshold: Optional override
        
        Returns:
            Dict with frame_shape and detections (pixel coordinates for direct rendering)
        """
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        try:
            h, w = frame.shape[:2]
            conf = conf_threshold or self.conf_threshold
            
            # Run inference
            results = self.model.predict(
                source=frame,
                conf=conf,
                device=self.device,
                verbose=False
            )
            
            # Extract detections in pixel coordinates
            detections = []
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                for box in boxes:
                    try:
                        xyxy = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().item())
                        cls_id = int(box.cls[0].cpu().item())
                        
                        x1, y1, x2, y2 = xyxy.astype(int)
                        
                        # Get class name
                        class_name = result.names.get(cls_id, f"Class_{cls_id}")
                        
                        detections.append({
                            'class_name': str(class_name),
                            'confidence': round(float(conf), 3),
                            'x1': int(x1),
                            'y1': int(y1),
                            'x2': int(x2),
                            'y2': int(y2),
                            'width': int(x2 - x1),
                            'height': int(y2 - y1),
                            'center_x': int((x1 + x2) / 2),
                            'center_y': int((y1 + y2) / 2)
                        })
                    except Exception as e:
                        logger.debug(f"Error extracting box: {e}")
                        continue
            
            return {
                'frame_shape': [h, w],
                'detections': detections
            }
        
        except Exception as e:
            logger.error(f"❌ Frame prediction error: {e}")
            return {'frame_shape': [h, w], 'detections': []}
    
    @staticmethod
    def _extract_detections(results, h: int, w: int) -> List[Dict]:
        """Extract detections from YOLO results with normalization"""
        detections = []
        
        if not results or len(results) == 0:
            return detections
        
        result = results[0]
        boxes = result.boxes
        
        for box in boxes:
            try:
                xyxy = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().item())
                cls_id = int(box.cls[0].cpu().item())
                
                x1, y1, x2, y2 = xyxy
                
                # Normalize coordinates (0-1)
                norm_x = float(x1 / w)
                norm_y = float(y1 / h)
                norm_w = float((x2 - x1) / w)
                norm_h = float((y2 - y1) / h)
                
                # Calculate area percentage
                area_percent = (norm_w * norm_h) * 100.0
                
                # Get class name
                class_name = result.names.get(cls_id, f"Class_{cls_id}")
                
                detections.append({
                    'class_id': int(cls_id),
                    'class_name': str(class_name),
                    'confidence': round(float(conf), 3),
                    'bbox_normalized': {
                        'x': round(norm_x, 4),
                        'y': round(norm_y, 4),
                        'width': round(norm_w, 4),
                        'height': round(norm_h, 4)
                    },
                    'bbox_pixel': {
                        'x1': int(x1),
                        'y1': int(y1),
                        'x2': int(x2),
                        'y2': int(y2),
                        'width': int(x2 - x1),
                        'height': int(y2 - y1)
                    },
                    'area_percent': round(area_percent, 2)
                })
            except Exception as e:
                logger.debug(f"Error processing box: {e}")
                continue
        
        return detections
    
    def get_model_info(self) -> Dict:
        """Get model metadata"""
        if not self.model:
            return {}
        
        return {
            'model_path': str(self.model_path),
            'device': str(self.device),
            'model_name': getattr(self.model, 'model_name', 'Unknown'),
            'num_classes': len(self.model.names) if hasattr(self.model, 'names') else 0,
            'class_names': list(self.model.names.values()) if hasattr(self.model, 'names') else [],
            'task': getattr(self.model, 'task', 'detect'),
            'gpu_available': torch.cuda.is_available(),
            'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
        }


# Backward compatibility: Keep old function interface
def detect(image_path: str, conf_thresh: float = 0.25) -> List[Dict]:
    """
    Legacy interface for single image detection
    """
    try:
        detector = YOLODetector(conf_threshold=conf_thresh)
        result = detector.predict(image_path, conf_threshold=conf_thresh)
        return result['detections']
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        return []
