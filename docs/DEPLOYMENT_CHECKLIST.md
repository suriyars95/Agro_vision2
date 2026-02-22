# Deployment Checklist & Quick Commands

## Pre-Deployment Checklist

### Code Ready ✅
- [x] Backend has CORS configured (Already in app.py)
- [x] Backend vercel.json exists and updated
- [x] Frontend vercel.json exists and created
- [x] requirements.txt updated for Vercel
- [x] All code committed to GitHub

### Local Testing ✅
```powershell
# Test frontend build
cd d:\SIH_Codes\Agrofrontback0\Frontend
npm install
npm run build
# ✅ Should create dist/ folder without errors

# Test backend starts
cd ..\backend
python app.py
# ✅ Should say "🚀 DISEASE DETECTION API - STARTUP"
```

---

## Quick Command Reference

### 1️⃣ Prepare Code for Deployment
```powershell
cd d:\SIH_Codes\Agrofrontback0

# Commit changes
git add .
git commit -m "Ready for Vercel deployment"
git push origin main

# Verify
git log --oneline -3
# Should show your commit at top
```

### 2️⃣ Deploy Frontend (Option A: Dashboard)
**Steps:**
1. Go to https://vercel.com (login)
2. New Project → Import Git Repository
3. Select `Agrofrontback0`
4. Settings:
   - Root Directory: `Frontend`
   - Framework: `Vite`
   - Build: `npm run build`
   - Output: `dist`
5. Deploy
6. **Save URL:** `https://YOUR-FRONTEND.vercel.app`

### 2️⃣ Deploy Frontend (Option B: CLI)
```powershell
npm install -g vercel
vercel login
cd d:\SIH_Codes\Agrofrontback0\Frontend
vercel deploy --prod
# Copy URL: https://YOUR-FRONTEND.vercel.app
```

### 3️⃣ Deploy Backend (Option A: Dashboard)
**Steps:**
1. Go to https://vercel.com (login)
2. New Project → Import Git Repository
3. Select same `Agrofrontback0`
4. Settings:
   - Root Directory: `backend`
   - Framework: `Python`
   - Build: `pip install -r requirements.txt`
5. Add Environment Variables:
   - `USE_YOLO` = `1`
   - `FLASK_ENV` = `production`
   - `PYTHONUNBUFFERED` = `1`
6. Deploy
7. **Save URL:** `https://YOUR-BACKEND.vercel.app`

### 3️⃣ Deploy Backend (Option B: CLI)
```powershell
cd d:\SIH_Codes\Agrofrontback0\backend
vercel deploy --prod
# Copy URL: https://YOUR-BACKEND.vercel.app
```

### 4️⃣ Link Frontend to Backend

**In Vercel Dashboard for Frontend:**
1. Project Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://YOUR-BACKEND.vercel.app`
3. Redeploy → Deployments → Latest → Redeploy

**In Vercel Dashboard for Backend:**
1. Project Settings → Environment Variables
2. Add: `CORS_ORIGIN` = `https://YOUR-FRONTEND.vercel.app`
3. Redeploy → Deployments → Latest → Redeploy

### 5️⃣ Test Deployment
```powershell
# Test Frontend Loads
start https://YOUR-FRONTEND.vercel.app

# Test Backend Health
curl https://YOUR-BACKEND.vercel.app/health

# Test CORS & Connection (from browser console)
# Open DevTools (F12) and run:
fetch('https://YOUR-BACKEND.vercel.app/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK:', d))
  .catch(e => console.error('❌ Error:', e))
```

---

## Key URLs to Save

**Update these with your actual Vercel URLs:**

```
Frontend URL:  https://agrofrontback-frontend.vercel.app
Backend URL:   https://agrofrontback-backend.vercel.app
GitHub Repo:   https://github.com/suriyars95/Agro_vision2
```

---

## Environment Variables Summary

### Frontend Environment Variables
```
VITE_API_URL=https://YOUR-BACKEND.vercel.app
```

### Backend Environment Variables
```
USE_YOLO=1
FLASK_ENV=production
PYTHONUNBUFFERED=1
CORS_ORIGIN=https://YOUR-FRONTEND.vercel.app
```

---

## Troubleshooting Quick Guide

### ❌ Frontend won't build
```powershell
# Test locally first
cd Frontend
npm install
npm run build

# Fix errors then redeploy
```

### ❌ API returns 404
```
✅ Solution:
1. Check VITE_API_URL in frontend env vars
2. Verify backend is deployed (check logs)
3. Hard refresh frontend (Ctrl+Shift+R)
```

### ❌ CORS errors in console
```
✅ Solution:
1. Add CORS_ORIGIN to backend env vars
2. Redeploy backend
3. Wait 5 minutes for changes to take effect
```

### ❌ Predictions fail
```
✅ Solution:
1. Check backend logs for YOLO errors
2. Ensure requirements.txt installed (check Deployment logs)
3. First request takes 5-10 minutes (model loading)
```

### ❌ Slow performance
```
✅ Solution:
1. Compress images before uploading
2. Use smaller YOLO model (already configured)
3. Check backend memory (set to 3008MB)
```

---

## Files You've Already Prepared

✅ **Created/Updated:**
- `/backend/vercel.json` - Backend configuration
- `/Frontend/vercel.json` - Frontend configuration
- `/package.json` - Root package.json
- `/backend/requirements.txt` - Vercel-optimized dependencies
- `/backend/.env.example` - Environment template
- `VERCEL_DEPLOYMENT_GUIDE.md` - Detailed guide
- `DEPLOY_TO_VERCEL_QUICK_START.md` - Quick reference
- `OPTION1_DEPLOYMENT_STEPS.md` - Step-by-step this file

✅ **Already Configured:**
- Backend CORS headers (app.py)
- Backend routes and API endpoints
- Frontend API service integration

---

## Next Steps

1. **Commit & Push**
   ```powershell
   cd d:\SIH_Codes\Agrofrontback0
   git add .
   git commit -m "Deployment files ready"
   git push origin main
   ```

2. **Deploy Frontend** (5 min)
   - Use Vercel Dashboard or CLI

3. **Deploy Backend** (5-10 min)
   - Use Vercel Dashboard or CLI

4. **Link Environments** (2 min)
   - Set frontend and backend URLs

5. **Test** (5 min)
   - Open frontend URL
   - Check console
   - Try image upload

6. **Monitor**
   - Check logs in Vercel Dashboard
   - Fix any issues

---

## Success Indicators ✅

- [ ] Frontend loads at your Vercel URL
- [ ] Browser console has no CORS errors
- [ ] API calls show in Network tab
- [ ] Backend `/health` endpoint responds
- [ ] Image upload works
- [ ] Disease predictions return
- [ ] Results display in UI

---

## Support & Debugging

**Check logs:**
1. Vercel Dashboard → Project
2. Deployments → Click latest deployment
3. Logs tab (for build errors)
4. Runtime Logs tab (for runtime errors)

**Local testing before deployment:**
```powershell
# Frontend
cd Frontend
npm run dev
# Visit http://localhost:5173

# Backend (in new terminal)
cd backend
python app.py
# Visit http://localhost:5000
```

---

**Ready to deploy? Follow the Quick Command Reference above! 🚀**
