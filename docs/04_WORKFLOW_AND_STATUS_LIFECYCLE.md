# 4. Workflow & Status Lifecycle

## End-to-end workflow

1. User logs in / selects a role.
2. User opens the dashboard.
3. User clicks "Create New Test Report."
4. User enters instrument and manufacturer details.
5. User enters laboratory and environmental conditions.
6. User selects which OIML tests apply to this instrument.
7. User enters observations for each selected test.
8. Backend validates the submitted test data.
9. Backend calculates, per test: observed error, corrected error where applicable,
   maximum permissible error, differences between readings, test-specific limits, and
   the pass/fail status.
10. Frontend displays the calculation results as they come back.
11. User saves the report as a draft (can happen at any point above).
12. User submits the report for review.
13. Reviewer reviews the report.
14. Reviewer either returns it for correction, or approves it.
15. If corrections are needed: technician edits and resubmits — back to step 13.
16. On approval: backend generates the final report.
17. Backend calculates a report integrity hash.
18. The approved report becomes read-only.
19. The report appears in the searchable repository.
20. The user can preview or download the generated file.

## Status values

```
DRAFT
  → IN_PROGRESS
    → SUBMITTED_FOR_REVIEW
      → QUERY_RAISED  → RESUBMITTED → SUBMITTED_FOR_REVIEW (loop)
      → APPROVED  (terminal, read-only)
      → REJECTED  (terminal)
        → ARCHIVED (from APPROVED or REJECTED, later)
```

## Rules governing transitions

- Only a Technician can move a report from `DRAFT`/`QUERY_RAISED` into
  `SUBMITTED_FOR_REVIEW` (via resubmission).
- Only a Reviewer (or Admin acting as reviewer) can move a report from
  `SUBMITTED_FOR_REVIEW` into `QUERY_RAISED`, `APPROVED`, or `REJECTED`.
- A report cannot be submitted if mandatory tests are incomplete (see
  `13_VALIDATION_RULES.md`).
- Once `APPROVED`, a report is immutable — no further edits, only viewing/downloading.
- Every transition writes an audit event: who, what role, from-status, to-status,
  timestamp, and comment if any (see `14_REPORT_GENERATION_AND_AUDIT.md`).
- A report keeps the rule-set version it was evaluated against once submitted, even if
  the "active" rule-set changes later (see `11_RULE_ENGINE_SPEC.md` §4).
