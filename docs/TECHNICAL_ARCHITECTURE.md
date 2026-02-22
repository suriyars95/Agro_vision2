# AgroVision AI - Technical Architecture & System Design

## Executive Summary

**AgroVision AI** is an end-to-end AI-powered agricultural disease detection platform designed for real-time crop health monitoring. The system leverages computer vision (YOLO object detection), React-based UI, and Flask REST APIs to enable farmers and agricultural professionals to detect crop diseases from laptop cameras, mobile devices, and drone/RTSP feeds with minimal latency.

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgroVision AI Platform                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────┐          ┌──────────────────────────┐  │
│  │  Frontend (React+Vite)  │◄────────►│  Backend (Flask API)     │  │
│  │  - Live Camera UI       │          │  - YOLO Detector         │  │
│  │  - Image Upload         │          │  - Stream Processing     │  │
│  │  - Real-time Overlays   │          │  - Disease Classification│  │
│  │  - Report Generation    │          │  - RTSP/Video Handler    │  │
│  └─────────────────────────┘          └──────────────────────────┘  │
│           ▲                                        │                 │
│           │                                        ▼                 │
│           │                            ┌──────────────────────────┐  │
│           └────────────────────────────►│  ML Models               │  │
│                                         │  - YOLOv8/11 (Detection)│  │
│                                         │  - TensorFlow (Fallback)│  │
│                                         │  - Disease Labels CSV   │  │
│                                         └──────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite | UI/UX, real-time rendering |
| **Backend** | Flask, Python 3.6+, Gunicorn/Waitress | REST API, request handling |
| **ML/CV** | YOLOv8/v11, Ultralytics, OpenCV, PyTorch | Object detection, disease localization |
| **Data Processing** | NumPy, Pillow, TensorFlow (optional) | Image manipulation, inference |
| **Deployment** | Docker, Vercel (backend), Vite (frontend) | Containerization, cloud hosting |

---

## 2. Backend Architecture

### 2.1 Core Components

#### **A. Flask Application (`app.py`)**
- **Role**: REST API server orchestrating all requests
- **Port**: `5000` (default)
- **Key Endpoints**:

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/` | GET | Health check | — | `{status, yolo_enabled, endpoints}` |
| `/predict` | POST | Single image disease detection | `file (image)` | `{disease, confidence, boxes, medicines}` |
| `/stream/info` | POST | Get video stream properties | `{source}` | `{fps, width, height, frame_count}` |
| `/stream/detect` | POST | Process video stream (JSONL stream) | `{source, max_frames, conf_thresh}` | `JSONL: {frame_num, detections}` |

**CORS Support**: All endpoints support cross-origin requests from frontend (http://localhost:5175).

#### **B. YOLO Detector Module (`yolo_detector.py`)**
- **Purpose**: Wrapper around Ultralytics YOLO for object detection
- **Model Loading Strategy** (priority order):
  1. Environment variable: `YOLO_MODEL_PATH`
  2. `backend/Models/` — user's custom models
  3. `backend/model/` — default location
  4. `Models/` or `model/` (root-level fallback)
  5. Ultralytics auto-download: `yolov8n.pt` (COCO model)

**Key Function**: `detect(image_path, conf_thresh=0.25) → List[Dict]`
- **Input**: Image file path, confidence threshold (0–1)
- **Output**: List of detections with:
  ```json
  {
    "class": "Aphid",           // disease/object name from model
    "conf": 0.92,              // confidence (0–1 range)
    "x": 0.15,                 // normalized bbox x (0–1)
    "y": 0.25,                 // normalized bbox y (0–1)
    "w": 0.6,                  // normalized bbox width
    "h": 0.5,                  // normalized bbox height
    "percent": 18.5            // area coverage % (w*h*100)
  }
  ```

**Normalization**: All coordinates are normalized (0–1) relative to image dimensions for device-independent rendering.

#### **C. Stream Handler (`stream_handler.py`)**
- **Purpose**: Process live video streams (USB camera, RTSP, file video)
- **Class**: `StreamDetector(use_yolo: bool)`
- **Key Methods**:

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `process_frame()` | `frame (np.ndarray)` | `{boxes, frame_shape, detections_count}` | Detect diseases in single frame |
| `process_stream()` | `source, max_frames, conf_thresh` | Generator of `{frame_num, detections}` | Stream frame-by-frame detections |
| `get_video_properties()` | `source` | `{fps, width, height, frame_count}` | Retrieve stream metadata |

**Source Types Supported**:
- **Camera**: Integer `0`, `1`, `2` (system camera indices)
- **File**: Path like `/path/to/video.mp4`
- **RTSP**: URL like `rtsp://example.com/stream` (drone feeds)

