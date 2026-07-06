"""
Core configuration — re-exports the canonical app.config.Settings and adds
any core-specific helpers.

All core modules should import from here:
    from app.core.config import get_settings
"""

from app.config import Settings, get_settings  # noqa: F401 — re-export

__all__ = ["Settings", "get_settings"]
