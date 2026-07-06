"""
LogicLens AI - Application Configuration

Loads environment variables from .env and exposes them as typed settings
via pydantic-settings BaseSettings. All configuration is centralised here
so that every module imports a single, validated settings object.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Google Gemini AI ──────────────────────────────────────────────
    GOOGLE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./logiclens.db"

    # ── Model selection ───────────────────────────────────────────────
    FAST_MODEL: str = "gemini-2.5-flash"
    DEEP_MODEL: str = "gemini-2.5-pro"
    DEFAULT_MODEL: str = "gemini-2.5-flash"
    DEFAULT_TEMPERATURE: float = 0.2

    # ── Runtime flags ─────────────────────────────────────────────────
    DEBUG: bool = False

    def model_post_init(self, __context):
        # Fallback for keys
        if not self.GEMINI_API_KEY and self.GOOGLE_API_KEY:
            self.GEMINI_API_KEY = self.GOOGLE_API_KEY
        elif not self.GOOGLE_API_KEY and self.GEMINI_API_KEY:
            self.GOOGLE_API_KEY = self.GEMINI_API_KEY



@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance so the .env file is read only once."""
    return Settings()
