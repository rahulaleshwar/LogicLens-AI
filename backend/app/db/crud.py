"""
LogicLens AI - Database CRUD operations
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scan import Scan, Finding, Report


async def create_scan(db: AsyncSession, target_url: str, scan_type: str = "full") -> Scan:
    """Create a new scan record."""
    scan = Scan(
        target_url=target_url,
        status="pending",
        scan_type=scan_type,
        findings_count=0
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


async def get_scan(db: AsyncSession, scan_id: int) -> Optional[Scan]:
    """Retrieve a scan by its primary key ID."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    return result.scalar_one_or_none()


async def get_scans(db: AsyncSession, limit: int = 100) -> List[Scan]:
    """Retrieve a list of scans ordered by creation date descending."""
    result = await db.execute(
        select(Scan).order_by(Scan.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def update_scan_status(db: AsyncSession, scan_id: int, status: str) -> Optional[Scan]:
    """Update the status of a scan."""
    scan = await get_scan(db, scan_id)
    if scan:
        scan.status = status
        if status in ("completed", "failed"):
            scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(scan)
    return scan


async def update_scan_report(db: AsyncSession, scan_id: int, report_data: Dict[str, Any]) -> Optional[Scan]:
    """Save the final report data and complete the scan."""
    scan = await get_scan(db, scan_id)
    if scan:
        scan.status = "completed"
        scan.completed_at = datetime.now(timezone.utc)
        scan.report_data = report_data
        
        # Save a corresponding Report object
        report = Report(scan_id=scan_id, report_data=report_data)
        db.add(report)
        
        await db.commit()
        await db.refresh(scan)
    return scan


async def update_scan_live_report(db: AsyncSession, scan_id: int, report_data: Dict[str, Any]) -> Optional[Scan]:
    """Persist an in-progress scan snapshot for UI hydration and reconnects."""
    scan = await get_scan(db, scan_id)
    if scan:
        scan.report_data = report_data
        if "findings" in report_data and isinstance(report_data["findings"], list):
            scan.findings_count = len(report_data["findings"])
        await db.commit()
        await db.refresh(scan)
    return scan


async def create_finding(db: AsyncSession, scan_id: int, finding_data: Dict[str, Any]) -> Finding:
    """Create a vulnerability finding associated with a scan."""
    
    def serialize_field(field_val: Any) -> str:
        if isinstance(field_val, (list, dict)):
            return json.dumps(field_val)
        return str(field_val) if field_val is not None else ""

    finding = Finding(
        scan_id=scan_id,
        title=finding_data.get("title", ""),
        description=finding_data.get("description", ""),
        severity=finding_data.get("severity", "info").lower(),
        category=finding_data.get("category", "general"),
        evidence=serialize_field(finding_data.get("evidence", "")),
        remediation=serialize_field(finding_data.get("remediation", "")),
        confidence=finding_data.get("confidence", 0.0),
        debate_summary=serialize_field(finding_data.get("debate_summary", ""))
    )
    db.add(finding)
    
    # Update findings count on parent scan
    scan = await get_scan(db, scan_id)
    if scan:
        scan.findings_count += 1
        
    await db.commit()
    await db.refresh(finding)
    return finding


async def get_scan_findings(db: AsyncSession, scan_id: int) -> List[Finding]:
    """Retrieve all findings for a specific scan."""
    result = await db.execute(
        select(Finding).where(Finding.scan_id == scan_id).order_by(Finding.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_scan(db: AsyncSession, scan_id: int) -> bool:
    """Delete a scan and all its cascaded findings/reports."""
    scan = await get_scan(db, scan_id)
    if scan:
        await db.delete(scan)
        await db.commit()
        return True
    return False
