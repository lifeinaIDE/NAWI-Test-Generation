# 9. Data Model

## The core report object

This is the central entity in the system. Everything else (attachments, audit events,
review comments) hangs off of it.

```json
{
  "reportId": "NAWI-2026-0001",
  "applicationNumber": "APP-2026-001",
  "status": "DRAFT",
  "reportVersion": 1,
  "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
  "createdBy": "user-id",
  "createdAt": "2026-01-01T10:00:00Z",
  "updatedAt": "2026-01-01T10:00:00Z",

  "laboratory": { "name": "", "address": "", "location": "", "contact": "" },
  "manufacturer": { "name": "", "address": "", "country": "" },

  "instrument": {
    "model": "",
    "serialNumber": "",
    "type": "",
    "accuracyClass": "III",
    "maxCapacity": 0,
    "minCapacity": 0,
    "verificationIntervalE": 0,
    "actualIntervalD": 0,
    "numberOfIntervalsN": 0,
    "unit": "kg",
    "softwareVersion": "",
    "loadCell": {}
  },

  "environment": {
    "temperatureStart": 0,
    "temperatureEnd": 0,
    "relativeHumidity": 0,
    "barometricPressure": null
  },

  "tests": [
    {
      "testCode": "WEIGHING_PERFORMANCE",
      "testName": "Weighing Performance",
      "applicable": true,
      "status": "COMPLETED",
      "observations": [],
      "calculations": {},
      "result": "PASS",
      "remarks": ""
    }
  ],

  "attachments": [],
  "review": { "reviewerId": null, "reviewerComments": "", "reviewedAt": null },
  "finalResult": "PENDING",
  "hash": null,
  "auditEvents": []
}
```

`testCode` values in v1: `WEIGHING_PERFORMANCE`, `ECCENTRICITY`, `REPEATABILITY`,
`DISCRIMINATION`, plus entries for all other OIML tests with `status: "PLANNED"` (see
`12_TEST_MODULES.md` §E).

## Shared entities (same field names, frontend and backend)

`User, Role, Instrument, Laboratory, Environment, TestDefinition, TestObservation,
CalculationResult, ValidationMessage, Report, Attachment, AuditEvent, RuleSet,
DashboardSummary`

Example (TypeScript, mirrored in Pydantic on the backend):

```ts
export type Role = "TECHNICIAN" | "REVIEWER" | "ADMIN" | "VIEWER";

export interface User {
  id: string;
  username: string;
  role: Role;
  laboratory: string;
}

export interface ValidationMessage {
  level: "ERROR" | "WARNING" | "INFO";
  field: string;
  message: string;
}

export interface CalculationResult {
  observedError: number;
  correctedError?: number;
  maxPermissibleError: number;
  result: "PASS" | "FAIL" | "WARNING" | "INCOMPLETE" | "NOT_APPLICABLE";
  formulaUsed: string;
}
```

## Why field names matter this much

Because the frontend never computes compliance logic itself, it depends entirely on
receiving well-structured, consistently-named data from the backend. If
`verificationIntervalE` on the backend became `verification_interval_e` while the
frontend still expected the camelCase form, forms would silently show blank values
instead of erroring loudly — which is dangerous in a legal-metrology context. Keeping
names identical, field-for-field, across `backend/app/schemas/` and `frontend/src/types/`
is a deliberate design decision, not a style preference.
