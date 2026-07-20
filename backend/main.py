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
from routers.gjp_invoice_router import router as gjp_invoice_router
from routers.ae_qff_router import router as ae_qff_router
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
from routers.passport_router import router as passport_router
from routers.quiz_router import router as quiz_router
from routers.guandan_router import router as guandan_router
from routers.bench_router import router as bench_router, reclaim_stale_jobs_loop
from database import (
    init_yif_triggers, init_embodybench_tables, init_passport_log_table,
    init_quiz_leaderboard_table, init_guandan_tables,
)
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


@app.middleware("http")
async def _trim_memory_after_uploads(request: Request, call_next):
    """File uploads (images/PDF/Excel) decode into big transient buffers. On the
    512MB instance, glibc keeps that freed memory in its arenas, so RSS ratchets
    up across uploads until OOM. After any multipart request, return freed memory
    to the OS. Runs only on uploads, so the overhead is negligible."""
    response = await call_next(request)
    try:
        if request.headers.get("content-type", "").startswith("multipart/form-data"):
            from memutil import release_memory
            release_memory()
    except Exception:
        pass
    return response


app.include_router(pdf_router, prefix="/api/pdf", tags=["PDF Processing"])
app.include_router(messages_router)
app.include_router(pdf_template_router)
app.include_router(gjp_invoice_router)
app.include_router(ae_qff_router)
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
app.include_router(passport_router)
app.include_router(quiz_router)
app.include_router(guandan_router)
app.include_router(bench_router)

# Initialize YIF triggers (backup safety net, auto-creates if not exists)
init_yif_triggers()

# Initialize EmbodyBench tables (auto-creates if not exists)
init_embodybench_tables()

# Initialize passport→DOCS audit log table (auto-creates if not exists)
init_passport_log_table()

# Initialize code-quiz leaderboard table (auto-creates if not exists)
init_quiz_leaderboard_table()

# Initialize Guandan online tables (auto-creates if not exists)
init_guandan_tables()


@app.on_event("startup")
async def _start_embodybench_reclaim_loop():
    """Start the heartbeat-reclaim background task on app boot."""
    import asyncio
    app.state.embodybench_reclaim_task = asyncio.create_task(reclaim_stale_jobs_loop())


@app.on_event("shutdown")
async def _stop_embodybench_reclaim_loop():
    import asyncio
    task = getattr(app.state, "embodybench_reclaim_task", None)
    if task and not task.done():
        task.cancel()
        try:
            await task
        # CancelledError 是 BaseException 的子类，不会被 `except Exception` 捕获，
        # 必须显式捕获，否则关停时会报 "Application shutdown failed"。
        except (asyncio.CancelledError, Exception):
            pass


@app.get("/")
async def root():
    return {"message": "Hoshipu Backend API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 6101))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
