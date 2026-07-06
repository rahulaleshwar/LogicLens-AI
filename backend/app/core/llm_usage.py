"""Per-scan Gemini usage accounting.

The active collector is stored in a context variable so concurrent scans do not
mix usage records. Google GenAI response usage metadata is used directly.
"""

from __future__ import annotations

from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any


_collector: ContextVar[list[dict[str, Any]] | None] = ContextVar("llm_usage", default=None)


def begin_usage_collection() -> None:
    _collector.set([])


def record_usage(*, model: str, agent: str, purpose: str, response: Any = None, simulated: bool = False) -> dict[str, Any]:
    metadata = getattr(response, "usage_metadata", None)

    def value(*names: str) -> int:
        for name in names:
            raw = getattr(metadata, name, None) if metadata else None
            if raw is not None:
                return int(raw)
        return 0

    prompt_tokens = value("prompt_token_count", "input_token_count")
    output_tokens = value("candidates_token_count", "output_token_count")
    total_tokens = value("total_token_count") or prompt_tokens + output_tokens
    entry = {
        "run": len(_collector.get() or []) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": agent,
        "purpose": purpose,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "simulated": simulated,
    }
    current = _collector.get()
    if current is not None:
        current.append(entry)
    return entry


def usage_summary() -> dict[str, Any]:
    runs = list(_collector.get() or [])
    by_model: dict[str, dict[str, Any]] = {}
    for run in runs:
        model = run["model"]
        bucket = by_model.setdefault(model, {
            "model": model, "runs": 0, "prompt_tokens": 0,
            "output_tokens": 0, "total_tokens": 0,
        })
        bucket["runs"] += 1
        for key in ("prompt_tokens", "output_tokens", "total_tokens"):
            bucket[key] += run[key]
    return {
        "runs": runs,
        "by_model": list(by_model.values()),
        "totals": {
            "runs": len(runs),
            "prompt_tokens": sum(r["prompt_tokens"] for r in runs),
            "output_tokens": sum(r["output_tokens"] for r in runs),
            "total_tokens": sum(r["total_tokens"] for r in runs),
        },
    }
