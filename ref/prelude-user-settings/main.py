import sys
import os

# Add src directory to path for imports
src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.invitations_router import router as invitations_router
from routers.onboarding_router import router as onboarding_router
from routers.activity_router import router as activity_router
from routers.password_auth_router import router as password_auth_router
from routers.email_training_router import router as email_training_router
from routers.signature_router import router as signature_router
from routers.template_router import router as template_router
from routers.oauth_router import router as oauth_router
from routers.writing_style_router import router as writing_style_router
from routers.ai_preferences_router import router as ai_preferences_router
from config.settings import ALLOWED_ORIGINS
from config import settings
import uvicorn
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize auth
from auth import init_auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events."""
    # Startup
    logging.info("User Settings Service starting up...")

    # Initialize authentication
    try:
        init_auth(
            google_client_id=settings.GOOGLE_CLIENT_ID,
            google_client_secret=settings.GOOGLE_CLIENT_SECRET,
            microsoft_client_id=settings.MICROSOFT_CLIENT_ID,
            microsoft_client_secret=settings.MICROSOFT_CLIENT_SECRET,
            microsoft_tenant_id=settings.MICROSOFT_TENANT_ID,
            jwt_secret=settings.JWT_SECRET
        )
        logger.info("Authentication system initialized (Google + Microsoft)")
    except Exception as e:
        logger.error(f"Failed to initialize auth: {e}")

    yield
    # Shutdown
    logging.info("User Settings Service shutting down...")

app = FastAPI(
    title="User Settings & Activity Service",
    description="Service for managing team invitations, user profiles, and activity logging",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - using ALLOWED_ORIGINS from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(invitations_router, tags=["Team Invitations"])
app.include_router(onboarding_router, tags=["Personal Onboarding"])
app.include_router(activity_router, tags=["Activity Logging"])
app.include_router(password_auth_router, tags=["Password Authentication"])
app.include_router(oauth_router, tags=["OAuth Authentication"])
app.include_router(email_training_router, tags=["Email Training"])
app.include_router(signature_router, tags=["Email Signature"])
app.include_router(template_router, tags=["Email Templates"])
app.include_router(writing_style_router, tags=["Writing Style"])
app.include_router(ai_preferences_router, tags=["AI Preferences"])

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "user-settings",
        "port": 8005,
        "features": {
            "team_invitations": True,
            "user_onboarding": True,
            "activity_logging": True,
            "database_routing": True,
            "email_training": True,
            "email_signature": True,
            "email_templates": True,
            "oauth_authentication": True,
            "password_authentication": True,
            "writing_style": True
        }
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8005))
    host = os.environ.get("HOST", "0.0.0.0")
    
    logger.info(f"Starting Team Invitations Service on {host}:{port}")
    logger.info(f"Available endpoints:")
    logger.info(f"   - Health: http://localhost:{port}/health")
    logger.info(f"   - API Docs: http://localhost:{port}/docs")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
