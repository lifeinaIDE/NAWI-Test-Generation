# 5. Technology Stack

## Frontend

| Choice | Why |
|---|---|
| React + TypeScript | Component model fits a multi-step wizard well; TypeScript catches field-name mismatches with the backend contract early. |
| Vite | Fast local dev server and build — matters for an offline-first, quickly-iterated prototype. |
| Tailwind CSS | Lets a small team build a clean, consistent laboratory-style UI without hand-rolling a design system. |
| React Router | Handles protected routes (role-based) and the wizard's step navigation. |
| React Hook Form + Zod | This app is form-heavy and validation-heavy; this pairing gives good UX (inline errors) with a schema that can mirror the backend's validation rules. |
| Recharts | Used for dashboard statistics and the repeatability stability chart. |

## Backend

**Choice: Python + FastAPI**, over Node.js (Express/NestJS).

Why FastAPI fits this project specifically:

- **Pydantic models** give strong, declarative validation for numeric/legal-metrology
  data (capacities, intervals, tolerances) with very little boilerplate — and this
  application is fundamentally about validating and calculating numeric data
  correctly.
- **Auto-generated OpenAPI docs** are useful when the audience reviewing the API
  includes non-developers (lab reviewers, legal-metrology evaluators).
- Python's ecosystem for **PDF generation** (`reportlab`, `weasyprint`) and numeric
  work is mature and simple to use directly, without extra tooling.
- FastAPI supports a clean **layered architecture** (routers → services →
  repositories) without needing an opinionated framework on top.

If a team strongly prefers Node.js instead, the same layering maps 1:1: Nest
controllers instead of FastAPI routers, `class-validator`/Zod instead of Pydantic. The
architecture in `06_ARCHITECTURE.md` does not depend on the specific backend language.

## What guided every choice

The prototype must be:
- Fast to build and iterate on.
- Good at form-heavy UIs with strict validation.
- Runnable fully offline / on localhost.
- Maintainable by more than one person.
- Straightforward for PDF generation.
- Migratable to a real database later without a rewrite.

## Explicitly not used in v1

- No cloud database (Postgres/Mongo/Firebase) — see `08_LOCAL_STORAGE_DESIGN.md`.
- No authentication provider (Auth0, Firebase Auth) — local/simulated login only.
- No message queue / background job system — report generation runs synchronously for
  the prototype's scale.
