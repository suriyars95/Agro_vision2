# Option 1: Separate Deployments - Step-by-Step Guide

## Prerequisites
- [ ] Vercel account (https://vercel.com) - Sign up if needed
- [ ] GitHub repository with code pushed
- [ ] Node.js v18+ installed locally
- [ ] Vercel CLI: `npm install -g vercel`

---

## STEP 1: Prepare Your Local Code

### 1.1 Ensure All Changes Are Committed
```powershell
cd d:\SIH_Codes\Agrofrontback0
git status
git add .
git commit -m "Prepare for Vercel deployment - separate frontend and backend"
git push origin main
```

### 1.2 Verify Frontend Build Works Locally
```powershell
cd Frontend
npm install
npm run build
```
✅ You should see a `dist` folder created

### 1.3 Verify Backend Configuration
Check that `backend/requirements.txt` has Vercel-compatible versions:
```powershell
cd ..\backend
# Already updated with Vercel-optimized packages
```

---

## STEP 2: Deploy Frontend to Vercel

### 2.1 Option A: Using Vercel Dashboard (Recommended)

**Step 1:** Go to https://vercel.com and login to your account

**Step 2:** Click **"Add New..."** → **"Project"**

**Step 3:** Click **"Import Git Repository"**

**Step 4:** Select your `Agrofrontback0` repository from GitHub

**Step 5:** Configure Project Settings:
- **Project Name:** `agrofrontback-frontend` (or your choice)
- **Framework:** `Vite`
- **Root Directory:** `Frontend` ← **IMPORTANT**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**Step 6:** Click **"Deploy"**

⏳ Wait for deployment to complete (2-3 minutes)

✅ You'll get a URL like: `https://agrofrontback-frontend.vercel.app`
**Save this URL - you'll need it for backend configuration**

### 2.2 Option B: Using Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to Frontend
cd d:\SIH_Codes\Agrofrontback0\Frontend

# Deploy
vercel deploy --prod
```

Follow prompts and confirm deployment.

✅ You'll get a URL - **Save this URL**

---

## STEP 3: Deploy Backend to Vercel

### 3.1 Using Vercel Dashboard

**Step 1:** Go back to https://vercel.com

**Step 2:** Click **"Add New..."** → **"Project"**

**Step 3:** Click **"Import Git Repository"**

**Step 4:** Select the same `Agrofrontback0` repository

**Step 5:** Configure Project Settings:
- **Project Name:** `agrofrontback-backend` (or your choice)
- **Framework:** `Python`
- **Root Directory:** `backend` ← **IMPORTANT**
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** *(leave empty)*
- **Output Directory:** *(leave empty)*

**Step 6:** Before deploying, scroll down to **Environment Variables**

**Step 7:** Add Environment Variables:
```
USE_YOLO = 1
FLASK_ENV = production
PYTHONUNBUFFERED = 1
```

**Step 8:** Click **"Deploy"**

⏳ Wait for deployment (3-5 minutes - first time is longer due to YOLO model)

✅ You'll get a URL like: `https://agrofrontback-backend.vercel.app`
**Save this URL**

### 3.2 Using Vercel CLI

```powershell
# Navigate to Backend
cd d:\SIH_Codes\Agrofrontback0\backend

# Deploy
vercel deploy --prod
```

---

## STEP 4: Link Frontend & Backend via Environment Variables

### 4.1 Add Frontend URL to Backend Project

**In Vercel Dashboard:**

1. Go to your backend project: `agrofrontback-backend`
2. Click **"Settings"** → **"Environment Variables"**
3. Click **"Add New"**
4. Add:
   - **Name:** `CORS_ORIGIN`
   - **Value:** `https://agrofrontback-frontend.vercel.app` (your frontend URL)
5. Click **"Save"**
6. Click **"Deployments"** → Select latest deployment
7. Click **"Redeploy"** to apply changes

✅ Backend now accepts requests from your frontend

### 4.2 Add Backend URL to Frontend Project

**In Vercel Dashboard:**

1. Go to your frontend project: `agrofrontback-frontend`
2. Click **"Settings"** → **"Environment Variables"**
3. Click **"Add New"**
4. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://agrofrontback-backend.vercel.app` (your backend URL)
5. Click **"Save"**
6. Click **"Deployments"** → Select latest deployment
7. Click **"Redeploy"** to apply changes

✅ Frontend now knows where backend is located

---

## STEP 5: Update Your Frontend Code (If Not Already)

### 5.1 Check Frontend API Service

Look for your API service file (typically in `Frontend/src/services/` or `Frontend/src/utils/`):

**Example Update:**
```typescript
// Frontend/src/services/api.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function predictDisease(imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Prediction failed:', error);
    throw error;
  }
}

export async function uploadImage(imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

### 5.2 Make Sure Backend App Accepts CORS

Check your `backend/app.py` includes CORS configuration:

```python
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS with your frontend domain
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://agrofrontback-frontend.vercel.app",
            "http://localhost:3000",
            "http://localhost:5000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
},
     r"/predict": {
        "origins": [
            "https://agrofrontback-frontend.vercel.app",
            "http://localhost:3000"
        ],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Your routes here...
```

---

## STEP 6: Test the Deployment

### 6.1 Test Frontend
```powershell
# Open in browser
start https://agrofrontback-frontend.vercel.app
```
✅ Page should load with your UI

### 6.2 Test Backend Health
```powershell
# In PowerShell
$backendUrl = "https://agrofrontback-backend.vercel.app"
Invoke-WebRequest -Uri "$backendUrl/health" -Method GET
```

Should return: `{"status": "ok"}` or similar

### 6.3 Test API Connection
Open browser developer console (F12) and test:
```javascript
const API = 'https://agrofrontback-backend.vercel.app';

// Test CORS and connection
fetch(`${API}/health`)
  .then(r => r.json())
  .then(d => console.log('Backend response:', d))
  .catch(e => console.error('Error:', e));
```

### 6.4 Full Integration Test
1. Go to https://agrofrontback-frontend.vercel.app
2. Upload an image
3. Check Network tab (F12) to see API calls
4. Verify response contains predictions

---

## STEP 7: Monitor & Debug

### 7.1 Check Frontend Logs
1. Vercel Dashboard → Frontend Project
2. Click **"Deployments"** → Latest deployment
3. Click **"Logs"** tab
4. Look for build errors

### 7.2 Check Backend Logs
1. Vercel Dashboard → Backend Project
2. Click **"Deployments"** → Latest deployment
3. Click **"Runtime Logs"** tab
4. Look for errors or issues

### 7.3 Browser Console Errors
Open frontend in browser, press F12:
- Check Console for errors
- Check Network tab for failed requests
- Look for CORS errors

### 7.4 Common Issues & Fixes

**Issue: 404 errors on API calls**
```
Solution: 
1. Check VITE_API_URL is set correctly in frontend env vars
2. Verify backend deployment is successful
3. Check API route exists in backend app.py
```

**Issue: CORS errors**
```
Solution:
1. Verify CORS_ORIGIN in backend env vars matches frontend URL
2. Check Flask CORS configuration in app.py
3. Redeploy backend after changing env vars
```

**Issue: File uploads fail**
```
Solution:
1. Vercel request timeout: 60 seconds
2. Reduce image size before upload
3. Check /tmp directory has space (handled by Vercel)
```

**Issue: YOLO model not loading**
```
Solution:
1. Check backend logs for model download errors
2. Ensure memory is set to 3008 MB in vercel.json
3. First deployment takes longer (downloading model)
4. Wait 5+ minutes on first request
```

---

## STEP 8: Set Up Custom Domain (Optional)

### 8.1 For Frontend
1. Vercel Dashboard → Frontend Project
2. Settings → Domains
3. Click "Add Domain"
4. Enter your domain (e.g., app.yourdomain.com)
5. Follow DNS configuration steps

### 8.2 For Backend
1. Vercel Dashboard → Backend Project
2. Settings → Domains
3. Click "Add Domain"
4. Enter your domain (e.g., api.yourdomain.com)
5. Follow DNS configuration steps

Then update `VITE_API_URL` to use your custom domain.

---

## STEP 9: Continuous Deployment (Automatic Updates)

By default, Vercel automatically deploys when you push to main:

```powershell
# Make changes locally
cd d:\SIH_Codes\Agrofrontback0

# Commit and push
git add .
git commit -m "Update feature xyz"
git push origin main

# Vercel automatically deploys both frontend and backend!
```

✅ Check Vercel Dashboard to see new deployments

---

## Final Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Vercel
- [ ] `VITE_API_URL` set in frontend env vars
- [ ] `CORS_ORIGIN` set in backend env vars
- [ ] Frontend code uses environment variable for API calls
- [ ] Backend has CORS configured
- [ ] Frontend loads without errors
- [ ] Backend API responds to health check
- [ ] Image upload and prediction works end-to-end
- [ ] No CORS errors in browser console

---

## Deployment URLs

**Save these for reference:**

Frontend: `https://agrofrontback-frontend.vercel.app`

Backend: `https://agrofrontback-backend.vercel.app`

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Build fails | Check `npm run build` works locally |
| 404 on API | Check `VITE_API_URL` environment variable |
| CORS error | Add `CORS_ORIGIN` to backend env vars |
| Slow first request | YOLO model downloading (5-10 min) |
| File upload fails | Check file size < 50MB |
| Static files 404 | Verify root directory is set correctly |
| Hot module reload issues | Hard refresh (Ctrl+Shift+R) |

---

## Performance Tips

1. **Optimize images before upload** - Reduces processing time
2. **Use lightweight YOLO model** - `yolov11n.pt` is fastest
3. **Cache responses** - Prevent duplicate predictions
4. **Monitor logs** - Check for bottlenecks

---

## Next Steps

1. ✅ Deploy frontend and backend
2. ✅ Test integration
3. 📊 Monitor performance in Vercel dashboard
4. 🔧 Set up error tracking (Sentry)
5. 📱 Enable analytics
6. 🎯 Optimize based on usage patterns

Good luck with your deployment! 🚀
