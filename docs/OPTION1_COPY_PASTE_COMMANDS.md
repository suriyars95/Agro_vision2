# OPTION 1: Copy-Paste Commands for Deployment

## ⚠️ Important: Replace Placeholders
Wherever you see `YOUR-FRONTEND` or `YOUR-BACKEND`, replace with your actual Vercel URLs.

---

## STEP 1: Prepare Local Repository (5 min)

### Copy-Paste These Commands:

```powershell
# Navigate to project root
cd d:\SIH_Codes\Agrofrontback0

# Check git status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Prepare for Vercel deployment - separate frontend and backend deployments"

# Push to GitHub
git push origin main

# Verify push successful
git log --oneline -3
```

**Expected Output:**
```
Your commit message should appear at the top
GitHub repository should show "Code" as current
```

---

## STEP 2: Deploy Frontend (10 min)

### Option A: Using Vercel CLI (Faster)

```powershell
# Install Vercel CLI (one-time)
npm install -g vercel

# Login to Vercel
vercel login
# Follow browser to login, come back to terminal

# Navigate to frontend
cd d:\SIH_Codes\Agrofrontback0\Frontend

# Deploy to production
vercel deploy --prod

# Vercel will ask questions:
# "Set up and deploy?" → Press Y
# "Link to existing project?" → Press N (new project)
# "Project name?" → agrofrontback-frontend (or your choice)
# "Project directory?" → ./ (current directory)
# Wait for deployment...
```

**You'll see output like:**
```
✅ Production: https://agrofrontback-frontend.vercel.app
```

**SAVE THIS URL** - You need it for Step 4a!

---

### Option B: Using Vercel Dashboard (More Visual)

1. Open browser: https://vercel.com
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Find and select "Agrofrontback0" repository
5. In settings:
   ```
   Project Name: agrofrontback-frontend
   Framework Preset: Vite
   Root Directory: Frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
6. Click "Deploy" button
7. Wait for deployment (2-3 min)
8. You'll get URL: `https://agrofrontback-frontend.vercel.app`

**SAVE THIS URL** - You need it for Step 4a!

---

## STEP 3: Deploy Backend (15-20 min)

### Option A: Using Vercel CLI (Faster)

```powershell
# Navigate to backend
cd d:\SIH_Codes\Agrofrontback0\backend

# Deploy to production
vercel deploy --prod

# Vercel will ask questions:
# "Set up and deploy?" → Press Y
# "Link to existing project?" → Press N (new project)
# "Project name?" → agrofrontback-backend (or your choice)
# "Project directory?" → ./ (current directory)
# Wait for deployment...
```

⏳ **First deployment takes longer** (downloading ~100MB YOLO model)

**You'll see output like:**
```
✅ Production: https://agrofrontback-backend.vercel.app
```

**SAVE THIS URL** - You need it for Step 4b!

---

### Option B: Using Vercel Dashboard

1. Open browser: https://vercel.com
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Find and select "Agrofrontback0" repository
5. In settings:
   ```
   Project Name: agrofrontback-backend
   Framework Preset: Python
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Install Command: (leave empty)
   Start Command: (leave empty)
   Output Directory: (leave empty)
   ```
6. Scroll down to "Environment Variables"
7. Add these three:
   ```
   USE_YOLO = 1
   FLASK_ENV = production
   PYTHONUNBUFFERED = 1
   ```
8. Click "Deploy" button
9. Wait for deployment (5-10 min)
10. You'll get URL: `https://agrofrontback-backend.vercel.app`

**SAVE THIS URL** - You need it for Step 4b!

---

## STEP 4: Link Frontend to Backend (5 min)

### Step 4a: Tell Frontend Where Backend Is

**In Vercel Dashboard:**

1. Go to: https://vercel.com/dashboard
2. Click on your frontend project: `agrofrontback-frontend`
3. Click "Settings" tab
4. Click "Environment Variables" in left sidebar
5. Click "Add New"
   ```
   Name: VITE_API_URL
   Value: https://YOUR-BACKEND.vercel.app
   ```
   (Replace YOUR-BACKEND with your actual backend URL from Step 3)
