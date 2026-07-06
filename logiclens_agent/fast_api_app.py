"""Cloud Run entrypoint combining the existing product API, React frontend and ADK."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.cli.fast_api import get_fast_api_app

# -------------------------------------------------------
# Paths
# -------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]

BACKEND = ROOT / "backend"

FRONTEND = ROOT / "frontend" / "dist"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

# -------------------------------------------------------
# Existing Backend
# -------------------------------------------------------

from app.main import app  # noqa: E402

# -------------------------------------------------------
# Google ADK
# -------------------------------------------------------

adk_app = get_fast_api_app(
    agents_dir=str(ROOT),
    web=os.getenv("ADK_WEB_UI", "false").lower() == "true",
    allow_origins=os.getenv(
        "ALLOW_ORIGINS",
        "http://localhost:5173",
    ).split(","),
    session_service_uri=None,
)

app.mount("/adk", adk_app)

# -------------------------------------------------------
# Health
# -------------------------------------------------------

@app.get("/adk-health")
def adk_health():
    return {
        "status": "healthy",
        "framework": "Google ADK",
        "mcp_server": "logiclens-passive-security",
    }

# -------------------------------------------------------
# React Static Files
# -------------------------------------------------------

assets = FRONTEND / "assets"

if assets.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=assets),
        name="assets",
    )

# favicon

favicon = FRONTEND / "favicon.svg"

if favicon.exists():

    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon_file():
        return FileResponse(favicon)

# robots

robots = FRONTEND / "robots.txt"

if robots.exists():

    @app.get("/robots.txt", include_in_schema=False)
    async def robots_file():
        return FileResponse(robots)

# -------------------------------------------------------
# React SPA
# -------------------------------------------------------

INDEX = FRONTEND / "index.html"

@app.get("/", include_in_schema=False)
async def home():

    if INDEX.exists():
        return FileResponse(INDEX)

    return {
        "message": "Frontend not built."
    }

@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str):

    # Don't interfere with API routes
    if full_path.startswith("api"):
        return {"detail": "Not Found"}

    if full_path.startswith("adk"):
        return {"detail": "Not Found"}

    requested = FRONTEND / full_path

    if requested.exists() and requested.is_file():
        return FileResponse(requested)

    if INDEX.exists():
        return FileResponse(INDEX)

    return {
        "message": "Frontend not built."
    }