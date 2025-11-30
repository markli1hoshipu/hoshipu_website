# Deployment Guide

## Environment Setup

### Frontend (Next.js)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. Update `.env.local` with your production backend URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   ```

3. Build and deploy:
   ```bash
   npm run build
   npm start
   ```

### Backend (FastAPI)

1. Create Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create `.env` file (optional):
   ```bash
   cp .env.example .env
   ```

4. Run the server:
   ```bash
   python main.py
   ```

## Deployment Options

### Frontend Deployment

**Vercel (Recommended)**
- Connect your GitHub repository
- Set environment variable: `NEXT_PUBLIC_API_URL`
- Deploy automatically

**Netlify**
- Connect repository
- Build command: `npm run build`
- Publish directory: `.next`
- Set environment variable: `NEXT_PUBLIC_API_URL`

### Backend Deployment

**Railway**
- Connect repository
- Detect Python buildpack
- Set port to environment variable

**Render**
- Create new Web Service
- Build command: `pip install -r requirements.txt`
- Start command: `python main.py`

**Docker (Optional)**
- Backend includes Dockerfile support
- Build: `docker build -t backend .`
- Run: `docker run -p 6101:6101 backend`

## Environment Variables

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Backend
- `PORT`: Server port (default: 6101)
- `ALLOWED_ORIGINS`: CORS allowed origins

## CORS Configuration

Update `backend/main.py` to include your production frontend URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:6001",
        "https://your-frontend-domain.com"  # Add your production URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
