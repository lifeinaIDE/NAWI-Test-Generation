# 8. Local Storage Design

## Why no database in v1

The goal of the first version is to demonstrate the full workflow without the added
complexity of setting up and managing a database server. All persistence in v1 is
backend-managed local files, sitting behind a repository abstraction so a real database
can be introduced later **without changing the frontend or the calling code in the
service layer**.

## Storage layout

```
storage/
  reports/
    NAWI-2026-0001.json
    NAWI-2026-0002.json
  attachments/
    NAWI-2026-0001/
      nameplate.jpg
      calibration-cert.pdf
  generated-reports/
    NAWI-2026-0001.pdf
  rules/
    r76-rules-v1.json
    r76-rules-v2.json
  users/
    users.json
  audit/
    audit-log.json
  templates/
    report-template.json
```

## Repository abstraction

Each storage concern has an interface, implemented for JSON files in v1:

- `ReportRepository` — create/read/update/list/search reports.
- `UserRepository` — read users, check credentials/roles.
- `RuleRepository` — read/write rule-sets, track active version.
- `AttachmentRepository` — store/retrieve/delete attachment files, tied to a report.
- `AuditRepository` — append-only write, filtered read of audit events.

Services depend only on these interfaces. A future `PostgresReportRepository` (for
example) would implement the same interface and be swapped in via configuration —
nothing above the repository layer changes.

## Rules for this layer

- The frontend must never receive a raw file path or be able to specify one — all file
  access goes through repository methods that validate and sanitize.
- Attachment uploads must be restricted by file type and size, and stored under
  sanitized, generated filenames (never the raw client-provided filename) to avoid path
  traversal or unsafe characters.
- Audit log writes are append-only — nothing overwrites a past audit entry.
- Report writes must not corrupt the file on a crash mid-write (write to a temp file,
  then atomically rename) — small but important for a JSON-file-backed system.

## Migration path (documented now, not built now)

Future storage backends the abstraction should support without frontend changes:
PostgreSQL, MySQL, MongoDB, a government-managed cloud database, or an
offline-synchronization store. None of these are implemented in v1 — the point of the
abstraction is that they *can* be, later, cleanly.
