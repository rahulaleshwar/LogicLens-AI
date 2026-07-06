"""
LogicLens AI - Scans REST endpoints
"""

import asyncio
from typing import List, Any, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, HttpUrl

from app.db.database import get_db
from app.db import crud
from app.agents.live_mcp_coordinator import LiveMCPScanCoordinator
from app.api.websocket import manager
from app.core.byok import require_api_key

router = APIRouter(prefix="/api/scans", tags=["Scans"])


class ScanCreate(BaseModel):
    target_url: str
    scan_type: str = "full"
    selected_agents: Optional[List[str]] = None
    llm_model: Literal["flash", "pro"] = "flash"


class ScanResponse(BaseModel):
    id: int
    target_url: str
    status: str
    scan_type: str
    findings_count: int
    created_at: Any
    completed_at: Any = None
    report_data: Any = None

    class Config:
        from_attributes = True


async def run_scan_task(
    scan_id: int,
    target_url: str,
    scan_type: str = "full",
    selected_agents: Optional[List[str]] = None,
    llm_model: Literal["flash", "pro"] = "flash",
    api_key: str = "",
):
    """Background task to run the coordinator scan."""
    # Obtain a separate db session for the background task
    from app.db.database import async_session_factory
    async with async_session_factory() as db:
        try:
            # Update status to running
            await crud.update_scan_status(db, scan_id, "running")
            
            # WebSocket broadcast callback
            async def broadcast_callback(message: dict):
                # Add scan_id to message
                message["scan_id"] = scan_id
                await manager.broadcast_to_scan(scan_id, message)

            # Initialize coordinator and run
            coordinator = LiveMCPScanCoordinator(db_session=db, api_key=api_key)
            await coordinator.run_scan(
                target_url,
                str(scan_id),
                broadcast_callback,
                scan_type=scan_type,
                selected_agents=selected_agents,
                llm_model=llm_model,
            )
            
        except Exception as e:
            # Update status to failed
            await crud.update_scan_status(db, scan_id, "failed")
            await manager.broadcast_to_scan(scan_id, {
                "type": "scan_failed",
                "scan_id": scan_id,
                "error": str(e)
            })


@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    payload: ScanCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    """Create a scan and trigger it in the background."""
    # Validate target url
    target = payload.target_url.strip()
    if not (target.startswith("http://") or target.startswith("https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid target URL. Must start with http:// or https://"
        )

    scan = await crud.create_scan(db, target_url=target, scan_type=payload.scan_type)
    
    # Start scan in the background
    background_tasks.add_task(
        run_scan_task,
        scan.id,
        target,
        payload.scan_type,
        payload.selected_agents,
        payload.llm_model,
        api_key,
    )
    
    return scan


@router.get("", response_model=List[ScanResponse])
async def list_scans(db: AsyncSession = Depends(get_db)):
    """Retrieve all scans."""
    return await crud.get_scans(db)


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Get scan by ID."""
    scan = await crud.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a scan."""
    deleted = await crud.delete_scan(db, scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    return None
