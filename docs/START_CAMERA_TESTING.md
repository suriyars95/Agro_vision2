# 🎯 Quick Start - Camera Testing

## Right Now (You're Set Up!)

### What's Running:
- ✅ Backend: `http://localhost:5000/predict`
- ✅ Frontend: `http://localhost:5175`
- ✅ Browser: Open the Simple Browser that should already be displayed

---

## 🏃 Do This Now:

### Step 1: Navigate to Camera Tab
1. Look for **"Farmer Portal"** link (navigation menu)
2. Find the **"Your Camera"** tab
3. You should see "💻 Laptop Camera" button

### Step 2: Start Camera
1. Click **"💻 Laptop Camera"**
2. Browser will ask for camera permission → **Allow it**
3. Should see:
   - Video stream in the canvas
   - Green timer showing "0s"
   - Blue "Detections: 0" badge

### Step 3: Debug (Press F12)
Press **F12** on keyboard:
- Click "Console" tab
- Look for logs starting with emoji (✓, 📤, 📥, etc.)
- If no errors → **Camera working! ✅**

### Step 4: Watch Detections
- Every 1-2 seconds, frame is sent to backend
- You'll see console logs: `📤 Sending frame...` → `📥 Response received`
- Detection counter will increment
- Bounding boxes appear on video

### Step 5: Generate Report
- Click "End Stream & Report" button
- See summary with:
  - Total detections
  - Diseases found
  - Confidence levels
  - Detection timeline

---

## 🆘 If Something's Wrong

### Camera Not Showing (Black Screen)
```
Press F12 → Console
Look for: ❌ Camera error
```
→ Check camera permission in browser settings

### No Detections Appearing
```
Press F12 → Console
Look for: 📤 Sending frame
```
→ If no logs → camera loop not running
→ If logs appear → check backend at `http://localhost:5000`

### Backend Connection Error
```powershell
# Check if backend is running:
curl http://localhost:5000

# If error, restart backend:
cd D:\Programfiles_Company\Agrofrontback2\backend
D:\Programfiles_Company\Agrofrontback2\.venv\Scripts\python.exe run_app_test.py
```

---

## 📝 Expected Console Output

When working correctly:
```
✓ Camera stream obtained
✓ Video metadata loaded. Dimensions: 1280 x 720
✓ Camera started successfully
▶️ Started video render loop
🔍 Starting detection loop...
📹 Processing frame 1280 x 720
📤 Sending frame to backend /predict. Size: 12345 bytes
📥 Backend response status: 200
✓ Backend result: {disease: "Aphid", confidence: 77.3, boxes: [...]}
```

---

## 🎯 What Happens Behind the Scenes

```
You click "Laptop Camera"
        ↓
Browser asks camera permission
        ↓
Video stream starts in canvas (60 fps loop)
        ↓
Every 1 second: frame captured from video
        ↓
Frame sent as JPEG to http://localhost:5000/predict
        ↓
Backend analyzes frame (currently using mock predictions)
        ↓
Response returned with: disease name, confidence %, boxes
        ↓
Boxes drawn on video overlay
        ↓
Detection counter increments
        ↓
Repeat every second
        ↓
User clicks "End Stream & Report"
        ↓
Summary report generated
```

---

## 🚀 When Ready - Enable YOLO Model

Once camera works with mock predictions, you can enable real object detection:

```powershell
# Stop current backend (Ctrl+C in terminal)

# Restart with YOLO:
cd D:\Programfiles_Company\Agrofrontback2\backend
$env:USE_YOLO = "1"
D:\Programfiles_Company\Agrofrontback2\.venv\Scripts\python.exe run_app_yolo.py

# Frontend stays same - already at http://localhost:5175
# Refresh browser - camera will now use yolo11n.pt model
```

---

## ✅ You Have

- 📹 Live camera feed
- 🎯 Real-time object detection (mock or YOLO)
- 📊 Bounding box overlays
- 📈 Live statistics
- 📄 Report generation

---

## 🎉 You're Done with Integration!

The camera tab is fully integrated. Test it now by following the steps above.

Any issues? Check console logs (F12) - they'll tell you exactly what went wrong!

**Good luck! 🚀**