#### **D. Image Classifier (`predict.py` / `predict_fallback.py`)**
- **Main** (`predict.py`): TensorFlow/Keras classifier for image classification
  - Model: `model/model_new.tflite` (TFLite format)
  - Input: 255×255 RGB image
  - Output: Disease label + confidence (0–100%)
  - 15 disease classes (Aphid, Black Rust, Blast, Brown Rust, etc.)

- **Fallback** (`predict_fallback.py`): Mock predictor used when TensorFlow is unavailable
  - Returns random disease with confidence in specified range
  - Used for testing/demo without full ML stack

**Disease Mapping** (from `predict.py`):
```python
labels = {
    0: 'Aphid', 1: 'Black Rust', 2: 'Blast', 3: 'Brown Rust', 
    4: 'Common Root Rot', 5: 'Fusarium Head Blight', 6: 'Healthy',
    7: 'Leaf Blight', 8: 'Mildew', 9: 'Mite', 10: 'Septoria',
    11: 'Smut', 12: 'Stem fly', 13: 'Tan spot', 14: 'Yellow Rust'
}
```

### 2.2 Request/Response Flow

**Example: `/predict` Endpoint Flow**

```
1. Frontend sends: POST /predict
   ├─ File: frame.jpg (from canvas or upload)
   └─ CORS headers: Origin: http://localhost:5175

2. Backend (app.py):
   ├─ Validates file (PNG/JPG/WEBP, <5MB)
   ├─ Saves to uploads/
   └─ Calls YOLO detector OR classifier

3. Detection Module:
   ├─ Loads model (if not cached)
   ├─ Runs inference on image
   ├─ Normalizes boxes (coordinates to 0–1)
   └─ Returns list of detections + percent area

4. Backend formats response:
   {
     "fileReceived": true,
     "disease": "Aphid",           // top-confidence detection
     "confidence": 92.3,           // in percent (0–100)
     "description": "...",         // disease info
     "treatment": "...",           // recommended treatment
     "medicines": [...],           // suggested products
     "boxes": [                    // all detections
       {
         "class": "Aphid",
         "conf": 92.3,             // confidence in percent
         "x": 0.1, "y": 0.2,
         "w": 0.8, "h": 0.6,
         "percent": 48.0           // bbox area % of image
       }
     ]
   }

5. Frontend renders:
   ├─ Converts normalized coords to pixel coords
   ├─ Draws bounding boxes on canvas
   ├─ Overlays label: "Aphid 92.3% · 48.0%"
   └─ Updates stats panel
```

### 2.3 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `USE_YOLO` | `0` | Enable YOLO (`1`) or use classifier (`0`) |
| `YOLO_MODEL_PATH` | `` | Override model path (if set, checked first) |
| `FLASK_ENV` | `production` | Flask environment mode |

**Startup Example**:
```bash
# Enable YOLO detection
$env:USE_YOLO='1'; python app.py

# Use custom model
$env:YOLO_MODEL_PATH='D:\models\custom_yolo11.pt'; $env:USE_YOLO='1'; python app.py

# Fallback to classifier
$env:USE_YOLO='0'; python app.py
```

---

## 3. Frontend Architecture

### 3.1 Project Structure

