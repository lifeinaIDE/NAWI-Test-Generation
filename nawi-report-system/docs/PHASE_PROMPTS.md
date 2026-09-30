# NAWI Test Report Management System — Phase-by-Phase Build Prompts

> **How to use this file**
> Each section below is a self-contained prompt to hand to an AI coding tool (Antigravity, Cursor, etc.) for that phase.
> Read the referenced baseline docs **before** running each prompt so you can answer any clarifying question the tool raises.
> Run phases in order — each one assumes the previous phase is complete and passing verification.

---

## Phase 0 — Domain & Architecture Preparation

> **Baseline docs:** `01_PROJECT_OVERVIEW.md`, `02_GLOSSARY.md`, `03_USER_ROLES_AND_PERMISSIONS.md`, `04_WORKFLOW_AND_STATUS_LIFECYCLE.md`, `06_ARCHITECTURE.md`

```
You are helping design a software system called the NAWI Test Report Management System.
This system digitises the generation of test reports for Non-Automatic Weighing Instruments (NAWIs)
in accordance with OIML Recommendation R-76. Version 1 runs entirely on a local machine — no
external database or cloud service.

Using the following baseline documents as your source of truth, produce a written domain summary
that the whole team (developers, a legal-metrology reviewer, a first-time reader) can use as a
shared mental model before any code is written:

  • 01_PROJECT_OVERVIEW.md  — what the system is and what problem it solves
  • 02_GLOSSARY.md          — NAWI, OIML, MPE, e, d, n, accuracy class, rule-set, report hash
  • 03_USER_ROLES_AND_PERMISSIONS.md — the four roles: Technician, Reviewer, Admin, Viewer
  • 04_WORKFLOW_AND_STATUS_LIFECYCLE.md — 20-step end-to-end workflow, status machine
  • 06_ARCHITECTURE.md      — layered architecture, four non-negotiable layering rules

Your output must cover:

1. ONE-PARAGRAPH SYSTEM SUMMARY — what is being built and why.
2. GLOSSARY REVIEW — list every domain term from 02_GLOSSARY.md with a one-line plain-English
   definition; flag any term whose threshold or formula requires domain validation against the
   official OIML R-76 edition.
3. ROLE MATRIX — a table: Role | Can do | Cannot do | Backend enforcement required?
4. STATUS MACHINE — reproduce the status diagram from 04_WORKFLOW_AND_STATUS_LIFECYCLE.md as a
   Mermaid state diagram; add which role may trigger each transition and whether it writes an
   audit event.
5. ARCHITECTURE LAYERS — a labelled diagram (ASCII or Mermaid) showing Frontend → REST →
   Routers → Services → Repositories → Local Storage Adapter; annotate the four non-negotiable
   layering rules from 06_ARCHITECTURE.md.
6. OPEN QUESTIONS — list every assumption flagged as "requires domain validation" or "not certain"
   in the baseline docs. Do not resolve them — surface them explicitly.
7. OUT-OF-SCOPE LIST — reproduce what version 1 deliberately does not do (from
   01_PROJECT_OVERVIEW.md §"What version 1 deliberately does not do").

Do NOT write any code. Do NOT invent thresholds or formulas not present in the baseline docs.
Flag anything that is unclear rather than guessing.
```

---

## Phase 1 — Project Setup & Design System

> **Baseline docs:** `05_TECH_STACK.md`, `06_ARCHITECTURE.md`, `07_FOLDER_STRUCTURE.md`, `10_API_CONTRACT.md`

```
You are setting up the NAWI Test Report Management System — a local-only, offline-first
prototype. The tech stack is:
  • Frontend: React + TypeScript + Vite + Tailwind CSS + React Router + React Hook Form + Zod
  • Backend:  Python + FastAPI + Pydantic

Reference documents:
  • 05_TECH_STACK.md         — technology choices and rationale
  • 06_ARCHITECTURE.md       — layered architecture and data-flow diagram
  • 07_FOLDER_STRUCTURE.md   — exact monorepo layout
  • 10_API_CONTRACT.md       — full API surface (stubs for now)

Tasks:

1. SCAFFOLD MONOREPO — Create the folder structure exactly as specified in 07_FOLDER_STRUCTURE.md:
   nawi-report-system/
     frontend/   (React + TypeScript + Vite)
     backend/    (FastAPI)
     docs/       (baseline documentation — copy existing .md files here)
     README.md

2. FRONTEND SCAFFOLD
   - Initialise with Vite + React + TypeScript template.
   - Install: tailwindcss, react-router-dom, react-hook-form, zod, recharts.
   - Create placeholder pages: Login, Dashboard, Repository, ReviewPage, RuleAdmin.
   - Create the 7-step wizard shell (Step1–Step7 components) with no logic yet — just
     headings and a "Coming in Phase N" placeholder.
   - Create frontend/src/types/index.ts with TypeScript interfaces for:
     User, Role, Report, Instrument, Laboratory, Environment, TestDefinition,
     TestObservation, CalculationResult, ValidationMessage, AuditEvent, RuleSet,
     DashboardSummary
     (field names must be camelCase and must exactly match backend schemas — see
     09_DATA_MODEL.md for the canonical field names).

3. BACKEND SCAFFOLD
   - Initialise FastAPI with uvicorn.
   - Create the folder layout: app/api/, app/services/, app/repositories/, app/schemas/,
     app/rules/, app/reportgen/, app/core/, main.py.
   - Create stub routers for: auth, reports, calculations, rules, attachments, audit, dashboard.
     Every endpoint must return a hardcoded placeholder 200 response for now (real logic
     comes in later phases).
   - Create Pydantic schemas in app/schemas/ that mirror every TypeScript interface listed above,
     using the same field names (camelCase aliases via Field(alias=...)).
   - Add CORS configuration so the frontend on localhost:5173 can reach the backend on
     localhost:8000.

4. ERROR-HANDLING CONVENTION — decide now, document in code comments:
   - Backend: always return { "detail": [...ValidationMessage] } for 4xx errors.
   - Frontend: a centralised Axios/fetch interceptor converts API errors into toast
     notifications + inline field errors.

5. README — write local-run instructions:
   cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
   cd frontend && npm install && npm run dev
   Include: prerequisites (Python 3.11+, Node 18+), expected URLs, how to verify it's running.

Verification gate (must pass before Phase 2 begins):
  A developer can clone the repo, follow only the README, and see the React app at
  localhost:5173 talking to the FastAPI server at localhost:8000/docs — with no manual
  fixes, no unresolved imports, and no red console errors.
```

