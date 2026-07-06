"""Per-scan Google ADK analysis over a live MCP evidence ledger."""

from __future__ import annotations

import json
from functools import cached_property
from typing import Any, Literal

from google import genai
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.runners import InMemoryRunner
from google.adk.workflow import JoinNode, Workflow
from google.genai import types
from pydantic import BaseModel, Field


class AnalysisSummary(BaseModel):
    summary: str
    observations: list[str] = Field(default_factory=list)
    unsupported_hypotheses: list[str] = Field(default_factory=list)


class FindingProposal(BaseModel):
    title: str
    description: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    category: str
    evidence: list[str]
    remediation: str
    confidence: float = Field(ge=0.0, le=1.0)
    agent_source: str


class FinalAssessment(BaseModel):
    executive_summary: str
    findings: list[FindingProposal] = Field(default_factory=list)
    rejected_hypotheses: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def _session_model(api_key: str, model_name: str) -> Gemini:
    class SessionGemini(Gemini):
        @cached_property
        def api_client(self) -> genai.Client:
            return genai.Client(api_key=api_key)

    return SessionGemini(model=model_name)


def _analyst(
    *,
    name: str,
    role: str,
    api_key: str,
    model: str,
) -> Agent:
    return Agent(
        name=name,
        model=_session_model(api_key, model),
        description=role,
        instruction=(
            f"You are the LogicLens {role}. Analyze only the LIVE MCP EVIDENCE LEDGER in the "
            "user message. Do not claim any request, response, endpoint, software version, exploit, "
            "or behavior not explicitly present there. Absence observations may cite an exact "
            "'Missing header:' ledger entry. Separate unsupported hypotheses explicitly. "
            "This is passive inspection; never imply active testing occurred."
        ),
        output_schema=AnalysisSummary,
    )


def build_analysis_workflow(api_key: str, fast_model: str, deep_model: str) -> Workflow:
    planner = Agent(
        name="live_evidence_planner",
        model=_session_model(api_key, fast_model),
        description="Plans analysis of a completed live MCP evidence ledger.",
        instruction=(
            "Create an analysis plan for the supplied LIVE MCP EVIDENCE LEDGER. The evidence has "
            "already been collected. Do not invent scan actions or request active testing."
        ),
        output_schema=AnalysisSummary,
    )
    transport = _analyst(
        name="transport_header_analyst",
        role="transport and security-header analyst",
        api_key=api_key,
        model=fast_model,
    )
    cookie = _analyst(
        name="cookie_analyst",
        role="cookie-attribute analyst",
        api_key=api_key,
        model=fast_model,
    )
    inventory = _analyst(
        name="public_inventory_analyst",
        role="public link and script inventory analyst",
        api_key=api_key,
        model=fast_model,
    )
    tls = _analyst(
        name="tls_analyst",
        role="TLS certificate metadata analyst",
        api_key=api_key,
        model=fast_model,
    )
    join = JoinNode(name="specialist_join")
    reviewer = Agent(
        name="evidence_gate_reviewer",
        model=_session_model(api_key, deep_model),
        description="Produces final findings whose citations exactly match the live evidence ledger.",
        instruction=(
            "Review the joined specialist analyses against the LIVE MCP EVIDENCE LEDGER in the "
            "original user message. Return a finding only when every evidence item is copied "
            "verbatim from an EVIDENCE ITEM line. Missing-header findings must cite the exact "
            "'Missing header: <name>' item. Reject authorization, injection, rate-limit, secret, "
            "version, business-logic, and exploit claims unless directly proven by the ledger. "
            "If nothing supports a vulnerability, return an empty findings list and state "
            "'insufficient evidence' in limitations."
        ),
        output_schema=FinalAssessment,
    )
    return Workflow(
        name="logiclens_live_adk_analysis",
        description="Google ADK multi-agent analysis of live MCP evidence.",
        edges=[
            ("START", planner),
            (planner, (transport, cookie, inventory, tls)),
            ((transport, cookie, inventory, tls), join),
            (join, reviewer),
        ],
        max_concurrency=4,
        timeout=180.0,
    )


async def analyze_evidence_with_adk(
    *,
    api_key: str,
    evidence_items: list[str],
    target_url: str,
    fast_model: str,
    deep_model: str,
) -> tuple[FinalAssessment, dict[str, Any]]:
    workflow = build_analysis_workflow(api_key, fast_model, deep_model)
    app_name = "logiclens_live_scan"
    runner = InMemoryRunner(app=App(name=app_name, root_agent=workflow))
    session = await runner.session_service.create_session(app_name=app_name, user_id="byok-user")
    prompt = (
        f"AUTHORIZED TARGET: {target_url}\n"
        "LIVE MCP EVIDENCE LEDGER:\n"
        + "\n".join(f"EVIDENCE ITEM: {item}" for item in evidence_items)
    )
    final_output: dict[str, Any] | None = None
    usage_runs: list[dict[str, Any]] = []
    async for event in runner.run_async(
        user_id="byok-user",
        session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=prompt)]),
    ):
        output = getattr(event, "output", None)
        if isinstance(output, dict) and "findings" in output:
            final_output = output
        usage = getattr(event, "usage_metadata", None)
        if usage:
            prompt_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
            output_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
            usage_runs.append(
                {
                    "run": len(usage_runs) + 1,
                    "agent": getattr(event, "author", "ADK agent"),
                    "purpose": "live MCP evidence analysis",
                    "model": deep_model if getattr(event, "author", "") == "evidence_gate_reviewer" else fast_model,
                    "prompt_tokens": prompt_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": int(getattr(usage, "total_token_count", 0) or prompt_tokens + output_tokens),
                    "simulated": False,
                }
            )
    if final_output is None:
        raise RuntimeError("ADK analysis completed without a final structured assessment")
    assessment = FinalAssessment.model_validate(final_output)
    totals = {
        key: sum(run[key] for run in usage_runs)
        for key in ("prompt_tokens", "output_tokens", "total_tokens")
    }
    totals["runs"] = len(usage_runs)
    by_model: dict[str, dict[str, Any]] = {}
    for run in usage_runs:
        bucket = by_model.setdefault(
            run["model"],
            {
                "model": run["model"],
                "runs": 0,
                "prompt_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
            },
        )
        bucket["runs"] += 1
        for key in ("prompt_tokens", "output_tokens", "total_tokens"):
            bucket[key] += run[key]
    return assessment, {"runs": usage_runs, "by_model": list(by_model.values()), "totals": totals}
