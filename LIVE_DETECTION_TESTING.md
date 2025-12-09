# 🎥 Live Detection Testing Guide

**Status**: ✅ **SYSTEM READY FOR TESTING**  
**Backend**: ✅ Running on http://localhost:5000  
**Frontend**: ✅ Running on http://localhost:5173  
**Fixes Applied**: 
- ✅ Fixed API response parsing (x1, y1, x2, y2 normalized coordinates)
- ✅ Improved canvas drawing with better box rendering
- ✅ Enhanced label display (Disease name + Confidence % + Area %)
- ✅ Added corner markers and shadow effects

---

## 🎬 QUICK START TO TEST LIVE DETECTION

### Step 1: Open the Application
1. Open your browser
2. Navigate to: **http://localhost:5173**
3. You should see the AgroVision AI interface

### Step 2: Navigate to Live Camera
- Click on **"Farmer Portal"** in the top navigation
- Or click on the **"🎥 Live Crop Disease Detection"** card if visible

### Step 3: Start Camera
1. Click the **"🎬 Start Camera"** button
2. **Allow camera permission** when prompted by browser
3. Wait 2-3 seconds for camera to initialize

### Step 4: Position Your Camera
- Point your webcam at:
  - A real crop leaf (if available)
  - A printed image of affected crop
  - Your hand (for testing)
  - Anything with texture/colors

### Step 5: Watch for Detection
- **Wait 1-2 seconds** after positioning for first detection
- **Red bounding box** should appear around detected disease
- **Disease name + confidence %** should display above the box

---

## 📊 WHAT YOU SHOULD SEE

### Visual Layout:
```
┌─────────────────────────────────────────────────────────┐
│ AgroVision AI - Live Camera                    🔴 LIVE  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Video Stream with Overlays:                     │  │
│   │  ┌─ Blast 93.5% · 8.2%                          │  │
│   │  │ ┌───────────────────────────┐                │  │
│   │  │ │ [Red Bounding Box]        │                │  │
│   │  │ │ (Disease affected area)   │                │  │
│   │  │ └───────────────────────────┘                │  │
│   │  │                                               │  │
│   │  │ 🎬 LIVE - FPS: 58                           │  │
│   │  │ 📊 Frames: 16/45                             │  │
│   │  │ 🎯 Detections: 1                             │  │
│   │  └──────────────────────────────────────────────┘  │
│                                                          │
│ FPS: 58        Detected Frames: 16      Total: 1      │
│                                                          │
│ 🚨 Current Detections:                                 │
│ • Black Rust - 93.5% confidence, 8.2% area            │
│                                                          │
│ [🎬 Start Camera] [📥 Download Report]                │
└─────────────────────────────────────────────────────────┘
```

### Box Color Meanings:
| Confidence | Color | Meaning |
|-----------|-------|---------|
| > 80% | 🔴 Red | **High certainty** disease detected |
| 60-80% | 🟠 Orange | **Medium certainty** possible disease |
| < 60% | 🟢 Green | **Low certainty** uncertain detection |

### Label Format:
```
Disease Name + Confidence % + Area %
    ↓              ↓              ↓
Black Rust    93.5%              8.2%
```

---

## 🔍 DATA FLOW EXPLANATION

### What Happens When You Start Camera:

```
1. Browser Request Camera Access
   ↓
2. getUserMedia() captures video stream
   ↓
3. Video displayed on canvas (60 FPS)
   ↓
4. Every 1 second, frame is captured and sent to backend
   ↓
5. Backend processes with YOLO model
   ↓
6. Returns detections (class, confidence, bbox coordinates)
   ↓
7. Frontend draws boxes on canvas
   ↓
8. Labels display with disease name + stats
   ↓
9. Detection stored in memory for report
```

---

## 📡 API RESPONSE FORMAT

### Backend Response Example:
```json
{
  "success": true,
  "detections": [
    {
      "class": "Black Rust",
      "conf": 93.5,
      "x1": 0.15,
      "y1": 0.20,
      "x2": 0.45,
      "y2": 0.50
    }
  ],
  "count": 1
}
```

**Coordinate Format**: Normalized (0-1 range)
- `x1, y1`: Top-left corner as fraction of frame width/height
- `x2, y2`: Bottom-right corner as fraction of frame width/height

### Frontend Parsing:
```typescript
const boxes = detections.map(det => ({
  class: det.class,           // "Black Rust"
  conf: det.conf,              // 93.5 (already in %)
  x: det.x1,                   // 0.15
  y: det.y1,                   // 0.20
  w: det.x2 - det.x1,          // 0.30
  h: det.y2 - det.y1,          // 0.30
  percent: width * height * 100 // 9.0%
}));
```

---

## 🎯 TESTING SCENARIOS

### Test 1: Static Object Detection ✅
**Goal**: Verify bounding boxes appear for static objects

1. Start camera
2. Point at an object (hand, leaf, etc.)
3. **Expected**: Box appears within 1-2 seconds with label
4. **If working**: See "Disease name X.X% · Y.Y%" above red box

### Test 2: Multiple Objects ✅
**Goal**: Detect multiple diseases in frame

