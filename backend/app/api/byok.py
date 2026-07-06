"""Bring-your-own Gemini key session endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from google import genai
from pydantic import BaseModel, Field

from app.core.byok import (
    COOKIE_NAME,
    SESSION_TTL_SECONDS,
    create_key_session,
    delete_key_session,
    get_key_session,
)
from app.core.config import get_settings

router = APIRouter(prefix="/api/auth/key", tags=["BYOK"])


class KeyLogin(BaseModel):
    api_key: str = Field(min_length=20, max_length=512)


def _status(session) -> dict:
    return {
        "connected": bool(session),
        "provider": "Google Gemini" if session else None,
        "expires_at": (
            datetime.fromtimestamp(session.expires_at, timezone.utc).isoformat() if session else None
        ),
    }


@router.get("")
async def key_status(
    logiclens_key_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    return _status(get_key_session(logiclens_key_session))


@router.post("")
async def connect_key(
    payload: KeyLogin,
    request: Request,
    response: Response,
    logiclens_key_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    api_key = payload.api_key.strip()
    try:
        client = genai.Client(api_key=api_key)
        await client.aio.models.get(model=get_settings().FAST_MODEL)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Gemini rejected this API key") from exc

    delete_key_session(logiclens_key_session)
    session_id, session = create_key_session(api_key)
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        path="/",
    )
    return _status(session)


@router.delete("")
async def disconnect_key(
    response: Response,
    logiclens_key_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    delete_key_session(logiclens_key_session)
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, samesite="lax")
    return {"connected": False}
