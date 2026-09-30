# NAWI Test Report Management System

Digitises test-report generation for **Non-Automatic Weighing Instruments (NAWIs)** per **OIML Recommendation R-76**.

> ⚠️ **Preliminary automated evaluation only.** Every generated result must be reviewed by a qualified legal-metrology professional. This system does not produce a legal certification.

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Quick Start — Local Run (Single Command)

From the project root:
```bash
npm run dev
# or
npm start
```
> You can also double-click `start.bat` or run `.\start.ps1`. Both backend (FastAPI) and frontend (Vite) will launch concurrently with live reload.

---

### Alternative: Run Individually

#### 1. Backend (FastAPI · localhost:8000)

```bash
cd backend
uv venv .venv
uv pip install -r requirements.txt
.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Note:** This project uses [uv](https://github.com/astral-sh/uv) for Python package management. If `pip` is not on your PATH, use `uv pip install` instead.

Open **http://localhost:8000/docs** — you should see the FastAPI Swagger UI with all endpoints listed.

### 2. Frontend (React · localhost:5173)

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — you should see the NAWI login page.

---

## Verify It's Running

| Check | Expected |
|---|---|
| `http://localhost:8000/` | JSON: `{ "status": "running", "docs": "/docs" }` |
| `http://localhost:8000/docs` | Swagger UI with auth, reports, calculations, rules, audit, dashboard routes |
| `http://localhost:5173` | NAWI login page (dark theme) |
| Login with `technician / demo123` | Redirects to `/dashboard` |

---

## Demo Credentials (Phase 1 — stubs, real auth in Phase 2)

| Username | Password | Role |
|---|---|---|
| `technician` | `demo123` | TECHNICIAN |
| `reviewer` | `demo123` | REVIEWER |
| `admin` | `demo123` | ADMIN |
| `viewer` | `demo123` | VIEWER |

---

## Build Status by Phase

| Phase | Status | What it adds |
|---|---|---|
| **0** | ✅ Complete | Domain summary, glossary, role matrix, architecture diagram |
| **1-9** | ✅ Complete | Full MVP implementation |
| **10**| ✅ Complete | Demonstration Hardening, Seed Data, Disclaimers |

---

## Demo Reports (Loaded via `seed_demo_data.py`)

Run `cd backend && python scripts/seed_demo_data.py` to load these fictional reports into the repository:
1. `NAWI-DEMO-PASS-001` (ALL-PASS example)
2. `NAWI-DEMO-FAIL-002` (FAIL example with observed error > MPE)
3. `NAWI-DEMO-WARN-003` (WARNING example close to MPE threshold)

---

## Folder Structure

```
nawi-report-system/
├── frontend/          React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── api/       Typed Axios API client (one file)
│       ├── components/ AppLayout, ProtectedRoute
│       ├── hooks/     useAuth (AuthContext + AuthProvider)
│       ├── pages/     Login, Dashboard, Repository, Review, RuleAdmin
│       ├── types/     TypeScript interfaces (mirror backend schemas)
│       └── wizard/    Step1–Step7 shells
├── backend/           Python + FastAPI + Pydantic
│   ├── app/
│   │   ├── api/       Routers: auth, reports, calculations, rules, attachments, audit, dashboard
│   │   ├── schemas/   Pydantic models (camelCase, mirror frontend types/)
│   │   ├── services/  (Phase 3+ — ReportService, CalculationEngine, …)
│   │   ├── repositories/ (Phase 3+ — JsonReportRepository, …)
│   │   └── main.py    FastAPI app + CORS
│   └── storage/       Local JSON file storage (gitignored except .gitkeep)
└── docs/              Baseline documentation + phase prompts
```

---

## Known Limitations (v1 Deliberate Scope)

- No external database — all persistence is local JSON files behind a repository abstraction
- No real digital signature — prototype SHA-256 integrity hash only
- No multi-laboratory sync or government integration
- No hardware integration — observations entered manually
- Only 4 of ~15+ OIML R-76 tests fully implemented (Weighing Performance, Eccentricity, Repeatability, Discrimination)
- No authentication provider — simulated local login only
- No background job system — report generation is synchronous

These are documented, deliberate boundaries — not oversights. See `docs/01_PROJECT_OVERVIEW.md`.