---

## Phase 2 — Local Authentication & Roles

> **Baseline docs:** `03_USER_ROLES_AND_PERMISSIONS.md`, `04_WORKFLOW_AND_STATUS_LIFECYCLE.md`, `10_API_CONTRACT.md`, `15_SECURITY_AND_QUALITY.md`

```
You are implementing local authentication and role-based access control for the NAWI
Test Report Management System. This is a local prototype — there is no Auth0, no Firebase.
Authentication is simulated using a JSON users file.

Reference documents:
  • 03_USER_ROLES_AND_PERMISSIONS.md — four roles and their permissions
  • 10_API_CONTRACT.md               — POST /api/auth/login, GET /api/auth/me
  • 15_SECURITY_AND_QUALITY.md       — enforcement principle: backend is authoritative

Tasks:

1. SEED USER STORE — Create backend/storage/users/users.json with four prototype users,
   one per role:
   { "id": "user-tech-01",  "username": "technician", "password": "demo123",
     "role": "TECHNICIAN", "laboratory": "Central Demo Legal Metrology Laboratory" }
   { "id": "user-rev-01",   "username": "reviewer",   "password": "demo123",
     "role": "REVIEWER",   "laboratory": "Central Demo Legal Metrology Laboratory" }
   { "id": "user-admin-01", "username": "admin",      "password": "demo123",
     "role": "ADMIN",      "laboratory": "Central Demo Legal Metrology Laboratory" }
   { "id": "user-view-01",  "username": "viewer",     "password": "demo123",
     "role": "VIEWER",     "laboratory": "Central Demo Legal Metrology Laboratory" }
   (Plaintext passwords are acceptable for this local prototype only.)

2. BACKEND AUTH
   - Implement POST /api/auth/login: validate username/password against users.json,
     return a signed JWT (HS256, secret from environment variable AUTH_SECRET).
   - Implement GET /api/auth/me: decode and validate the JWT, return the User object.
   - Create a FastAPI dependency get_current_user(token) that extracts the user from
     the Bearer token in the Authorization header.
   - Create a role-enforcement dependency require_role(*roles) that calls get_current_user
     and raises HTTP 403 if the caller's role is not in the allowed set.
   - Apply require_role on every existing stub endpoint according to the permission matrix
     in 03_USER_ROLES_AND_PERMISSIONS.md:
       TECHNICIAN: create/edit/submit reports (own only)
       REVIEWER:   read submitted reports, return/approve/reject
       ADMIN:      all of the above + user management + rule administration
       VIEWER:     read approved reports only

3. FRONTEND AUTH
   - Build the Login page (username + password form, calls POST /api/auth/login).
   - Store the JWT in memory (not localStorage — prototype security baseline).
   - Store the decoded user object in a React context (AuthContext).
   - Implement protected routes: redirect to /login if no valid token.
   - Implement role-gated routes: if a user navigates to a route their role cannot access,
     show a dedicated "Not authorised for this action" screen — not a generic 404.
   - Show the current user's name and role in the navigation bar.

4. ENFORCEMENT TEST (write this test now, not later)
   - Write a pytest test that:
     a. Logs in as "technician", captures the token.
     b. Calls POST /api/reports/{id}/approve with that token.
     c. Asserts the response is HTTP 403.
   This test must pass before Phase 3 begins.

Verification gate:
  Four browser sessions — one per role — each show a role-appropriate dashboard.
  A Technician's token rejected by the approve endpoint with HTTP 403 (tested above).
  No role-check logic lives only in the frontend.
```

---

## Phase 3 — Instrument & Report Setup

> **Baseline docs:** `04_WORKFLOW_AND_STATUS_LIFECYCLE.md`, `07_FOLDER_STRUCTURE.md`, `08_LOCAL_STORAGE_DESIGN.md`, `09_DATA_MODEL.md`, `10_API_CONTRACT.md`, `13_VALIDATION_RULES.md`

