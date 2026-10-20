# 16. Testing Strategy

## Backend tests

- MPE table selection (by accuracy class + interval count)
- Observed error / corrected error calculation
- Repeatability range calculation
- Eccentricity per-position result + worst-position detection
- Discrimination pass/fail
- Boundary values (exactly at the MPE limit)
- Invalid/missing input handling
- Status transition rules (e.g., can't approve directly from DRAFT)
- Role permission enforcement
- Report hash consistency (same content → same hash; changed content → different hash)

## Frontend tests

- Form validation (required fields, numeric ranges, max > min)
- Wizard step navigation (can't skip incomplete steps)
- Dynamic test form rendering per selected test
- Error message display
- Pass/fail indicator rendering
- Role-based page visibility
- Search/filter behavior
- Report download action

## End-to-end demo script

1. Technician logs in, creates a report.
2. Technician enters valid instrument and test values.
3. Backend returns PASS for all four tests.
4. Technician submits the report.
5. Reviewer opens it, raises a query.
6. Technician edits and resubmits.
7. Reviewer approves.
8. Backend generates the final PDF and computes the hash.
9. Report becomes read-only.
10. Repository search finds it by model/serial/status.
11. Hash verification screen confirms integrity.

**Mandatory failing scenario:** enter an observed error that exceeds the MPE → system
shows FAIL with the specific rule/limit it failed against → approval is blocked or
explicitly flagged for review, per the workflow rules in
`04_WORKFLOW_AND_STATUS_LIFECYCLE.md`.
