# 2. Glossary

A reader unfamiliar with legal metrology needs these terms to make sense of the rest
of the documentation.

| Term | Meaning |
|---|---|
| **NAWI** | Non-Automatic Weighing Instrument — a weighing instrument that requires an operator during the weighing process (as opposed to fully automatic weighing systems). |
| **OIML** | International Organization of Legal Metrology — publishes international recommendations for measuring instruments. |
| **OIML R-76** | The specific OIML Recommendation covering the metrological and technical requirements for NAWIs, including the tests this system automates. |
| **Legal Metrology** | The branch of regulation covering measurement instruments used in trade/commerce, to ensure fairness and accuracy. |
| **Model Approval / Type Evaluation** | The formal process by which a specific instrument model is certified fit for legal/commercial use, based on passing a defined set of tests. |
| **Accuracy Class** | A classification (e.g., Class II, III, IIII) defining how precise an instrument must be; determines which MPE table applies. |
| **e (Verification Scale Interval)** | The scale interval used for verification/legal purposes — the "legal" unit of resolution for compliance checks. |
| **d (Actual Scale Interval)** | The actual smallest increment the instrument's display can show. |
| **n (Number of Verification Intervals)** | Max capacity divided by `e` — determines which MPE tier applies. |
| **MPE (Maximum Permissible Error)** | The largest error allowed at a given load, per the applicable accuracy class and rule-set. This is the pass/fail threshold. |
| **Observed Error** | The difference between an instrument's indicated value and the true/reference value during a test. |
| **Corrected Error** | Observed error adjusted for a known zero error or other systematic offset. |
| **Eccentricity Test** | A test that loads the instrument off-center (e.g., at each corner of a platform) to check that position doesn't distort the reading beyond the permitted error. |
| **Repeatability Test** | A test that repeats the same load multiple times to check the instrument gives consistent (not just accurate) readings. |
| **Discrimination Test** | A test that checks the instrument can detect a small added load — i.e., it's sensitive enough at its stated resolution. |
| **Verification / Stamping** | The physical/legal act of certifying and sealing an instrument for legal trade use, based on it passing evaluation. |
| **Rule-Set** | A versioned configuration file containing the MPE tables and test criteria used to evaluate a report — see `11_RULE_ENGINE_SPEC.md`. |
| **Draft / Submitted / Approved / Rejected** | Status values a report moves through — see `04_WORKFLOW_AND_STATUS_LIFECYCLE.md`. |
| **Repository (data)** | A backend abstraction layer for reading/writing stored data, independent of whether the underlying storage is JSON files or a real database. |
| **Report Hash** | A prototype integrity fingerprint computed from a report's content once approved, used to detect any later tampering. It is *not* a legal digital signature. |
