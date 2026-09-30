# NAWI Test Report Management System — Documentation Index

This folder is the baseline documentation set for the project. It is written so that
someone with **no prior context** — a new teammate, a reviewer, or a future contributor —
can read it top to bottom and understand what the system is, why it exists, and how it
is built, without needing to talk to anyone first.

Read in this order:

| # | File | What it answers |
|---|---|---|
| 1 | `01_PROJECT_OVERVIEW.md` | What is this system and why does it need to exist? |
| 2 | `02_GLOSSARY.md` | What do NAWI, OIML R-76, MPE, e, d, n, accuracy class, etc. mean? |
| 3 | `03_USER_ROLES_AND_PERMISSIONS.md` | Who uses the system and what can each of them do? |
| 4 | `04_WORKFLOW_AND_STATUS_LIFECYCLE.md` | What happens, step by step, from creating a report to it being approved? |
| 5 | `05_TECH_STACK.md` | What technologies are used, and why these ones? |
| 6 | `06_ARCHITECTURE.md` | How is the system structured internally? |
| 7 | `07_FOLDER_STRUCTURE.md` | Where does each piece of code live? |
| 8 | `08_LOCAL_STORAGE_DESIGN.md` | Where and how is data actually stored (no database in v1)? |
| 9 | `09_DATA_MODEL.md` | What does a "report" look like as data? |
| 10 | `10_API_CONTRACT.md` | What API endpoints exist, and what do they expect/return? |
| 11 | `11_RULE_ENGINE_SPEC.md` | How are OIML R-76 rules and thresholds represented and versioned? |
| 12 | `12_TEST_MODULES.md` | What do the four OIML tests actually measure and calculate? |
| 13 | `13_VALIDATION_RULES.md` | What input validation and warning rules exist? |
| 14 | `14_REPORT_GENERATION_AND_AUDIT.md` | How is the final report produced, hashed, and audited? |
| 15 | `15_SECURITY_AND_QUALITY.md` | What baseline engineering practices does the system follow? |
| 16 | `16_TESTING_STRATEGY.md` | How is correctness verified? |
| 17 | `17_DEMO_DATA.md` | What sample data is used to demonstrate the system? |
| 18 | `PHASES.md` | How was/will the system actually be built, phase by phase — as a build history/plan, not instructions to an AI tool |

## One-paragraph summary

The system digitizes the process of generating **test reports for Non-Automatic
Weighing Instruments (NAWIs)** — electronic scales, platform scales, weighbridges —
according to **OIML Recommendation R-76**. A laboratory technician records instrument
details and test observations; the backend automatically calculates observed error
against the permissible limits and returns a pass/fail result; a reviewer checks and
approves the report; the system then generates a tamper-evident, read-only PDF report
that is stored locally and searchable later. Version 1 runs entirely on a local
machine with no external database, using a file-based storage layer designed to be
swapped for a real database later without touching the frontend.

## Important standing disclaimer

This system produces a **preliminary automated evaluation**, not a legal certification.
Every generated result must be reviewed by a qualified legal-metrology professional.
This principle appears throughout the documentation and must appear in the product UI
and generated reports themselves — see `11_RULE_ENGINE_SPEC.md` §6.
