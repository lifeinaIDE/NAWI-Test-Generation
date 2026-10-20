# NAWI Test Report Management System

Digitises test-report generation for **Non-Automatic Weighing Instruments (NAWIs)** per **OIML Recommendation R-76**.  
Project ID: **SIH26035**, Smart India Hackathon 2026.

> ⚠️ **Preliminary automated evaluation only.** Every generated result must be reviewed by a qualified legal-metrology professional. This system does not produce a legal certification. [D1]  
> **Notice:** All seeded data is **FICTIONAL DEMO DATA — not real government or laboratory test data**.

---

## 1. Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Python | 3.11+ | FastAPI Backend & Calculation Engine |
| Node.js | 18+ | React 19 + TypeScript + Vite Frontend |
| npm | 9+ | Node package manager |

---

## 2. Quick Setup & Seed Demo Data

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd backend
python -m venv .venv
# On Windows PowerShell / Command Prompt:
.venv\Scripts\activate
pip install -r requirements.txt

# Frontend dependencies (in a new terminal)
cd ../frontend
npm install
```

### Step 2: Seed Demo Data (Idempotent)
To populate the storage directory with the active rule-set (`OIML-R76-PROTOTYPE-V1`), 4 user accounts, and 3 pre-configured demo reports for instrument `BP-Platform-300`:

```bash
# From the backend directory (with .venv active):
python scripts/seed_demo_data.py --reset
```

> **Note on `--reset` flag:** The `--reset` flag cleanly wipes and re-initializes `storage/` before seeding. Running without `--reset` is fully idempotent and updates existing records without overwriting uncommitted drafts.

---

## 3. Launching the System

You can run both backend and frontend concurrently from the root directory:

```bash
npm run dev
```

Or run each service individually:

- **Backend (FastAPI)**:
  ```bash
  cd backend
  .venv\Scripts\activate
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
  API Docs (Swagger UI): **http://localhost:8000/docs**  
  Health Check: **http://localhost:8000/api/health**

- **Frontend (Vite Single-Page Application)**:
  ```bash
  cd frontend
  npm run dev
  ```
  Application UI: **http://localhost:5173**

---

## 4. Demo User Accounts

All 4 roles use the same password `demo123`:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `technician` | `demo123` | `TECHNICIAN` | Create drafts, input test observations, submit and resubmit reports |
| `reviewer` | `demo123` | `REVIEWER` | Review submissions, raise queries (return), approve, or reject |
| `admin` | `demo123` | `ADMIN` | Manage users, view audit logs, create drafts and activate OIML rule-sets |
| `viewer` | `demo123` | `VIEWER` | Search repository and view/download approved certificates |

---

## 5. Seeded Demo Reports (`BP-Platform-300`)

Seeded instrument attributes:
- **Model**: `BP-Platform-300`
- **Manufacturer**: `Demo Instruments Pvt Ltd`
- **Serial Number**: `BP300-DEMO-001`
- **Type**: Electronic Platform Scale (Class III, $Max = 300\text{ kg}$, $Min = 2\text{ kg}$, $e = d = 0.1\text{ kg}$, $n = 3000$)
- **Testing Laboratory**: `Central Demo Legal Metrology Laboratory`

| Report ID | Metrological State | Workflow Status | Description |
|---|---|---|---|
| `NAWI-2026-0001` | **PASS** | `APPROVED` | All 4 applicable tests conform strictly within MPE. Locked and sealed with SHA-256 integrity hash & PDF certificate. |
| `NAWI-2026-0002` | **FAIL** | `SUBMITTED_FOR_REVIEW` | Contains a deliberate failure in Weighing Performance ($obsErr = +0.220\text{ kg} > MPE = \pm 0.100\text{ kg}$). Shows explicit non-conformity reason. |
| `NAWI-2026-0003` | **WARNING** | `SUBMITTED_FOR_REVIEW` | Within limits but observed error exceeds $90\%$ of MPE ($obsErr = +0.095\text{ kg} \approx 95\%$ of MPE $0.100\text{ kg}$). Prompts reviewer inspection. |

---

## 6. Unaided Demo Walk-Through (11-Step Script)

Follow these steps to demonstrate the full end-to-end workflow:

1. **Log In as Technician**:
   - Navigate to `http://localhost:5173/login`. Log in with `technician` / `demo123`.
2. **Create a Report with the Demo Instrument**:
   - Click **"+ Create New Report"** (or **New Report** in sidebar).
   - In Step 1, verify Application Number (e.g. `APP-2026-DEMO`) and click Save & Next.
   - In Step 2, enter or select:
     - Manufacturer: `Demo Instruments Pvt Ltd`
     - Model: `BP-Platform-300`
     - Serial: `BP300-DEMO-002`
     - Class: `III`, Max Capacity: `300` kg, Min Capacity: `2` kg, Scale Interval $e$: `0.1` kg, Actual Interval $d$: `0.1` kg.
   - In Step 3, confirm ambient temperature (`20.0` °C) and humidity (`55.0` %).
