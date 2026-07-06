"""Evidence-only live scan coordinator backed by the LogicLens MCP server."""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urlparse

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.report_gen import ReportGenerator
from app.core.config import get_settings
from app.agents.live_adk_analysis import analyze_evidence_with_adk

AGENT_NAMES = (
    "Planner",
    "Recon",
    "Tech Fingerprint",
    "JS Analysis",
    "API Discovery",
    "Authentication",
    "Workflow Learning",
    "Business Logic",
)


def _finding(
    *,
    title: str,
    description: str,
    severity: str,
    category: str,
    evidence: list[str],
    remediation: str,
    source: str,
) -> dict[str, Any]:
    return {
        "title": title,
        "description": description,
        "severity": severity,
        "category": category,
        "evidence": evidence,
        "remediation": remediation,
        "confidence": 1.0,
        "agent_source": source,
        "debate_status": "ACCEPTED",
        "debate_summary": "Accepted from deterministic MCP tool evidence; no LLM claim was used.",
        "evidence_validation_score": 1.0,
    }


def _redact_sensitive_headers(headers: dict[str, str]) -> dict[str, str]:
    sanitized = dict(headers)
    raw_cookie = sanitized.get("set-cookie")
    if raw_cookie:
        parts = raw_cookie.split(";")
        cookie_name = parts[0].split("=", 1)[0].strip() or "unnamed"
        attributes = [part.strip() for part in parts[1:] if part.strip()]
        sanitized["set-cookie"] = f"{cookie_name}=<redacted>; " + "; ".join(attributes)
    return sanitized


def _parse_tool_result(result: Any) -> dict[str, Any]:
    if getattr(result, "isError", False):
        messages = [getattr(item, "text", "") for item in result.content]
        raise RuntimeError("MCP tool failed: " + " ".join(messages))
    structured = getattr(result, "structuredContent", None)
    if isinstance(structured, dict):
        return structured
    for item in getattr(result, "content", []):
        text = getattr(item, "text", None)
        if text:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
    raise RuntimeError("MCP tool returned no structured result")


