"""Ephemeral bring-your-own-key sessions.

API keys are held only in process memory. Browsers receive an opaque HttpOnly
session cookie, never the key itself.
"""

from __future__ import annotations

import secrets
import threading
import time
from contextvars import ContextVar
from dataclasses import dataclass

from fastapi import Cookie, HTTPException

from app.core.config import get_settings

COOKIE_NAME = "logiclens_key_session"
SESSION_TTL_SECONDS = 8 * 60 * 60
_active_key: ContextVar[str | None] = ContextVar("logiclens_active_api_key", default=None)
_lock = threading.Lock()


@dataclass
class KeySession:
    api_key: str
    created_at: float
    expires_at: float


_sessions: dict[str, KeySession] = {}


def create_key_session(api_key: str) -> tuple[str, KeySession]:
    now = time.time()
    session = KeySession(api_key=api_key, created_at=now, expires_at=now + SESSION_TTL_SECONDS)
    session_id = secrets.token_urlsafe(32)
    with _lock:
        _sessions[session_id] = session
    return session_id, session


def delete_key_session(session_id: str | None) -> None:
    if session_id:
        with _lock:
            _sessions.pop(session_id, None)


def get_key_session(session_id: str | None) -> KeySession | None:
    if not session_id:
        return None
    with _lock:
        session = _sessions.get(session_id)
        if session and session.expires_at <= time.time():
            _sessions.pop(session_id, None)
            return None
        return session


def set_active_api_key(api_key: str) -> None:
    _active_key.set(api_key)


def get_active_api_key() -> str:
    contextual = _active_key.get()
    if contextual:
        return contextual
    settings = get_settings()
    return settings.GEMINI_API_KEY if "your_api_key" not in settings.GEMINI_API_KEY else ""


async def require_api_key(
    logiclens_key_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> str:
    session = get_key_session(logiclens_key_session)
    if not session:
        raise HTTPException(status_code=401, detail="Connect your Gemini API key to continue")
    return session.api_key
