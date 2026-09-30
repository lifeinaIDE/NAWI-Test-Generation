# PHASES — How the System Is Built, Phase by Phase

This document explains the project as a **build history / roadmap**, for someone
trying to understand how the system came together (or will come together) — not as
instructions to hand to a coding tool. (Those live separately as phase-specific
Antigravity prompts, each of which references this document plus the relevant baseline
doc.)

Each phase below describes: what problem it addresses, what existed before it, what
exists after it, and how you'd verify it worked.

---

## Phase 0 — Domain & Architecture Preparation

**Before:** Only a raw problem statement — a description of what test reports are and
why the current manual process fails.

**What happens:** The team fixes the scope before writing code. This means agreeing on
the glossary, the four roles, which OIML tests are in scope for v1, the overall
architecture (layered, file-based storage), a data-flow diagram, and the full list of
screens the frontend will need. Any legal-metrology assumption that isn't certain is
explicitly flagged as "requires domain validation" rather than guessed at.

**After:** A written, shared understanding of what is being built and what is
explicitly deferred — captured in this documentation set.

**Verification:** Everyone on the team (and a first-time reader of these docs) can
describe the workflow, the roles, and the storage approach without asking a follow-up
question.

---

## Phase 1 — Project Setup & Design System

**Before:** Only documentation exists — no code.

**What happens:** The frontend (React/TS/Vite) and backend (FastAPI) projects are
scaffolded side by side in one repository. A shared understanding of the API contract
is established as stub types/schemas. Basic layout, navigation shell, and a consistent
styling approach (Tailwind) are put in place. An error-handling convention is decided
(how API errors surface in the UI). Local run instructions are written down and tested
by actually running them from a clean checkout.

**After:** Two apps that run locally side by side, talking to each other over a
placeholder API, with nothing meaningful in them yet.

**Verification:** A new developer can clone the repo, follow the README, and see a
blank-but-running frontend talking to a running backend, with no manual fixes needed.

---

## Phase 2 — Local Authentication & Roles

**Before:** No concept of "who is using the system."

**What happens:** A small set of prototype users (one per role) is defined. A login
screen is built. The frontend gates routes based on role. Critically, the backend also
checks role/permission on protected endpoints — not just the frontend.

**After:** Four people (technician, reviewer, admin, viewer) can each log in and see a
role-appropriate (empty) dashboard; each is blocked from actions outside their role
even if they try to call the API directly.

**Verification:** Attempting a reviewer-only action while logged in as a technician is
rejected by the backend, not just hidden by the UI.

---

## Phase 3 — Instrument & Report Setup

**Before:** Login works, but there's nothing to do once logged in.

**What happens:** Report creation begins. The instrument-details form, laboratory
form, and environment form are built. Saving a draft writes a JSON file to local
storage through the repository layer.

**After:** A technician can start a report, fill in instrument/lab/environment details,
save it as a draft, close the browser, and reopen the same draft later with everything
intact.

**Verification:** A saved draft's JSON file on disk matches what was entered in the UI,
field-for-field.

---

## Phase 4 — Calculation Engine & Rules

**Before:** Reports can hold instrument data but nothing is calculated yet.

**What happens:** The OIML rule-set is written as an external, versioned JSON file. A
rule-loading service is built. The four calculation functions (weighing performance,
eccentricity, repeatability, discrimination) are implemented as pure functions that
read thresholds from the rule-set — never from a hardcoded number. Unit tests cover
normal cases, boundary cases (exactly at the MPE), and invalid input.

**After:** Given a set of observations, the backend can return a calculated
observed error, the applicable MPE, and a pass/fail result — independent of any UI.

**Verification:** Unit tests pass, including at least one test that proves changing the
rule-set JSON changes the calculated result without touching calculation code.

---

## Phase 5 — Test Data Entry Interface

**Before:** Calculations work via API calls, but there's no UI to enter test
observations.

