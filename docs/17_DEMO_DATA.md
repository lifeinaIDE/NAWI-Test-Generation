# 17. Demo Data

All demo data below is **fictional** and must never be presented as real government or
laboratory test data.

```
Report ID:               NAWI-2026-0001
Manufacturer:            Demo Instruments Pvt Ltd
Model:                   BP-Platform-300
Serial Number:           BP300-DEMO-001
Instrument type:         Electronic platform scale
Accuracy class:          III
Max capacity:            300 kg
Min capacity:            2 kg
Verification interval e: 0.1 kg
Actual interval d:       0.1 kg
Unit:                    kg
Laboratory:              Central Demo Legal Metrology Laboratory
Technician:              Demo Technician
Reviewer:                Demo Reviewer
```

## Required demo report variants

1. **All-pass** — all four tests return PASS.
2. **Fail case** — at least one test fails (observed error beyond MPE), with a specific,
   readable failure reason attached.
3. **Warning case** — at least one test returns a value close to, but within, the
   permissible limit, triggering the warning tier described in
   `13_VALIDATION_RULES.md`.

These three variants together are what make the demo credible — showing only a
passing report doesn't demonstrate that the validation and rule engine actually work.
