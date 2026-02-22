# Backend Deployment Configuration - What to Fill In

## ✅ Configuration for the Screen You're Seeing

Based on your screenshot, here's what to enter in each field:

---

## 1. Framework Preset
**Current:** Flask ✅
**Status:** Already correct!
**Leave as:** Flask

---

## 2. Root Directory
**Current:** backend ✅
**Status:** Already correct!
**Leave as:** backend

---

## 3. Build Command
**Current:** `python app.py`
**Should be:** `pip install -r requirements.txt`

**Change it to:**
```
pip install -r requirements.txt
```

**Why?** This installs all your Python dependencies before the app runs.

---

## 4. Output Directory
**Current:** N/A
**Should be:** Leave empty (N/A)
**Status:** ✅ Correct - Python apps don't need output directory

---

## 5. Install Command
**Current:** `pip install -r requirements.txt`
**Should be:** Leave empty or use default
**Change it to:** Delete the current text, leave blank

**Why?** Vercel handles pip installs automatically for Python. The Build Command will handle it.

---

## 6. Environment Variables
**Current:** Collapsed (not shown)
**Click:** Expand "Environment Variables" section
**Add these 4 variables:**

```
Variable 1:
  Name: USE_YOLO
  Value: 1

Variable 2:
  Name: FLASK_ENV
  Value: production

Variable 3:
  Name: PYTHONUNBUFFERED
  Value: 1

Variable 4:
  Name: CORS_ORIGIN
  Value: https://YOUR-FRONTEND.vercel.app
  (Replace with your actual frontend URL after deploying frontend first)
```

---

## Summary - What to Change

| Field | Current | Change To | Status |
|-------|---------|-----------|--------|
| Framework Preset | Flask | Flask | ✅ Keep |
| Root Directory | backend | backend | ✅ Keep |
| Build Command | `python app.py` | `pip install -r requirements.txt` | ⚠️ Change |
| Output Directory | N/A | N/A | ✅ Keep |
| Install Command | `pip install -r requirements.txt` | (Leave empty) | ⚠️ Change |

---

## Environment Variables (Must Add)

Click the **"Environment Variables"** section (currently collapsed) and add:

```
USE_YOLO = 1
FLASK_ENV = production
PYTHONUNBUFFERED = 1
CORS_ORIGIN = https://your-frontend-url.vercel.app
```

---

## Final Configuration Should Look Like:

```
Framework Preset: Flask ✅

Root Directory: backend ✅

Build Command: pip install -r requirements.txt ✅

Output Directory: (empty/N/A) ✅

Install Command: (empty) ✅

Environment Variables:
  ✅ USE_YOLO = 1
  ✅ FLASK_ENV = production
  ✅ PYTHONUNBUFFERED = 1
  ✅ CORS_ORIGIN = https://your-frontend.vercel.app
```

---

## Step-by-Step Instructions

1. **Build Command:** Clear the field and enter:
   ```
   pip install -r requirements.txt
   ```

2. **Install Command:** Clear the field (leave empty)

3. **Environment Variables:** Click to expand, then add 4 variables:
   - `USE_YOLO` = `1`
   - `FLASK_ENV` = `production`
   - `PYTHONUNBUFFERED` = `1`
   - `CORS_ORIGIN` = `https://your-frontend.vercel.app`

4. **Click "Deploy"**

---

## ⚠️ Important Notes

### About CORS_ORIGIN
- Deploy your **frontend FIRST**
- Get the frontend URL
- Come back and set `CORS_ORIGIN` to that URL
- Or set it to `*` temporarily, then change it later

### Order of Deployment
1. Deploy frontend first → Get URL
2. Deploy backend → Set CORS_ORIGIN to frontend URL
3. Then set VITE_API_URL in frontend → Point to backend URL

---

## Quick Reference

**If you're unsure about any field, use these values:**

| Field | Value |
|-------|-------|
| Framework | Flask |
| Root Dir | backend |
| Build Cmd | `pip install -r requirements.txt` |
| Output Dir | (empty) |
| Install Cmd | (empty) |
| USE_YOLO | 1 |
| FLASK_ENV | production |
| PYTHONUNBUFFERED | 1 |
| CORS_ORIGIN | https://frontend-url.vercel.app |

---

**Ready to deploy? Fill in these values and click "Deploy"!** ✅
