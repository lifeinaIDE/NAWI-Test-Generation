# 15. Security & Quality Practices

Even as a local prototype, the system follows baseline good practice:

- Backend enforces authorization on every mutating and sensitive-read endpoint.
- All input is sanitized before use, especially anything touching the filesystem.
- File uploads are restricted by type and size.
- Uploaded files are stored under safe, generated filenames — never the raw
  client-supplied filename, and never a client-supplied path.
- The frontend cannot supply an arbitrary file path to the backend.
- No secrets or sensitive configuration live in frontend source code.
- Configuration (storage paths, secrets, environment-specific values) comes from
  environment variables, not hardcoded constants.
- Clear separation between development and production configuration.
- Approved reports are immutable at the service layer, not just hidden from edit UI.
- Every meaningful action is captured in the audit trail (see
  `14_REPORT_GENERATION_AND_AUDIT.md`).
- Calculation logic has automated unit tests — this is the most legally sensitive part
  of the system and the least acceptable place for an untested bug.
- APIs return structured, predictable error responses (not raw stack traces) to the
  frontend.
- A backup/export function exists for local report files, since there is no database
  with its own backup story in v1.