```
Frontend/
├── src/
│   ├── main.tsx                    # Vite entry point
│   ├── App.tsx                     # Root router component
│   ├── pages/
│   │   ├── Dashboard.tsx           # Analytics dashboard
│   │   ├── FarmerPortal.tsx        # Main feature hub
│   │   ├── Index.tsx               # Home page
│   │   └── NotFound.tsx            # 404 page
│   │
│   ├── components/
│   │   ├── LiveCameraPredictor.tsx  # ⭐ Live camera streaming + overlay
│   │   ├── StreamDetector.tsx       # Video stream processing UI
│   │   ├── Navbar.tsx              # Navigation bar
│   │   ├── Footer.tsx              # Footer
│   │   ├── FeatureCard.tsx         # Reusable feature card
│   │   ├── StatCard.tsx            # Stat display card
│   │   └── ui/                     # shadcn/ui components (100+ pre-built)
│   │       ├── button.tsx, card.tsx, dialog.tsx, etc.
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx          # Detect mobile device
│   │   └── use-toast.ts            # Toast notifications (Sonner)
│   │
│   ├── lib/
│   │   └── utils.ts                # Utility functions
│   │
│   ├── App.css                     # Global styles
│   └── index.css                   # Tailwind base styles
│
├── index.html                      # HTML entry (favicon link here)
├── vite.config.ts                  # Vite build config
├── tsconfig.json                   # TypeScript config
├── tailwind.config.ts              # Tailwind theme
├── postcss.config.js               # PostCSS plugins
├── eslint.config.js                # Linting rules
└── package.json                    # Dependencies
```

### 3.2 Key Components Deep Dive

#### **A. LiveCameraPredictor.tsx** (Core Component)
- **Purpose**: Real-time camera streaming with YOLO overlay
- **Architecture**:

```
User clicks "Start Camera"
    ↓
requestAnimationFrame loop (60 FPS video render)
    ├─ Reads frame from <video> element
    ├─ Draws frame to display canvas
    ├─ Overlays bounding boxes from detections[]
    └─ Continues loop

Parallel: Detection loop (1 Hz / every 1 second)
    ├─ Captures canvas as JPEG (85% quality)
    ├─ Sends to POST /predict
    ├─ Receives {boxes, disease, confidence}
    ├─ Converts normalized boxes → pixel coordinates
    └─ Updates detections[] state

When box renders:
    ├─ Color: Red if conf > 80%, Yellow otherwise
    ├─ Label: "{disease} {conf}% · {percent_area}%"
    └─ Example: "Aphid 92.3% · 48.0%"
```

**Key Interfaces**:
```typescript
interface Detection {
  disease: string;           // disease name
  confidence: number;        // 0–100 (%)
  x: number;                // pixel x coordinate
  y: number;                // pixel y coordinate
  width: number;            // pixel width
  height: number;           // pixel height
  percent?: number;         // bbox area % (optional, from API)
  timestamp: number;        // frame capture time
}

interface DiseaseReport {
  totalDetections: number;
  uniqueDiseases: string[];
  diseaseFrequency: Record<string, number>;
  averageConfidence: Record<string, number>;
  detectionTimeline: Detection[];
  duration: number;         // stream duration (seconds)
}
```

**Canvas Rendering Logic**:
```typescript
drawDetections(ctx, canvasWidth, canvasHeight) {
  detections.forEach(detection => {
    // Draw red/yellow box
    ctx.strokeStyle = detection.confidence > 80 ? "#ef4444" : "#eab308";
    ctx.lineWidth = 4;
    ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

    // Draw label with disease name + confidence + area%
    const percentArea = detection.percent !== undefined ? ` · ${detection.percent.toFixed(1)}%` : '';
    const labelText = `${detection.disease} ${detection.confidence.toFixed(1)}%${percentArea}`;
    
    // Render label background & text
    ctx.fillStyle = detection.confidence > 80 ? "#ef4444" : "#eab308";
    ctx.fillRect(detection.x, detection.y - 35, textWidth + 15, 30);
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px Arial";
    ctx.fillText(labelText, detection.x + 7, detection.y - 12);
  });
}
```

**Device Support**:
- **Laptop/Desktop**: `facingMode: "user"` (front camera)
- **Mobile**: `facingMode: {ideal: "environment"}` (rear camera)
- Automatic resolution negotiation (ideal: 1280×720)

