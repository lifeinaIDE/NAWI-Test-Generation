# 1. Project Overview

## What this is

A software application that generates **test reports for Non-Automatic Weighing
Instruments (NAWIs)** — instruments like electronic weighing scales, platform scales,
weighbridges, and industrial weighing systems, where a human operator is involved in
the weighing process — in accordance with **OIML Recommendation R-76**.

NAWIs are used across trade, commerce, agriculture, healthcare, and transport. Their
accuracy directly affects fair transactions and consumer protection, which is why
weighing instruments used commercially must go through evaluation, verification, and
approval before being trusted in the field.

To get that approval, laboratories run a battery of standardized tests on each
instrument model and produce a formal test report documenting the results.

## The problem being solved

Today, this testing and reporting process is largely manual:

- Data is entered repeatedly across paper forms, spreadsheets, and Word documents.
- Permissible-error and observed-error calculations are done by hand, which is
  error-prone.
- Report formats vary between technicians and labs.
- There's no easy way to check whether all required tests have actually been done.
- There's no searchable history of which instruments have been tested and with what
  result.
- Tracking a report through draft → submitted → reviewed → approved → rejected is done
  informally (email, verbal, physical file movement).
- When OIML rules are revised, every place a threshold is hardcoded has to be found
  and updated by hand.
- There's no systematic way to catch outlier or implausible readings.
- There's no cryptographic or systematic way to prove a report hasn't been altered
  after approval.

## What the system needs to do

1. Let a lab create a test report for a specific instrument.
2. Capture manufacturer, model, instrument, and laboratory details.
3. Record observations for the relevant OIML R-76 tests.
4. Automatically calculate observed error and the maximum permissible error (MPE).
5. Automatically determine PASS / FAIL / WARNING / INCOMPLETE / NOT_APPLICABLE.
6. Validate data before it can be submitted.
7. Generate a standardized report document.
8. Save and reopen reports at any point before approval.
9. Search and filter previously created reports.
10. Track a report's status through a review workflow.
11. Support different roles: technician, reviewer, administrator.
12. Keep OIML calculation rules in configuration, not scattered through code, so they
    can be updated without a code change.
13. Run entirely on a local machine for the first version — no external/cloud database.

## What "success" looks like for version 1

A technician can, from a browser, create a report, fill in real instrument and test
data across the four core OIML test modules, see automatic pass/fail results as they
type, submit the report, have a reviewer approve or send it back, and end up with a
hashed, read-only PDF — all searchable afterward, all logged in an audit trail — with
the whole thing running locally with no cloud dependency.

## What version 1 deliberately does not do

- No external database (Postgres/Mongo/Firebase) — see `08_LOCAL_STORAGE_DESIGN.md`.
- No real digital signature / PKI — a prototype integrity hash stands in for it.
- No multi-laboratory synchronization or central government integration.
- No hardware integration with physical scales (readings are entered manually).
- Only 4 of the ~15+ OIML R-76 test types are fully implemented; the rest exist as
  clearly labeled placeholders (see `12_TEST_MODULES.md` §E).

These are documented, deliberate scope boundaries — not oversights.
