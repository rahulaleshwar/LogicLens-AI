"""
LLM client factory for Google Generative AI.

Provides a cached client instance used by all agents to call Gemini models.
"""

from google import genai
from typing import Optional
from app.core.byok import get_active_api_key


def get_llm_client(api_key: str | None = None) -> Optional[genai.Client]:
    """Return a cached Google GenAI client singleton.

    Uses the GEMINI_API_KEY from application settings.

    Returns:
        genai.Client: Configured Google GenAI client.

    Raises:
        ValueError: If GEMINI_API_KEY is not configured.
    """
    key = api_key or get_active_api_key()
    if not key:
        return None
    return genai.Client(api_key=key)