#### **B. StreamDetector.tsx** (Advanced Stream Processing)
- **Purpose**: Process longer video files or RTSP feeds frame-by-frame
- **Input**: Stream source (camera index `0`, file path, or RTSP URL)
- **Output**: JSONL stream (JSON lines) of detections per frame
- **Use Case**: Batch processing, drone footage analysis

#### **C. FarmerPortal.tsx** (Hub)
- **Purpose**: Main entry point for farmers
- **Sections**:
  1. Upload image for disease detection
  2. Live camera feed (LiveCameraPredictor component)
  3. Video/RTSP stream processing (StreamDetector component)
  4. Reports & analytics dashboard

### 3.3 API Client Pattern

```typescript
// Example: How frontend calls /predict
const detectDiseaseInFrame = async (imageData: string, width: number, height: number) => {
  const blob = await fetch(imageData).then(res => res.blob());
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");

  const response = await fetch("http://localhost:5000/predict", {
    method: "POST",
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    // result = { fileReceived, disease, confidence, boxes, ... }
    
    // Convert normalized boxes to pixels
    const detections = result.boxes.map(b => ({
      disease: b.class,
      confidence: b.conf,
      x: b.x * width,
      y: b.y * height,
      width: b.w * width,
      height: b.h * height,
      percent: b.percent
    }));
    
    setDetections(detections);
  }
};
```

### 3.4 Styling & UI Framework

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Accessible, customizable React components
  - Button, Card, Dialog, Alert, Form, Tabs, etc.
- **Sonner**: Toast notification library
- **Custom CSS**: App.css for brand colors & animations
- **Responsive**: Mobile-first, breakpoints at `sm`, `md`, `lg`, `xl`

---

## 4. Data Flow & Integration Points

### 4.1 Complete Request Cycle: Live Camera → Overlay

```
┌─ Frontend ───────────────────────────────────────────────────┐
│                                                               │
│  1. User clicks "Laptop Camera" button                        │
│     → navigator.mediaDevices.getUserMedia({video, audio:0})  │
│     → <video> element receives MediaStream                   │
│                                                               │
│  2. startVideoRenderLoop() begins (requestAnimationFrame)     │
│     Every frame:                                              │
│     → ctx.drawImage(video, 0, 0, w, h)  [draw frame]        │
│     → drawDetections(ctx, w, h)         [overlay boxes]      │
│                                                               │
│  3. startDetectionLoop() begins (setInterval every 1 sec)    │
│     Every 1 second:                                           │
│     → canvas.toDataURL("image/jpeg", 0.85) [encode]         │
│     → POST http://localhost:5000/predict [send]             │
│                                                               │
└─────────────────────────────────────────┬─────────────────────┘
                                          │
                                          │ HTTP POST
                                          ▼
┌─ Backend ─────────────────────────────────────────────────────┐
│                                                               │
│  1. app.py receives POST /predict                            │
│     → validates file (MIME type, size <5MB)                 │
│     → saves to uploads/frame_TIMESTAMP.jpg                  │
│                                                               │
│  2. If USE_YOLO=1:                                           │
│     → yolo_detector.detect(path, conf_thresh=0.25)          │
│        └─ _load_model() [lazy load if needed]               │
│        └─ model.predict(image) → ultralytics.Results        │
│        └─ Extract boxes: xyxy, conf, cls                    │
│        └─ Normalize to 0–1 range                            │
│        └─ Compute percent = (w*h)*100                       │
│        └─ Return [{class, conf (0-1), x, y, w, h, percent}] │
│                                                               │
│  3. Convert YOLO output to API format:                       │
│     → conf *= 100 (convert to percent 0–100)                │
│     → select highest confidence box as top_disease         │
│     → response = {                                          │
│         fileReceived: true,                                 │
│         disease: "Aphid",        # top detection            │
│         confidence: 92.3,        # as percent               │
│         boxes: [...],            # all boxes with percent   │
│         ...                                                  │
│       }                                                      │
│                                                               │
│  4. Send JSON response                                       │
│                                                               │
└─────────────────────────────────────┬──────────────────────────┘
                                      │
                                      │ JSON Response
                                      ▼
┌─ Frontend (continued) ────────────────────────────────────────┐
│                                                               │
│  1. Parse response.json()                                    │
│     result = {                                               │
│       disease: "Aphid",                                      │
│       confidence: 92.3,                                      │
│       boxes: [{class, conf, x, y, w, h, percent}, ...]      │
│     }                                                        │
│                                                               │
│  2. Convert normalized boxes to pixel coordinates:           │
│     detection = {                                            │
│       disease: "Aphid",                                      │
│       confidence: 92.3,                                      │
│       x: 0.1 * 1280 = 128,                                  │
│       y: 0.2 * 720 = 144,                                   │
│       width: 0.8 * 1280 = 1024,                             │
│       height: 0.6 * 720 = 432,                              │
│       percent: 48.0  [from API]                             │
│     }                                                        │
│                                                               │
│  3. Update detections[] state                                │
│     setDetections(prev => [...prev, detection])             │
│                                                               │
│  4. Next frame render:                                       │
│     drawDetections() uses updated detections[]               │
│     → Overlays box with label:                              │
│        "Aphid 92.3% · 48.0%"                                │
│     → Color: Red (conf 92.3 > 80)                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Model Loading Strategy

```
Backend startup ($env:USE_YOLO='1'; python app.py)
    ↓
