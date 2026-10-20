"""
NAWI Report System — FastAPI Application Entry Point

Architecture (non-negotiable layering rules):
  L1  Frontend never touches storage — only calls REST endpoints.
  L2  Services never touch the filesystem — only repositories do.
  L3  Backend is source of truth for all calculations, validation, and status changes.
  L4  Calculation Engine is pure (no I/O) — easiest to unit test.

Error-handling convention (all 4xx responses):
  { "detail": [ { "level": "ERROR|WARNING|INFO", "field": "...", "message": "..." } ] }
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, reports, calculations, rules, attachments, audit, dashboard, users
from app.core.config import settings

app = FastAPI(
    title="NAWI Test Report Management System",
    description=(
        "Digitises test-report generation for Non-Automatic Weighing Instruments "
        "per OIML R-76. File-based storage backend."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

import os

# ---------------------------------------------------------------------------
# CORS origins — extend via ALLOWED_ORIGINS env var in production
# e.g. ALLOWED_ORIGINS=https://my-app.vercel.app,https://my-custom-domain.com
# ---------------------------------------------------------------------------
_extra_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
]

_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_cors_origins = list(set(_dev_origins + (settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]) + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow all Vercel preview/prod deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(calculations.router)
app.include_router(rules.router)
app.include_router(attachments.router)
app.include_router(audit.router)
app.include_router(dashboard.router)
app.include_router(users.router)


# ---------------------------------------------------------------------------
# Root and /api/health checks
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
async def root():
    return {
        "service": "NAWI Test Report Management System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
async def health():
    return {
        "status": "healthy",
        "service": "NAWI Test Report Management System",
        "version": "1.0.0",
        "docs": "/docs",
    }
