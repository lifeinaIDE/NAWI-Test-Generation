# 10. API Contract

## Auth

```
POST /api/auth/login          { username, password }         → { token, user }
GET  /api/auth/me             (auth header)                   → User
```

## Reports

```
GET    /api/reports                     ?status=&model=&serial=&manufacturer=&dateFrom=&dateTo=&accuracyClass=&result=
POST   /api/reports                     { instrument, manufacturer, laboratory }  → Report (status DRAFT)
GET    /api/reports/{reportId}          → Report
PUT    /api/reports/{reportId}          { ...partial report fields }             → Report
DELETE /api/reports/{reportId}          (draft only)
POST   /api/reports/{reportId}/submit    → Report (status SUBMITTED_FOR_REVIEW)
POST   /api/reports/{reportId}/return    { comment }           → Report (status QUERY_RAISED)
POST   /api/reports/{reportId}/approve   { comment }           → Report (status APPROVED, hash generated)
POST   /api/reports/{reportId}/reject    { comment }           → Report (status REJECTED)
POST   /api/reports/{reportId}/finalize  → triggers report generation
GET    /api/reports/{reportId}/download  → PDF (and later DOCX) binary
```

**Example — create report request**
```json
POST /api/reports
{
  "instrument": { "model": "BP-Platform-300", "serialNumber": "BP300-DEMO-001", "accuracyClass": "III",
                   "maxCapacity": 300, "minCapacity": 2, "verificationIntervalE": 0.1, "actualIntervalD": 0.1, "unit": "kg" },
  "manufacturer": { "name": "Demo Instruments Pvt Ltd", "country": "IN" },
  "laboratory": { "name": "Central Demo Legal Metrology Laboratory" }
}
```
**Example — response**
```json
{ "reportId": "NAWI-2026-0001", "status": "DRAFT", "reportVersion": 1, "ruleSetVersion": "OIML-R76-PROTOTYPE-V1", "...": "..." }
```

## Calculations (stateless — used for live preview in the wizard)

```
POST /api/calculations/weighing-performance   { testLoad, indication, zeroError, e, accuracyClass } → CalculationResult
POST /api/calculations/eccentricity            { loads: [{position, indication, reference}], e, accuracyClass } → CalculationResult
POST /api/calculations/repeatability           { testLoad, readings: number[], e, accuracyClass } → CalculationResult
POST /api/calculations/discrimination          { initialIndication, addedLoad, newIndication, d } → CalculationResult
```

## Tests / Rules

```
GET  /api/tests
GET  /api/tests/{testCode}
GET  /api/rules
GET  /api/rules/active
POST /api/rules                          (admin) → new draft rule-set
PUT  /api/rules/{ruleSetId}              (admin, only if not used by an approved report)
POST /api/rules/{ruleSetId}/activate     (admin)
```

## Attachments

```
POST   /api/reports/{reportId}/attachments                (multipart)
GET    /api/reports/{reportId}/attachments/{attachmentId}
DELETE /api/reports/{reportId}/attachments/{attachmentId}
```

## Audit / Dashboard

```
GET /api/reports/{reportId}/audit
GET /api/audit
GET /api/dashboard/summary       → totals, drafts, awaiting review, approved, rejected
GET /api/dashboard/statistics    → pass/fail rates, reports by model, recent activity
```

## Frontend handling contract

- **Loading states**: every wizard step and dashboard widget has a skeleton/spinner state.
- **API errors**: centralized error interceptor → toast + inline field errors where the error maps to a field.
- **Validation errors**: backend returns `{ level, field, message }[]`; rendered inline under the matching form field, non-field ones shown in a summary panel (wizard step 7).
- **Unsaved changes**: wizard warns on navigation away with dirty state; auto-save draft is a P1 nice-to-have.
- **Draft saving**: explicit "Save Draft" button calls `PUT /api/reports/{id}` with `status: DRAFT`.
- **Backend unavailable**: global banner ("Cannot reach local server") + disable mutating actions.
- **Report generation progress**: `POST /finalize` shows a spinner even if synchronous on the backend for v1.
- **Permission-denied (403)**: dedicated "not authorized for this action" state, not a generic error screen.