app.py: USE_YOLO = True
    ↓
from yolo_detector import detect as yolo_detect
    ↓
yolo_detector.py: _load_model() called on first detection
    ↓
Search for model file (in order):
    1. Check env var: os.environ['YOLO_MODEL_PATH']
       └─ If exists and file found → use it
    
    2. Search backend/Models/ for *.pt or *.pth
       └─ If found → use first match
    
    3. Search backend/model/ for *.pt or *.pth
       └─ If found → use first match
    
    4. Search Models/ or model/ (root level)
       └─ If found → use first match
    
    5. Fallback to ultralytics default
       └─ from ultralytics import YOLO
       └─ YOLO('yolov8n.pt')  # auto-download if needed
    ↓
Model cached in _model global variable (lazy initialization)
    ↓
Subsequent calls reuse _model (no reload)
```

---

## 5. Data Structures & Formats

### 5.1 Detection Box Format

**Backend (after normalization)**:
```json
{
  "class": "Aphid",
  "conf": 0.923,
  "x": 0.15,
  "y": 0.25,
  "w": 0.6,
  "h": 0.5,
  "percent": 30.0
}
```

**API Response (/predict)**:
```json
{
  "conf": 92.3,
  "percent": 30.0
}
```

**Frontend (after pixel conversion)**:
```javascript
{
  disease: "Aphid",
  confidence: 92.3,
  x: 192,        // 0.15 * 1280
  y: 180,        // 0.25 * 720
  width: 768,    // 0.6 * 1280
  height: 360,   // 0.5 * 720
  percent: 30.0,
  timestamp: Date.now()
}
```

### 5.2 Stream Response (JSONL Format)

**For `/stream/detect` endpoint**:
```
{"frame_num": 0, "detections": {"boxes": [...], "frame_shape": [720, 1280], "detections_count": 2}}
{"frame_num": 1, "detections": {"boxes": [...], "frame_shape": [720, 1280], "detections_count": 1}}
{"frame_num": 2, "detections": {"boxes": [], "frame_shape": [720, 1280], "detections_count": 0}}
```

Each line is a complete JSON object (JSONL = JSON Lines).

---

## 6. Performance Considerations

### 6.1 Backend Optimization

| Optimization | Implementation |
|--------------|-----------------|
| **Model Caching** | YOLO model loaded once and reused globally (`_model`) |
| **Image Resizing** | Stream frames resized to 640px width if larger (faster inference) |
| **Lazy Loading** | Model only loaded on first detection request |
| **Confidence Thresholding** | Default conf_thresh=0.25 filters low-confidence detections |
| **JPEG Compression** | Frontend compresses frames to 85% quality before sending |
| **Multi-threading** | Flask runs in production mode (Gunicorn/Waitress handles concurrency) |

### 6.2 Frontend Optimization

| Optimization | Implementation |
|--------------|-----------------|
| **requestAnimationFrame** | 60 FPS canvas rendering (native refresh rate) |
| **Throttled Detection** | Detection only 1 Hz (every 1 second), not every frame |
| **Canvas Reuse** | Display canvas reused for both video and overlays |
| **State Batching** | Detections array capped at 30 items (slice(-30)) |
| **Lazy Component Loading** | Routes use React.lazy() for code splitting |
| **Image Encoding** | Canvas toDataURL with JPEG codec (85% quality) |

### 6.3 Inference Speed

**Typical Performance** (YOLO11n on CPU):
- Single image inference: **50–100ms**
- Detection loop frequency: **1 FPS** (1 detection per second)
- Video rendering: **60 FPS** (smooth display)
- Overall latency: **~1 second** from capture to overlay

**Bottlenecks**:
1. YOLO inference (GPU would help significantly)
2. Image upload/download over HTTP
3. Canvas encoding (JPEG compression)

---

## 7. Deployment Architecture

### 7.1 Local Development

```bash
# Terminal 1: Backend
cd backend
$env:USE_YOLO='1'  # Enable YOLO
python app.py      # Runs on http://localhost:5000

