# Vercel Deployment Guide - Agrofrontback Project

This guide covers deploying your full-stack project (React Frontend + Python Flask Backend + YOLO) to Vercel.

## Project Structure Overview
```
Agrofrontback0/
├── Frontend/              # React/Vite frontend
├── backend/               # Python Flask API
├── api/                   # API routes (optional)
└── uploads/               # File uploads
```

## Prerequisites
1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Push code to GitHub/GitLab/Bitbucket
3. **Node.js**: v18+ installed locally
4. **Vercel CLI**: `npm install -g vercel`

---

## Deployment Options

### Option 1: Monorepo Deployment (Recommended)
Deploy both frontend and backend from a single GitHub repository.

#### Step 1: Update Project Structure

Your project should be structured as a monorepo with a root `vercel.json`:

```
Agrofrontback0/
├── frontend/          # React/Vite app
├── backend/           # Python Flask API
└── vercel.json        # Root configuration
```

#### Step 2: Create Root `vercel.json`

**File: `/vercel.json`**
```json
{
  "buildCommand": "npm run build:all",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-api.vercel.app/api/:path*"
    }
  ]
}
```

#### Step 3: Update Frontend `vercel.json` (or create if missing)

**File: `/Frontend/vercel.json`**
```json
{
  "name": "agrofrontback-frontend",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": [
    "VITE_API_URL"
  ]
}
```

#### Step 4: Update Backend `vercel.json`

**File: `/backend/vercel.json`**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python",
      "config": {
        "maxLambdaSize": "50mb",
        "runtime": "python3.11"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ],
  "env": {
    "PYTHONUNBUFFERED": "1",
    "USE_YOLO": "1"
  }
}
```

#### Step 5: Update `backend/requirements.txt`

Add Vercel-compatible dependencies:

```txt
Flask==2.3.0
Gunicorn==21.2.0
flask-cors==4.0.0
numpy==1.24.0
opencv-python-headless==4.8.0.76
ultralytics==8.0.0
torch==2.0.0
torchvision==0.15.0
Werkzeug==2.3.0
Pillow==10.0.0
```

**⚠️ Important Notes:**
- Use `opencv-python-headless` (no GUI dependencies)
- Pin specific versions for reproducibility
- YOLO model weights will be cached automatically

#### Step 6: Create Root `package.json`

**File: `/package.json`**
```json
{
  "name": "agrofrontback",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && python app.py",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && pip install -r requirements.txt",
    "build:all": "npm run build",
    "preview": "cd frontend && npm run preview"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

---

### Option 2: Separate Deployments (Easier)

Deploy frontend and backend as separate Vercel projects.

#### Frontend Deployment

1. **In `/Frontend` directory, create `vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "@vite_api_url"
  }
}
```

2. **Update Frontend environment for production:**
   - In `/Frontend/src` or `.env.production`:
```env
VITE_API_URL=https://your-backend-api.vercel.app
```

3. **Deploy frontend:**
```bash
cd Frontend
vercel deploy --prod
```

#### Backend Deployment

1. **Ensure `/backend/vercel.json` exists** (already present)

2. **Update environment variables in backend:**

**`/backend/.env.example`:**
```env
FLASK_ENV=production
USE_YOLO=1
MAX_FILE_SIZE=52428800
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

3. **Deploy backend:**
```bash
cd backend
vercel deploy --prod
```

---

## Step-by-Step Deployment Instructions

### Using Vercel Dashboard (Easiest)

1. **Push code to GitHub:**
```bash
cd d:\SIH_Codes\Agrofrontback0
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. **Go to [vercel.com/new](https://vercel.com/new)**
3. **Connect your GitHub repository**
4. **Configure project:**
   - **Root Directory**: Leave empty or set based on structure
   - **Framework**: Vite (for frontend) or Python (for backend)
   - **Build Command**: 
     - Frontend: `npm run build`
     - Backend: `pip install -r requirements.txt`
   - **Output Directory**: 
     - Frontend: `dist`
     - Backend: `/` (root)

5. **Add Environment Variables:**
   - For Frontend:
     - `VITE_API_URL=https://backend-domain.vercel.app`
   - For Backend:
     - `USE_YOLO=1`
     - `FLASK_ENV=production`

6. **Click "Deploy"**

### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy frontend
cd Frontend
vercel deploy --prod

# Deploy backend
cd ../backend
vercel deploy --prod
```

---

## Configuration Files Checklist

- [ ] Root `vercel.json` (if monorepo)
- [ ] `/Frontend/vercel.json` - Frontend config
- [ ] `/backend/vercel.json` - Backend config
- [ ] `/backend/requirements.txt` - Python dependencies
- [ ] `/Frontend/package.json` - Build scripts
- [ ] `.env.production` files for environment variables
- [ ] GitHub repository connected to Vercel

---

## Important Configuration Details

### Frontend (`Frontend/package.json`)
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "dev": "vite"
  }
}
```

### Backend (`backend/app.py`)
Must listen on `0.0.0.0` and the port from `$PORT` environment variable:
```python
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
```

### CORS Configuration
Update your Flask app to accept frontend domain:
```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-frontend.vercel.app", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
```

---

## Environment Variables to Set

### In Vercel Dashboard

**Frontend Project:**
- `VITE_API_URL` = `https://backend-api-url.vercel.app`

**Backend Project:**
- `USE_YOLO` = `1`
- `FLASK_ENV` = `production`
- `MAX_FILE_SIZE` = `52428800` (50MB)

---

## Troubleshooting

### Issue: 404 on API routes
**Solution:** Ensure CORS headers are properly set in Flask app

### Issue: YOLO model too large
**Solution:** 
- Lambda functions have 50MB limit
- Use lightweight model: `yolov11n.pt` (smallest)
- Or use edge runtime with more capacity

### Issue: Frontend build fails
**Solution:** 
```bash
# Check build locally first
cd Frontend
npm install
npm run build
```

### Issue: Backend times out
**Solution:**
- Image processing can take time
- Consider using Vercel's serverless function timeout settings
- Or migrate to Vercel Container Runtime for longer timeouts

### Issue: Large file uploads fail
**Solution:** 
- Vercel request timeout: 60s
- Optimize image sizes before sending
- Use streaming uploads for video

---

## Performance Optimization

1. **Image Optimization:**
```python
# In app.py
from PIL import Image
image = Image.open(file)
image.thumbnail((1024, 1024))  # Reduce size
```

2. **Model Caching:**
- YOLO models are cached in `/tmp` automatically
- First request may be slower

3. **Enable Compression:**
```python
from flask_compress import Compress
Compress(app)
```

---

## Production Checklist

- [ ] Frontend API calls use environment variable for backend URL
- [ ] Backend CORS configured for frontend domain
- [ ] Environment variables set in Vercel dashboard
- [ ] `.env.local` files not committed to git
- [ ] Testing deployed endpoints work correctly
- [ ] Error handling logs are sufficient for debugging
- [ ] Rate limiting considered for API
- [ ] YOLO model weights properly configured

---

## Testing After Deployment

```bash
# Test frontend
curl https://your-frontend.vercel.app

# Test backend
curl https://your-backend.vercel.app/health

# Test API integration
curl -X POST https://your-backend.vercel.app/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```

---

## Next Steps

1. Update all configuration files
2. Push to GitHub
3. Connect project to Vercel
4. Set environment variables
5. Trigger deployment
6. Test endpoints
7. Monitor logs in Vercel dashboard

Good luck with your deployment! 🚀
