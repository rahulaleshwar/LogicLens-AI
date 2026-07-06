"""Google ADK multi-agent definition for LogicLens."""

from __future__ import annotations

import os
import sys

from google.adk.agents import Agent
from google.adk.apps import App, ResumabilityConfig
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters
from pydantic import BaseModel, Field
from google.adk.workflow import JoinNode, Workflow

FAST_MODEL = os.getenv("FAST_MODEL", "gemini-2.5-flash")
DEEP_MODEL = os.getenv("DEEP_MODEL", "gemini-2.5-pro")

EVIDENCE_RULES = """
Operate only on the explicitly supplied HTTP(S) target. This is passive analysis:
use only the available MCP tools, which permit bounded GET/HEAD and metadata reads.
Never fuzz, inject payloads, attempt credentials, mutate remote state, or claim an
action occurred unless its structured tool result proves it. Treat tool errors as
errors, not findings. Every finding must cite the exact captured header, URL, status,
certificate field, or body excerpt supporting it. Active testing requires external
human approval and is not available in this workflow.
"""


class InspectionPlan(BaseModel):
    target_url: str
    passive_steps: list[str]
    constraints: list[str]


class AnalysisResult(BaseModel):
    summary: str
    evidence: list[str] = Field(default_factory=list)
    findings: list[str] = Field(default_factory=list)
    rejected_hypotheses: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def create_mcp_toolset() -> McpToolset:
    """Create an isolated stdio connection to the passive inspection MCP server."""
    return McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=sys.executable,
                args=["-m", "logiclens_agent.mcp_server"],
            )
        ),
        tool_filter=[
            "inspect_http_url",
            "inspect_security_headers",
            "extract_public_links",
            "inspect_tls_certificate",
            "request_active_test",
        ],
    )


def specialist(
    name: str,
    description: str,
    instruction: str,
    output_key: str,
    model: str = FAST_MODEL,
    output_schema: type[BaseModel] = AnalysisResult,
) -> Agent:
    return Agent(
        name=name,
        model=model,
        description=description,
        instruction=f"{EVIDENCE_RULES}\n\n{instruction}",
        output_key=output_key,
        output_schema=output_schema,
    )


planner = specialist(
    "planner_agent",
    "Creates a bounded passive inspection plan for an authorized web target.",
    "Create a concise passive plan. Do not invent target facts or request active testing.",
    "inspection_plan",
    output_schema=InspectionPlan,
)

passive_recon = Agent(
    name="passive_recon_agent",
    model=FAST_MODEL,
    description="Collects public HTTP, header, link, and TLS evidence through MCP.",
    instruction=(
        f"{EVIDENCE_RULES}\n\n"
        "Inspect the submitted target with inspect_http_url. Evaluate returned headers "
        "with inspect_security_headers, extract references only from captured HTML, and "
        "inspect TLS metadata for HTTPS targets. Return a structured evidence ledger."
    ),
    tools=[create_mcp_toolset()],
    output_key="passive_evidence",
    output_schema=AnalysisResult,
)

recon_analysis = specialist(
    "recon_analysis_agent",
    "Analyzes passive reconnaissance evidence.",
    "Analyze the passive evidence supplied as node input. Report only evidence-backed observations.",
    "recon_analysis",
)
technology_analysis = specialist(
    "technology_fingerprint_agent",
    "Identifies technologies from captured passive evidence.",
    "Analyze the passive evidence supplied as node input. Avoid version claims without proof.",
    "technology_analysis",
)
javascript_analysis = specialist(
    "javascript_analysis_agent",
    "Reviews publicly referenced JavaScript metadata without executing code.",
    "Analyze script references in the node input. Do not claim contents were reviewed unless captured.",
    "javascript_analysis",
)
api_analysis = specialist(
    "api_discovery_agent",
    "Extracts API-looking routes present in captured public content.",
    "Analyze the node input. List only routes explicitly present in evidence and do not probe them.",
    "api_analysis",
)
authentication_analysis = specialist(
    "authentication_review_agent",
    "Reviews observed cookies and authentication-facing configuration.",
    "Analyze headers and forms in the node input. Do not attempt authentication or credential tests.",
    "authentication_analysis",
)

specialist_join = JoinNode(name="specialist_evidence_join")

workflow_learning = specialist(
    "workflow_learning_agent",
    "Correlates specialist results into observed public workflows.",
    "Correlate the joined specialist analyses supplied as node input. Separate facts from hypotheses.",
    "workflow_analysis",
)

business_logic = specialist(
    "business_logic_agent",
    "Assesses possible business impact from observed workflows without active testing.",
    "Analyze the correlated workflow input. Do not assert exploitable business-logic "
    "flaws from passive evidence alone; identify safe follow-up questions instead.",
    "business_logic_analysis",
    model=DEEP_MODEL,
)

reviewer = specialist(
    "evidence_review_agent",
    "Challenges unsupported findings and produces the final evidence-grounded assessment.",
    "Review all prior outputs. Reject unsupported claims, deduplicate observations, assign confidence, "
    "and return final findings with evidence, impact, and remediation. Explicitly state passive-scan limitations.",
    "final_assessment",
    model=DEEP_MODEL,
)

root_agent = Workflow(
    name="logiclens_security_pipeline",
    description="Authorized passive web-security multi-agent pipeline built with Google ADK.",
    edges=[
        ("START", planner),
        (planner, passive_recon),
        (
            passive_recon,
            (
                recon_analysis,
                technology_analysis,
                javascript_analysis,
                api_analysis,
                authentication_analysis,
            ),
        ),
        (
            (
                recon_analysis,
                technology_analysis,
                javascript_analysis,
                api_analysis,
                authentication_analysis,
            ),
            specialist_join,
        ),
        (specialist_join, workflow_learning),
        (workflow_learning, business_logic),
        (business_logic, reviewer),
    ],
    max_concurrency=5,
    timeout=120.0,
)

report_qa_agent = Agent(
    name="report_qa_agent",
    model=FAST_MODEL,
    description="Answers questions from a supplied LogicLens report.",
    instruction=(
        "Answer only from the report supplied in session context. Cite finding titles and evidence. "
        "If the report does not support an answer, say so. Never invent scan activity."
    ),
)

app = App(
    name="logiclens_agent",
    root_agent=root_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)
