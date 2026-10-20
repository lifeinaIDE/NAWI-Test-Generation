# System Architecture — NAWI Test Report Management System

> **Project ID:** SIH26035 — Smart India Hackathon 2026  
> **Standard:** OIML R-76 (Non-Automatic Weighing Instruments)  
> **Phase:** Phase 0 — Domain & Architecture Specification

---

## 1. System Summary

The **NAWI Test Report Management System** is an offline-first, local-prototype software platform built to digitise, standardise, and streamline the legal-metrology testing and certification process for Non-Automatic Weighing Instruments (NAWIs) in accordance with **OIML Recommendation R-76**. Operating strictly on a local machine without external database or cloud dependencies, the system eliminates error-prone manual calculations and physical paperwork by providing a guided test wizard, an isolated pure calculation engine driven by external versioned rule-sets, server-enforced role-based access control across four distinct roles (Technician, Reviewer, Admin, Viewer), automated ReportLab PDF certificate generation with tamper-evident SHA-256 integrity hashing, and an immutable append-only audit trail persisting to disk via clean repository abstractions over structured JSON storage.

---

## 2. Layer Diagram

The system adheres to a strict layered architecture with unidirectional top-to-bottom dependency flow. Cross-layer calls and circular dependencies are prohibited.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│         Frontend Client (React 19, TypeScript, Vite, Tailwind CSS)      │
│   - Guided 6-Step Wizard (Metadata, Instrument, Environment, Tests)    │
│   - Role-Gated Views: Dashboard, Repository, Review Queue, Rule Admin │
│   - Live Calculation Previews (Read-only, backend-computed)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON wire format, camelCase)
┌───────────────────────────────────▼────────────────────────────────────┐
│                         API ROUTING LAYER                              │
│                    FastAPI Routers (Backend Web API)                   │
│   /api/auth          /api/reports        /api/calculations             │
│   /api/rules         /api/audit          /api/dashboard                │
│   - JWT Bearer Token Extraction & Server-Side Role Enforcement         │
│   - HTTP Status Mapping (401 Unauthorized, 403 Forbidden, 422 Invalid) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Injects service dependencies
┌───────────────────────────────────▼────────────────────────────────────┐
│                          SERVICES LAYER                                │
│   - ReportService: Manages report lifecycle, status transitions, checks│
│   - AuditService: Records immutable audit events on every transition   │
│   - SearchService: Filters & aggregates reports across all criteria    │
│   - AuthService: User credential verification & JWT generation         │
│                                                                        │
│   ┌──────────────────────────────┐  ┌────────────────────────────────┐ │
│   │   CalculationEngine (Pure)   │  │ ReportGenerationService        │ │
│   │   - Weighing Performance     │  │ - ReportLab PDF layout engine  │ │
│   │   - Eccentricity Evaluation  │  │ - SHA-256 Content Hashing      │ │
│   │   - Repeatability Analysis   │  │ - Immutability lock upon seal  │ │
│   │   - Discrimination Testing   │  │ - Verification QR placeholder  │ │
│   └──────────────▲───────────────┘  └────────────────────────────────┘ │
│                  │ Reads active ruleset                                │
│   ┌──────────────┴───────────────┐                                     │
│   │   RuleLoader / RuleService   │                                     │
│   │   - OIML R-76 JSON rule-sets │                                     │
│   │   - Schema versioning/locking│                                     │
│   └──────────────────────────────┘                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls repository abstractions
┌───────────────────────────────────▼────────────────────────────────────┐
│                       REPOSITORIES LAYER                               │
│                   Interface Abstractions & Adapters                    │
│   - IReportRepository   -> JsonReportRepository                        │
│   - IUserRepository     -> JsonUserRepository                          │
│   - IRuleRepository     -> JsonRuleRepository                          │
│   - IAuditRepository    -> JsonAuditRepository                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ File I/O operations only
┌───────────────────────────────────▼────────────────────────────────────┐
│                    LOCAL JSON STORAGE LAYER                            │
│                      backend/storage/ (Disk)                           │
│   ├── reports/      (*.json — canonical reports)                       │
│   ├── rules/        (*.json — versioned OIML R-76 rules)               │
│   ├── users/        (*.json — local user accounts)                     │
│   ├── audit/        (audit_log.json — append-only event stream)        │
│   └── generated/    (*.pdf — approved, hashed certificate artifacts)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Four Non-Negotiable Layering Rules

These four architectural invariants must never be broken under any circumstances:

### Rule 1: The frontend never touches storage
The React single-page application is completely decoupled from the filesystem and persistence layer. It communicates with the backend solely via asynchronous HTTP REST endpoints. The frontend possesses zero knowledge of whether backend data is stored in local JSON files, SQLite, or PostgreSQL.

### Rule 2: Services never touch the filesystem directly
Service classes encapsulate business logic and status validation. They must **never** perform direct disk I/O, open files, or call filesystem APIs. All data retrieval and persistence is delegated strictly to Repository interfaces (`IReportRepository`, etc.). Swapping JSON storage for an enterprise relational database requires authoring new repository implementations without altering a single line of service logic.

### Rule 3: The backend is the single source of truth
The backend exclusively controls:
- Metrological calculations and error corrections
- OIML MPE evaluations and pass/fail/warning compliance decisions
- Report lifecycle status transitions and permission validation
- PDF generation and cryptographic SHA-256 hashing

The frontend never calculates compliance independently. Any live feedback displayed in the UI during observation entry is fetched directly from the backend `/api/calculations/*` endpoints.

### Rule 4: The calculation engine is pure
The `CalculationEngine` is implemented as a set of pure mathematical functions:
$$\text{Data In} \longrightarrow \text{Calculated Output}$$
Functions take observations and the applicable rule-set slice as input and return calculated errors, applicable MPEs, and compliance determinations. They perform **zero I/O**, hold **no global state**, and trigger **no side effects**. This guarantees deterministic, highly testable legal-metrology evaluation.

---

## 4. Mandatory Disclaimers

The following disclaimers must be defined as global constants and displayed across UI screens, API responses, and generated PDF reports:

- **D1**: *Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final acceptance remains subject to review and authorization by competent legal-metrology personnel.*
- **D2**: *Planned — Not implemented in prototype.*
- **D3**: *Requires domain validation.*
- **D4**: *Prototype integrity hash — not a legally valid digital signature. Digital signature integration planned for production deployment.*
