# 🎯 QUICK REFERENCE CARD

## ✅ EVERYTHING IS RUNNING

```
BACKEND  → http://localhost:5000  ✓
FRONTEND → http://localhost:5175  ✓
YOLO     → Configured & Ready     ✓
```

---

## 🚀 START HERE

### Open Application
```
👉 http://localhost:5175
```

### Available Features
1. **📤 Upload Image** - Get instant disease analysis
2. **📹 Your Camera** - Real-time detection
3. **🎥 RTSP/Video** - Process video streams
4. **🛸 Drone** - Aerial analysis
5. **📊 Dashboard** - Statistics

---

## 🔧 COMMANDS

### Stop Everything
```powershell
Get-Process python | Stop-Process -Force
Get-Process node | Stop-Process -Force
```

### Restart Backend
```powershell
cd D:\Programfiles_Company\Agrofrontback2\backend
python run_app_test.py
```

### Restart Frontend
```powershell
cd D:\Programfiles_Company\Agrofrontback2\Frontend
npm run dev
```

### Enable YOLO (Advanced)
```powershell
$env:USE_YOLO='1'
python run_app_yolo.py
```

---

## 📊 URLS

| Component | URL | Port |
|-----------|-----|------|
| Application | http://localhost:5175 | 5175 |
| API | http://localhost:5000 | 5000 |
| API Health | http://localhost:5000/ | 5000 |

---

## 🐛 DEBUG

### Browser Console
```
Press F12 → Console tab → Look for logs
```

### Backend Logs
```
Check terminal running Flask
POST requests appear here
```

### API Test
```
curl http://localhost:5000/
```

---

## 📁 KEY FILES

- `Frontend/src/components/LiveCameraPredictor.tsx` - Camera feature
- `backend/run_app_test.py` - Backend server (RUNNING)
- `backend/model/yolo11n.pt` - Your YOLO model
- `README_CAMERA_READY.md` - Getting started guide

---

## 📖 DOCUMENTATION

| Doc | Purpose |
|-----|---------|
| `README_CAMERA_READY.md` | Quick start |
| `CAMERA_TESTING_GUIDE.md` | Full guide |
| `PROJECT_RUNNING.md` | Current status |
| `FULL_PROJECT_STATUS.md` | Complete info |

---

## ✨ WHAT WORKS

✅ Image upload + detection  
✅ Live camera + overlays  
✅ Real-time bounding boxes  
✅ Medicine recommendations  
✅ Report generation  
✅ Debug logging  
✅ API endpoints  

---

## 🎉 YOU'RE READY

**Status**: 🟢 ALL SYSTEMS GO  
**Next**: Open http://localhost:5175  

---
