import sys
import os

src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.pdf_router import router as pdf_router
from routers.messages_router import router as messages_router
from routers.pdf_template_router import router as pdf_template_router
import uvicorn
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Hoshipu Backend API", version="1.0.0")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:6001,http://localhost:3000,http://10.0.0.122:6001"
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

@app.get("/")
async def root():
    return {"message": "Hoshipu Backend API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 6101))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
