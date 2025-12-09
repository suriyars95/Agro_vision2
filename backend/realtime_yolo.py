"""
Enhanced YOLO detector for real-time video processing with OpenCV.
Supports webcam, RTSP streams, and video files.
"""
import cv2
import numpy as np
from typing import Optional, Dict, List, Union, Generator
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class RealtimeYOLO:
    def __init__(self, model_path: str = None, conf_threshold: float = 0.5, iou_threshold: float = 0.4):
        """
        Initialize YOLO detector.
        
        Args:
            model_path: Path to YOLO model (.pt file). If None, uses default YOLOv8n.
            conf_threshold: Confidence threshold for detections (0-1)
            iou_threshold: IoU threshold for NMS (0-1)
        """
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model = self._load_model(model_path)
        self.class_names = self._get_class_names()
        
    def _load_model(self, model_path: str = None):
        """Load YOLO model from file or download default."""
        try:
            from ultralytics import YOLO
            
            if model_path and Path(model_path).exists():
                logger.info(f"Loading YOLO model from {model_path}")
                model = YOLO(model_path)
            else:
                logger.info("Using default YOLOv8n model")
                model = YOLO('yolov8n.pt')
                
            return model
            
        except ImportError:
            logger.error("ultralytics package not found. Install with: pip install ultralytics")
            raise
            
    def _get_class_names(self) -> List[str]:
        """Get class names from the model."""
        if hasattr(self.model, 'names') and self.model.names is not None:
            return list(self.model.names.values())
        return [str(i) for i in range(1000)]  # Fallback
    
    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process a single frame and return detections.
        
        Args:
            frame: BGR image (numpy array)
            
        Returns:
            {
                'detections': List[Dict],  # List of detection dicts
                'fps': float,             # Processing FPS
                'inference_time': float,  # Inference time in seconds
                'frame_shape': (h, w),    # Frame dimensions
                'timestamp': float        # Unix timestamp
            }
        """
        if frame is None or frame.size == 0:
            return {'detections': [], 'fps': 0, 'inference_time': 0, 'frame_shape': (0, 0), 'timestamp': time.time()}
            
        start_time = time.time()
        
        # Run inference
        results = self.model(
            frame,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            verbose=False,
            stream=False  # Disable streaming for single frame
        )
        
        inference_time = time.time() - start_time
        fps = 1.0 / (inference_time + 1e-9)  # Avoid division by zero
        
        detections = []
        h, w = frame.shape[:2]
        
        if results and len(results) > 0:
            result = results[0]
            if hasattr(result, 'boxes') and result.boxes is not None:
                for box in result.boxes:
                    # Get box coordinates (xyxy format)
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = self.class_names[cls_id] if cls_id < len(self.class_names) else str(cls_id)
                    
                    # Calculate normalized coordinates (0-1)
                    x_center = ((x1 + x2) / 2) / w
                    y_center = ((y1 + y2) / 2) / h
                    width = (x2 - x1) / w
                    height = (y2 - y1) / h
                    
                    detections.append({
                        'class': class_name,
                        'confidence': float(conf),
                        'x': float(x_center),
                        'y': float(y_center),
                        'width': float(width),
                        'height': float(height),
                        'x1': float(x1),
                        'y1': float(y1),
                        'x2': float(x2),
                        'y2': float(y2),
                    })
        
        return {
            'detections': detections,
            'fps': fps,
            'inference_time': inference_time,
            'frame_shape': (h, w),
            'timestamp': time.time()
        }
    
    def process_video(self, source: Union[int, str, int], max_frames: int = 0) -> Generator[Dict, None, None]:
        """
        Process video stream frame by frame.
        
        Args:
            source: Camera index (0 for default), video file path, or RTSP URL
            max_frames: Maximum number of frames to process (0 for unlimited)
            
        Yields:
            Dictionary with detection results for each frame
        """
        if isinstance(source, str) and source.isdigit():
            source = int(source)
            
        cap = cv2.VideoCapture(source)
        
        if not cap.isOpened():
            logger.error(f"Failed to open video source: {source}")
            raise ValueError(f"Could not open video source: {source}")
            
        try:
            frame_count = 0
            start_time = time.time()
            
            while True:
                if 0 < max_frames <= frame_count:
                    logger.info(f"Reached maximum frame count: {max_frames}")
                    break
                    
                ret, frame = cap.read()
                if not ret:
                    logger.info("End of video stream")
                    break
                    
                # Process frame
                result = self.process_frame(frame)
                result['frame_number'] = frame_count
                result['elapsed_time'] = time.time() - start_time
                
                # Add frame for visualization
                result['frame'] = frame
                
                yield result
                frame_count += 1
                
        finally:
            cap.release()
            logger.info(f"Video processing complete. Processed {frame_count} frames in {time.time() - start_time:.2f} seconds")
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """
        Draw bounding boxes and labels on the frame.
        
        Args:
            frame: Input frame (BGR)
            detections: List of detection dictionaries
            
        Returns:
            Frame with drawn detections (BGR)
        """
        if frame is None or len(detections) == 0:
            return frame
            
        h, w = frame.shape[:2]
        output = frame.copy()
        
        for det in detections:
            # Convert normalized coordinates to pixel coordinates
            x1 = int(det.get('x1', det.get('x', 0) * w))
            y1 = int(det.get('y1', det.get('y', 0) * h))
            x2 = int(det.get('x2', (det.get('x', 0) + det.get('width', 0)) * w))
            y2 = int(det.get('y2', (det.get('y', 0) + det.get('height', 0)) * h))
            
            # Ensure coordinates are within frame bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w - 1, x2), min(h - 1, y2)
            
            if x2 <= x1 or y2 <= y1:
                continue  # Skip invalid boxes
                
            # Draw rectangle
            color = (0, 255, 0)  # Green
            thickness = 2
            cv2.rectangle(output, (x1, y1), (x2, y2), color, thickness)
            
            # Add label with confidence
            label = f"{det['class']} {det['confidence']:.2f}"
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            
            # Draw background for label
            cv2.rectangle(output, (x1, y1 - 20), (x1 + label_w, y1), color, -1)
            cv2.putText(output, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            
        return output

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Real-time YOLO Object Detection")
    parser.add_argument("--source", type=str, default="0", help="Camera index, video file, or RTSP URL")
    parser.add_argument("--model", type=str, default=None, help="Path to YOLO model (.pt file)")
    parser.add_argument("--conf", type=float, default=0.5, help="Confidence threshold")
    parser.add_argument("--max-frames", type=int, default=0, help="Maximum frames to process (0 for unlimited)")
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize detector
    detector = RealtimeYOLO(model_path=args.model, conf_threshold=args.conf)
    
    try:
        for result in detector.process_video(args.source, max_frames=args.max_frames):
            frame = result['frame']
            
            # Draw detections
            frame = detector.draw_detections(frame, result['detections'])
            
            # Add FPS counter
            fps_text = f"FPS: {result['fps']:.1f} | Inference: {result['inference_time']*1000:.1f}ms"
            cv2.putText(frame, fps_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Show frame
            cv2.imshow("YOLO Detection", frame)
            
            # Press 'q' to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("\nStopping...")
    
    cv2.destroyAllWindows()
