"""
LogicLens AI - Reports REST endpoints
"""

from typing import List, Any, Dict
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.core.pdf_gen import generate_pdf_report
from app.core.config import get_settings
from app.core.llm import get_llm_client
from app.core.llm_usage import record_usage
from app.core.byok import require_api_key

router = APIRouter(prefix="/api/scans", tags=["Reports"])


class AnalysisQuestion(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


@router.post("/{scan_id}/analysis/chat")
async def chat_with_analysis(
    payload: AnalysisQuestion,
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    """Answer questions using only the completed scan report as grounding."""
    scan = await crud.get_scan(db, scan_id)
    if not scan or not scan.report_data:
        raise HTTPException(status_code=404, detail="Completed scan analysis not found")

    settings = get_settings()
    model = settings.FAST_MODEL
    report_context = json.dumps(scan.report_data, default=str)[:120000]
    prompt = (
        "You are the LogicLens Analysis Assistant. Answer only from the supplied security "
        "report. If the report does not support an answer, say so. Be concise, cite finding "
        "titles when relevant, and never invent evidence.\n\n"
        f"REPORT:\n{report_context}\n\nQUESTION:\n{payload.question}"
    )
    client = get_llm_client(api_key)
    if client is None:
        usage = record_usage(
            model=model, agent="Analysis Q&A Assistant",
            purpose="grounded report question answering", simulated=True,
        )
        answer = (
            "The Q&A assistant could not access a Gemini API key. "
            f"This report contains {len(scan.report_data.get('findings', []))} accepted findings. "
            "Configure GEMINI_API_KEY for grounded natural-language answers."
        )
    else:
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config={"temperature": 0.1},
            )
            usage = record_usage(
                model=model, agent="Analysis Q&A Assistant",
                purpose="grounded report question answering", response=response,
            )
            answer = response.text or "No answer was returned."
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Analysis assistant failed: {exc}") from exc
    return {"answer": answer, "model": model, "usage": usage}


def _deserialize_field(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


@router.get("/{scan_id}/report")
async def get_scan_report(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve the generated report for a completed scan."""
    scan = await crud.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    if scan.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Scan report is not available. Status is: {scan.status}"
        )
        
    if not scan.report_data:
        raise HTTPException(
            status_code=404,
            detail="Report data is missing from the database record."
        )
        
    return scan.report_data


@router.get("/{scan_id}/findings")
async def get_scan_findings(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve all findings for a scan."""
    scan = await crud.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    findings = await crud.get_scan_findings(db, scan_id)
    
    # Format database models into JSON response format
    result = []
    for f in findings:
        result.append({
            "id": f.id,
            "scan_id": f.scan_id,
            "title": f.title,
            "description": f.description,
            "severity": f.severity.upper(),
            "category": f.category,
            "evidence": _deserialize_field(f.evidence),
            "remediation": _deserialize_field(f.remediation),
            "confidence": f.confidence,
            "debate_summary": _deserialize_field(f.debate_summary),
            "created_at": f.created_at
        })
        
    return result


@router.get("/{scan_id}/attack-chains")
async def get_attack_chains(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve attack chains from the scan report."""
    scan = await crud.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if not scan.report_data:
        return []

    return scan.report_data.get("attack_chains", [])

@router.get("/{scan_id}/report/pdf")
async def get_scan_report_pdf(scan_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve the generated report for a completed scan as a PDF."""
    scan = await crud.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    if scan.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Scan report is not available. Status is: {scan.status}"
        )
        
    if not scan.report_data:
        raise HTTPException(
            status_code=404,
            detail="Report data is missing from the database record."
        )
        
    findings = await crud.get_scan_findings(db, scan_id)
    
    # Format database models into JSON response format
    findings_list = []
    for f in findings:
        findings_list.append({
            "id": f.id,
            "title": f.title,
            "description": f.description,
            "severity": f.severity.upper(),
            "category": f.category,
            "evidence": _deserialize_field(f.evidence),
            "remediation": _deserialize_field(f.remediation),
        })
    
    # Convert SQLAlchemy model to dict for scan data
    scan_data = {
        "id": scan.id,
        "target_url": scan.target_url,
        "status": scan.status,
        "created_at": scan.created_at
    }
        
    pdf_bytes = generate_pdf_report(scan_data, scan.report_data, findings_list)
    
    # Use StreamingResponse which is much more reliable for binary downloads in browsers
    import base64 as _base64
    pdf_content = bytes(pdf_bytes)
    pdf_b64 = _base64.b64encode(pdf_content).decode('utf-8')
    return {
        "pdf_base64": pdf_b64,
        "filename": f"logiclens-report-{scan_id}.pdf",
        "size": len(pdf_content)
    }