# Terminal 2: Frontend
cd Frontend
npm run dev        # Runs on http://localhost:5175 (Vite default)
```

### 7.2 Production Deployment

**Backend (Vercel/Heroku)**:
```
Environment Variables:
  - USE_YOLO: '1'
  - YOLO_MODEL_PATH: (optional, if custom model)
  
Gunicorn startup:
  gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**Frontend (Vercel/Netlify)**:
```
Build command: npm run build
Output directory: dist/
Environment: VITE_API_URL=https://api.example.com
```

### 7.3 Docker Setup

**Dockerfile (Backend)**:
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

---

## 8. Error Handling & Fallback Mechanisms

### 8.1 Backend Fallback Chain

```
USE_YOLO='1'?
    ├─ YES → Try YOLO detection
    │         ├─ Model loads successfully?
    │         │  ├─ YES → Return YOLO boxes
    │         │  └─ NO → Fallback to classifier
    │         └─ Inference fails?
    │            └─ Fallback to classifier
    │
    └─ NO → Use TensorFlow classifier
            ├─ Classifier loads?
            │  ├─ YES → Return classification result
            │  └─ NO → Use mock predictor
            └─ Inference fails?
               └─ Use mock predictor
```

### 8.2 Frontend Error Handling

```typescript
// Try to get camera
navigator.mediaDevices.getUserMedia()
  .catch(error => {
    // Handle permission denied, hardware not found, etc.
    toast.error(`Failed to access camera: ${error.message}`);
  });

// Try to fetch predictions
fetch('/predict')
  .catch(error => {
    console.error('Backend unreachable');
    toast.error('Backend not responding');
  });

// Network timeout
setTimeout(() => {
  if (response not received) {
    setIsProcessing(false);
    toast.error('Request timeout');
  }
}, 30000);
```

---

## 9. Security Considerations

### 9.1 Backend Security

| Feature | Implementation |
|---------|-----------------|
| **File Validation** | MIME type check (PNG/JPG/WEBP), <5MB size limit |
| **Path Traversal Prevention** | `secure_filename()` from Werkzeug |
| **CORS Validation** | Allows localhost:5175 (configurable) |
| **Input Sanitization** | JSON schema validation for stream sources |
| **Temporary Files** | Cleaned up after processing (not persisted) |

### 9.2 Frontend Security

| Feature | Implementation |
|---------|-----------------|
| **HTTPS** | Recommended for production (HTTPS enforced by Vercel) |
| **Content Security Policy** | Restrict script sources to trusted domains |
| **XSS Prevention** | React escapes user inputs automatically |
| **CSRF Protection** | SameSite cookies, no sensitive operations via GET |

---

## 10. Extensibility & Future Roadmap

### 10.1 Adding a New Disease Type

