# 🎥 Live Camera Disease Detection - Feature Guide

## 📋 Overview

A brand new real-time disease detection feature has been integrated into the Farmer Portal that allows users to:

1. ✅ Use their **laptop/desktop camera** or **mobile camera**
2. ✅ Perform **real-time disease detection** on visible plants
3. ✅ See **bounding boxes** with disease names and confidence levels
4. ✅ Generate a **comprehensive report** with:
   - Total detections
   - Disease frequency
   - Average confidence scores
   - Detection timeline
   - CSV export capability

---

## 🚀 How to Use the Live Camera Feature

### Step 1: Access the Farmer Portal
1. Open `http://localhost:5173` in your browser
2. Click **"Farmer Portal"** in the navigation menu

### Step 2: Switch to Live Camera Tab
- Look for the **"Live Stream Disease Detection"** card on the right side
- Click the **"Your Camera"** tab (camera icon)

### Step 3: Select Device Type
Two options are available:
- **Laptop/Desktop Camera** - Uses your built-in webcam
- **Mobile Camera** - Uses your phone's rear camera

Click the appropriate button to start the camera.

### Step 4: Watch Real-Time Detection
- The camera feed will appear with live video
- Disease detection happens **every 1 second**
- When a disease is detected:
  - A **yellow/red bounding box** appears around the area
  - **Disease name** and **confidence %** are displayed
  - Detection is recorded in the report

### Step 5: End Stream & Get Report
- Click **"End Stream & Report"** button to stop the camera
- A comprehensive report will be generated automatically

---

## 📊 Report Features

### Summary Statistics
- **Total Detections** - Total number of disease detections during stream
- **Unique Diseases Found** - Number of different disease types detected
- **Stream Duration** - How long the camera was active (in seconds)

### Disease Frequency
Shows how many times each disease was detected:
```
Black Rust: 5x
Powdery Mildew: 3x
Yellow Rust: 2x
```

### Average Confidence
Shows the average confidence level for each detected disease:
```
Black Rust: 87.3%
Powdery Mildew: 92.1%
Yellow Rust: 78.5%
```

### Detection Timeline
Shows the last 10 detections with:
- Disease name
- Confidence percentage (color-coded)
- Timestamp

Confidence colors:
- 🔴 **Red** (>80%) - High confidence
- 🟡 **Orange** (60-80%) - Medium confidence
- 🟢 **Green** (<60%) - Low confidence

### Export Report
- Click **"Download Report"** to export as CSV
- File includes: Disease, Confidence, Time
- Useful for record-keeping and analysis

---

## 🎯 Technical Details

### Video Processing
- **Frame capture rate**: 1 frame per second
- **Resolution**: Up to 640x480 (automatically optimized)
- **Video format**: H.264 (browser-native)
- **Processing mode**: Non-blocking (UI remains responsive)

### Disease Detection
- **Model**: TensorFlow Lite (same as image upload)
- **Supported diseases**: All 15 crop diseases
- **Detection method**: Frame-by-frame analysis
- **Backend**: Flask API `/predict` endpoint

### Bounding Box Visualization
- **Box color**: Yellow (low confidence) → Red (high confidence)
- **Text label**: "Disease Name XX.X%"
- **Position**: Centered on the detected area (frame-based)
- **Overlay**: Real-time canvas rendering

---

## 📱 Device-Specific Usage

### Laptop/Desktop
1. Click **"Laptop/Desktop Camera"**
2. Grant camera permission in browser
3. Position plants in front of camera
4. Camera uses front-facing lens (usual webcam)

### Mobile Phone
1. Click **"Mobile Camera"**
2. Grant camera permission in browser
3. Hold phone over crops
4. Camera uses rear-facing lens (better for field use)
5. Portrait or landscape orientation both work

---

## 🎨 UI Components

### Camera Tab Interface
```
┌─ Your Camera Tab ──────────────────┐
│ [Laptop Camera] [Mobile Camera]    │
│                                    │
│ ┌──── Video Canvas ───────────────┐│
│ │                                  ││
│ │ Camera Feed with              ┌──┤ Detections: 5
│ │ Bounding Boxes               │├─┤ Processing...
│ │                                  ││
│ └──────────────────────────────────┘│
│                                    │
│ [Stop Camera] [End Stream & Report]│
└────────────────────────────────────┘

Detection Stats Card:
┌─ Real-time Detections ──┐
│ Total Detections: 12    │
│ Unique Diseases: 3      │
└─────────────────────────┘
```

### Report Display
```
Summary Stats:
[Total Detections: 12] [Unique: 3] [Duration: 45s]

Disease Frequency:
Black Rust: 5x
Powdery Mildew: 4x
Yellow Rust: 3x

Average Confidence:
Black Rust: 88.2%
Powdery Mildew: 91.5%
Yellow Rust: 79.8%

Timeline (Last 10):
1. Black Rust       87.3%  14:23:15
2. Black Rust       88.9%  14:23:14
... (more entries)
```

---

## 🔧 Camera Permissions

### First Time Setup
When you click "Start Camera" for the first time:
1. Browser will ask for **camera permission**
2. Click **"Allow"** to grant access
3. Camera will start immediately

### Permission Issues
If camera doesn't start:

