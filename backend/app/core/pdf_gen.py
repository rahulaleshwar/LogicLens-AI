from fpdf import FPDF
from typing import Any, Dict, List


def _pdf_text(value: Any) -> str:
    """Convert report values to text supported by the built-in PDF fonts."""
    if isinstance(value, (dict, list)):
        import json
        value = json.dumps(value, indent=2, ensure_ascii=False)
    if value is None:
        return ""
    return str(value).encode("latin-1", errors="replace").decode("latin-1")


def _multi_cell(pdf: FPDF, height: float, value: Any, **kwargs: Any) -> None:
    """Render wrapped text with a full usable line width."""
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, height, _pdf_text(value), **kwargs)

class ReportPDF(FPDF):
    NAVY = (9, 17, 32)
    SLATE = (71, 85, 105)
    CYAN = (6, 182, 212)
    LIGHT = (241, 245, 249)

    def header(self):
        self.set_fill_color(*self.NAVY)
        self.rect(0, 0, self.w, 22, style="F")
        self.set_xy(self.l_margin, 6)
        self.set_font("helvetica", "B", 12)
        self.set_text_color(255, 255, 255)
        self.cell(0, 7, "LOGICLENS", align="L")
        self.set_xy(self.w - 75, 6)
        self.set_font("helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(65, 7, "COLLABORATIVE AI SECURITY", align="R")
        self.set_y(28)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(226, 232, 240)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.set_y(-11)
        self.set_font("helvetica", "", 7)
        self.set_text_color(*self.SLATE)
        self.cell(0, 6, f"CONFIDENTIAL  |  LogicLens AI  |  Page {self.page_no()}", align="C")

    def section_title(self, title: str, accent: tuple[int, int, int] | None = None):
        accent = accent or self.CYAN
        self.set_fill_color(*accent)
        self.rect(self.l_margin, self.get_y() + 1, 3, 8, style="F")
        self.set_x(self.l_margin + 7)
        self.set_font("helvetica", "B", 15)
        self.set_text_color(*self.NAVY)
        self.cell(0, 10, _pdf_text(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def label(self, text: str):
        self.set_font("helvetica", "B", 8)
        self.set_text_color(*self.SLATE)
        self.cell(0, 6, _pdf_text(text).upper(), new_x="LMARGIN", new_y="NEXT")


def _severity_color(severity: Any) -> tuple[int, int, int]:
    return {
        "CRITICAL": (220, 38, 38),
        "HIGH": (234, 88, 12),
        "MEDIUM": (217, 119, 6),
        "LOW": (37, 99, 235),
        "INFO": (109, 40, 217),
    }.get(str(severity).upper(), (71, 85, 105))


def _ensure_space(pdf: ReportPDF, height: float):
    if pdf.get_y() + height > pdf.h - 20:
        pdf.add_page()

def generate_pdf_report(scan_data: Dict, report_data: Dict, findings: List[Dict]) -> bytes:
    """Generate a branded, readable security report and return it as PDF bytes."""
    pdf = ReportPDF(format="A4")
    pdf.set_margins(14, 28, 14)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    summary = report_data.get("summary", {})
    risk_level = str(summary.get("risk_level", "UNKNOWN")).upper()
    risk_score = summary.get("total_risk_score", 0)
    created_at = str(scan_data.get('created_at', ''))[:10]

    # Executive cover
    pdf.ln(8)
    pdf.set_font("helvetica", "B", 28)
    pdf.set_text_color(*ReportPDF.NAVY)
    pdf.cell(0, 13, "Executive Security", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*ReportPDF.CYAN)
    pdf.cell(0, 13, "Assessment Report", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(*ReportPDF.SLATE)
    _multi_cell(pdf, 6, "Collaborative multi-agent penetration testing, evidence validation, and consensus review.")
    pdf.ln(8)

    pdf.set_fill_color(*ReportPDF.LIGHT)
    card_y = pdf.get_y()
    pdf.rect(pdf.l_margin, card_y, pdf.epw, 42, style="F")
    pdf.set_xy(pdf.l_margin + 7, card_y + 6)
    pdf.label("Assessment Target")
    pdf.set_x(pdf.l_margin + 7)
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(*ReportPDF.NAVY)
    pdf.multi_cell(pdf.epw - 14, 6, _pdf_text(scan_data.get("target_url", "Unknown")))
    pdf.set_xy(pdf.l_margin + 7, card_y + 27)
    pdf.set_font("helvetica", "", 8)
    pdf.set_text_color(*ReportPDF.SLATE)
    pdf.cell(65, 6, f"DATE  {created_at}")
    pdf.cell(65, 6, f"STATUS  {str(scan_data.get('status', 'Unknown')).upper()}")
    pdf.set_y(card_y + 49)

    # Summary cards
    pdf.section_title("Risk Summary")
    card_width = (pdf.epw - 8) / 3
    metrics = [
        ("RISK SCORE", f"{risk_score}/100", _severity_color(risk_level)),
        ("RISK LEVEL", risk_level, _severity_color(risk_level)),
        ("FINDINGS", str(summary.get("total_findings", len(findings))), ReportPDF.CYAN),
    ]
    y = pdf.get_y()
    for index, (label, value, color) in enumerate(metrics):
        x = pdf.l_margin + index * (card_width + 4)
        pdf.set_fill_color(248, 250, 252)
        pdf.rect(x, y, card_width, 26, style="F")
        pdf.set_xy(x + 5, y + 4)
        pdf.set_font("helvetica", "B", 7)
        pdf.set_text_color(*ReportPDF.SLATE)
        pdf.cell(card_width - 10, 5, label)
        pdf.set_xy(x + 5, y + 11)
        pdf.set_font("helvetica", "B", 15)
        pdf.set_text_color(*color)
        pdf.cell(card_width - 10, 9, _pdf_text(value))
    pdf.set_y(y + 33)

    pdf.label("Severity Distribution")
    dist = summary.get("severity_distribution", {})
    severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    segment_width = pdf.epw / len(severities)
    for sev in severities:
        pdf.set_fill_color(*_severity_color(sev))
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 8)
        pdf.cell(segment_width, 10, f"{sev}  {dist.get(sev, 0)}", fill=True, align="C")
    pdf.ln(16)

    methodology = report_data.get("methodology")
    if methodology:
        pdf.section_title("Methodology")
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(51, 65, 85)
        _multi_cell(pdf, 5.5, methodology)

    chains = report_data.get("attack_chains", [])
    if chains:
        pdf.add_page()
        pdf.section_title("Validated Attack Chains", (220, 38, 38))
        for chain_index, chain in enumerate(chains, start=1):
            _ensure_space(pdf, 35)
            severity = str(chain.get("max_severity", "HIGH")).upper()
            pdf.set_font("helvetica", "B", 7)
            pdf.set_text_color(*_severity_color(severity))
            pdf.cell(0, 6, f"ATTACK CHAIN {chain_index}  /  {severity}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "B", 13)
            pdf.set_text_color(*ReportPDF.NAVY)
            _multi_cell(pdf, 7, chain.get("title", "Attack Chain"))
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(71, 85, 105)
            _multi_cell(pdf, 5.5, chain.get("description", ""))
            pdf.ln(3)

            for idx, step in enumerate(chain.get("steps", []), start=1):
                _ensure_space(pdf, 20)
                step_y = pdf.get_y()
                pdf.set_fill_color(*_severity_color(severity))
                pdf.ellipse(pdf.l_margin, step_y, 8, 8, style="F")
                pdf.set_xy(pdf.l_margin, step_y + 1)
                pdf.set_font("helvetica", "B", 7)
                pdf.set_text_color(255, 255, 255)
                pdf.cell(8, 6, str(idx), align="C")
                pdf.set_xy(pdf.l_margin + 12, step_y)
                pdf.set_font("helvetica", "B", 9)
                pdf.set_text_color(*ReportPDF.NAVY)
                pdf.multi_cell(pdf.epw - 12, 5, _pdf_text(step.get("action", "")))
                evidence = step.get("evidence", "")
                if evidence:
                    pdf.set_x(pdf.l_margin + 12)
                    pdf.set_font("courier", "", 7)
                    pdf.set_text_color(*ReportPDF.SLATE)
                    pdf.set_fill_color(248, 250, 252)
                    pdf.multi_cell(pdf.epw - 12, 4, _pdf_text(evidence), fill=True)
                pdf.ln(3)
            pdf.set_draw_color(226, 232, 240)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(7)

    if findings:
        pdf.add_page()
        pdf.section_title("Detailed Findings", (217, 119, 6))
        for index, finding in enumerate(findings, start=1):
            _ensure_space(pdf, 45)
            severity = str(finding.get("severity", "INFO")).upper()
            color = _severity_color(severity)
            pdf.set_fill_color(*color)
            pdf.rect(pdf.l_margin, pdf.get_y(), 3, 12, style="F")
            pdf.set_x(pdf.l_margin + 7)
            pdf.set_font("helvetica", "B", 7)
            pdf.set_text_color(*color)
            pdf.cell(0, 5, f"FINDING {index:02d}  /  {severity}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_x(pdf.l_margin + 7)
            pdf.set_font("helvetica", "B", 13)
            pdf.set_text_color(*ReportPDF.NAVY)
            pdf.multi_cell(pdf.epw - 7, 7, _pdf_text(finding.get("title", "Unknown Finding")))
            pdf.set_x(pdf.l_margin + 7)
            pdf.set_font("helvetica", "", 8)
            pdf.set_text_color(*ReportPDF.SLATE)
            pdf.cell(0, 6, f"CATEGORY  {_pdf_text(finding.get('category', 'General')).upper()}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(3)

            sections = [
                ("Description", finding.get("description"), False, None),
                ("Evidence / Proof of Concept", finding.get("evidence"), True, (241, 245, 249)),
                ("Recommended Remediation", finding.get("remediation"), False, (236, 253, 245)),
            ]
            for label, content, monospace, fill in sections:
                if not content:
                    continue
                _ensure_space(pdf, 18)
                pdf.label(label)
                pdf.set_font("courier" if monospace else "helvetica", "", 8 if monospace else 9)
                pdf.set_text_color(51, 65, 85)
                if fill:
                    pdf.set_fill_color(*fill)
                _multi_cell(pdf, 4.5 if monospace else 5.5, content, fill=bool(fill))
                pdf.ln(3)
            pdf.set_draw_color(203, 213, 225)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(8)
    return bytes(pdf.output())