1. **Train/Obtain YOLO Model**:
   - Annotate dataset (bounding boxes + labels)
   - Use YOLOv8 training: `yolo detect train data=dataset.yaml`
   - Export to `.pt` format

2. **Deploy Model**:
   - Place `.pt` file in `backend/Models/` or `backend/model/`
   - Restart backend (auto-detects and loads)

3. **Update Labels** (if using classification):
   - Update `predict.py` labels dictionary
   - Restart backend

### 10.2 Custom Integration Points

- **Replace YOLO**: Modify `yolo_detector.py` to use different model (Faster R-CNN, RetinaNet, etc.)
- **Add Database**: Store detections in PostgreSQL/MongoDB
- **Real-time Alerts**: Integrate Twilio/PushNotifications for high-confidence detections
- **Historical Analytics**: Track disease trends over time
- **Multi-crop Support**: Extend classifier to handle multiple crop types

---

## 11. Troubleshooting Guide

### Backend Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `ModuleNotFoundError: keras` | TensorFlow not installed | `pip install tensorflow keras` |
| `YOLO model not found` | Model not in expected path | Place .pt in `backend/Models/` or set `YOLO_MODEL_PATH` |
| `Port 5000 already in use` | Another service using port | Change port in app.py or kill existing process |
| `CORS error from frontend` | Backend not allowing origin | Check `@app.after_request` CORS headers |

### Frontend Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Camera not working | Permission denied | Grant camera permission in browser settings |
| No detections showing | Backend returning wrong format | Check `/predict` response in browser DevTools Network tab |
| Bounding boxes misaligned | Coordinate conversion error | Verify `x*width`, `y*height` math in LiveCameraPredictor |
| Favicon not updating | Browser cache | Clear cache or do hard refresh (Ctrl+Shift+R) |

---

## 12. Code Examples

### 12.1 Starting Backend with YOLO

```python
# From terminal
$env:USE_YOLO='1'
python D:\Programfiles_Company\Agrofrontback2\backend\app.py

# Or programmatically
import os
import subprocess

os.environ['USE_YOLO'] = '1'
subprocess.Popen(['python', 'backend/app.py'])
```

### 12.2 Calling /predict from Custom Client

```python
import requests
import json

# Send image
with open('test_image.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:5000/predict', files=files)

# Parse response
result = response.json()
print(f"Disease: {result['disease']}")
print(f"Confidence: {result['confidence']}%")
print(f"Detections: {len(result['boxes'])}")

for box in result['boxes']:
    print(f"  - {box['class']}: conf={box['conf']}%, area={box['percent']}%")
```

### 12.3 Canvas Overlay Rendering

```typescript
const canvas = displayCanvasRef.current;
const ctx = canvas.getContext('2d');

// Draw detection box
const detection = detections[0];
ctx.strokeStyle = '#ef4444';  // Red
ctx.lineWidth = 4;
ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

// Draw label
const label = `${detection.disease} ${detection.confidence.toFixed(1)}%${
  detection.percent ? ` · ${detection.percent.toFixed(1)}%` : ''
}`;
ctx.fillStyle = '#ef4444';
ctx.fillRect(detection.x, detection.y - 35, 200, 30);
ctx.fillStyle = '#000';
ctx.font = 'bold 16px Arial';
ctx.fillText(label, detection.x + 7, detection.y - 12);
```

---

## Conclusion

**AgroVision AI** is a production-ready agricultural disease detection platform combining modern web technologies (React, TypeScript) with state-of-the-art computer vision (YOLO) and REST APIs. The architecture prioritizes:

1. **Real-time Performance**: 60 FPS display + 1 FPS detection
2. **Device Agnostic**: Works on laptop, mobile, and drone feeds
3. **Fallback Mechanisms**: Always provides prediction even with missing dependencies
4. **Extensibility**: Easy to swap models or add new features
5. **Scalability**: Backend ready for containerization and cloud deployment

The system is designed for agricultural professionals to quickly identify crop diseases with high accuracy and actionable recommendations for treatment.

---

**Last Updated**: December 6, 2025  
**Version**: 1.0 (Beta)  
**Maintained by**: AgroVision AI Team
