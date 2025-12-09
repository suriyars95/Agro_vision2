# 🎬 QUICK START - LIVE CAMERA DETECTION

## ✅ SYSTEM STATUS

Both services are **RUNNING NOW**:

```
✅ Backend API:  http://localhost:5000
✅ Frontend UI:  http://localhost:5173
✅ YOLO Model:   trained_100_yolov12.pt (loaded)
```

---

## 🚀 OPEN THE APPLICATION

### Option 1: Click Direct Link
[http://localhost:5173](http://localhost:5173)

### Option 2: Manual
1. Open any web browser
2. Type: `http://localhost:5173`
3. Press Enter

---

## 🎮 HOW TO USE

### Start Detection:
1. **Click** "🎬 Start Camera" button
2. **Allow** camera permission when prompted
3. **Watch** live detection with boxes overlay
4. **See** disease names + confidence % + area %

### Stop and Report:
1. **Click** "🛑 Stop Camera" to stop
2. **Click** "📥 Download Report" to save results
3. **View** text file with disease summary

---

## 📊 REAL-TIME DISPLAY

On your webcam feed, you'll see:

```
┌─────────────────────────────────┐
│  📹 LIVE VIDEO STREAM           │
│                                 │
│    ┌──────────────────────┐    │
│    │ [Disease Box]        │    │
│    │ Blast 85.3% · 8.1%   │    │ ← Disease name, confidence, area %
│    │                      │    │
│    └──────────────────────┘    │
│                                 │
│  FPS: 58                        │ ← Performance metrics
│  Detected: 5/45                 │
│  Active: 1                      │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 WHAT TO TEST

### With Healthy Crop:
- ✓ Few or no detections
- ✓ Confidence very low

### With Diseased Leaf:
- ✓ Multiple boxes appear
- ✓ Disease name shows correctly
- ✓ Confidence 70%+
- ✓ Red/orange boxes

### Performance:
- ✓ Smooth video (60 FPS)
- ✓ Detection every ~1-2 seconds
- ✓ Boxes update in real-time
- ✓ No crashes or errors

---

## 📁 FILES INVOLVED

**Backend** (`backend/app.py`):
- `/health` - System status
- `/predict` - Single image detection
- `/stream/detect` - Live frame detection
- `/analyze` - Results analysis

**Frontend** (`Frontend/src/components/LiveCameraPredictor.tsx`):
- Camera capture
- Canvas rendering (60 FPS)
- Detection processing (1 FPS)
- Report generation

**Model** (`backend/model/trained_100_yolov12.pt`):
- YOLOv12 trained on 100 samples
- Detects: Crop diseases (15 classes)
- Runs on: CPU (no GPU required)

---

## 🔍 VERIFY IT'S WORKING

### Check Backend Health:
Open in browser or curl:
```
http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "yolo_ready": true,
  "fallback_ready": true
}
```

### Check Frontend Loading:
```
http://localhost:5173
```

Expected: React app loads, no console errors

---

## 🎓 UNDERSTANDING THE DATA

### Confidence Score:
- **85.3%** = Model is 85.3% sure it's a disease
- Higher = More reliable
- Boxes color by confidence:
  - 🔴 Red >80% (high confidence)
  - 🟠 Orange 60-80% (medium)
  - 🟢 Green <60% (low)

### Area Percentage:
- **8.1%** = Disease covers 8.1% of image
- Larger % = More affected crop

### FPS:
- Canvas FPS (~58): How smooth the video plays
- Detected frames: How many had detections
- Active: Boxes currently visible

---

## ⚠️ TROUBLESHOOTING

### "Cannot connect to localhost:5000"
→ Check if backend terminal shows "Running on http://127.0.0.1:5000"

### "Camera access denied"
→ Check browser settings: Allow camera for localhost:5173

### "No boxes appearing"
→ Ensure you're pointing at actual crop/leaf (not just empty space)

### "Very slow / laggy"
→ Close other apps; YOLO runs on CPU (takes 300-400ms per frame)

---

## 📱 MOBILE TESTING

To test on mobile device on same network:

1. Get PC IP: `ipconfig` → IPv4 Address (e.g., 192.168.1.100)
2. On mobile: Open `http://192.168.1.100:5173`
3. Select rear camera
4. Point at crop

---

## 🎬 DEMO VIDEO SCRIPT

**30 seconds demo**:
1. Open app → "Start Camera" (5s)
2. Point at leaf → Wait for detection (10s)
3. Move camera around → See boxes track (8s)
4. Download report (5s)

---

## 📞 NEED HELP?

Check these files:
- **General questions**: `START_HERE.md`
- **API details**: `API_DOCUMENTATION.md`
- **Architecture**: `TECHNICAL_ARCHITECTURE.md`
- **Full integration**: `YOLO_INTEGRATION_COMPLETE.md`
- **Deployment**: `LIVE_DEPLOYMENT_GUIDE.md`

---

## 🎉 YOU'RE ALL SET!

Everything is ready. Just:
1. Open http://localhost:5173
2. Click "Start Camera"
3. Point at crop
4. Enjoy live disease detection! 🌾