```
You are implementing report creation, the instrument-details form, and local file-based
storage for the NAWI Test Report Management System.

Reference documents:
  • 09_DATA_MODEL.md               — canonical report JSON structure
  • 08_LOCAL_STORAGE_DESIGN.md     — storage layout, repository abstraction rules
  • 10_API_CONTRACT.md             — POST /api/reports, GET /api/reports/{id}, PUT /api/reports/{id}
  • 13_VALIDATION_RULES.md         — validation rules sections A and B
  • 04_WORKFLOW_AND_STATUS_LIFECYCLE.md — DRAFT status entry point

Tasks:

1. REPOSITORY LAYER (backend)
   - Define the ReportRepository interface (abstract base class) with methods:
     create(report) -> Report
     get(reportId) -> Report | None
     update(report) -> Report
     list(filters) -> List[Report]
     delete(reportId) -> bool
   - Implement JsonReportRepository: reads/writes report JSON to backend/storage/reports/.
   - Filename convention: {reportId}.json
   - Use atomic writes: write to {reportId}.tmp, then os.replace() to {reportId}.json.
   - Auto-generate reportId as "NAWI-{YYYY}-{NNNN}" (year + 4-digit sequence).
   - Wire JsonReportRepository into ReportService via dependency injection (FastAPI Depends).

2. REPORT SERVICE (backend)
   - Implement ReportService.create_report(instrument, manufacturer, laboratory, user):
     Creates a new Report with status=DRAFT, ruleSetVersion = active rule-set ID,
     createdBy = user.id, createdAt = now(), returns saved Report.
   - Implement ReportService.update_report(reportId, partial_data, user):
     Checks user is the report's creator or an Admin.
     Checks report status is DRAFT or IN_PROGRESS (not SUBMITTED or later).
     Validates fields using ValidationEngine (see below).
     Saves and returns the updated report.
   - Implement ReportService.get_report(reportId, user):
     Returns the report; enforces that a VIEWER can only see APPROVED reports.

3. VALIDATION ENGINE (backend, partial — sections A and B of 13_VALIDATION_RULES.md)
   - Required fields present.
   - Numeric fields are numeric, no negative capacity.
   - maxCapacity > minCapacity.
   - e > 0, d > 0.
   - n is consistent with maxCapacity / e.
   - Temperature within -10°C to 60°C; humidity 20–98%.
   - Return List[ValidationMessage] with { level, field, message }.
   - Level ERROR blocks save; level WARNING allows save but is returned to the frontend.

4. API ENDPOINTS (backend)
   - POST /api/reports → calls ReportService.create_report, returns Report (DRAFT).
   - GET  /api/reports/{reportId} → calls ReportService.get_report.
   - PUT  /api/reports/{reportId} → calls ReportService.update_report.
   - DELETE /api/reports/{reportId} → only allowed if status is DRAFT; deletes the JSON file.

5. FRONTEND — WIZARD STEPS 1–3
   - Step 1 (Metadata): report title, application number, laboratory details.
   - Step 2 (Instrument Details): model, serial number, type, accuracyClass, maxCapacity,
     minCapacity, verificationIntervalE, actualIntervalD, numberOfIntervalsN, unit,
     softwareVersion.
   - Step 3 (Environment): temperatureStart, temperatureEnd, relativeHumidity,
     barometricPressure.
   - Each step: validate with Zod (same rules as backend section A), show inline errors.
   - "Save Draft" button on each step calls PUT /api/reports/{id}.
   - On step navigation, warn the user if there are unsaved changes (dirty state check).

6. PERSISTENCE ROUND-TRIP TEST
   - Write a pytest test: create a report, PUT an update, GET it back, assert every field
     matches what was sent — including all Instrument and Environment sub-fields.

Verification gate:
  A technician creates a report, fills in all three steps, saves a draft, closes the browser.
  The JSON file exists in storage/reports/. On reopening, every field is populated exactly
  as entered.
```

---

## Phase 4 — Calculation Engine & Rules

> **Baseline docs:** `11_RULE_ENGINE_SPEC.md`, `12_TEST_MODULES.md`, `09_DATA_MODEL.md`, `10_API_CONTRACT.md`, `16_TESTING_STRATEGY.md`