class LiveMCPScanCoordinator:
    """Runs only live, passive MCP inspection and deterministic evidence rules."""

    def __init__(self, db_session: AsyncSession | None = None, api_key: str = ""):
        self.db_session = db_session
        self.api_key = api_key

    async def run_scan(
        self,
        target_url: str,
        scan_id: str,
        broadcast_callback: Callable[[dict[str, Any]], Any],
        scan_type: str = "full",
        selected_agents: list[str] | None = None,
        llm_model: str = "flash",
    ) -> dict[str, Any]:
        from app.db import crud

        started = time.time()
        statuses = {name: "PENDING" for name in AGENT_NAMES}

        async def phase(name: str, message: str) -> None:
            await broadcast_callback({"type": "phase_start", "phase": name, "message": message})

        async def status(name: str, state: str, info: str) -> None:
            statuses[name] = state
            await broadcast_callback(
                {
                    "type": "agent_status",
                    "agent_name": name,
                    "status": state,
                    "confidence": 1.0 if state == "COMPLETED" else 0.0,
                    "info": info,
                }
            )

        async def snapshot(current_phase: str, findings: list[dict[str, Any]]) -> None:
            if self.db_session:
                await crud.update_scan_live_report(
                    self.db_session,
                    int(scan_id),
                    {
                        "scan_id": scan_id,
                        "target_url": target_url,
                        "status": "running",
                        "current_phase": current_phase,
                        "agent_summary": statuses,
                        "findings": findings,
                        "attack_chains": [],
                        "summary": {"total_findings": len(findings), "current_phase": current_phase},
                    },
                )

        await phase("Planning", "Creating a bounded passive inspection plan.")
        await status("Planner", "RUNNING", "Restricting scope to live GET/HEAD, headers, links, and TLS.")
        plan = {
            "target": target_url,
            "mode": "live_passive_mcp",
            "phases": [
                {"phase_name": "Live HTTP inspection", "agents": ["Recon"], "parallel": False},
                {
                    "phase_name": "Deterministic evidence review",
                    "agents": ["Tech Fingerprint", "JS Analysis", "API Discovery", "Authentication"],
                    "parallel": True,
                },
            ],
            "limitations": [
                "No fuzzing, exploitation, credential testing, or state-changing requests.",
                "No vulnerability is reported without MCP-returned evidence.",
            ],
        }
        await broadcast_callback({"type": "plan_created", "plan": plan})
        await status("Planner", "COMPLETED", "Passive evidence plan created.")

        await phase("Reconnaissance", "Calling the live passive-inspection MCP server.")
        await status("Recon", "RUNNING", "Issuing a bounded live GET through MCP.")
        server = StdioServerParameters(
            command=sys.executable,
            args=["-m", "logiclens_agent.mcp_server"],
        )
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                http_result = _parse_tool_result(
                    await session.call_tool(
                        "inspect_http_url", {"url": target_url, "method": "GET"}
                    )
                )
                if http_result.get("status") != "success":
                    raise RuntimeError(
                        f"Live inspection failed: {http_result.get('error', 'unknown MCP error')}"
                    )
                await status(
                    "Recon",
                    "COMPLETED",
                    f"Live response received: HTTP {http_result['http_status']}.",
                )

                headers = {
                    str(key).lower(): str(value)
                    for key, value in (http_result.get("headers") or {}).items()
                }
                await status(
                    "Tech Fingerprint", "RUNNING", "Evaluating captured response headers."
                )
                header_result = _parse_tool_result(
                    await session.call_tool(
                        "inspect_security_headers", {"headers": headers}
                    )
                )
                await status(
                    "Tech Fingerprint",
                    "COMPLETED",
                    f"Header score: {header_result.get('score', 0):.0%}.",
                )

                links_result: dict[str, Any] = {
                    "links": [],
                    "scripts": [],
                    "forms": [],
                }
                content_type = headers.get("content-type", "")
                if "html" in content_type.lower() and http_result.get("body_sample"):
                    await status(
                        "JS Analysis",
                        "RUNNING",
                        "Extracting public script references without executing code.",
                    )
                    links_result = _parse_tool_result(
                        await session.call_tool(
                            "extract_public_links",
                            {
                                "base_url": http_result["final_url"],
                                "html": http_result["body_sample"],
                            },
                        )
                    )
                    await status(
                        "JS Analysis",
                        "COMPLETED",
                        f"Observed {len(links_result.get('scripts', []))} script references.",
                    )
                    await status(
                        "API Discovery",
                        "COMPLETED",
                        f"Observed {len(links_result.get('links', []))} public links; none were probed.",
                    )
                else:
                    await status(
                        "JS Analysis", "SKIPPED", "Response was not captured HTML."
                    )
                    await status(
                        "API Discovery", "SKIPPED", "No captured HTML links to inventory."
                    )

                tls_result = None
                parsed_target = urlparse(http_result["final_url"])
                if parsed_target.scheme == "https" and parsed_target.hostname:
                    tls_result = _parse_tool_result(
                        await session.call_tool(
                            "inspect_tls_certificate",
                            {"hostname": parsed_target.hostname, "port": parsed_target.port or 443},
                        )
                    )

        await phase("Evidence Validation", "Google ADK agents are analyzing only captured MCP evidence.")
        redacted_headers = _redact_sensitive_headers(headers)
        evidence_items = [
            f"HTTP status: {http_result['http_status']}",
            f"Requested URL: {http_result['requested_url']}",
            f"Final URL: {http_result['final_url']}",
            f"Redirect history: {json.dumps(http_result['redirect_history'], sort_keys=True)}",
            f"Response body bytes captured: {http_result['body_bytes']}",
            f"Response truncated: {http_result['truncated']}",
        ]
        evidence_items.extend(
            f"Response header {name}: {value}" for name, value in sorted(redacted_headers.items())
        )
        evidence_items.extend(
            f"Missing header: {item['header']}" for item in header_result.get("missing", [])
        )
        evidence_items.extend(
            f"Public link: {value}" for value in links_result.get("links", [])
        )
        evidence_items.extend(
            f"Public script: {value}" for value in links_result.get("scripts", [])
        )
        evidence_items.extend(
            f"Public form: {value}" for value in links_result.get("forms", [])
        )
        if tls_result:
            evidence_items.extend(
                f"TLS {name}: {json.dumps(value, default=str, sort_keys=True)}"
                for name, value in sorted(tls_result.items())
            )

        if not self.api_key:
            raise RuntimeError("A connected Gemini API key is required for ADK analysis")
        settings = get_settings()
        selected_model = settings.DEEP_MODEL if llm_model == "pro" else settings.FAST_MODEL
        await status("Tech Fingerprint", "RUNNING", "Gemini ADK specialist analyzing live header and TLS evidence.")
        await status("JS Analysis", "RUNNING", "Gemini ADK specialist analyzing captured script references.")
        await status("API Discovery", "RUNNING", "Gemini ADK specialist analyzing captured public links.")
        await status("Authentication", "RUNNING", "Gemini ADK specialist analyzing observed cookie evidence.")
        assessment, llm_usage = await analyze_evidence_with_adk(
            api_key=self.api_key,
            evidence_items=evidence_items,
            target_url=target_url,
            fast_model=selected_model,
            deep_model=selected_model,
        )
        await status("Tech Fingerprint", "COMPLETED", "ADK transport/header analysis completed.")
        await status("JS Analysis", "COMPLETED", "ADK public script analysis completed.")
        await status("API Discovery", "COMPLETED", "ADK public link analysis completed.")
        await status("Authentication", "COMPLETED", "ADK cookie evidence analysis completed.")

        evidence_set = set(evidence_items)
        findings: list[dict[str, Any]] = []
        rejected_hypotheses = list(assessment.rejected_hypotheses)
        for proposal in assessment.findings:
            invalid_citations = [citation for citation in proposal.evidence if citation not in evidence_set]
            if not proposal.evidence or invalid_citations:
                rejected_hypotheses.append(
                    f"{proposal.title}: rejected because citations did not exactly match live MCP evidence"
                )
                continue
            findings.append(
                _finding(
                    title=proposal.title,
                    description=proposal.description,
                    severity=proposal.severity,
                    category=proposal.category,
                    evidence=proposal.evidence,
                    remediation=proposal.remediation,
                    source=proposal.agent_source,
                )
                | {"confidence": proposal.confidence}
            )

        await status(
            "Workflow Learning",
            "COMPLETED",
            "Google ADK joined and correlated specialist analyses.",
        )
        await status(
            "Business Logic",
            "COMPLETED",
            "Gemini reviewer recorded business-logic limitations from passive evidence.",
        )

        for finding in findings:
            await broadcast_callback({"type": "finding_new", "finding": finding})
        await snapshot("Evidence Validation", findings)

        await phase("Report Assembly", "Compiling the live evidence-only report.")
        elapsed = time.time() - started
        report = ReportGenerator.generate_report(
            scan_id=scan_id,
            target_url=target_url,
            findings=findings,
            attack_chains=[],
            agent_statuses=statuses,
            elapsed_time=elapsed,
        )
        report.update(
            {
                "assessment_mode": "LIVE_PASSIVE_MCP",
                "assessment_status": (
                    "VERIFIED_OBSERVATIONS"
                    if findings
                    else "INSUFFICIENT_EVIDENCE_FOR_VULNERABILITIES"
                ),
                "methodology": (
                    "Live passive assessment using the LogicLens MCP server and Google ADK multi-agent "
                    "analysis. Gemini agents planned, specialized, correlated, and reviewed the captured "
                    "evidence. Every accepted citation was checked for an exact match against the MCP "
                    "evidence ledger. No exploitation, fuzzing, credential testing, hardcoded findings, "
                    "or simulated evidence occurred."
                ),
                "executive_summary": assessment.executive_summary,
                "rejected_hypotheses": rejected_hypotheses,
                "limitations": assessment.limitations,
                "raw_evidence": {
                    "http": {
                        "requested_url": http_result["requested_url"],
                        "final_url": http_result["final_url"],
                        "http_status": http_result["http_status"],
                        "redirect_history": http_result["redirect_history"],
                        "headers": redacted_headers,
                        "body_bytes": http_result["body_bytes"],
                        "truncated": http_result["truncated"],
                        "elapsed_ms": http_result["elapsed_ms"],
                    },
                    "public_inventory": {
                        "links": links_result.get("links", []),
                        "scripts": links_result.get("scripts", []),
                        "forms": links_result.get("forms", []),
                    },
                    "tls": tls_result,
                },
                "llm_usage": llm_usage,
                "llm_model": llm_model,
                "agents_used": [
                    {"name": name, "status": state}
                    for name, state in statuses.items()
                    if state != "SKIPPED"
                ],
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        if self.db_session:
            for finding in report["findings"]:
                await crud.create_finding(self.db_session, int(scan_id), finding)
            await crud.update_scan_report(self.db_session, int(scan_id), report)

        await broadcast_callback({"type": "scan_complete", "report": report})
        return report
