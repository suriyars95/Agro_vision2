import sys, torch
print("Python:", sys.version.split()[0])
print("PyTorch:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    try:
        print("CUDA device:", torch.cuda.get_device_name(0))
        print("CUDA capacity:", round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1), "GB")
    except Exception as e:
        print("Error:", e)
from ultralytics import YOLO
print("Ultralytics imported OK")
import cv2
print("OpenCV version:", cv2.__version__)
