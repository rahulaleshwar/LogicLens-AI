"""
LogicLens AI - FastAPI Backend Entrypoint

Initializes database, routing, CORS, and Websockets for real-time agent logging.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import init_db
from app.api.scans import router as scans_router
from app.api.reports import router as reports_router
from app.api.websocket import manager
from app.api.byok import router as byok_router

# Configure logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("logiclens.main")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    logger.info("Initializing SQLite database tables...")
    await init_db()
    yield
    logger.info("Shutting down LogicLens AI backend...")


app = FastAPI(
    title="LogicLens AI",
    description="Collaborative Multi-Agent Penetration Testing Team Simulator",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.run\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length"],
)

# Include API Router modules
app.include_router(scans_router)
app.include_router(reports_router)
app.include_router(byok_router)


@app.get("/health")
def health_check():
    """Service status health check."""
    return {"status": "healthy", "model_fast": settings.FAST_MODEL, "model_deep": settings.DEEP_MODEL}


@app.websocket("/ws/scans/{scan_id}")
async def websocket_endpoint(websocket: WebSocket, scan_id: int):
    """WebSocket endpoint for real-time scan events."""
    await manager.connect(scan_id, websocket)
    try:
        # Loop to keep the connection alive and handle client closures
        while True:
            # We don't expect messages from client, but we wait for ping or text
            data = await websocket.receive_text()
            logger.info("Received client WebSocket message for scan %s: %s", scan_id, data)
    except WebSocketDisconnect:
        manager.disconnect(scan_id, websocket)
    except Exception as e:
        logger.error("WebSocket exception: %s", e)
        manager.disconnect(scan_id, websocket)