```
You are implementing the OIML R-76 rule engine and the four calculation functions for the
NAWI Test Report Management System. This is the most legally sensitive part of the system.

Reference documents:
  • 11_RULE_ENGINE_SPEC.md   — rule-set format, versioning rules, calculation function signatures
  • 12_TEST_MODULES.md       — inputs, outputs, and formulas for all four test types
  • 09_DATA_MODEL.md         — CalculationResult type
  • 10_API_CONTRACT.md       — four POST /api/calculations/* endpoints
  • 16_TESTING_STRATEGY.md   — required test cases

Tasks:

1. RULE-SET FILE — Create backend/storage/rules/r76-rules-v1.json matching the structure
   in 11_RULE_ENGINE_SPEC.md exactly:
   {
     "ruleSetId": "OIML-R76-PROTOTYPE-V1",
     "standard": "OIML R-76",
     "edition": "Prototype configuration — requires domain validation ...",
     "effectiveFrom": "2026-01-01",
     "mpeRules": { "III": [...], "II": [...], "IIII": [...] },
     "testRules": { "weighingPerformance": {...}, "eccentricity": {...},
                    "repeatability": {...}, "discrimination": {...} }
   }
   Mark every threshold with a comment: "Prototype value — requires domain validation."

2. RULE ENGINE SERVICE (backend/app/rules/)
   - RuleLoader: reads a rule-set JSON from disk, validates required fields, caches in memory.
   - RuleRepository: get_active_ruleset() -> RuleSet, get_by_id(id) -> RuleSet.
   - RuleSet must be loaded at startup; failures must raise a clear startup error, not a
     silent 500 later.

3. CALCULATION ENGINE (backend/app/services/calculation_engine.py)
   Implement four pure functions (no I/O, no database calls, no global state):

   calculate_weighing_performance(testLoad, indication, zeroError, e, accuracyClass, ruleSet)
     -> CalculationResult
     Formula: observedError = indication - testLoad
              correctedError = observedError - zeroError
              mpe = look up from ruleSet.mpeRules[accuracyClass] by n = testLoad / e
              result = PASS if abs(correctedError) <= mpe else FAIL
              Include in result: formulaUsed = "OBSERVED_ERROR_V1", ruleSetId used.

   calculate_eccentricity(loads, e, accuracyClass, ruleSet)
     -> CalculationResult
     For each position: error = indication - reference
     mpe = look up from ruleSet.mpeRules[accuracyClass] for the load/e ratio
     Worst position = max(abs(error)) across all positions
     result = PASS if all positions within mpe, else FAIL

   calculate_repeatability(testLoad, readings, e, accuracyClass, ruleSet)
     -> CalculationResult
     range = max(readings) - min(readings)
     mpe = look up from ruleSet for testLoad/e
     result = PASS if range <= mpe else FAIL

   calculate_discrimination(initialIndication, addedLoad, newIndication, d, ruleSet)
     -> CalculationResult
     delta = newIndication - initialIndication
     result = PASS if delta >= d else FAIL

   Each function must NEVER contain a raw threshold number — all limits come from the
   ruleSet argument. Violating this rule invalidates the legal-metrology correctness guarantee.

4. API ENDPOINTS
   - POST /api/calculations/weighing-performance
   - POST /api/calculations/eccentricity
   - POST /api/calculations/repeatability
   - POST /api/calculations/discrimination
   Each is stateless — receives inputs, calls the pure function, returns CalculationResult.
   Require authentication (any role). Do NOT require a reportId — these endpoints exist
   for live preview (see 10_API_CONTRACT.md).

5. UNIT TESTS (backend/tests/test_calculation_engine.py)
   Write pytest tests covering every item in 16_TESTING_STRATEGY.md "Backend tests":
   - MPE table selection: Class III, load/e = 3000 -> mpe should be 0.5e; load/e = 10000 -> 1.0e
   - PASS case: observedError < mpe
   - FAIL case: observedError > mpe
   - BOUNDARY case: observedError == mpe -> must be PASS (<= not <)
   - Rule-set swap test: change mpeInE in the rule-set JSON -> same inputs now produce a
     different result WITHOUT touching calculation_engine.py (proves rules are external)
   - Eccentricity: worst-position detection correct
   - Repeatability range calculation correct
   - Discrimination delta calculation correct
   - Invalid input (missing field, non-numeric): returns INCOMPLETE or raises a clean error

Verification gate:
  All unit tests pass including the boundary case and the rule-set swap test.
  grep -r "0.5|1.0|1.5" app/services/calculation_engine.py returns zero hits
  (no hardcoded MPE values in calculation code).
```

---

## Phase 5 — Test Data Entry Interface

> **Baseline docs:** `12_TEST_MODULES.md`, `10_API_CONTRACT.md`, `13_VALIDATION_RULES.md`, `07_FOLDER_STRUCTURE.md`

```
You are building the test-data-entry UI for the NAWI Test Report Management System.
At the end of this phase a technician can enter observations for all four OIML tests and
see live, backend-computed pass/fail results.

Reference documents:
  • 12_TEST_MODULES.md        — inputs, outputs, and UI enhancements for each test
  • 10_API_CONTRACT.md        — four POST /api/calculations/* endpoints + frontend contract
  • 13_VALIDATION_RULES.md    — validation rules (all three tiers)

Tasks:

1. WIZARD STEP 4 — TEST SELECTION (frontend/src/wizard/Step4TestSelection.tsx)
   - Show all four implemented tests (WEIGHING_PERFORMANCE, ECCENTRICITY, REPEATABILITY,
     DISCRIMINATION) plus the planned-but-unimplemented list from 12_TEST_MODULES.md §E.
   - Each implemented test: checkbox "Applicable" | "Not Applicable" (mandatory choice).
   - Each planned test: shown as disabled with label "Planned — Not implemented in prototype."
   - Saving this step writes test.applicable = true/false for each test into the report draft.

2. WIZARD STEP 5 — TEST DATA ENTRY (frontend/src/wizard/Step5TestDataEntry.tsx)
   For each applicable test, render a dynamic sub-form:

   WEIGHING_PERFORMANCE sub-form:
     Fields: testLoad, indication, zeroError, (e and accuracyClass auto-populated from instrument)
     On any field change: call POST /api/calculations/weighing-performance with the current values.
     Display: observedError, correctedError, maxPermissibleError, result (PASS/FAIL/WARNING),
              formulaUsed.

   ECCENTRICITY sub-form:
     Show one row per position (CENTER, FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT).
     Fields per row: load, indication, reference.
     On change: call POST /api/calculations/eccentricity.
     Visual enhancement: a platform diagram (simple SVG or CSS grid) where each corner
     is colour-coded green/amber/red by result; worst-performing position highlighted.

   REPEATABILITY sub-form:
     Fields: testLoad, number of repetitions (default 10), readings[] (one input per rep).
     On change: call POST /api/calculations/repeatability.
     Visual enhancement: a simple line chart (Recharts) showing the readings across repetitions.

   DISCRIMINATION sub-form:
     Fields: initialIndication, addedLoad, newIndication, d (auto-populated from instrument).
     On change: call POST /api/calculations/discrimination.

3. PASS/FAIL INDICATORS
   - Each sub-form shows a colour-coded badge: PASS (green), FAIL (red), WARNING (amber),
     INCOMPLETE (grey), NOT_APPLICABLE (grey with strikethrough).
   - The badge must show the specific limit being checked (e.g., "MPE: ±0.05 kg") alongside
     the result.
   - The badge text and colour come from the CalculationResult returned by the backend —
     the frontend does NOT compute compliance logic itself.

4. INLINE VALIDATION (frontend)
   - Test load > instrument maxCapacity -> Error (blocks save).
   - Any required observation field empty -> Error on the field.
   - Result close to limit (abs(error) > 0.9 * mpe) -> Warning badge shown.
   - Planned test selected as applicable -> Info: "This test is not implemented in the
     prototype. Mark as Not Applicable or leave for domain expert review."

5. SAVE DRAFT integration
   - Step 5 "Save Draft" calls PUT /api/reports/{id} with the observations array populated.
   - The backend validates observations array shape (section B of 13_VALIDATION_RULES.md).

6. FRONTEND TESTS
   - Unit tests (Vitest/Jest): form renders correct fields per test type; PASS indicator
     shows green; FAIL indicator shows red; indicator is driven by CalculationResult not
     frontend logic.
   - Mock the calculation API to return known results.

Verification gate:
  Enter the same numeric inputs in the UI and directly via curl to the calculation endpoints.
  The results shown in the UI must be identical to the API response — no rounding or
  re-computation in the frontend.
```

