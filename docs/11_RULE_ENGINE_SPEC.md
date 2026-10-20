# 11. Rule Engine Specification

## Principle

OIML R-76 thresholds and formulas live in **external, versioned JSON configuration** —
never hardcoded in frontend components or scattered across backend logic. The
Calculation Engine reads rules through the Rule Engine; it never contains a raw
threshold itself.

## Rule-set file format

```json
{
  "ruleSetId": "OIML-R76-PROTOTYPE-V1",
  "standard": "OIML R-76",
  "edition": "Prototype configuration — requires domain validation against the official edition",
  "effectiveFrom": "2026-01-01",
  "changeNotes": "Initial prototype rule-set for demo purposes.",
  "mpeRules": {
    "III": [
      { "minIntervals": 0,     "maxIntervals": 5000,   "mpeInE": 0.5 },
      { "minIntervals": 5000,  "maxIntervals": 20000,  "mpeInE": 1.0 },
      { "minIntervals": 20000, "maxIntervals": 100000, "mpeInE": 1.5 }
    ]
  },
  "testRules": {
    "weighingPerformance": {
      "formulaId": "OBSERVED_ERROR_V1",
      "criterion": "abs(observedError) <= mpe"
    },
    "eccentricity": {
      "criterion": "abs(error_at_each_position) <= mpe",
      "positions": ["CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"]
    },
    "repeatability": {
      "criterion": "range_less_than_or_equal_to_mpe"
    },
    "discrimination": {
      "criterion": "indication_change_greater_than_or_equal_to_d"
    }
  }
}
```

## Required fields per rule-set

- Rule-set ID, standard name, edition, effective date.
- Accuracy classes and their MPE tables (by interval range).
- Test-specific criteria (as a named rule, not inline logic).
- Units, formula identifiers, rounding rules.
- Applicability conditions (when a test is required vs optional).
- Notes and change history.

## Versioning rules

- A report locks in the `ruleSetVersion` at submission time — even if the active
  rule-set changes later, that report keeps calculating against the version it started
  with.
- A rule-set referenced by an **approved** report cannot be edited — only a new version
  can be created.
- Admin can create a new draft rule-set, edit it freely, then `activate` it. Only one
  rule-set is "active" per standard at a time.

## Calculation engine responsibilities

Pure, side-effect-free functions, one per test:

- `calculate_weighing_performance(testLoad, indication, zeroError, e, accuracyClass, ruleSet) -> CalculationResult`
- `calculate_eccentricity(loads, e, accuracyClass, ruleSet) -> CalculationResult`
- `calculate_repeatability(testLoad, readings, e, accuracyClass, ruleSet) -> CalculationResult`
- `calculate_discrimination(initialIndication, addedLoad, newIndication, d, ruleSet) -> CalculationResult`

Each function must:
1. Look up the applicable MPE from the rule-set (never hardcode a number).
2. Compute the relevant error/range/delta.
3. Compare against the rule's criterion.
4. Return `PASS / FAIL / WARNING / INCOMPLETE / NOT_APPLICABLE` plus which
   formula/rule-set version was used (for traceability in the report).

## Mandatory disclaimers (must appear in UI + generated report)

- "Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final
  acceptance remains subject to review and authorization by competent legal-metrology
  personnel."
- Any test not yet implemented is labeled: "Planned — Not implemented in prototype."
- Any threshold not confirmed against an official edition is labeled: "Requires domain
  validation."
- The hash/signature field is labeled: "Prototype integrity hash — not a legally valid
  digital signature. Digital signature integration planned for production deployment."
