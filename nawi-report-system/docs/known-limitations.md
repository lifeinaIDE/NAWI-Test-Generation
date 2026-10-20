# Known Limitations & Out-of-Scope Architecture — NAWI Prototype

> **Project ID:** SIH26035 — Smart India Hackathon 2026  
> **Phase:** Phase 0 — Scope & System Boundaries Specification  
> **Notice:** All features listed below are marked with disclaimer **D2: Planned — Not implemented in prototype**. They reflect deliberate architectural constraints for the SIH 2026 working prototype.

---

## 1. Architectural Limitations & Production Roadmap

### 1. No External Database (Local File-Based JSON Storage)
- **Current Prototype:** All data (reports, user records, OIML rule-sets, audit events) is stored directly as plain JSON files in `backend/storage/`.
- **Reason:** Keeps the prototype 100% self-contained, offline-runnable, portable, and zero-configuration for demonstration without provisioning PostgreSQL, MongoDB, or Redis.
- **Production Path:** The repository layer (`IReportRepository`, `IUserRepository`, etc.) cleanly abstracts storage. Swapping file I/O for PostgreSQL via SQLAlchemy requires writing new repository implementations with zero modifications to API routers or frontend code.

### 2. No Legally Valid Digital Signature (Cryptographic Hash Only)
- **Current Prototype:** Uses SHA-256 content hashing to produce an integrity fingerprint stored in `report.hash` and embedded on the PDF.
- **Reason:** Complies with disclaimer **D4**: *Prototype integrity hash — not a legally valid digital signature. Digital signature integration planned for production deployment.*
- **Production Path:** Integrate standard Indian PKI / CCA e-Sign or HSM-backed X.509 digital certificates (e.g. USB crypto-token or Aadhaar e-Sign) to sign the PDF artifact upon approval.

### 3. No Multi-Laboratory Synchronization
- **Current Prototype:** Operates as a single-node, standalone lab system on the host machine.
- **Reason:** Simplifies state management and avoids distributed replication, conflict resolution, and connectivity dependencies during local evaluation.
- **Production Path:** Centralized cloud/regional database hub with bi-directional encrypted synchronization (via periodic batch sync or WebSocket push) for field officers.

### 4. No Direct Hardware / Balance Integration
- **Current Prototype:** Technicians manually type indicated values and test loads into the web interface.
- **Reason:** Hardware weighing indicators use varied proprietary serial protocols (RS-232, RS-485, Modbus, USB HID) that require physical hardware rigs.
- **Production Path:** Web Serial API integration in the browser or a local Python sidecar service capable of polling balance RS-232 ports directly and auto-populating observation cells.

### 5. Only 4 Implemented Tests (13 Planned Placeholders)
- **Current Prototype:** Fully implements and calculates the 4 core metrological tests:
  1. `WEIGHING_PERFORMANCE`
  2. `ECCENTRICITY`
  3. `REPEATABILITY`
  4. `DISCRIMINATION`
- **Reason:** These 4 tests represent over 90% of routine initial and periodic verification workload under OIML R-76.
- **Planned Extensions (13 Tests):**
  - Tare Test & Tare Balancing
  - Zero-Setting & Zero-Tracking Accuracy
  - Warm-up Time Evaluation
  - Tilting Test (Leveling Sensitivity)
  - Temperature Influence on No-Load & Span
  - Damp Heat / Humidity Testing
  - Voltage & Power Variations
  - Span Stability / Creep Test
  - Durability / Endurance Cycling
  - Static Temperatures & Thermal Shock
  - Barometric Pressure Influence
  - Electromagnetic Susceptibility (EMC)
  - Disturbance Recovery

### 6. No External Authentication / Identity Provider
- **Current Prototype:** Built-in JWT authentication using hardcoded demo credentials in `backend/storage/users/users.json` signed by a local secret.
- **Reason:** Guarantees instant login across all 4 roles (Technician, Reviewer, Admin, Viewer) during testing without configuring OAuth2, LDAP, or Active Directory.
- **Production Path:** Integration with OAuth 2.0 / OpenID Connect, Government Single-Sign-On (Parichay / Jan Parichay), or corporate LDAP.

### 7. No Asynchronous Background Job Worker
- **Current Prototype:** All calculations, validations, and ReportLab PDF document renderings run synchronously within the FastAPI request cycle.
- **Reason:** Simple local operation without needing Celery, RabbitMQ, or Redis daemon workers.
- **Production Path:** Offload PDF generation and batch exports to a background worker queue with progress polling or WebSocket notifications.

### 8. PDF Export Only
- **Current Prototype:** Generates structured, printable PDF certificates via ReportLab.
- **Reason:** PDF is the universally recognized legal document format for legal-metrology inspection.
- **Production Path:** Add structured data export in OIML XML, JSON-LD, and CSV formats for national metrology database integration.

### 9. No Progressive Web App (PWA) / Native Offline Cache
- **Current Prototype:** Runs locally via a loopback HTTP server (`http://127.0.0.1:8000` and `http://localhost:5173`). Requires browser connectivity to the local server process.
- **Reason:** Provides immediate responsive desktop experience for hackathon demonstration.
- **Production Path:** Full PWA service worker caching with IndexedDB local queue for field inspectors working in remote areas without laptop servers.

### 10. QR Code is a Prototype Verification Placeholder
- **Current Prototype:** The QR code rendered on page 1 of the generated PDF contains an encoded JSON verification payload (`{"reportId": "...", "hash": "...", "verifier": "NAWI-LOCAL"}`).
- **Reason:** There is no public internet server hosting an online certificate verification portal for local demo runs.
- **Production Path:** QR code points to a secure public registry endpoint (e.g. `https://verify.legalmetrology.gov.in/report/{hash}`) for instantaneous on-site scanning by trade inspectors.