---

## Phase 6 — Review Workflow

> **Baseline docs:** `03_USER_ROLES_AND_PERMISSIONS.md`, `04_WORKFLOW_AND_STATUS_LIFECYCLE.md`, `10_API_CONTRACT.md`, `14_REPORT_GENERATION_AND_AUDIT.md`, `13_VALIDATION_RULES.md`, `16_TESTING_STRATEGY.md`

```
You are implementing the full review workflow for the NAWI Test Report Management System —
submit, return, approve, reject — with audit logging on every transition.

Reference documents:
  • 04_WORKFLOW_AND_STATUS_LIFECYCLE.md  — status machine and transition rules
  • 03_USER_ROLES_AND_PERMISSIONS.md     — who may trigger which transition
  • 10_API_CONTRACT.md                   — submit/return/approve/reject endpoints
  • 14_REPORT_GENERATION_AND_AUDIT.md    — audit event fields
  • 13_VALIDATION_RULES.md               — submission pre-condition (no incomplete mandatory tests)
  • 16_TESTING_STRATEGY.md               — end-to-end demo script steps 4–9

Tasks:

1. STATUS TRANSITION ENDPOINTS (backend)
   Implement each endpoint in ReportService and wire to the router:

   POST /api/reports/{id}/submit
     - Allowed only if caller role is TECHNICIAN (or ADMIN).
     - Allowed only if current status is DRAFT, IN_PROGRESS, or QUERY_RAISED.
     - Pre-condition: no mandatory test is INCOMPLETE (ValidationEngine check).
     - Locks the ruleSetVersion to the active rule-set at this moment.
     - Transitions status -> SUBMITTED_FOR_REVIEW.
     - Writes audit event.

   POST /api/reports/{id}/return  { comment }
     - Allowed only if caller role is REVIEWER or ADMIN.
     - Allowed only if current status is SUBMITTED_FOR_REVIEW.
     - Transitions status -> QUERY_RAISED.
     - Stores comment in report.review.reviewerComments.
     - Writes audit event.

   POST /api/reports/{id}/approve  { comment }
     - Allowed only if caller role is REVIEWER or ADMIN.
     - Allowed only if current status is SUBMITTED_FOR_REVIEW.
     - Transitions status -> APPROVED.
     - Sets report.review.reviewerId, reviewedAt.
     - Writes audit event.
     - Calls ReportGenerationService.finalize(report) -> generates PDF + hash.
     - Report becomes immutable (service layer rejects future PUT calls).

   POST /api/reports/{id}/reject  { comment }
     - Allowed only if caller role is REVIEWER or ADMIN.
     - Allowed only if current status is SUBMITTED_FOR_REVIEW.
     - Transitions status -> REJECTED.
     - Writes audit event.

2. AUDIT SERVICE (backend/app/services/audit_service.py)
   - log_event(userId, role, action, reportId, fromStatus, toStatus, comment, ruleSetVersion)
   - Appends a timestamped entry to backend/storage/audit/audit-log.json.
   - Writes are append-only. Entries are never overwritten or deleted.
   - API: GET /api/reports/{id}/audit -> returns events for that report.
          GET /api/audit -> returns all events (admin only).

3. REVIEWER DASHBOARD (frontend/src/pages/ReviewPage.tsx)
   - Lists all reports with status SUBMITTED_FOR_REVIEW (for a REVIEWER).
   - Each report card shows: ID, instrument model, serial, technician, submitted date,
     accuracy class, overall result (PASS/FAIL based on current test results).
   - Clicking a report opens the full report review view.

4. REPORT REVIEW VIEW
   - Read-only display of all wizard steps (instrument, environment, all test data).
   - For each test: show observations, calculated values, applicable limit, result badge.
   - Comments box (reviewer can type and save a comment without yet making a decision).
   - Buttons: "Return for Correction" (-> calls /return) | "Approve" (-> calls /approve) |
     "Reject" (-> calls /reject).
   - Each action requires a comment (text field is required before the button is enabled).

5. TECHNICIAN RESUBMIT FLOW
   - If a report status is QUERY_RAISED, the wizard reopens in edit mode.
   - The reviewer's comment is shown prominently at the top of each wizard step.
   - On completing edits, "Resubmit" button calls POST /api/reports/{id}/submit again.

6. ENFORCEMENT TESTS (must pass)
   - TECHNICIAN token -> POST /approve -> HTTP 403.
   - REVIEWER token -> POST /submit (own report) -> HTTP 403.
   - Attempt to approve from DRAFT status -> HTTP 422 / 400 (invalid transition).
   - Attempt to submit with INCOMPLETE mandatory test -> HTTP 422 with validation message.

Verification gate:
  Run the end-to-end demo script from 16_TESTING_STRATEGY.md steps 1–9, including the
  query-and-resubmit loop. Every audit event is written. Enforcement tests all pass.
```

