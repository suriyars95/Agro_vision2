# Deploy to Vercel - Quick Start

This document provides step-by-step instructions to deploy your Agrofrontback project to Vercel.

## Prerequisites Checklist
- [ ] Vercel account created (https://vercel.com)
- [ ] GitHub repository with your code pushed
- [ ] Node.js v18+ installed
- [ ] Git installed and configured

## Quick Deployment Steps

### Step 1: Verify Your Repository
Ensure all files are committed and pushed to GitHub:
```bash
cd d:\SIH_Codes\Agrofrontback0
git status
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy Frontend Only (Simplest)
Option A: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `Agrofrontback0` repository
4. Choose "Vite" as framework
5. Set Root Directory to `Frontend`
6. Click "Deploy"

Option B: Using Vercel CLI
```bash
# Install CLI if not already
npm install -g vercel

# Login
vercel login

# Deploy frontend
cd Frontend
vercel deploy --prod
```

### Step 3: Get Frontend URL
After deployment completes, you'll get a URL like:
```
https://agrofrontback-frontend.vercel.app
```

### Step 4: Deploy Backend API
```bash
cd backend
vercel deploy --prod
```

You'll get a backend URL like:
```
https://agrofrontback-backend.vercel.app
```

### Step 5: Add Environment Variables

#### In Frontend Project (Vercel Dashboard)
1. Go to your frontend project settings
2. Environment Variables
3. Add: `VITE_API_URL` = `https://agrofrontback-backend.vercel.app`
4. Redeploy: `vercel deploy --prod`

#### In Backend Project (Vercel Dashboard)
1. Go to your backend project settings
2. Environment Variables
3. Add:
   - `USE_YOLO` = `1`
   - `FLASK_ENV` = `production`
   - `CORS_ORIGIN` = `https://agrofrontback-frontend.vercel.app`
4. Redeploy: `vercel deploy --prod`

### Step 6: Update Frontend Code
Update API calls to use environment variable:

In your frontend API service file:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function predictDisease(imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    body: formData
  });
  return response.json();
}
```

### Step 7: Test Deployment
```bash
# Test frontend
curl https://agrofrontback-frontend.vercel.app

# Test backend
curl https://agrofrontback-backend.vercel.app/health

# Test API call
curl -X POST https://agrofrontback-backend.vercel.app/predict \
  -F "image=@path/to/image.jpg"
```

## Alternative: Deploy as Monorepo

If you want both frontend and backend in one Vercel project:

1. Go to https://vercel.com/new
2. Import your repository
3. In Build & Development Settings:
   - Framework: "Other"
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install && cd frontend && npm install`
4. Add Root Directory: (leave empty)
5. Deploy

Then add rewrites in root `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-url.vercel.app/api/:path*"
    }
  ]
}
```

## Troubleshooting

### Issue: Build fails with "Module not found"
**Solution:**
```bash
# Install dependencies locally first
cd Frontend
npm install
npm run build

# Check for any build errors
```

### Issue: API calls return 404
**Solution:**
- Verify `VITE_API_URL` is set correctly
- Check CORS settings in backend
- Ensure backend is deployed and running

### Issue: YOLO model fails to load
**Solution:**
- Check Vercel function memory: Set to 3008 MB in `vercel.json`
- Reduce model size: Use `yolov11n.pt` instead of larger models
- Check available disk space in logs

### Issue: File uploads fail
**Solution:**
- Vercel timeout: 60 seconds by default
- Compress images before upload
- Consider increasing timeout in `vercel.json`

### Issue: Static files not serving
**Solution:**
- Ensure `public` folder is in root
- Check Vercel framework setting (should be "Vite")
- Verify build output directory is `dist`

## Monitoring & Debugging

### View Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Select deployment
5. Click "Runtime Logs" tab

### Performance Tips
1. Optimize images before upload
2. Use `opencv-python-headless` (no GUI overhead)
3. Consider caching YOLO model
4. Use CDN for frontend assets (automatic with Vercel)

## Important Notes

⚠️ **YOLO Model Storage:**
- Model files are cached in Vercel's /tmp directory
- First deployment may take longer (downloading model)
- Subsequent requests will be faster

⚠️ **File Uploads:**
- Max file size: 50 MB per Vercel limits
- Store in `/tmp` directory
- Clean up old files regularly

⚠️ **Cost Considerations:**
- Vercel free tier includes serverless functions
- Large YOLO models may increase deployment size
- Monitor usage in Vercel dashboard

## Success Indicators

✅ Frontend loads at https://your-frontend.vercel.app
✅ Backend API responds at https://your-backend.vercel.app/health
✅ API calls work between frontend and backend
✅ Image predictions return correct results
✅ No CORS errors in browser console

## Next Steps

1. Monitor your deployed application
2. Set up error tracking (Sentry, etc.)
3. Enable analytics in Vercel dashboard
4. Configure custom domain (optional)
5. Set up automatic deployments on push

For detailed configuration, see `VERCEL_DEPLOYMENT_GUIDE.md`