1. Show multiple affected areas to camera
2. **Expected**: Multiple boxes with different labels
3. **If working**: Each disease shown separately

### Test 3: Confidence Variation ✅
**Goal**: Verify color changes with confidence

1. Move object closer/farther from camera
2. **Expected**: Color changes from green → orange → red
3. **If working**: See confidence % increase/decrease in label

### Test 4: FPS Counter ✅
**Goal**: Verify rendering performance

1. Watch FPS counter in bottom-left
2. **Expected**: Should show 50-60 FPS
3. **If working**: Counter updates every second

### Test 5: Detection Counter ✅
**Goal**: Track number of detections

1. Run for 10+ seconds with object in view
2. **Expected**: "Detected Frames" counter increases
3. **If working**: Shows X/Y (X detected, Y total processed)

### Test 6: Report Generation ✅
**Goal**: Export detection results

1. Run detection for 10+ seconds
2. Click "📥 Download Report"
3. **Expected**: Text file downloads with summary
4. **If working**: Contains disease stats and timestamps

---

## 🐛 TROUBLESHOOTING

### Issue: No Bounding Boxes Appearing
**Possible Causes**:
1. ❌ Backend not detecting objects
   - Solution: Check backend logs for errors
   
2. ❌ Canvas not rendering
   - Solution: Open DevTools (F12) → Console tab
   - Look for JavaScript errors
   
3. ❌ API not responding
   - Solution: 
   ```powershell
   # Check backend is running
   netstat -ano | Select-String "5000"
   ```

**Debug Steps**:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for messages like:
   - `📦 API Response: [...]` = Data received
   - `❌ Detection error: ...` = API failed
4. Check **Network** tab:
   - Look for `/stream/detect` requests
   - Should see responses with "success": true

### Issue: FPS is Very Low (< 20)
**Possible Causes**:
1. Low CPU performance
2. Resolution too high
3. Browser rendering issue

**Solutions**:
1. Reduce camera resolution (check constraints in code)
2. Close other applications
3. Try different browser (Chrome vs Firefox)

### Issue: Camera Permission Denied
**Solutions**:
1. Check browser permissions:
   - Chrome: Settings → Privacy → Site Settings → Camera
   - Firefox: Preferences → Privacy → Permissions → Camera
2. Restart browser
3. Try incognito/private mode

### Issue: Backend Crashes After Few Seconds
**Possible Causes**:
1. Out of memory
2. Model loading issue
3. GPU memory exhausted

**Solutions**:
1. Check backend logs:
   ```powershell
   # Terminal where backend is running
   # Look for error messages
   ```
2. Restart backend:
   ```powershell
   # Stop current backend (Ctrl+C)
   # Restart:
   $env:USE_YOLO='1'
   python backend/app.py
   ```

---

## 📝 DEBUGGING CHECKLIST

Before declaring an issue:

- [ ] Is frontend running? (Check http://localhost:5173)
- [ ] Is backend running? (Check http://localhost:5000/health)
- [ ] Did you allow camera permission?
- [ ] Is camera working elsewhere? (Windows Camera app)
- [ ] Any errors in DevTools Console (F12)?
- [ ] Are both terminal windows showing output?
- [ ] Did you wait 2+ seconds after starting camera?

---

## 🔗 USEFUL LINKS

- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Docs**: http://localhost:5000 (root path)

---

## 📊 KEY METRICS TO TRACK

| Metric | Expected Value | Unit |
|--------|---|---|
| **Canvas FPS** | 50-60 | fps |
| **Detection Frequency** | 1 | fps |
| **API Response Time** | 200-500 | ms |
| **Model Inference Time** | 300-800 | ms |
| **Memory Usage** | 300-600 | MB |
| **CPU Usage** | 25-40 | % |

---

## ✨ FEATURES TO TEST

- [x] Live camera stream displays
- [x] Bounding boxes appear for objects
- [x] Disease names display in labels
- [x] Confidence percentages show
- [x] Area percentages calculate
- [x] Color coding works (red/orange/green)
- [x] FPS counter shows rendering speed
- [x] Detection counter tracks frames
- [x] Multiple detections visible
- [x] Statistics update in real-time
- [x] Reports can be downloaded

---

## 🎯 EXPECTED BEHAVIOR

### When Everything Works:
1. ✅ Camera stream visible immediately
2. ✅ Red bounding box appears within 1-2 seconds
3. ✅ Label shows: "Disease_Name 93.5% · 8.2%"
4. ✅ FPS shows 50-60 in corner
5. ✅ Detection counter increments
6. ✅ Report downloads when clicked

### Sign of Issues:
1. ❌ Black screen (camera not starting)
2. ❌ No boxes appearing (detection not working)
3. ❌ JavaScript errors in console (code error)
4. ❌ FPS < 20 (performance issue)
5. ❌ API calls failing (backend issue)

---

## 📞 NEXT STEPS

1. **Open App**: http://localhost:5173
2. **Go to Farmer Portal** → **Live Camera**
3. **Click "🎬 Start Camera"**
4. **Allow Camera Permission**
5. **Point at Object**
6. **Watch for Detection!** 🎉

---

**System Status**: ✅ Ready for Testing  
**Last Updated**: December 7, 2025  
**Version**: 2.0
