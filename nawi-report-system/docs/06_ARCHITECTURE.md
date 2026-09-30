# 6. Architecture

## High-level diagram

```
┌─────────────────────────────┐
│         Frontend (React)     │
│  Wizard UI / Dashboard /     │
│  Repository / Review / Admin │
└───────────────┬──────────────┘
                │ REST (JSON) over HTTP
┌───────────────▼──────────────┐
│        Backend (FastAPI)      │
│                                │
│  Routers (API layer)          │
│    ↓                          │
│  Services                     │
│   - ReportService              │
│   - InstrumentService          │
│   - TestService                │
│   - CalculationEngine          │
│   - ValidationEngine           │
│   - RuleEngine                 │
│   - ReportGenerationService    │
│   - AuditService               │
│   - SearchService               │
│   - AuthService                 │
│    ↓                          │
│  Repository Interfaces        │
│   - ReportRepository           │
│   - UserRepository              │
│   - RuleRepository              │
│   - AttachmentRepository        │
│   - AuditRepository             │
│    ↓                          │
│  Local Storage Adapter        │
│   (JSON files on disk)        │
└───────────────┬──────────────┘
                │
        storage/ (local filesystem)
```

## Layering rules (non-negotiable)

1. **Frontend never touches storage.** It only calls REST endpoints. It has no idea
   whether data lives in JSON files, SQLite, or Postgres.
2. **Services never touch the filesystem directly.** Only repository implementations
   do. Services depend on repository *interfaces*, not concrete file-reading code.
3. **The backend is the source of truth** for all calculations, validation, pass/fail
   determination, report status, user permissions, report finalization, and hash
   generation. The frontend may show a live preview of a calculation, but that preview
   is computed by calling the backend's calculation endpoints — it is never
   independently computed in a React component.
4. **The Calculation Engine is pure.** Its functions take data in, return a result, and
   perform no I/O — this makes the most legally sensitive part of the system the
   easiest to unit test.

## Why this shape

- Swapping local JSON storage for a real database later means writing new repository
  implementations — the routers, services, and frontend do not change.
- Keeping calculations pure and separate from routing/persistence means the rules that
  matter most for legal-metrology correctness can be tested in isolation, with no
  server running.
- Role-based permission checks live in the service layer (not just route decorators or
  UI logic) so that permission enforcement can't be bypassed by calling a different
  entry point.

## Data flow — creating and approving a report (example)

```
Technician (browser)
   → POST /api/reports                      [ReportService → ReportRepository → storage/reports/*.json]
   → POST /api/calculations/repeatability     [CalculationEngine, pure function, uses active RuleSet]
   → PUT  /api/reports/{id}                   [ReportService validates via ValidationEngine, saves via ReportRepository]
   → POST /api/reports/{id}/submit            [ReportService: status → SUBMITTED_FOR_REVIEW, AuditService logs event]

Reviewer (browser)
   → GET  /api/reports/{id}
   → POST /api/reports/{id}/approve           [ReportService: status → APPROVED, ReportGenerationService creates PDF + hash, AuditService logs event]
   → GET  /api/reports/{id}/download          [ReportGenerationService returns stored PDF]
```
