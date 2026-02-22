# OPTION 1: Separate Deployments - Visual Workflow

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Your GitHub Repository                    │
│              (Agrofrontback0 on GitHub)                      │
│                                                               │
│  ├─ Frontend/                                                │
│  ├─ backend/                                                 │
│  └─ other files                                              │
└────────────┬────────────────────────────────┬────────────────┘
             │                                │
             │ Deploy                         │ Deploy
             ▼                                ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ VERCEL FRONTEND  │          │ VERCEL BACKEND   │
    │                  │          │                  │
    │ React/Vite App   │          │ Python Flask API │
    │ Build: dist/     │          │ Build: pip       │
    │ URL: FE-URL      │          │ URL: BE-URL      │
    └────────┬─────────┘          └────────┬─────────┘
             │                             │
             │ VITE_API_URL=BE-URL         │
             │ (Set in env vars)           │
             │                             │ CORS_ORIGIN=FE-URL
             │                             │ (Set in env vars)
             │◄───────────────────────────►│
             │       API Requests          │
             │       (Predictions)         │
             │                             │
             └─────────────┬───────────────┘
                           │
                    Users Visit FE-URL
                    Upload Images
                    Get Predictions
```

---

## Step-by-Step Workflow

### Phase 1: Preparation (5 min)
```
Your Local Machine
└─ Git Push to GitHub
   └─ Code Ready on GitHub
      └─ Vercel Can Access It
```

**Commands:**
```powershell
cd d:\SIH_Codes\Agrofrontback0
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

### Phase 2: Frontend Deployment (10 min)
```
Vercel Dashboard
├─ New Project
├─ Import Git Repository (Agrofrontback0)
├─ Configure:
│  ├─ Root Directory: Frontend
│  ├─ Framework: Vite
│  ├─ Build: npm run build
│  └─ Output: dist
├─ Deploy
└─ ✅ Get Frontend URL
   └─ Save: https://YOUR-FRONTEND.vercel.app
```

---

### Phase 3: Backend Deployment (10-15 min)
```
Vercel Dashboard
├─ New Project
├─ Import Git Repository (Agrofrontback0)
├─ Configure:
│  ├─ Root Directory: backend
│  ├─ Framework: Python
│  ├─ Build: pip install -r requirements.txt
│  ├─ Environment Variables:
│  │  ├─ USE_YOLO=1
│  │  ├─ FLASK_ENV=production
│  │  └─ PYTHONUNBUFFERED=1
│  └─ Deploy
└─ ✅ Get Backend URL
   └─ Save: https://YOUR-BACKEND.vercel.app
```

**⏳ Note:** First deployment takes longer (downloading YOLO model ~100MB)

---

### Phase 4: Link Frontend to Backend (5 min)

#### Step 4a: Tell Frontend Where Backend Is
```
Frontend Project Settings
├─ Environment Variables
├─ Add New:
│  ├─ Name: VITE_API_URL
│  └─ Value: https://YOUR-BACKEND.vercel.app
├─ Save
├─ Deployments → Latest → Redeploy
└─ ✅ Frontend now knows backend URL
```

#### Step 4b: Tell Backend Where Frontend Is
```
Backend Project Settings
├─ Environment Variables
├─ Add New:
│  ├─ Name: CORS_ORIGIN
│  └─ Value: https://YOUR-FRONTEND.vercel.app
├─ Save
├─ Deployments → Latest → Redeploy
└─ ✅ Backend accepts frontend requests
```

---

### Phase 5: Testing (10 min)

#### Test 1: Frontend Loads
```
1. Open browser
2. Go to: https://YOUR-FRONTEND.vercel.app
3. ✅ Page should load with your UI
```

#### Test 2: Backend Responds
```
1. Open terminal
2. Run: curl https://YOUR-BACKEND.vercel.app/health
3. ✅ Should return JSON response
```

#### Test 3: API Connection (Browser Console)
```
1. Go to frontend URL
2. Press F12 (DevTools)
3. Paste in Console:
   fetch('https://YOUR-BACKEND.vercel.app/health')
     .then(r => r.json())
     .then(d => console.log('✅ Connected:', d))
     .catch(e => console.error('❌ Error:', e))
4. ✅ Should see success message
```

#### Test 4: Full Feature Test
```
1. On frontend URL, upload an image
2. Click "Predict" or similar button
3. ✅ Image should be sent to backend
4. ✅ Predictions should return
5. ✅ Results display on frontend
6. ✅ No CORS errors in console
```

---

## Data Flow Diagram

### User Uploads Image & Gets Prediction

