# Deploy Backend to Render

## Prerequisites
- GitHub account
- Code pushed to GitHub

## Step-by-Step Deployment

### 1. Sign Up for Render
- Go to https://render.com
- Sign up with GitHub

### 2. Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select repository: `Yif_applications`
4. Configure:
   - **Name**: `hoshipu-backend` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `hoshipu-1.0` (or `main`)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Instance Type**: `Free`

### 3. Add Environment Variables
Click **"Advanced"** → Add environment variables:

```
PORT = 10000
ALLOWED_ORIGINS = https://your-vercel-app.vercel.app,http://localhost:6001
```

(You'll update the Vercel URL after deploying frontend)

### 4. Deploy
- Click **"Create Web Service"**
- Wait 5-10 minutes for deployment
- Your backend URL will be: `https://hoshipu-backend.onrender.com`

### 5. Test Backend
Visit: `https://your-backend-url.onrender.com/health`

Should return: `{"status": "healthy"}`

### 6. Update Frontend
In your Vercel deployment, set environment variable:
```
NEXT_PUBLIC_API_URL = https://your-backend-url.onrender.com
```

## Important Notes

⚠️ **Free tier limitations:**
- Spins down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds (cold start)
- 750 hours/month free

💡 **Tips:**
- Keep backend awake with a cron job (ping every 14 minutes)
- Or upgrade to paid tier ($7/month for always-on)

## Troubleshooting

**Build fails?**
- Check `requirements.txt` is correct
- Check Python version compatibility

**CORS errors?**
- Update `ALLOWED_ORIGINS` with your actual Vercel URL
- Include both `https://your-app.vercel.app` and `https://your-app-git-branch.vercel.app`

**500 errors?**
- Check logs in Render dashboard
- Verify all dependencies installed