---

## Phase 7 — Report Generation

> **Baseline docs:** `14_REPORT_GENERATION_AND_AUDIT.md`, `10_API_CONTRACT.md`, `11_RULE_ENGINE_SPEC.md`, `09_DATA_MODEL.md`

```
You are implementing PDF report generation and report integrity hashing for the NAWI
Test Report Management System.

Reference documents:
  • 14_REPORT_GENERATION_AND_AUDIT.md — required PDF fields (24 items), format, hash rules
  • 10_API_CONTRACT.md                — POST /finalize, GET /download
  • 11_RULE_ENGINE_SPEC.md §6         — mandatory disclaimer text
  • 09_DATA_MODEL.md                  — report.hash field

Tasks:

1. REPORT GENERATION SERVICE (backend/app/reportgen/pdf_generator.py)
   Use reportlab or weasyprint. The generated PDF must include all 24 fields listed in
   14_REPORT_GENERATION_AND_AUDIT.md in order:
     1. Report title
     2. Report ID
     3. Application number
     4. Laboratory details
     5. Manufacturer details
     6. Instrument details (all fields from Instrument schema)
     7. Environmental conditions
     8. Test equipment
     9. Calibration information
     10. Test-by-test observations table (one table per test type)
     11. Calculated error column
     12. Applicable MPE column
     13. Pass/fail result column
     14. Remarks per test
     15. Overall conclusion (PASS only if all applicable tests PASS)
     16. Attachments list
     17. Technician name + ID
     18. Reviewer name + ID
     19. Approval date
     20. Rule-set version used
     21. Report hash (computed — see item 3 below)
     22. Signature placeholder with label:
         "Prototype integrity hash — not a legally valid digital signature."
     23. QR placeholder (leave as empty box labelled "QR verification placeholder")
     24. Page number (bottom of each page)

   Mandatory disclaimer (from 11_RULE_ENGINE_SPEC.md §6) must appear on every page footer:
   "Preliminary automated evaluation based on the configured OIML R-76 rule-set.
    Final acceptance remains subject to review and authorization by competent
    legal-metrology personnel."

2. HASH COMPUTATION
   - Compute SHA-256 of the report's canonical JSON (sorted keys, no whitespace variance).
   - Store hash in report.hash field.
   - A verification endpoint: POST /api/reports/{id}/verify -> re-computes hash from stored
     content and returns { "match": true/false, "storedHash": "...", "computedHash": "..." }.

3. IMMUTABILITY ENFORCEMENT
   - Once status = APPROVED:
     - ReportService.update_report() raises HTTP 403 "Report is approved and read-only."
     - The JSON file must not be overwritten (check status before any write in the repository).
   - Test: attempt PUT /api/reports/{id} on an APPROVED report -> HTTP 403.

4. API ENDPOINTS
   - POST /api/reports/{id}/finalize -> triggers PDF generation, computes hash, stores both.
     This is called automatically by the approve workflow (Phase 6).
   - GET  /api/reports/{id}/download -> streams the stored PDF from
     backend/storage/generated-reports/{reportId}.pdf

5. DESIGN ABSTRACTION
   - All PDF logic lives in app/reportgen/. The signature of the public function is:
     generate_report(report: Report) -> bytes   (returns the PDF bytes)
   - The calling code (ReportGenerationService) does not import reportlab or weasyprint —
     it only calls generate_report(). This keeps the door open for a DOCX generator later.

6. TESTS
   - Same content -> same hash (deterministic, no timestamp in the hashed body).
   - Changing one field -> different hash.
   - Attempt to write an APPROVED report -> HTTP 403.
   - PDF bytes returned by /download are a valid PDF (check magic bytes: starts with %PDF).

Verification gate:
  An approved report produces a downloadable PDF containing all 24 fields.
  Re-hashing the stored content twice gives the same hash.
  Editing any field changes the hash.
  PUT on an approved report -> HTTP 403.
```

---

## Phase 8 — Repository & Dashboard

> **Baseline docs:** `10_API_CONTRACT.md`, `08_LOCAL_STORAGE_DESIGN.md`, `09_DATA_MODEL.md`, `03_USER_ROLES_AND_PERMISSIONS.md`