3. **Enter All Four Tests and See PASS from the Backend**:
   - In Step 4, ensure the 4 core tests (`WEIGHING_PERFORMANCE`, `ECCENTRICITY`, `REPEATABILITY`, `DISCRIMINATION`) are active. Notice the 13 planned tests tagged `[D2]`.
   - In Step 5, enter nominal observations (e.g., test load 150 kg, indication 150.0 kg). Observe the green **PASS** badge and the `"Calculated by server"` tag.
4. **Submit Report**:
   - Advance through Step 6 and Step 7 (Review & Submit).
   - Check the metrological confirmation checkbox and click **"Submit for Legal Review"**. Status transitions to `SUBMITTED_FOR_REVIEW`.
5. **Log In as Reviewer**:
   - Log out and log in with `reviewer` / `demo123`.
   - Open **Review Queue** from the sidebar; the newly submitted report appears at the top.
6. **Raise a Query with a Comment**:
   - Click **Review** on the report to view the 3-column metrological preview.
   - Click **Return with Query**, enter comment: `"Please re-verify eccentricity observation at Rear-Right corner."`, and confirm. Status transitions to `QUERY_RAISED`.
7. **Log In as Technician, Fix and Resubmit**:
   - Log in as `technician` / `demo123`. Open the report in Wizard.
   - Notice the amber **Reviewer Query Card** displaying the reviewer's comment.
   - Adjust observations if desired and click **"Resubmit for Review →"**.
8. **Log In as Reviewer, Approve**:
   - Log back in as `reviewer` / `demo123`, navigate to the review queue, and click **Review**.
   - Click **Approve Report**, enter approval remark: `"All observations verified and compliant with OIML R-76."`, and confirm.
   - Status transitions to `APPROVED`, rule-set version is permanently locked, and SHA-256 integrity hash is computed.
9. **Download PDF and Verify the Hash**:
   - From the Approved report view, click **"Download PDF"** to inspect the 24-point legal metrology certificate.
   - Click **"Verify Integrity"**. The modal verifies the canonical report payload against the stored SHA-256 hash.
10. **Search Repository by Model `BP-Platform-300`**:
    - Go to **Repository** in the sidebar.
    - In the Model filter or Search box, enter `BP-Platform-300`.
    - Observe the seeded and created reports filter instantaneously.
11. **Verify Screen Shows Match: true**:
    - Open `NAWI-2026-0001` or your newly approved report.
    - Click **"Verify Integrity"**. The modal displays **`Match: true`** in green with full stored and re-computed hashes.

---

## 7. Mandatory Failing Scenario

To demonstrate the server-driven compliance enforcement:
1. In Step 5 (Weighing Performance), enter:
   - Test Load: `50.0` kg
   - Indication: `50.25` kg (Error = $+0.250\text{ kg}$)
   - Zero Error: `0.0` kg
2. For Class III at $50\text{ kg}$ ($500\text{ e}$), the MPE is $\pm 0.5\text{ e} = \pm 0.050\text{ kg}$.
3. Because $|+0.250\text{ kg}| > 0.050\text{ kg}$, the backend immediately returns `FAIL`.
4. The UI displays a prominent **red FAIL badge** naming the exact limit that failed:
   `Compliance Non-conformity Detected: Observed error (+0.250 kg) exceeds MPE (±0.050 kg) per OIML R-76-1 Table 6`

---

## 8. Disclaimer Audit & Placements

The system strictly adheres to the 4 legal metrology disclaimers:
- **`[D1]` General Metrology Disclaimer**: Placed in the sticky global footer of every application screen and in the footer of every generated PDF page.
  > *"Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final acceptance remains subject to review and authorization by competent legal-metrology personnel."*
- **`[D2]` Research Prototype Coverage**: Displayed as a badge and tooltip on all 13 planned tests in Step 4.
  > *"Research prototype implementation — calculation engine coverage is currently limited to core automated tests. Extended environmental and disturbance test modules are planned for future releases."*
- **`[D3]` Domain Validation Required**: Displayed beside every threshold, MPE column, and tolerance limit in tables and calculation result cards.
  > *"Domain validation required: metrological limits and tolerances are subject to legal metrology verification rules."*
- **`[D4]` Integrity Hash Notice**: Rendered directly beneath the SHA-256 cryptographic hash on report views, modals, and the PDF certificate.
  > *"Prototype integrity hash — not a legally valid digital signature. Digital signature integration planned for production deployment."*

---

## 9. Running Automated Test Suites

### Backend Tests (pytest)
```bash
cd backend
$env:PYTHONPATH = ".\.venv\Lib\site-packages;."
.venv\Scripts\pytest -v
```
*Executes all 53 backend tests covering calculation engines, rule versioning, workflow transitions, PDF generation, canonical hashing, search filters, and the 11-step demo script.*

### Frontend Tests (vitest)
```bash
cd frontend
npm test -- --run
```
*Executes all 45 frontend tests across 8 suites covering auth, 7-step wizard, calculation UI, workflow transitions, PDF preview, hash verification, search filters, and admin screens.*

