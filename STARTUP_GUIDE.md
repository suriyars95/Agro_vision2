# AgroFront Application - Startup Guide

## Quick Start Options

### Option 1: Start Both Services Together (Recommended for Production)
```powershell
.\start-services.ps1
```
This will start both backend and frontend in separate windows.

---

### Option 2: Start Backend and Frontend Separately (For Development/Debugging)

#### **Step 1: Start Backend in Terminal 1**
```powershell
.\start-backend.ps1
```

**Expected Output**:
```
========================================
Starting AgroFront Backend (Flask)
========================================

Step 1: Setting Up Backend
========================================

Activating virtual environment...
Installing/updating dependencies...
Dependencies installed successfully

========================================
Starting Flask Backend Server
========================================

Backend API: http://localhost:5000

Press Ctrl+C to stop the backend server

 * Serving Flask app 'app'
 * Debug mode: off
 * Running on http://0.0.0.0:5000
```

**Verify Backend is Running**:
- Open `http://localhost:5000` in browser - should see welcome message
- Keep this terminal open

---

#### **Step 2: Start Frontend in Terminal 2 (New PowerShell Window)**
```powershell
.\start-frontend.ps1
```

**Expected Output**:
```
========================================
Starting AgroFront Frontend (React)
========================================

Step 1: Setting Up Frontend
========================================

Dependencies already installed

========================================
Starting React Frontend Server
========================================

Frontend App: http://localhost:5173

Press Ctrl+C to stop the frontend server

  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Verify Frontend is Running**:
- Open `http://localhost:5173` in browser - should see AgroFront application
- Keep this terminal open

---

## Testing the Application

Once both services are running:

1. **Open Browser**: Navigate to `http://localhost:5173`
2. **Go to Farmer Portal**: Click on "Farmer Portal" navigation
3. **Upload Image**: Click the upload area and select a crop disease image
4. **Analyze**: Click "Analyze Image" button
5. **View Results**: See disease name, confidence, description, and medicines

---

## Troubleshooting

### Backend Shows "Address already in use"
**Cause**: Port 5000 is already in use by another process

**Solution**:
```powershell
# Kill process using port 5000
Get-Process | Where-Object { $_. Handle -like "*5000*" } | Stop-Process -Force

# Or specifically kill Python
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Frontend Shows "Address already in use"
**Cause**: Port 5173 is already in use

**Solution**:
```powershell
# Kill Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### "Failed to fetch" Error on Image Upload

**Step-by-step debugging**:

1. **Verify Backend is Running**:
   ```powershell
   Invoke-WebRequest http://localhost:5000 -Method GET
   ```
   Should return 200 status with welcome message

2. **Verify Frontend can Reach Backend**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Upload an image and check for error messages
   - Check Network tab to see the request being sent

3. **Check Backend Logs**:
   - Look at the backend terminal for error messages
   - Should show POST /predict requests

4. **Test Backend Directly with cURL**:
   ```powershell
   # Create a test request to backend
   $file = Get-ChildItem -Path "backend/uploads" -Filter "*.jpg" | Select-Object -First 1
   if ($file) {
       Invoke-WebRequest -Uri "http://localhost:5000/predict" `
         -Method Post `
         -Form @{ file = $file }
   }
   ```

### "Connection Refused" Error
**Cause**: One or both services are not running

**Solution**:
1. Check if backend terminal shows "Running on http://0.0.0.0:5000"
2. Check if frontend terminal shows "Local: http://localhost:5173"
3. If not, start the services again with separate scripts

### "Module not found" Error in Backend
**Cause**: Python dependencies not installed

**Solution**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install --upgrade Flask Gunicorn keras tensorflow numpy Werkzeug matplotlib scikit-learn flask-cors waitress
```

---

## File Locations

| File | Purpose |
|------|---------|
| `start-services.ps1` | Start both backend and frontend together |
| `start-backend.ps1` | Start backend only (Flask) |
| `start-frontend.ps1` | Start frontend only (React) |
| `backend/app.py` | Flask API server |
| `backend/predict.py` | ML model inference |
| `Frontend/src/pages/FarmerPortal.tsx` | Main upload interface |
| `Frontend/src/services/api.ts` | API communication |

---

## Environment Configuration

### Backend Configuration
- Port: 5000
- Max file size: 5 MB
- Allowed formats: PNG, JPG, JPEG, BMP
- CORS: Enabled for localhost and production domains

### Frontend Configuration
- Port: 5173
- API URL: Read from `.env.local` (defaults to http://localhost:5000)
- Build tool: Vite
- Framework: React + TypeScript

---

## Manual Start (If Scripts Don't Work)

### **Start Backend Manually**:
```powershell
cd d:\Programfiles_Company\Agrofrontback2\backend
.\venv\Scripts\Activate.ps1
python app.py
```

### **Start Frontend Manually**:
```powershell
cd d:\Programfiles_Company\Agrofrontback2\Frontend
npm run dev
```

---

## Stopping the Services

- **From Script**: Press `Ctrl+C` in the terminal window
- **Kill Processes**:
  ```powershell
  Get-Process python, node | Stop-Process -Force
  ```

---

## Performance Tips

1. First analysis may take 3-5 seconds (TensorFlow model loading)
2. Subsequent analyses will be faster
3. Use separate terminals for debugging
4. Check browser console (F12) for frontend errors
5. Check terminal output for backend errors

---

**Last Updated**: December 5, 2025
**Status**: ✅ Ready for Testing