```
You are building the searchable report repository and the dashboard statistics view for the
NAWI Test Report Management System.

Reference documents:
  • 10_API_CONTRACT.md        — GET /api/reports (filter params), GET /api/dashboard/*
  • 08_LOCAL_STORAGE_DESIGN.md — JsonReportRepository.list(filters)
  • 09_DATA_MODEL.md          — DashboardSummary type
  • 03_USER_ROLES_AND_PERMISSIONS.md — VIEWER sees only APPROVED; others see per role

Tasks:

1. SEARCH SERVICE (backend)
   - Implement SearchService.search(filters) using JsonReportRepository.list(filters).
   - Supported filters (all optional, combinable):
       status, model, manufacturer, serialNumber, dateFrom, dateTo,
       accuracyClass, finalResult
   - Filtering logic runs in Python over the in-memory list of JSON files (acceptable for
     prototype scale; no SQL needed).
   - Results are sorted by createdAt descending.
   - Apply role-based visibility: VIEWER receives only APPROVED reports; TECHNICIAN
     sees own reports + APPROVED; REVIEWER and ADMIN see all.

2. SEARCH ENDPOINT
   GET /api/reports?status=&model=&serial=&manufacturer=&dateFrom=&dateTo=&accuracyClass=&result=
   - Returns paginated list (page, pageSize, total, items[]).
   - Each item in the list is a report summary (not the full report body):
     { reportId, status, model, serialNumber, manufacturer, accuracyClass,
       createdBy, createdAt, updatedAt, finalResult }

3. DASHBOARD ENDPOINTS
   GET /api/dashboard/summary
     -> { total, drafts, inProgress, submittedForReview, approved, rejected }

   GET /api/dashboard/statistics
     -> { passRate, failRate, reportsByModel: [{model, count}],
         recentActivity: [{reportId, action, timestamp, user}] }

4. REPOSITORY UI (frontend/src/pages/RepositoryPage.tsx)
   - Search bar: free-text searches across model, serial, manufacturer.
   - Filter dropdowns: Status, Accuracy Class, Final Result.
   - Date range picker: Created From / To.
   - Results table: columns = Report ID | Status badge | Model | Serial | Manufacturer |
     Class | Technician | Date | Result | Actions.
   - Actions per row: View (all roles) | Download PDF (APPROVED only).
   - Empty state: "No reports match your search." with a clear prompt to adjust filters.
   - Loading skeleton while the API is called.

5. DASHBOARD PAGE (frontend/src/pages/DashboardPage.tsx)
   - Summary cards: Total Reports | Drafts | Awaiting Review | Approved | Rejected.
   - Pass/Fail rate bar or pie chart (Recharts).
   - Top models by report count (Recharts bar chart).
   - Recent activity feed (last 10 audit events): icon + "Technician submitted NAWI-2026-0001".
   - Each card and chart links to the Repository filtered for that status/result.

6. SEARCH TESTS (backend)
   - Search by status=APPROVED returns only APPROVED reports.
   - Search by model="BP-Platform-300" returns only matching reports.
   - Combining two filters returns only reports matching both.
   - VIEWER token can only see APPROVED reports regardless of filter params.

Verification gate:
  Searching by each of the 8 supported filter fields returns the correct, and only the
  correct, matching reports. VIEWER receives only APPROVED reports even if
  status=DRAFT is passed explicitly.
```

---

## Phase 9 — Rule Administration & Extensibility

> **Baseline docs:** `11_RULE_ENGINE_SPEC.md`, `03_USER_ROLES_AND_PERMISSIONS.md`, `10_API_CONTRACT.md`

```
You are building the admin-only rule management screen for the NAWI Test Report Management
System, allowing OIML threshold updates without manual file editing.

Reference documents:
  • 11_RULE_ENGINE_SPEC.md           — rule-set format, versioning rules, locking rules
  • 03_USER_ROLES_AND_PERMISSIONS.md — only ADMIN may manage rule-sets
  • 10_API_CONTRACT.md               — GET/POST/PUT /api/rules, POST /api/rules/{id}/activate

Tasks:

1. RULE REPOSITORY (backend/app/repositories/)
   - Implement JsonRuleRepository with methods:
     get_active() -> RuleSet
     get_by_id(ruleSetId) -> RuleSet | None
     list_all() -> List[RuleSet]
     create(ruleSet) -> RuleSet  (saves as new JSON file in storage/rules/)
     update(ruleSet) -> RuleSet  (only if status is DRAFT)
     activate(ruleSetId) -> RuleSet  (sets active flag, clears active on previous version)
   - Locking rule: if a rule-set ID is referenced by any APPROVED report, update() must
     raise HTTP 409 "Rule-set is locked — referenced by an approved report."

2. RULE ENGINE SERVICE EXTENSION
   - On activate: validate the new rule-set has all required fields (mpeRules for all
     supported accuracy classes, testRules for all four implemented tests).
   - After activation, new reports use the new rule-set; existing submitted/approved reports
     keep their locked ruleSetVersion unchanged (already enforced in Phase 6 submit endpoint).

3. API ENDPOINTS (all ADMIN-only)
   GET  /api/rules           -> list all rule-set versions with status (draft/active/locked)
   GET  /api/rules/active    -> the currently active rule-set
   GET  /api/rules/{id}      -> a specific rule-set (any status)
   POST /api/rules           -> create a new DRAFT rule-set (copy of active as starting point)
   PUT  /api/rules/{id}      -> edit a DRAFT rule-set (rejected if referenced by APPROVED report)
   POST /api/rules/{id}/activate -> activate a draft rule-set

4. RULE ADMIN UI (frontend/src/pages/RuleAdmin.tsx)
   - List all rule-set versions in a table: ID | Edition | Status | Effective Date | Created By
   - "Active" row highlighted.
   - View button: opens a read-only formatted display of the full rule-set JSON.
   - "Create New Draft" button: calls POST /api/rules (starts from a copy of active).
   - Edit draft: an inline JSON editor or structured form for MPE tables.
   - "Activate Draft" button: calls POST /api/rules/{id}/activate with a confirmation dialog.
   - Locked rule-sets (referenced by approved report): shown with lock icon, edit button disabled.

5. TESTS
   - Attempt to edit a rule-set referenced by an APPROVED report -> HTTP 409.
   - Activate new version -> GET /api/rules/active returns the new version.
   - Reports submitted before activation still use the old ruleSetVersion.
   - Non-ADMIN token -> all write endpoints return HTTP 403.

Verification gate:
  Updating OIML thresholds via the admin UI propagates to new reports without touching
  calculation_engine.py. Approved-report rule-sets are immutable.
```

---

## Phase 10 — Demonstration Hardening

> **Baseline docs:** `17_DEMO_DATA.md`, `16_TESTING_STRATEGY.md`, `11_RULE_ENGINE_SPEC.md`, `14_REPORT_GENERATION_AND_AUDIT.md`

