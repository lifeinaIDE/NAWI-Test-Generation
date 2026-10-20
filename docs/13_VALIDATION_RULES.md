# 13. Validation Rules

Validation is implemented at **both** frontend (fast feedback) and backend (source of
truth) levels. The backend is authoritative — the frontend's copy of these rules exists
only for responsiveness, and must never diverge into being the actual gate.

## A. Basic validation

- Required fields must be present.
- Numeric fields must be numeric where applicable.
- No negative capacity.
- Max capacity must be greater than min capacity.
- `e` and `d` must be positive.
- Number of divisions (`n`) must be a valid, consistent value.
- Temperature and humidity must fall within reasonable physical ranges.
- Test load must be within the instrument's declared capacity.
- Observation values must be numeric where required.

## B. Cross-field validation

- `n` should correspond to `maxCapacity / e` where applicable.
- The selected accuracy class must have an available MPE rule in the active rule-set.
- Test data must match the shape expected by the selected test.
- A test cannot be marked complete without its required observations filled in.
- Approved reports must be read-only — any write attempt against an `APPROVED` report
  must be rejected server-side.
- A report cannot be submitted if mandatory tests are incomplete.
- A calibration certificate must not be accepted as valid after its expiry date.
- A report must use a fixed rule-set version once submitted — it cannot silently switch
  to a newer active rule-set mid-review.

## C. Three-tier warning system

| Level | Effect | Example |
|---|---|---|
| **Error** | Blocks saving or submission | "Test load exceeds instrument capacity." |
| **Warning** | Allows saving, flags for review | "Observed error is close to the permissible limit." |
| **Information** | Explains a calculation/condition, no gating | "This test has not been marked applicable or not applicable." |

Additional example warnings:
- "Calibration certificate expiry date is approaching."
- "The selected rule-set is not the latest active rule-set."

Every validation message returned by the backend includes `{ level, field, message }`
so the frontend can render it inline against the right form field (see
`10_API_CONTRACT.md`).