**Firefox/Chrome/Edge:**
- Check browser permissions
- Go to Settings → Privacy & Security
- Verify camera is enabled for this site
- Refresh page and try again

**Mobile Browser:**
- App permissions must be enabled
- Go to Phone Settings → Apps → Browser
- Enable camera permission
- Try again

---

## 📈 Use Cases

### 1. Field Scouting
- Walk through field with phone
- Scan multiple areas for disease hotspots
- Generate report for spatial analysis

### 2. Early Detection
- Use webcam to monitor greenhouse crops
- Catch diseases early
- Track disease progression over time

### 3. Area Assessment
- Quick visual scan of entire field
- Identify disease distribution
- Prioritize treatment areas

### 4. Documentation
- Download report as evidence
- Share with agricultural experts
- Track disease history

### 5. Precision Agriculture
- Map disease-affected zones
- Plan targeted spraying routes
- Optimize pesticide use

---

## ⚙️ Configuration

### Backend Integration
- Endpoint: `http://localhost:5000/predict`
- Method: POST with image/jpeg
- Response: JSON with disease, confidence, medicines, etc.

### Frontend Settings
- Capture interval: 1 second (adjustable in code)
- Max detections stored: 50 (prevents memory issues)
- Canvas resolution: Matches video dimensions
- Default device: Laptop camera

### Confidence Thresholds
- High risk (red): > 80%
- Medium risk (yellow): 60-80%
- Low risk (green): < 60%

---

## 🐛 Troubleshooting

### Camera Won't Start
1. **Check permissions**: Ensure camera permission is granted
2. **Check privacy settings**: Some browsers block camera by default
3. **Try different browser**: Chromium browsers work best
4. **Mobile issue**: Ensure HTTPS (required for mobile camera access)

### No Detections Appearing
1. **Check backend**: Ensure Flask backend is running
2. **Check console**: Press F12 → Console tab → Look for errors
3. **Verify endpoint**: Test `/predict` endpoint manually
4. **Check image quality**: Ensure plants are clearly visible

### Bounding Boxes Misaligned
1. **Video dimensions**: Canvas size is auto-adjusted
2. **Browser zoom**: Set zoom to 100% for accuracy
3. **Device rotation**: Phone may need to be held in specific orientation

### Browser Freezes
1. **Close other tabs**: Reduce system load
2. **Clear browser cache**: F12 → Storage → Clear All
3. **Restart browser**: Close and reopen
4. **Use different browser**: Try Chrome/Firefox

---

## 📊 Data Storage

### Detection Data
- Stored in browser memory (not persisted)
- Lost when page is refreshed
- Max 50 detections kept to prevent lag

### Report Export
- CSV format: Disease, Confidence, Time
- Filename: `camera-report-TIMESTAMP.csv`
- No data sent to server for export

### Privacy
- No images are stored
- No recordings are saved
- All processing is real-time only
- Export is local (no cloud sync)

---

## 🎓 Best Practices

1. **Lighting**: Ensure good lighting for better detection
2. **Distance**: Keep camera 30-50cm from plants
3. **Angle**: Show plant from side or top angle
4. **Movement**: Slow, steady movements for consistency
5. **Multiple angles**: Scan different parts of crop
6. **Follow-up**: Verify detections with image upload feature

---

## 📱 Supported Devices

| Device | Tested | Notes |
|--------|--------|-------|
| Windows Webcam | ✅ | Works great |
| Mac Webcam | ✅ | Works great |
| Linux Webcam | ✅ | Works great |
| iPhone Camera | ✅ | Use Safari/Chrome |
| Android Camera | ✅ | Use Chrome/Firefox |
| iPad Camera | ✅ | Works great |
| USB Webcam | ✅ | External cameras OK |

---

## 🔄 Workflow Example

```
1. Start Farmer Portal
   ↓
2. Click "Your Camera" tab
   ↓
3. Select "Mobile Camera" (or "Laptop")
   ↓
4. Allow camera permission
   ↓
5. Point camera at crop field
   ↓
6. Camera captures frames every 1 second
   ↓
7. Each frame is sent to backend for analysis
   ↓
8. Bounding boxes appear with disease names
   ↓
9. Detection continues (adjustable)
   ↓
10. Click "End Stream & Report"
    ↓
11. Report shows all detections and statistics
    ↓
12. Download as CSV or start new stream
```

---

## 📞 Support

If you encounter issues:

1. **Check console**: F12 → Console → Screenshot errors
2. **Verify backend**: http://localhost:5000 should respond
3. **Test image upload**: Verify basic ML model works first
4. **Check permissions**: Browser camera settings
5. **Restart services**: Kill and restart backend/frontend

---

## 🎉 Features Summary

✅ Real-time camera feed from any device
✅ Live disease detection per frame
✅ Visual bounding boxes with labels
✅ Confidence percentage display
✅ Comprehensive detection report
✅ Disease frequency analysis
✅ Confidence score tracking
✅ Detection timeline view
✅ CSV export for record-keeping
✅ Mobile-friendly interface
✅ Privacy-focused (local processing only)

---

**Last Updated**: December 5, 2025
**Feature Status**: ✅ Complete & Ready
**Supported Devices**: Laptop, Desktop, Mobile (Phone/Tablet)
