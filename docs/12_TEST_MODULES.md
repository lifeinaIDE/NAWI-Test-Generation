# 12. Test Modules

## A. Weighing Performance Test

**Inputs:** test load, indication, additional small weights used to determine actual
indication before rounding, zero error (where applicable), verification interval `e`,
accuracy class.

**Calculated:** indication prior to rounding, observed error, corrected error, maximum
permissible error, pass/fail result.

The specific OIML R-76 formula used must be clearly displayed alongside the result, not
just the final number — so a reviewer can see *how* the pass/fail was reached.

## B. Eccentricity Test

**Inputs:** load value, position/corner, observed indication, reference indication,
error, applicable limit.

For a platform or weighbridge, supported positions: **Center, Front-Left, Front-Right,
Rear-Left, Rear-Right.**

**Frontend enhancement:** a visual platform map, color-coded per position
(pass/warning/fail), with the worst-performing position highlighted.

## C. Repeatability Test

**Inputs:** test load, number of repetitions, observed readings, mean/reference value.

**Calculated:** maximum reading, minimum reading, difference between max and min,
applicable permissible error, pass/fail status.

**Frontend enhancement:** a simple stability chart showing the readings across
repetitions.

## D. Discrimination Test

**Inputs:** initial indication, added small load, new indication, scale interval `d`,
applicable criterion.

**Calculated:** change in indication, whether the change is at least the required
interval, pass/fail status.

## E. Planned test modules (v1 placeholders only)

The following OIML R-76 tests are **not implemented** in v1. They exist in the test
inventory with `status: "PLANNED"` so the architecture visibly supports adding them
without redesign:

- Zero return
- Creep
- Temperature effect
- Warm-up time
- Voltage variation
- Tilting
- Tare weighing
- Stability of equilibrium
- Electrical disturbance
- Damp heat
- Span stability
- Endurance
- Construction examination

**Rule:** never invent an unsupported legal threshold for these. A planned test must be
clearly labeled "Planned," "Not implemented in prototype," or "Requires domain
validation" wherever it appears in the UI or generated report.
