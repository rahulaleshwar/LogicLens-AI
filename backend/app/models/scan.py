"""
LogicLens AI - Scan, Finding & Report ORM Models

Represents security-scan jobs, their individual vulnerability findings,
and the aggregated report.  Each scan progresses through statuses:
pending → running → completed | failed.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Scan(Base):
    """A single security-scan request and its lifecycle metadata."""

    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    scan_type: Mapped[str] = mapped_column(String(64), nullable=False, default="full")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    findings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    report_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)

    # Relationships
    findings: Mapped[list["Finding"]] = relationship(
        "Finding", back_populates="scan", cascade="all, delete-orphan", lazy="selectin"
    )
    report: Mapped["Report | None"] = relationship(
        "Report", back_populates="scan", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Scan id={self.id} url={self.target_url!r} "
            f"status={self.status!r} type={self.scan_type!r}>"
        )


class Finding(Base):
    """An individual vulnerability finding discovered during a scan."""

    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="info")
    category: Mapped[str] = mapped_column(String(128), nullable=False, default="general")
    evidence: Mapped[str] = mapped_column(Text, nullable=False, default="")
    remediation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    debate_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")

    def __repr__(self) -> str:
        return f"<Finding id={self.id} scan={self.scan_id} title={self.title!r} severity={self.severity!r}>"


class Report(Base):
    """Aggregated scan report containing the full analysis as JSON."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    report_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    scan: Mapped["Scan"] = relationship("Scan", back_populates="report")

    def __repr__(self) -> str:
        return f"<Report id={self.id} scan={self.scan_id}>"
