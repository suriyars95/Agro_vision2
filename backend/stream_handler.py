"""
Stream handler for live video and RTSP processing with YOLO detection.
Supports: USB camera, file video, RTSP drone streams.
"""
import cv2
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

class StreamDetector:
    """Process live video streams (camera, file, RTSP) with YOLO detection."""
    
    def __init__(self, use_yolo=False):
        self.use_yolo = use_yolo
        self.yolo_model = None
        if use_yolo:
            try:
                # Use yolo_detector which handles model loading with proper fallbacks
                from yolo_detector import _load_model
                logger.info("Loading YOLO model via yolo_detector...")
                self.yolo_model = _load_model()  # Loads yolo11n.pt or yolov8n.pt
                logger.info("✓ YOLO model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load YOLO: {e}")
                self.use_yolo = False
    
    def process_frame(self, frame: np.ndarray, conf_thresh: float = 0.25) -> Dict:
        """
        Process a single frame and return detections.
        
        Args:
            frame: BGR image from cv2
            conf_thresh: confidence threshold for detections
            
        Returns:
            {
                'boxes': [{'class': str, 'conf': float, 'x': float, 'y': float, 'w': float, 'h': float}, ...],
                'frame_shape': (height, width),
                'detections_count': int
            }
        """
        if frame is None or frame.size == 0:
            return {'boxes': [], 'frame_shape': (0, 0), 'detections_count': 0}
        
        h, w = frame.shape[:2]
        result = {
            'boxes': [],
            'frame_shape': (h, w),
            'detections_count': 0
        }
        
        if not self.use_yolo or self.yolo_model is None:
            return result
        
        try:
            # Run YOLO inference on frame
            predictions = self.yolo_model(frame, conf=conf_thresh, verbose=False)
            
            if predictions and len(predictions) > 0:
                pred = predictions[0]
                if pred.boxes is not None:
                    for box in pred.boxes:
                        # Extract normalized coordinates (0-1 range)
                        x1, y1, x2, y2 = box.xyxyn[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        
                        # Convert to center + width/height format (normalized)
                        box_w = x2 - x1
                        box_h = y2 - y1
                        box_x = x1 + box_w / 2
                        box_y = y1 + box_h / 2
                        
                        class_name = pred.names.get(cls, f"class_{cls}")
                        
                        # compute percent area of bbox in frame
                        percent_area = round((box_w * box_h) * 100.0, 2)

                        result['boxes'].append({
                            'class': class_name,
                            'conf': round(conf, 3),
                            'x': round(box_x, 3),
                            'y': round(box_y, 3),
                            'w': round(box_w, 3),
                            'h': round(box_h, 3),
                            'percent': percent_area
                        })
                    
                    result['detections_count'] = len(result['boxes'])
                    logger.debug(f"Detected {result['detections_count']} objects in frame")
        
        except Exception as e:
            logger.error(f"Error in frame processing: {e}")
        
        return result
    
    def get_video_properties(self, source: str) -> Optional[Dict]:
        """
        Get video properties (FPS, resolution, frame count) from source.
        
        Args:
            source: File path, camera index (0), or RTSP URL
            
        Returns:
            {'fps': float, 'width': int, 'height': int, 'frame_count': int} or None if failed
        """
        try:
            # Try to open source (camera index or file/RTSP URL)
            if isinstance(source, str) and source.isdigit():
                source = int(source)
            
            cap = cv2.VideoCapture(source)
            
            if not cap.isOpened():
                logger.error(f"Failed to open video source: {source}")
                return None
            
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            cap.release()
            
            return {
                'fps': fps,
                'width': width,
                'height': height,
                'frame_count': frame_count
            }
        
        except Exception as e:
            logger.error(f"Error getting video properties: {e}")
            return None
    
    def process_stream(self, source: str, max_frames: int = 30, conf_thresh: float = 0.25):
        """
        Generator: process video stream frame-by-frame.
        
        Args:
            source: Camera index (0), file path, or RTSP URL
            max_frames: Maximum frames to process (0 = all)
            conf_thresh: Confidence threshold
            
        Yields:
            {'frame_num': int, 'detections': {...}} for each frame
        """
        try:
            # Convert string camera index to int
            if isinstance(source, str) and source.isdigit():
                source = int(source)
            
            cap = cv2.VideoCapture(source)
            
            if not cap.isOpened():
                logger.error(f"Failed to open source: {source}")
                yield {'error': f'Cannot open source: {source}'}
                return
            
            frame_num = 0
            while frame_num < (max_frames if max_frames > 0 else float('inf')):
                ret, frame = cap.read()
                
                if not ret or frame is None:
                    logger.info(f"Stream ended or error at frame {frame_num}")
                    break
                
                # Resize for faster processing if too large
                if frame.shape[1] > 640:
                    scale = 640 / frame.shape[1]
                    frame = cv2.resize(frame, None, fx=scale, fy=scale)
                
                detections = self.process_frame(frame, conf_thresh)
                
                yield {
                    'frame_num': frame_num,
                    'detections': detections
                }
                
                frame_num += 1
            
            cap.release()
            logger.info(f"Stream processing complete: {frame_num} frames processed")
        
        except Exception as e:
            logger.error(f"Error processing stream: {e}")
            yield {'error': str(e)}
