# 🚀 Camera Integration - Testing Instructions

## Current Status
✅ **Backend**: Flask API running on `http://localhost:5000`
✅ **Frontend**: Vite dev server running on `http://localhost:5175`  
✅ **Logging**: Enhanced LiveCameraPredictor with console logs
✅ **Mock Predictions**: Working with random disease detections + bounding boxes
✅ **YOLO Model**: yolo11n.pt integrated into yolo_detector.py (ready for activation)

## How to Test the Camera Feature

### 1. Open the Application
- Navigate to **`http://localhost:5175`** in your browser
- You should see the homepage with the Agro Disease Detection banner

### 2. Go to Farmer Portal
- Click on the **"Farmer Portal"** link or navigation item
- You should see multiple tabs: "Upload Image", "Your Camera", "RTSP/Video", "Drone"

### 3. Click on "Your Camera Tab"
- Look for the tab labeled **"Your Camera"**
- You'll see two buttons: "💻 Laptop Camera" and "📱 Mobile Camera"

### 4. Start the Camera
- **Click "💻 Laptop Camera"** (if on desktop)
- Grant camera permission when your browser prompts
- You should see:
  - Video stream displaying in the canvas
  - Green "0s" timer at bottom-left (stream duration)
  - Blue "Detections: 0" counter at top-left
  - "Processing..." indicator when frames are being sent to backend

### 5. Check Browser Console Logs
- Press **F12** to open Developer Tools
- Click on the **"Console"** tab
- You should see logs like:
  ```
  🎬 Starting camera...
  📷 Requesting camera access...
  ✓ Camera stream obtained
  ✓ Video metadata loaded. Dimensions: 1280 x 720
  ✓ Camera started successfully
  🔄 Starting video render loop...
  🔍 Starting detection loop...
  🎥 Video render loop running. Frame: 30
  📹 Processing frame 1280 x 720
  📤 Sending frame to backend /predict. Size: XXXXX bytes
  📥 Backend response status: 200
  ✓ Backend result: {disease: "...", confidence: ..., boxes: [...]}
  ```

### 6. Monitor Detections
- As frames are processed, the **detection counter** will increase
- Bounding boxes will appear on the video overlay
- Disease names and confidence percentages will be shown
- Real-time statistics will update in the "Live Detection Stats" section below

### 7. End Stream and Generate Report
- Click **"End Stream & Report"** button
- A detailed report will be generated with:
  - Total detections count
  - Unique diseases detected
  - Average confidence per disease
  - Detection timeline

## Troubleshooting

### Camera Not Showing
**Check Console Logs** (F12):
- If you see `❌ Camera error:` → Camera permission denied
  - Solution: Allow camera access in browser permissions
- If you see `❌ Metadata loading timeout` → Browser can't access camera
  - Solution: Check if webcam works (test in other apps)

### No Backend Response
**Check Console Logs**:
- If you see `❌ Backend returned error status: 500` → Backend crashed
  - Solution: Check backend terminal for errors
- If you see `⚠ No disease or boxes in response` → Backend returned incomplete data
  - Solution: Backend might not have restarted after changes

### Backend Not Running
```powershell
# Verify backend is running on port 5000:
curl http://localhost:5000

# If not running, restart:
cd D:\Programfiles_Company\Agrofrontback2\backend
D:\Programfiles_Company\Agrofrontback2\.venv\Scripts\python.exe run_app_test.py
```

### Frontend Issues
```powershell
# If port 5175 is not accessible, restart frontend:
cd D:\Programfiles_Company\Agrofrontback2\Frontend
npm run dev
```

## Next Steps

### Enable YOLO Model Integration (Advanced)
Once camera works with mock predictions, you can enable the user's **yolo11n.pt** model:

```powershell
cd D:\Programfiles_Company\Agrofrontback2\backend
$env:USE_YOLO = "1"
D:\Programfiles_Company\Agrofrontback2\.venv\Scripts\python.exe run_app_yolo.py
```

**Note**: Using YOLO requires restarting the backend. It will load `backend/model/yolo11n.pt` automatically.

## File Changes Summary

### Frontend
- `src/components/LiveCameraPredictor.tsx`: Added comprehensive console logging
  - 📝 Logs camera initialization
  - 📝 Logs video rendering loop status
  - 📝 Logs backend requests/responses
  - 📝 Logs detection parsing and overlay rendering

### Backend  
- `backend/run_app_test.py`: Created for mock predictions testing
  - Uses predict_mock.py (no heavy ML deps)
  - Returns boxes array for overlay
  - CORS enabled for frontend

- `backend/yolo_detector.py`: Updated to auto-detect yolo11n.pt
  - Checks `backend/model/yolo11n.pt` first
  - Falls back to yolov8n.pt if not found
  - Configurable via YOLO_MODEL_PATH env var

- `backend/stream_handler.py`: Updated to use yolo_detector
  - Uses _load_model() from yolo_detector
  - Automatically loads user's model when YOLO enabled

## Expected Output

When everything works:
1. Video appears in canvas
2. Stream duration timer increments
3. Detection counter increases every second
4. Bounding boxes appear with disease names
5. Statistics panel shows:
   - Total detections
   - Unique diseases
   - Average confidence per disease
   - Last 5 detections list

## Current Limitations

- **Mock Mode**: Currently using random predictions (for testing without heavy ML deps)
  - Disease names are realistic (Aphid, Blast, Rust, etc.)
  - Boxes are random positions (not based on actual image content)
  - All diseases in DISEASE_INFO list can appear

- **YOLO Mode** (when enabled):
  - Uses yolo11n.pt model for actual object detection
  - Detects general objects (not crop diseases specifically)
  - Boxes will be based on actual image content

## Next Session TODO

1. ✅ Verify camera works with console logs
2. Enable USE_YOLO=1 and test with yolo11n.pt
3. Fine-tune confidence thresholds
4. Test with actual disease images
5. Generate sample reports
