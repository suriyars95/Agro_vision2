#!/usr/bin/env python
"""
Test /predict endpoint with a simple test image
"""
import requests
import cv2
import numpy as np
import json

# Create a simple test image (green rectangle on black background)
img = np.zeros((480, 640, 3), dtype=np.uint8)
img[100:300, 150:500] = [0, 255, 0]  # Green rectangle

# Save to JPEG
cv2.imwrite('test_frame.jpg', img)
print("✓ Created test image: test_frame.jpg")

# Send to backend
url = 'http://localhost:5000/predict'
with open('test_frame.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post(url, files=files)

print(f"Response status: {response.status_code}")
print(f"Response body:")
print(json.dumps(response.json(), indent=2))

# Clean up
import os
os.remove('test_frame.jpg')
print("✓ Test completed")
