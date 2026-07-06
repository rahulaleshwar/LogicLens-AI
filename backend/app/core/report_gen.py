"""
LogicLens AI - Report Generator

Assembles findings, debates, attack chains, and metadata into a professional penetration testing report.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger("logiclens.core.report_gen")


class ReportGenerator:
    """Aggregates all scan outputs and creates the final structured report."""

    @staticmethod
    def _normalize_attack_chain(chain: Dict[str, Any]) -> Dict[str, Any]:
        """Return a frontend/PDF friendly attack-chain schema."""
        steps = []
        for index, step in enumerate(chain.get("steps", []), start=1):
            steps.append({
                "step_number": step.get("step_number", index),
                "finding_title": step.get("finding_title", ""),
                "action": step.get("action", ""),
                "evidence": step.get("evidence", step.get("finding_title", "")),
            })

        return {
            "title": chain.get("title") or chain.get("chain_name") or "Attack Chain",
            "max_severity": chain.get("max_severity") or chain.get("composite_severity") or "HIGH",
            "description": chain.get("description") or chain.get("narrative") or "",
            "steps": steps,
            "remediation": chain.get("remediation", ""),
        }

    @staticmethod
    def generate_report(
        scan_id: str,
        target_url: str,
        findings: List[Dict[str, Any]],
        attack_chains: List[Dict[str, Any]],
        agent_statuses: Dict[str, str],
        elapsed_time: float
    ) -> Dict[str, Any]:
        """Compiles a complete penetration testing report.

        Only accepts findings that have reached consensus or passed validation.
        """
        logger.info("Generating report for scan %s", scan_id)

        # Include only findings that reached consensus through debate or
        # deterministic evidence validation.
        valid_findings = [
            f for f in findings
            if f.get("debate_status") in ("ACCEPTED", "DOWNGRADED")
        ]

        # Calculate severity counts
        severity_counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
            "INFO": 0
        }
        for f in valid_findings:
            sev = f.get("severity", "INFO").upper()
            if sev in severity_counts:
                severity_counts[sev] += 1
            else:
                severity_counts["INFO"] += 1

        # Calculate overall score (risk rating)
        # Critical = 10, High = 7, Medium = 4, Low = 1
        total_weight = (
            severity_counts["CRITICAL"] * 10 +
            severity_counts["HIGH"] * 7 +
            severity_counts["MEDIUM"] * 4 +
            severity_counts["LOW"] * 1
        )
        total_risk_score = min(100, total_weight * 5)
        
        if total_weight >= 20:
            risk_level = "CRITICAL"
            risk_color = "red"
        elif total_weight >= 10:
            risk_level = "HIGH"
            risk_color = "orange"
        elif total_weight >= 4:
            risk_level = "MEDIUM"
            risk_color = "yellow"
        elif total_weight > 0:
            risk_level = "LOW"
            risk_color = "green"
        else:
            risk_level = "SECURE"
            risk_color = "emerald"

        # Methodology summary
        methodology = (
            "LogicLens AI implements a collaborative multi-agent security assessment. "
            "Instead of a single execution flow, specialized agents (Recon, Technology Fingerprint, "
            "JavaScript Analysis, API Discovery, Authentication Testing) perform analysis in parallel. "
            "Their findings are stored in a Shared Memory layer. Findings are then correlated by the "
            "Workflow Learning and Business Logic agents. High-risk findings undergo an agent-to-agent "
            "debate to challenge findings, evaluate evidence, and remove false positives prior to final inclusion."
        )

        report = {
            "scan_id": scan_id,
            "target_url": target_url,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "elapsed_time_seconds": round(elapsed_time, 2),
            "summary": {
                "risk_level": risk_level,
                "risk_color": risk_color,
                "total_risk_score": total_risk_score,
                "total_findings": len(valid_findings),
                "severity_distribution": severity_counts,
                "agent_team_count": len(agent_statuses)
            },
            "methodology": methodology,
            "findings": valid_findings,
            "attack_chains": [ReportGenerator._normalize_attack_chain(chain) for chain in attack_chains],
            "agent_summary": agent_statuses,
            "hackathon_highlight": "Built for the Google Hackathon: transparent Gemini model and token observability with multi-agent analysis."
        }

        return report