**What happens:** The wizard's test-selection and test-data-entry steps are built.
Each of the four test types gets a dedicated dynamic form with inline validation. As
data is entered, the frontend calls the calculation endpoints and shows live pass/fail
indicators (green/amber/red) alongside the calculated values and the limit they're
being checked against.

**After:** A technician can select applicable tests, enter real observations, and see
correct, backend-computed results as they go — with no compliance math happening in
the browser itself.

**Verification:** The same inputs entered in the UI and sent directly to the
calculation API return identical results.

---

## Phase 6 — Review Workflow

**Before:** Reports can be filled out and calculated, but they're stuck in draft
forever.

**What happens:** Status-transition endpoints are built (submit, return, approve,
reject), each enforcing which role may perform it and which prior status is valid.
Every transition writes an audit event. A reviewer dashboard and review page are
built, including the ability to add comments and see the full test-by-test picture.

**After:** A report can move from draft through submission, a query-and-resubmit loop,
and on to approval or rejection — with a full paper trail.

**Verification:** The end-to-end demo script in `16_TESTING_STRATEGY.md` runs
successfully, including the query-and-resubmit loop.

---

## Phase 7 — Report Generation

**Before:** Reports can be approved, but there's no artifact to hand anyone.

**What happens:** The report preview screen and PDF generation service are built,
covering all fields listed in `14_REPORT_GENERATION_AND_AUDIT.md`. On approval, a
content hash is computed and stored; the report becomes read-only at the service
level, not just in the UI.

**After:** An approved report produces a downloadable, hashed PDF that can't be edited
afterward through normal channels.

**Verification:** Attempting to edit an approved report via the API is rejected;
re-hashing the same report content twice gives the same hash, and changing any field
changes the hash.

---

## Phase 8 — Repository & Dashboard

**Before:** Reports exist as individual files but there's no way to find or summarize
them.

**What happens:** Search/filter endpoints (by ID, model, manufacturer, serial number,
status, date, accuracy class, result) are built, along with the repository UI and
dashboard statistics (totals, drafts, awaiting review, approved, rejected, pass/fail
rates, recent activity).

**After:** Anyone with appropriate access can find a specific report in seconds and see
a lab-wide summary at a glance.

**Verification:** Searching by each supported field returns the correct, and only the
correct, matching reports.

---

## Phase 9 — Rule Administration & Extensibility

**Before:** Rule-sets exist as files an admin has to edit by hand outside the app.

**What happens:** An admin-only screen for viewing the active rule-set, creating a new
draft version, editing it, and activating it is built. The rule-set locking behavior
(can't edit a rule-set already used by an approved report) is enforced.

**After:** Updating OIML thresholds is a workflow inside the product, not a manual file
edit, and history of rule-set versions is preserved and auditable.

**Verification:** Attempting to edit a rule-set referenced by an approved report is
rejected; activating a new version doesn't retroactively change already-submitted
reports' calculations.

---

## Phase 10 — Demonstration Hardening

**Before:** The system works but hasn't been stress-tested against how it will
actually be shown to someone unfamiliar with it.

**What happens:** Seed/demo data is loaded (the three variants in `17_DEMO_DATA.md`),
every screen's empty and error states are checked, loading states are added wherever
missing, and the scripted demo flow is rehearsed end-to-end. Documentation (README,
architecture diagram, screenshots) is finalized.

**After:** The system can be handed to someone cold, or demonstrated live, without
hitting an unhandled edge case.

**Verification:** A person who did not build the system can follow the demo script in
`16_TESTING_STRATEGY.md` unaided and get the expected result at every step, including
the deliberate failing scenario.

---

## Reading this against the MVP priorities

Phases 0–8 correspond to the **P0** feature set (see `04` in the original phase-plan
scope, now folded into this document) — this is the minimum for a credible working
prototype. Phase 9 and parts of hardening lean into **P1** (nice-to-have if time
allows). Nothing here builds toward **P2** scope (real digital signatures,
multi-laboratory sync, hardware integration, production database) — that is
deliberately out of bounds for this build.
