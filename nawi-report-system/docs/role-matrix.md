# User Role & Permissions Matrix — NAWI System

> **Project ID:** SIH26035 — Smart India Hackathon 2026  
> **Phase:** Phase 0 — Security & Access Control Specification

---

## 1. Principles of Server-Side Enforcement

In accordance with **Layering Rule 3**, role-based permission checks are executed and strictly enforced on the **FastAPI backend** inside the security dependency (`require_role`) and service layer methods. 

- Frontend navigation hiding or button disabling is solely a user-experience enhancement.
- If an unauthorized user crafts a direct HTTP request to a mutating or privileged endpoint, the backend immediately halts execution and returns:
  - **`HTTP 401 Unauthorized`**: If the caller has missing, invalid, or expired JWT credentials.
  - **`HTTP 403 Forbidden`**: If the caller is authenticated but lacks the required role for the requested operation (`{"detail": [{"level": "ERROR", "field": "", "message": "Not authorized for this action"}]}`).
  - **`HTTP 422 Unprocessable Entity`**: If a transition violates report state preconditions (e.g. attempting to submit an incomplete report or approving an unsubmitted draft).

---

## 2. Feature vs Role Access Matrix

| Feature / Action | API Endpoint & Method | TECHNICIAN | REVIEWER | ADMIN | VIEWER | Backend Enforcement Mechanism |
|---|---|:---:|:---:|:---:|:---:|---|
| **Authenticate / Login** | `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ | Public endpoint; returns JWT token. |
| **Inspect Current Profile** | `GET /api/auth/me` | ✅ | ✅ | ✅ | ✅ | `get_current_user` dependency (validates JWT). |
| **Create New Report Draft** | `POST /api/reports` | ✅ | ❌ | ✅ | ❌ | `require_role(["TECHNICIAN", "ADMIN"])` |
| **Edit Metadata & Instrument** | `PUT /api/reports/{id}` | ✅ (drafts) | ❌ | ✅ | ❌ | `require_role(["TECHNICIAN", "ADMIN"])` + report ownership/state check |
| **Enter / Update Observations** | `PUT /api/reports/{id}` | ✅ (drafts) | ❌ | ✅ | ❌ | Rejected if report status is `SUBMITTED_FOR_REVIEW`, `APPROVED`, or `REJECTED` |
| **Delete Draft Report** | `DELETE /api/reports/{id}` | ✅ (own) | ❌ | ✅ | ❌ | `require_role(["TECHNICIAN", "ADMIN"])` + status must be `DRAFT` |
| **Live Calculation Preview** | `POST /api/calculations/*` | ✅ | ✅ | ✅ | ✅ | Stateless pure calculation endpoint; authenticated users only |
| **Submit Report for Review** | `POST /api/reports/{id}/submit` | ✅ | ❌ | ✅ | ❌ | `require_role(["TECHNICIAN", "ADMIN"])` + check all applicable tests completed |
| **Resubmit After Query** | `POST /api/reports/{id}/submit` | ✅ | ❌ | ✅ | ❌ | Transition from `QUERY_RAISED` with audit action `RESUBMIT` |
| **View Review Queue** | `GET /api/reports?status=SUBMITTED...` | ❌ | ✅ | ✅ | ❌ | Filtered in UI; non-reviewers restricted by workflow rules |
| **Add Reviewer Comments** | `POST /api/reports/{id}/return` | ❌ | ✅ | ✅ | ❌ | `require_role(["REVIEWER", "ADMIN"])` |
| **Return Report (Query Raised)**| `POST /api/reports/{id}/return` | ❌ | ✅ | ✅ | ❌ | `require_role(["REVIEWER", "ADMIN"])` + transition valid from `SUBMITTED_FOR_REVIEW` only |
| **Approve Report** | `POST /api/reports/{id}/approve` | ❌ | ✅ | ✅ | ❌ | `require_role(["REVIEWER", "ADMIN"])` + locks report, triggers PDF & SHA-256 hash |
| **Reject Report** | `POST /api/reports/{id}/reject` | ❌ | ✅ | ✅ | ❌ | `require_role(["REVIEWER", "ADMIN"])` |
| **Download PDF Certificate** | `GET /api/reports/{id}/download` | ✅ | ✅ | ✅ | ✅ | Permitted once report is `APPROVED` |
| **Verify Integrity Hash** | `GET /api/reports/{id}/hash` | ✅ | ✅ | ✅ | ✅ | Verifies calculated SHA-256 digest against canonical model |
| **Search / Filter Reports** | `GET /api/reports` | ✅ (own/all) | ✅ (all) | ✅ (all) | ✅ (approved) | Viewer role automatically scoped to `APPROVED` reports only |
| **View Dashboard Statistics** | `GET /api/dashboard/stats` | ✅ | ✅ | ✅ | ❌ | Role-tailored metrics returned by backend |
| **Read Audit Trail** | `GET /api/reports/{id}/audit` | ✅ | ✅ | ✅ | ❌ | `require_role(["TECHNICIAN", "REVIEWER", "ADMIN"])` |
| **View Active OIML Rule-Set** | `GET /api/rules/active` | ✅ | ✅ | ✅ | ✅ | Read-only access to versioned rules |
| **Create Draft Rule-Set** | `POST /api/rules` | ❌ | ❌ | ✅ | ❌ | `require_role(["ADMIN"])` |
| **Edit Draft Rule-Set** | `PUT /api/rules/{id}` | ❌ | ❌ | ✅ | ❌ | `require_role(["ADMIN"])` + blocked if rule-set referenced by approved report |
| **Activate Rule-Set Version** | `POST /api/rules/{id}/activate` | ❌ | ❌ | ✅ | ❌ | `require_role(["ADMIN"])` |
| **Manage Users & Role Assignment**| `POST /api/users` | ❌ | ❌ | ✅ | ❌ | `require_role(["ADMIN"])` |

---

## 3. Demo Persona Credentials

For prototype evaluation, the following pre-configured user credentials are provided in `backend/storage/users/users.json`:

| Username | Password | Role | Primary Operational Responsibility |
|---|---|---|---|
| `technician` | `demo123` | `TECHNICIAN` | Enters instrument specifications, inputs observations, runs tests, submits for review. |
| `reviewer` | `demo123` | `REVIEWER` | Inspects calculations, raises metrological queries, approves or rejects certificates. |
| `admin` | `demo123` | `ADMIN` | System administrator; manages user accounts, updates OIML rule-sets, reviews lab-wide audit logs. |
| `viewer` | `demo123` | `VIEWER` | Read-only auditor or legal metrology inspector; queries repository and downloads approved certificates. |