```
You are hardening the NAWI Test Report Management System for its first live demonstration.
The goal is: a person who did not build the system can run the demo script unaided and see
the expected result at every step, including deliberate failure scenarios.

Reference documents:
  • 17_DEMO_DATA.md          — seed data: instrument, three report variants
  • 16_TESTING_STRATEGY.md   — end-to-end demo script (11 steps) + mandatory failing scenario
  • 11_RULE_ENGINE_SPEC.md   — disclaimers that must appear in UI and generated report
  • 14_REPORT_GENERATION_AND_AUDIT.md — report content checklist

Tasks:

1. SEED / DEMO DATA LOADER (backend/scripts/seed_demo_data.py)
   Create a script that loads three demo reports from 17_DEMO_DATA.md:
   a. ALL-PASS report — all four tests return PASS for instrument BP-Platform-300 /
      BP300-DEMO-001 / Class III / 300 kg / e=0.1 kg.
   b. FAIL report — at least one test has observedError > MPE; the failure reason must be
      human-readable (e.g., "Observed error 0.18 kg exceeds MPE ±0.05 kg at load 50 kg").
   c. WARNING report — at least one test result is within MPE but > 90% of MPE.
   The script is idempotent: re-running it does not create duplicates.
   Data is labelled "FICTIONAL DEMO DATA — not real government or laboratory test data."

2. EMPTY AND ERROR STATES (sweep every screen)
   For every page and widget:
   - Empty state (no data): show an informative message and a clear call-to-action.
     Examples: "No reports yet — create the first one.", "No reports match your search."
   - Loading state: skeleton loaders or spinners (no blank white flashes).
   - API error state: a dismissible inline banner — not a broken page.
   - 403 state: "You don't have permission to perform this action." — not a generic error.
   - Backend unreachable: global top banner "Cannot reach local server — mutating actions
     are disabled." + all save/submit/approve buttons disabled.

3. DISCLAIMER AUDIT (sweep every screen and generated PDF)
   Check that all four mandatory disclaimers from 11_RULE_ENGINE_SPEC.md §6 appear:
   a. "Preliminary automated evaluation..." — on every page footer and in the PDF.
   b. "Planned — Not implemented in prototype." — on any planned test in Step 4 + Step 5.
   c. "Requires domain validation." — wherever a threshold is shown.
   d. "Prototype integrity hash — not a legally valid digital signature." — on the hash field
      in the review view and in the PDF.

4. DEMO SCRIPT DRY RUN (follow 16_TESTING_STRATEGY.md exactly)
   Walk through all 11 steps as if you are the first-time demonstrator:
   1. Log in as technician.
   2. Create a new report with the demo instrument data.
   3. Enter all four test data sets — backend returns PASS for all.
   4. Submit.
   5. Log out; log in as reviewer.
   6. Raise a query with a comment.
   7. Log out; log in as technician; open the returned report; fix and resubmit.
   8. Log out; log in as reviewer; approve.
   9. Download PDF; verify hash matches.
   10. Search repository by model "BP-Platform-300" -> report appears.
   11. Verify hash screen shows "Match: true".
   MANDATORY FAILING SCENARIO: re-enter test data with observedError > MPE;
   confirm system shows FAIL badge with the specific rule/limit failed.

5. DOCUMENTATION FINALIZATION
   - Update README with demo login credentials and the three demo report IDs.
   - Add a one-page architecture diagram screenshot to docs/.
   - Confirm all local-run instructions still work from a clean clone.
   - Add a "Known limitations" section to README covering all items from
     01_PROJECT_OVERVIEW.md "What version 1 deliberately does not do".

Verification gate:
  A person who did not build the system can follow the demo script in 16_TESTING_STRATEGY.md
  unaided, including the deliberate FAIL scenario, with the expected result at every step.
  All four disclaimers appear in every correct location.
  Seed data loads cleanly on a fresh storage/ directory.
```

---

## Phase Summary Table

| Phase | Name | Primary Docs | Output |
|---|---|---|---|
| 0 | Domain & Architecture Prep | 01, 02, 03, 04, 06 | Shared written understanding, no code |
| 1 | Project Setup & Design System | 05, 06, 07, 10 | Running scaffold, both apps talking |
| 2 | Local Auth & Roles | 03, 04, 10, 15 | Login, JWT, role enforcement, 403 test |
| 3 | Instrument & Report Setup | 04, 07, 08, 09, 10, 13 | Draft creation, local JSON persistence |
| 4 | Calculation Engine & Rules | 11, 12, 09, 10, 16 | Pure calc functions, rule-set, unit tests |
| 5 | Test Data Entry Interface | 12, 10, 13, 07 | Live pass/fail wizard UI |
| 6 | Review Workflow | 03, 04, 10, 14, 13, 16 | Submit/return/approve/reject + audit |
| 7 | Report Generation | 14, 10, 11, 09 | PDF with hash, immutability enforcement |
| 8 | Repository & Dashboard | 10, 08, 09, 03 | Search, filter, dashboard stats |
| 9 | Rule Administration | 11, 03, 10 | Admin UI for rule-set versioning |
| 10 | Demonstration Hardening | 17, 16, 11, 14 | Seed data, empty states, demo-ready |

> **MVP boundary:** Phases 0–8 = P0 (minimum credible prototype).
> Phase 9 = P1 (nice-to-have). Phase 10 = required before any live demo.
> P2 items (real digital signatures, multi-lab sync, hardware integration, production DB)
> are out of scope for this build — see 01_PROJECT_OVERVIEW.md.