6. Click "Save"
7. Go back to "Deployments" tab
8. Click on the latest deployment
9. Click "Redeploy" button at top right
10. Wait for deployment (1-2 min)

**Command-line alternative:**
```powershell
# Set environment variable
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel env add VITE_API_URL
# Paste your backend URL when prompted
# Re-deploy
vercel deploy --prod
```

---

### Step 4b: Tell Backend Where Frontend Is

**In Vercel Dashboard:**

1. Go to: https://vercel.com/dashboard
2. Click on your backend project: `agrofrontback-backend`
3. Click "Settings" tab
4. Click "Environment Variables" in left sidebar
5. Click "Add New"
   ```
   Name: CORS_ORIGIN
   Value: https://YOUR-FRONTEND.vercel.app
   ```
   (Replace YOUR-FRONTEND with your actual frontend URL from Step 2)
6. Click "Save"
7. Go back to "Deployments" tab
8. Click on the latest deployment
9. Click "Redeploy" button at top right
10. Wait for deployment (1-2 min)

**Command-line alternative:**
```powershell
# Set environment variable
cd d:\SIH_Codes\Agrofrontback0\backend
vercel env add CORS_ORIGIN
# Paste your frontend URL when prompted
# Re-deploy
vercel deploy --prod
```

---

## STEP 5: Test Deployment (10 min)

### Test 1: Frontend Loads

**Copy-paste in PowerShell:**
```powershell
# Replace YOUR-FRONTEND with your actual URL
Start-Process "https://YOUR-FRONTEND.vercel.app"
```

**Or manually:**
- Open browser
- Go to: `https://YOUR-FRONTEND.vercel.app`
- Should see your application UI
- Check browser console (F12) for errors

---

### Test 2: Backend Health Check

**Copy-paste in PowerShell:**
```powershell
# Replace YOUR-BACKEND with your actual URL
$backendUrl = "https://YOUR-BACKEND.vercel.app/health"
Invoke-WebRequest -Uri $backendUrl -Method GET | ConvertTo-Json | Format-List
```

**Expected output:**
```
StatusCode        : 200
StatusDescription : OK
Content           : {"status":"ok",...}
```

**Or use curl:**
```powershell
curl https://YOUR-BACKEND.vercel.app/health
```

---

### Test 3: API Connection Test

**Copy-paste in browser console (F12):**

```javascript
// Replace YOUR-BACKEND with your actual URL
const API = 'https://YOUR-BACKEND.vercel.app';

console.log('Testing backend connection...');

fetch(`${API}/health`)
  .then(r => {
    console.log('✅ Response status:', r.status);
    console.log('✅ Response headers:', r.headers);
    return r.json();
  })
  .then(data => {
    console.log('✅ SUCCESS! Backend responded:', data);
  })
  .catch(error => {
    console.error('❌ FAILED! Error:', error);
    console.error('Check that CORS_ORIGIN is set correctly in backend');
  });
```

**Expected in console:**
```
✅ Response status: 200
✅ SUCCESS! Backend responded: {status: 'ok'}
```

---

### Test 4: Full Feature Test (Image Upload & Prediction)

1. Go to: `https://YOUR-FRONTEND.vercel.app`
2. Upload an image
3. Click "Predict" or similar button
4. Open DevTools (F12)
5. Go to "Network" tab
6. Look for POST request to `/predict`
7. Check request was sent to backend URL
8. Check response contains predictions
9. Verify UI displays results correctly

---

## Troubleshooting Commands

### Check Frontend Build

```powershell
# Test build locally first
cd d:\SIH_Codes\Agrofrontback0\Frontend
npm install
npm run build
# Should create dist/ folder
```

### Check Backend Dependencies

```powershell
# Test requirements locally
cd d:\SIH_Codes\Agrofrontback0\backend
python -m pip install -r requirements.txt
# Should complete without errors
```

### View Frontend Logs

```powershell
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel logs --prod
# Shows deployment and runtime logs
```

### View Backend Logs

```powershell
cd d:\SIH_Codes\Agrofrontback0\backend
vercel logs --prod
# Shows deployment and runtime logs
```

### Check Environment Variables

