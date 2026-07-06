"""
LogicLens AI - Async Database Engine & Session Management

Provides:
  • An async SQLAlchemy engine bound to the configured DATABASE_URL.
  • An async session factory for request-scoped database sessions.
  • A declarative Base class that all ORM models inherit from.
  • A FastAPI-compatible ``get_db`` dependency that yields sessions.
  • An ``init_db`` coroutine that creates every table on first startup.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# ── Session factory ───────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Declarative Base ─────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models in the project."""


# ── FastAPI dependency ────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and ensure it is closed afterwards.

    Usage in a FastAPI route::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


# ── Table creation helper ────────────────────────────────────────────
async def init_db() -> None:
    """Create all tables that are registered on ``Base.metadata``.

    Should be called once at application startup (e.g. inside a FastAPI
    lifespan handler).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
