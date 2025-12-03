# Deployment Guide

## Backend Deployment (Render)

### Prerequisites
- GitHub account
- Code pushed to GitHub repository

### Steps

1. **Sign Up for Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click **"New +"** ’ **"Web Service"**
   - Connect your GitHub repository: `hoshipu_website`

3. **Configure Service**
   - **Name**: `hoshipu-backend`
   - **Language**: `Python 3`
   - **Branch**: `hoshipu-1.0`
   - **Region**: `Oregon (US West)` (or closest to you)
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (or `Starter` for $7/month - no sleep)

4. **Add Environment Variables**
   Click **"Advanced"** ’ Add environment variables:
   ```
   PORT = 10000
   ALLOWED_ORIGINS = http://localhost:6001
   ```
   (Update `ALLOWED_ORIGINS` after deploying frontend)

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait 5-10 minutes for deployment
   - Your backend URL: `https://hoshipu-backend.onrender.com`

6. **Test Backend**
   ```bash
   curl https://hoshipu-backend.onrender.com/
   ```
   Should return: `{"message":"Hoshipu Backend API","version":"1.0.0"}`

### Important Notes

  **Free tier limitations:**
- Spins down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds (cold start)
- 750 hours/month free

=¡ **Tips:**
- Keep backend awake with a cron job (ping every 14 minutes)
- Or upgrade to Starter tier ($7/month for always-on)

### Troubleshooting

**Build fails?**
- Check `requirements.txt` is correct
- Check Python version compatibility

**404 errors?**
- Verify **Root Directory** is set to `backend`
- Verify **Start Command** is `uvicorn main:app --host 0.0.0.0 --port $PORT`

**CORS errors?**
- Update `ALLOWED_ORIGINS` with your actual frontend URL
- Include both production and development URLs

**500 errors?**
- Check logs in Render dashboard
- Verify all dependencies installed

---

## Frontend Deployment (Coming Soon)

TODO: Add Vercel deployment instructions