```
┌──────────────────────────────────────────────────────────────┐
│ User's Browser - Frontend (React/Vite)                        │
│ https://YOUR-FRONTEND.vercel.app                             │
│                                                               │
│  [Upload Image Button]                                       │
│         │                                                    │
│         ▼                                                    │
│  FormData with Image                                         │
│         │                                                    │
│         ▼                                                    │
│  API Call using VITE_API_URL env var                        │
│  fetch(`${VITE_API_URL}/predict`, {POST image})            │
│         │                                                    │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ HTTP POST Request
          │ Image File (multipart/form-data)
          │
┌─────────▼──────────────────────────────────────────────────┐
│ Vercel Serverless - Backend (Python Flask)                 │
│ https://YOUR-BACKEND.vercel.app                            │
│                                                             │
│  CORS Check:                                               │
│  ✅ Request from CORS_ORIGIN? → Allow                      │
│                                                             │
│  @app.route('/predict', methods=['POST'])                 │
│         │                                                  │
│         ▼                                                  │
│  Receive Image                                             │
│         │                                                  │
│         ▼                                                  │
│  Load YOLO Model                                           │
│  (or use cached version)                                   │
│         │                                                  │
│         ▼                                                  │
│  Detect Diseases in Image                                  │
│  Get Bounding Boxes + Confidence                           │
│         │                                                  │
│         ▼                                                  │
│  Return JSON Response                                      │
│  {predictions: [...], status: 'success'}                  │
│         │                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ HTTP Response
          │ JSON with predictions
          │
┌─────────▼──────────────────────────────────────────────────┐
│ User's Browser - Frontend (React/Vite)                    │
│                                                             │
│  Receive JSON response                                     │
│         │                                                  │
│         ▼                                                  │
│  Parse predictions                                         │
│         │                                                  │
│         ▼                                                  │
│  Render Results on UI                                      │
│  - Show detected diseases                                 │
│  - Display confidence scores                              │
│  - Draw bounding boxes (if implemented)                   │
│         │                                                  │
│         ▼                                                  │
│  User Sees Results                                         │
│  ✅ Deployment Complete!                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Flow

```
Your GitHub Repo (vercel.json + env vars)
       │
       ├─► Frontend Project (Vercel)
       │   ├─ Reads: VITE_API_URL
       │   └─ Uses: https://YOUR-BACKEND.vercel.app
       │
       └─► Backend Project (Vercel)
           ├─ Reads: USE_YOLO, FLASK_ENV, CORS_ORIGIN
           └─ Accepts: Requests from https://YOUR-FRONTEND.vercel.app


Frontend Code            Backend Code
   │                         │
   ├─ import.meta.env   ├─ os.environ
   │   .VITE_API_URL    │   .get('CORS_ORIGIN')
   │                         │
   ▼                         ▼
${API_URL}/predict      @app.after_request
   │                    Add CORS headers
   ▼                         │
fetch(url, {POST})          ▼
   │                    Return with headers
   ▼                         │
https://BACKEND/predict ◄────┘
   │
   ▼
Prediction Results
```

---

## Deployment Timeline

```
Day 1:
─────────────────────────────────────────
Hour 0:00 - Commit & Push Code (5 min)
          └─ Code on GitHub

Hour 0:05 - Deploy Frontend (10 min)
          └─ https://YOUR-FRONTEND.vercel.app ✅

Hour 0:15 - Deploy Backend (10-15 min)
          └─ https://YOUR-BACKEND.vercel.app ✅
          └─ YOLO model downloading (first time only)

Hour 0:30 - Link Frontend ↔ Backend (5 min)
          ├─ Set VITE_API_URL in frontend
          └─ Set CORS_ORIGIN in backend
          └─ Redeploy both

Hour 0:45 - Full System Test (10 min)
          ├─ Frontend loads ✅
          ├─ Backend responds ✅
          ├─ API connection works ✅
          └─ Full feature test ✅

Hour 1:00 - 🎉 LIVE AND DEPLOYED!
─────────────────────────────────────────
```

---

## What Each Vercel Project Does

### Frontend Project
```
Input:  Your React/Vite source code
        ├─ Frontend/src/**/*.tsx
        ├─ Frontend/public/**
        ├─ Frontend/package.json
        └─ Frontend/vercel.json

Process: npm run build
        ├─ Compile React components
        ├─ Bundle CSS/JS
        ├─ Optimize assets
        └─ Generate static files

Output: Static files in dist/
        ├─ index.html
        ├─ assets/
        │  ├─ app-xxxxx.js
        │  └─ app-xxxxx.css
        └─ etc.

Hosted: CDN (Fast, Global)
```

### Backend Project
```
Input:  Your Python Flask source code
        ├─ backend/app.py
        ├─ backend/requirements.txt
        ├─ backend/yolo_detector.py
        ├─ backend/predict.py
        └─ backend/vercel.json

Process: pip install -r requirements.txt
        ├─ Install dependencies
        ├─ Load YOLO model
        ├─ Setup Flask app
        └─ Ready to serve requests

Output: Serverless Function
        ├─ Listen on PORT env var
        ├─ Accept POST requests
        ├─ Run predictions
        └─ Return JSON

Hosted: Vercel Serverless (Cold start: ~5sec)
```

---

## File Structure for Deployment

```
Agrofrontback0/ (Your Git Repo Root)
│
├─ Frontend/                    ← Frontend Project Root
│  ├─ package.json
│  ├─ vercel.json              ← Points to this as root
│  ├─ src/
│  │  ├─ main.tsx
│  │  ├─ services/api.ts       ← Uses VITE_API_URL
│  │  └─ ...
│  ├─ public/
│  ├─ dist/                     ← Build output (created by npm run build)
│  └─ vite.config.ts
│
├─ backend/                     ← Backend Project Root
│  ├─ app.py                    ← Main Flask app
│  ├─ vercel.json              ← Points to this as root
│  ├─ requirements.txt          ← Dependencies
│  ├─ yolo_detector.py
│  ├─ predict.py
│  └─ uploads/
│
└─ [Other files]
```

---

## Key Takeaways

✅ **Separate Vercel Projects** = Simple to manage
✅ **Easy Linking** = Just set environment variables
✅ **Independent Scaling** = Frontend and backend scale separately
✅ **Simple Debugging** = Check each project's logs separately
✅ **Fast Deployment** = Both can be deployed in parallel
✅ **Cost Effective** = Free tier covers both

---

## Ready to Start?

1. **Step 1:** Commit code
2. **Step 2:** Deploy frontend (10 min)
3. **Step 3:** Deploy backend (10-15 min)
4. **Step 4:** Set environment variables (5 min)
5. **Step 5:** Test (10 min)
6. **Step 6:** Done! 🚀

**Total Time: ~45-60 minutes**

See `OPTION1_DEPLOYMENT_STEPS.md` for detailed steps! 📖
