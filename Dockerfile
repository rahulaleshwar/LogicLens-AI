# ==========================================================
# Stage 1 - Build React
# ==========================================================
FROM node:22-alpine AS frontend

WORKDIR /frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build


# ==========================================================
# Stage 2 - Backend
# ==========================================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /code

RUN apt-get update && \
    apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.8.13

# ----------------------------------------------------------
# Copy project metadata
# ----------------------------------------------------------

COPY pyproject.toml .
COPY uv.lock .

# ----------------------------------------------------------
# Install dependencies
# ----------------------------------------------------------

RUN uv sync --no-dev

# ----------------------------------------------------------
# Copy source
# ----------------------------------------------------------

COPY backend ./backend
COPY logiclens_agent ./logiclens_agent

# ADK files
COPY AGENTS.md .
COPY agents-cli-manifest.yaml .

# Optional
COPY .agents ./.agents

# ----------------------------------------------------------
# Copy frontend build
# ----------------------------------------------------------

COPY --from=frontend /frontend/dist ./frontend/dist

ENV PYTHONPATH=/code:/code/backend

EXPOSE 8080

CMD ["uv","run","uvicorn","logiclens_agent.fast_api_app:app","--host","0.0.0.0","--port","8080"]