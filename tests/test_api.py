"""
Quick smoke test: capture a dummy frame and send to /predict endpoint.
Verifies API response format for YOLO detections.
"""
import requests
import json
import time
from PIL import Image
import numpy as np
import sys

# Test config
BACKEND_URL = "http://localhost:5000"
TEST_IMAGE_PATH = "test_frame.jpg"

def create_dummy_image(width=640, height=480):
    """Create a dummy test image (green square with some noise)."""
    # Create a green image
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    img_array[:, :] = [34, 139, 34]  # Dark green (RGB)
    
    # Add some random noise for variety
    noise = np.random.randint(0, 50, (height, width, 3), dtype=np.uint8)
    img_array = np.clip(img_array.astype(int) + noise.astype(int), 0, 255).astype(np.uint8)
    
    img = Image.fromarray(img_array, 'RGB')
    img.save(TEST_IMAGE_PATH)
    print(f"✓ Created dummy test image: {TEST_IMAGE_PATH} ({width}x{height})")
    return TEST_IMAGE_PATH

def test_predict_endpoint():
    """Send test image to /predict and show response."""
    print("\n" + "="*70)
    print("SMOKE TEST: /predict endpoint")
    print("="*70)
    
    # Create test image
    img_path = create_dummy_image()
    
    # Send to backend
    print(f"\n📤 Sending image to {BACKEND_URL}/predict...")
    try:
        with open(img_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{BACKEND_URL}/predict", files=files, timeout=10)
        
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n📥 Backend Response (formatted JSON):")
            print(json.dumps(result, indent=2))
            
            # Check key fields
            print("\n📋 Response Structure Check:")
            print(f"  • fileReceived: {result.get('fileReceived')} (expected: True)")
            print(f"  • disease: {result.get('disease')} (expected: class name or None)")
            print(f"  • confidence: {result.get('confidence')} (expected: 0-100 or None)")
            print(f"  • boxes count: {len(result.get('boxes', []))} (expected: ≥0)")
            
            if result.get('boxes'):
                print("\n🎯 First Box Details:")
                box = result['boxes'][0]
                print(f"  • class: {box.get('class', 'N/A')}")
                print(f"  • conf: {box.get('conf', 'N/A')} (expected: 0-100)")
                print(f"  • percent: {box.get('percent', 'N/A')} (optional, bbox area %)")
                print(f"  • x, y, w, h: ({box.get('x', 'N/A')}, {box.get('y', 'N/A')}, {box.get('w', 'N/A')}, {box.get('h', 'N/A')})")
            
            return True
        else:
            print(f"❌ Error response:")
            print(response.text)
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BACKEND_URL}")
        print("   Make sure backend is running: $env:USE_YOLO='1'; python app.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_backend_health():
    """Quick health check on backend."""
    print("🏥 Checking backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Backend is running")
            print(f"  • YOLO enabled: {data.get('yolo_enabled', 'unknown')}")
            return True
        else:
            print(f"⚠ Unexpected status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot reach backend at {BACKEND_URL}")
        return False

if __name__ == '__main__':
    print("\n🧪 AgroVision YOLO Integration Smoke Test")
    print("="*70)
    
    # Check backend
    if not check_backend_health():
        print("\n⚠️ Backend not running. Start it first:")
        print("   cd backend")
        print("   $env:USE_YOLO='1'; python app.py")
        sys.exit(1)
    
    # Run test
    time.sleep(1)
    success = test_predict_endpoint()
    
    print("\n" + "="*70)
    if success:
        print("✅ Smoke test PASSED - API response looks good!")
    else:
        print("❌ Smoke test FAILED - check logs above")
    print("="*70 + "\n")
