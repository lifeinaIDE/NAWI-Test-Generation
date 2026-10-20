# 14. Report Generation & Audit

## What a generated report must contain

1. Report title
2. Report ID
3. Application number
4. Laboratory details
5. Manufacturer details
6. Instrument details
7. Environmental conditions
8. Test equipment
9. Calibration information
10. Test-by-test observations
11. Calculated error
12. Applicable MPE
13. Pass/fail result
14. Remarks
15. Overall conclusion
16. Attachments list
17. Technician details
18. Reviewer details
19. Approval date
20. Rule-set version
21. Report hash
22. Signature placeholder
23. QR verification placeholder (if implemented)
24. Page number

## Format

- **PDF** is required for v1.
- **DOCX/editable HTML** is a stretch goal — if it adds too much complexity in the first
  sprint, ship PDF first with a clean abstraction (`reportgen/`) so a DOCX generator can
  be added later without touching the calling code.
- Report generation happens **only** in the backend. The frontend requests it via
  `POST /api/reports/{reportId}/finalize` and downloads via
  `GET /api/reports/{reportId}/download`.

## Audit log

Every meaningful action is recorded:

- User ID
- User role
- Action taken
- Report ID
- Timestamp
- Previous status
- New status
- Comment (if any)
- Session/IP information where available
- Rule-set version in effect
- File generation events

The audit log is **append-only** — no entry is ever edited or deleted.

## Integrity, not legal signature

For an approved report:

- Ordinary editing is blocked.
- A content hash is computed and stored in the report's metadata.
- The hash is displayed in the report itself.
- Optionally, a QR code encoding the report ID + hash can be generated for quick
  verification.
- A verification endpoint/screen lets someone re-check a report's hash against its
  stored content.

**This hash is explicitly not a legally valid digital signature.** Wherever it appears,
it must be labeled: *"Prototype integrity hash — not a legally valid digital signature.
Digital signature integration planned for production deployment."*