**Frontend:**
```powershell
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel env list
# Should show VITE_API_URL
```

**Backend:**
```powershell
cd d:\SIH_Codes\Agrofrontback0\backend
vercel env list
# Should show USE_YOLO, FLASK_ENV, CORS_ORIGIN, PYTHONUNBUFFERED
```

---

## Fix Common Issues

### Issue: CORS Errors in Browser Console

**Error Message:**
```
Access to XMLHttpRequest at 'https://backend.vercel.app/predict' 
from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```

**Fix:**
```powershell
# 1. Verify environment variables are set
cd d:\SIH_Codes\Agrofrontback0\backend
vercel env list

# 2. Check CORS_ORIGIN matches frontend URL exactly
# Should be: https://YOUR-FRONTEND.vercel.app (with https://)

# 3. Redeploy backend
vercel deploy --prod

# 4. Wait 2-3 minutes for changes to take effect

# 5. Hard refresh frontend (Ctrl+Shift+R)
```

---

### Issue: 404 on API Endpoints

**Error Message:**
```
POST https://backend.vercel.app/predict 404 (Not Found)
```

**Fix:**
```powershell
# 1. Check VITE_API_URL is set in frontend
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel env list

# 2. Should output: VITE_API_URL=https://YOUR-BACKEND.vercel.app

# 3. Verify backend URL is correct (matches actual backend URL)

# 4. Redeploy frontend
vercel deploy --prod

# 5. Hard refresh (Ctrl+Shift+R)
```

---

### Issue: Slow Predictions / YOLO Model Not Loading

**Error / Behavior:**
```
First request takes 5-10 minutes
or returns error about model loading
```

**This is normal!**
```
- First deployment: Model downloading (~100MB)
- First request: Model loading into memory
- Subsequent requests: Much faster

Solution: Wait 5-10 minutes on first request
OR check backend logs for progress
```

---

### Issue: Build Fails

**Frontend build fails:**
```powershell
# Test locally
cd d:\SIH_Codes\Agrofrontback0\Frontend
npm install
npm run build

# Fix any errors shown
# Then commit and push
git add .
git commit -m "Fix frontend build issues"
git push origin main

# Vercel will auto-redeploy
```

**Backend build fails:**
```powershell
# Test locally
cd d:\SIH_Codes\Agrofrontback0\backend
python -m pip install -r requirements.txt

# Fix any dependency issues
# Then commit and push
git add .
git commit -m "Fix backend dependencies"
git push origin main

# Vercel will auto-redeploy
```

---

## Final Verification Checklist

Run these commands in order:

```powershell
# 1. Check frontend is deployed and loads
start https://YOUR-FRONTEND.vercel.app
# Wait for page to load, check for errors in console

# 2. Check backend responds
curl https://YOUR-BACKEND.vercel.app/health
# Should return JSON response

# 3. Check environment variables
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel env list
# Should show VITE_API_URL

cd d:\SIH_Codes\Agrofrontback0\backend
vercel env list
# Should show CORS_ORIGIN, USE_YOLO, FLASK_ENV

# 4. Check git is up to date
cd d:\SIH_Codes\Agrofrontback0
git log --oneline -1
# Should show your most recent commit
```

---

## URLs to Save

**Replace these with your actual URLs:**

```
Frontend:  https://YOUR-FRONTEND.vercel.app
Backend:   https://YOUR-BACKEND.vercel.app
GitHub:    https://github.com/suriyars95/Agro_vision2
```

**Store them somewhere safe!**

---

## Success! 🎉

If all tests pass:
✅ Frontend loads
✅ Backend responds
✅ API calls work
✅ No CORS errors
✅ Image predictions work

**Your application is LIVE and DEPLOYED! 🚀**

---

## Next Steps

1. Share your frontend URL with users
2. Monitor Vercel dashboard for issues
3. Set up custom domain (optional)
4. Enable analytics (optional)
5. Configure error tracking (optional)

---

## Need Help?

1. Check logs: `vercel logs --prod`
2. Read guides: See other markdown files in repo
3. Vercel docs: https://vercel.com/docs
4. GitHub issues: Create issue with error details
