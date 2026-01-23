import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limiter import limiter
from routers.pdf_router import router as pdf_router
from routers.messages_router import router as messages_router
from routers.pdf_template_router import router as pdf_template_router
from routers.qff_travel_router import router as qff_travel_router
from routers.collection_router import router as collection_router
from routers.yif_router import router as yif_router
from routers.yif_data_router import router as yif_data_router
from routers.yif_ious_router import router as yif_ious_router
from routers.yif_migration_router import router as yif_migration_router
from routers.yif_stats_router import router as yif_stats_router
from routers.yif_team_router import router as yif_team_router
from routers.accounting_router import router as accounting_router
from routers.contact_router import router as contact_router
from routers.gpu_monitor_router import router as gpu_monitor_router
from database import init_yif_triggers
import uvicorn
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# Migration router added
# Updated role support in login/verify

app = FastAPI(title="Hoshipu Backend API", version="1.0.0")

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:6001,http://localhost:3000,http://10.0.0.122:6001,https://www.hoshipu.top,https://hoshipu.top"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf_router, prefix="/api/pdf", tags=["PDF Processing"])
app.include_router(messages_router)
app.include_router(pdf_template_router)
app.include_router(qff_travel_router)
app.include_router(collection_router)
app.include_router(yif_router)
app.include_router(yif_data_router)
app.include_router(yif_ious_router)
app.include_router(yif_migration_router)
app.include_router(yif_stats_router)
app.include_router(yif_team_router)
app.include_router(accounting_router)
app.include_router(contact_router)
app.include_router(gpu_monitor_router)

# Initialize YIF triggers (backup safety net, auto-creates if not exists)
init_yif_triggers()

@app.get("/")
async def root():
    return {"message": "Hoshipu Backend API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 6101))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
