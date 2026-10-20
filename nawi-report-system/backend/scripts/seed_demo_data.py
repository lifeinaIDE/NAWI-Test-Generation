"""
Seed demo data script for OIML R-76 NAWI Test Report System.
FICTIONAL DEMO DATA — not real government or laboratory test data.

Creates:
1. 4 users: technician, reviewer, admin, viewer (password "demo123", bcrypt hashed).
2. Active rule-set: OIML-R76-PROTOTYPE-V1.
3. 3 demo reports for instrument BP-Platform-300:
   - NAWI-2026-0001: all tests PASS, APPROVED (with PDF and hash).
   - NAWI-2026-0002: contains FAIL with readable failure reason, SUBMITTED_FOR_REVIEW.
   - NAWI-2026-0003: contains WARNING (>90% MPE), SUBMITTED_FOR_REVIEW.

Supports --reset flag to wipe storage/ first.
Idempotent when run without --reset.
"""

import os
import sys
import json
import glob
import shutil
import argparse
from datetime import datetime, timezone
import bcrypt

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas import (
    Report,
    Instrument,
    Manufacturer,
    Laboratory,
    Environment,
    TestDefinition,
    ReviewInfo,
    AuditEvent,
)
from app.core.hashing import compute_report_hash
from app.repositories.report_repository import get_report_repository
from app.repositories.user_repository import user_repository
from app.repositories.audit_repository import get_audit_repository
from app.rules.rule_loader import get_rule_repository, clear_rule_cache
from app.reportgen.pdf_generator import generate_report
from app.core.config import get_settings

DEMO_LABEL = "FICTIONAL DEMO DATA — not real government or laboratory test data"

BASE_INSTRUMENT = {
    "model": "BP-Platform-300",
    "serialNumber": "BP300-DEMO-001",
    "type": "electronic platform scale",
    "accuracyClass": "III",
    "maxCapacity": 300.0,
    "minCapacity": 2.0,
    "verificationIntervalE": 0.1,
    "actualIntervalD": 0.1,
    "numberOfIntervalsN": 3000.0,
    "unit": "kg",
    "softwareVersion": "v1.0",
}

BASE_MANUFACTURER = {
    "name": "Demo Instruments Pvt Ltd",
    "address": "Demo Industrial Estate, Sector 5",
    "country": "India",
}

BASE_LABORATORY = {
    "name": "Central Demo Legal Metrology Laboratory",
    "address": "42 Standards Avenue",
    "location": "Central Demonstration Facility",
    "contact": "+91-11-2345-6789",
}

BASE_ENVIRONMENT = {
    "temperatureStart": 21.5,
    "temperatureEnd": 22.0,
    "relativeHumidity": 50.0,
    "barometricPressure": 1013.25,
}

PROTOTYPE_RULE_SET = {
    "ruleSetId": "OIML-R76-PROTOTYPE-V1",
    "standard": "OIML R-76",
    "edition": "Prototype configuration — requires domain validation against the official edition",
    "effectiveFrom": "2026-01-01",
    "changeNotes": "Initial prototype rule-set for demo purposes.",
    "status": "ACTIVE",
    "createdBy": "system",
    "createdAt": "2026-01-01T00:00:00Z",
    "warningRatio": 0.9,
    "mpeRules": {
        "III": [
            {"minIntervals": 0, "maxIntervals": 5000, "mpeInE": 0.5},
            {"minIntervals": 5000, "maxIntervals": 20000, "mpeInE": 1.0},
            {"minIntervals": 20000, "maxIntervals": 100000, "mpeInE": 1.5},
        ],
        "I": [
            {"minIntervals": 0, "maxIntervals": 50000, "mpeInE": 0.5, "requiresDomainValidation": True},
            {"minIntervals": 50000, "maxIntervals": 200000, "mpeInE": 1.0, "requiresDomainValidation": True},
            {"minIntervals": 200000, "maxIntervals": 1000000, "mpeInE": 1.5, "requiresDomainValidation": True},
        ],
        "II": [
            {"minIntervals": 0, "maxIntervals": 5000, "mpeInE": 0.5, "requiresDomainValidation": True},
            {"minIntervals": 5000, "maxIntervals": 20000, "mpeInE": 1.0, "requiresDomainValidation": True},
            {"minIntervals": 20000, "maxIntervals": 100000, "mpeInE": 1.5, "requiresDomainValidation": True},
        ],
        "IIII": [
            {"minIntervals": 0, "maxIntervals": 50, "mpeInE": 0.5, "requiresDomainValidation": True},
            {"minIntervals": 50, "maxIntervals": 200, "mpeInE": 1.0, "requiresDomainValidation": True},
            {"minIntervals": 200, "maxIntervals": 1000, "mpeInE": 1.5, "requiresDomainValidation": True},
        ],
    },
    "testRules": {
        "weighingPerformance": {
            "formulaId": "OBSERVED_ERROR_V1",
            "criterion": "abs(observedError) <= mpe",
        },
        "eccentricity": {
            "criterion": "abs(error_at_each_position) <= mpe",
            "positions": ["CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"],
        },
        "repeatability": {
            "criterion": "range_less_than_or_equal_to_mpe",
        },
        "discrimination": {
            "criterion": "indication_change_greater_than_or_equal_to_d",
        },
    },
    "isActive": True,
    "isLocked": True,
}


def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def wipe_storage(storage_dir: str):
    print(f"[{DEMO_LABEL}] Wiping storage directory: {storage_dir}...")
    subdirs = ["reports", "rules", "users", "audit", "generated-reports", "attachments"]
    for s in subdirs:
        target = os.path.join(storage_dir, s)
        if os.path.exists(target):
            shutil.rmtree(target)
        os.makedirs(target, exist_ok=True)
    print("Storage wiped and clean directory structure prepared.")


def seed_users(storage_dir: str):
    print(f"[{DEMO_LABEL}] Seeding the 4 users (technician, reviewer, admin, viewer)...")
    hashed_pwd = hash_pw("demo123")
    demo_users = [
        {
            "userId": "user-tech-01",
            "id": "user-tech-01",
            "username": "technician",
            "displayName": "T. Technician",
            "password": hashed_pwd,
            "role": "TECHNICIAN",
            "active": True,
            "laboratory": "Central Demo Legal Metrology Laboratory",
        },
        {
            "userId": "user-rev-01",
            "id": "user-rev-01",
            "username": "reviewer",
            "displayName": "R. Reviewer",
            "password": hashed_pwd,
            "role": "REVIEWER",
            "active": True,
            "laboratory": "Central Demo Legal Metrology Laboratory",
        },
        {
            "userId": "user-admin-01",
            "id": "user-admin-01",
            "username": "admin",
            "displayName": "A. Administrator",
            "password": hashed_pwd,
            "role": "ADMIN",
            "active": True,
            "laboratory": "Central Demo Legal Metrology Laboratory",
        },
        {
            "userId": "user-view-01",
            "id": "user-view-01",
            "username": "viewer",
            "displayName": "V. Viewer",
            "password": hashed_pwd,
            "role": "VIEWER",
            "active": True,
            "laboratory": "Central Demo Legal Metrology Laboratory",
        },
    ]

    users_file = os.path.join(storage_dir, "users", "users.json")
    os.makedirs(os.path.dirname(users_file), exist_ok=True)
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump(demo_users, f, indent=2)
    print(f"Successfully seeded {len(demo_users)} users with password 'demo123'.")


def seed_active_ruleset(storage_dir: str):
    print(f"[{DEMO_LABEL}] Seeding active rule-set: OIML-R76-PROTOTYPE-V1...")
    rules_dir = os.path.join(storage_dir, "rules")
    os.makedirs(rules_dir, exist_ok=True)

    rule_path = os.path.join(rules_dir, "OIML-R76-PROTOTYPE-V1.json")
    with open(rule_path, "w", encoding="utf-8") as f:
        json.dump(PROTOTYPE_RULE_SET, f, indent=2)

    # Invalidate cache so loader reads clean ruleset
    clear_rule_cache()
    repo = get_rule_repository()
    repo._load_all()
    print("Rule-set OIML-R76-PROTOTYPE-V1 seeded and set to ACTIVE.")


def seed_reports(storage_dir: str):
    print(f"[{DEMO_LABEL}] Seeding 3 demo reports for BP-Platform-300...")
    report_repo = get_report_repository()
    audit_repo = get_audit_repository()
    gen_dir = os.path.join(storage_dir, "generated-reports")
    os.makedirs(gen_dir, exist_ok=True)

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # =========================================================================
    # 1. NAWI-2026-0001: all tests PASS, APPROVED
    # =========================================================================
    report_001_dict = {
        "reportId": "NAWI-2026-0001",
        "title": f"Initial Verification Report — BP-Platform-300 ({DEMO_LABEL})",
        "applicationNumber": "DEMO-APP-2026-0001",
        "status": "APPROVED",
        "reportVersion": 1,
        "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
        "createdBy": "user-tech-01",
        "technicianId": "user-tech-01",
        "createdAt": "2026-01-15T09:00:00Z",
        "updatedAt": "2026-01-15T11:30:00Z",
        "laboratory": BASE_LABORATORY,
        "manufacturer": BASE_MANUFACTURER,
        "instrument": BASE_INSTRUMENT,
        "environment": BASE_ENVIRONMENT,
        "review": {
            "reviewerId": "user-rev-01",
            "reviewerComments": "All tests meet Class III MPE tolerances under OIML R-76. Approved for demonstration.",
            "reviewedAt": "2026-01-15T11:30:00Z",
        },
        "finalResult": "PASS",
        "attachments": [],
        "auditEvents": [],
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"testLoad": 50, "indication": 50.01, "zeroError": 0},
                    {"testLoad": 150, "indication": 150.02, "zeroError": 0},
                    {"testLoad": 300, "indication": 300.02, "zeroError": 0},
                ],
                "calculations": {
                    "result": "PASS",
                    "observedError": 0.02,
                    "correctedError": 0.02,
                    "maxPermissibleError": 0.05,
                    "mpe": 0.05,
                    "mpeInE": 0.5,
                    "formulaUsed": "OBSERVED_ERROR_V1",
                    "criterion": "abs(observedError) <= mpe (0.05)",
                    "messages": [],
                },
                "remarks": "Observed errors within ±0.05 kg MPE across all test load intervals.",
            },
            {
                "testCode": "ECCENTRICITY",
                "testName": "Eccentricity",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"position": "CENTER", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "FRONT_LEFT", "load": 100, "reference": 100, "indication": 100.01},
                    {"position": "FRONT_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "REAR_LEFT", "load": 100, "reference": 100, "indication": 99.99},
                    {"position": "REAR_RIGHT", "load": 100, "reference": 100, "indication": 100.01},
                ],
                "calculations": {
                    "result": "PASS",
                    "maxPermissibleError": 0.05,
                    "mpe": 0.05,
                    "criterion": "abs(error_at_each_position) <= mpe (0.05)",
                },
                "remarks": "Eccentricity verified across all 5 test positions.",
            },
            {
                "testCode": "REPEATABILITY",
                "testName": "Repeatability",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"testLoad": 150, "repetitions": [150.0, 150.01, 150.0]}
                ],
                "calculations": {
                    "result": "PASS",
                    "range": 0.01,
                    "maxPermissibleError": 0.05,
                    "mpe": 0.05,
                    "criterion": "range <= mpe (0.05)",
                },
                "remarks": "Span repeatability range 0.01 kg is within limit 0.05 kg.",
            },
            {
                "testCode": "DISCRIMINATION",
                "testName": "Discrimination",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"testLoad": 150, "extraLoad": 0.14, "indicationChange": 0.1}
                ],
                "calculations": {
                    "result": "PASS",
                    "criterion": "indication_change >= d (0.1)",
                },
                "remarks": "Extra load of 1.4d (0.14 kg) caused smooth 1d (0.1 kg) display advance.",
            },
        ],
    }

    # Compute canonical hash for approved report
    rep1_obj = Report(**report_001_dict)
    rep1_hash = compute_report_hash(rep1_obj)
    rep1_obj.hash = rep1_hash
    report_repo.update(rep1_obj)

    # Generate and store finalized PDF
    pdf_bytes = generate_report(rep1_obj.model_dump(by_alias=True, mode="json"))
    pdf_path = os.path.join(gen_dir, "NAWI-2026-0001.pdf")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    # Audit events for 0001
    audit_repo.append_event(
        AuditEvent(
            eventId="evt-demo-0001-submit",
            userId="user-tech-01",
            role="TECHNICIAN",
            action="SUBMIT",
            reportId="NAWI-2026-0001",
            fromStatus="IN_PROGRESS",
            toStatus="SUBMITTED_FOR_REVIEW",
            comment="Submitting completed verification tests for authorization.",
            timestamp="2026-01-15T10:00:00Z",
            ruleSetVersion="OIML-R76-PROTOTYPE-V1",
        )
    )
    audit_repo.append_event(
        AuditEvent(
            eventId="evt-demo-0001-approve",
            userId="user-rev-01",
            role="REVIEWER",
            action="APPROVE",
            reportId="NAWI-2026-0001",
            fromStatus="SUBMITTED_FOR_REVIEW",
            toStatus="APPROVED",
            comment="Approved. All verification criteria satisfied.",
            timestamp="2026-01-15T11:30:00Z",
            ruleSetVersion="OIML-R76-PROTOTYPE-V1",
        )
    )
    print("Seeded NAWI-2026-0001: ALL PASS, APPROVED (Hash & PDF generated).")

    # =========================================================================
    # 2. NAWI-2026-0002: contains a FAIL with readable failure reason, SUBMITTED_FOR_REVIEW
    # =========================================================================
    report_002_dict = {
        "reportId": "NAWI-2026-0002",
        "title": f"Periodic Verification Report — BP-Platform-300 ({DEMO_LABEL})",
        "applicationNumber": "DEMO-APP-2026-0002",
        "status": "SUBMITTED_FOR_REVIEW",
        "reportVersion": 1,
        "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
        "createdBy": "user-tech-01",
        "technicianId": "user-tech-01",
        "createdAt": "2026-01-16T10:00:00Z",
        "updatedAt": "2026-01-16T10:45:00Z",
        "laboratory": BASE_LABORATORY,
        "manufacturer": BASE_MANUFACTURER,
        "instrument": BASE_INSTRUMENT,
        "environment": BASE_ENVIRONMENT,
        "review": ReviewInfo(),
        "finalResult": "FAIL",
        "attachments": [],
        "auditEvents": [],
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "status": "COMPLETED",
                "result": "FAIL",
                "observations": [
                    {"testLoad": 150, "indication": 150.12, "zeroError": 0}
                ],
                "calculations": {
                    "result": "FAIL",
                    "observedError": 0.12,
                    "correctedError": 0.12,
                    "maxPermissibleError": 0.05,
                    "mpe": 0.05,
                    "mpeInE": 0.5,
                    "formulaUsed": "OBSERVED_ERROR_V1",
                    "criterion": "abs(correctedError) <= mpe (0.05)",
                    "failureReason": "Corrected error 0.12 exceeds maximum permissible error 0.05 (Rule: abs(observedError) <= mpe)",
                    "messages": ["Corrected error 0.12 exceeds MPE limit of 0.05."],
                },
                "remarks": "Weighing Performance at load 150 kg: Observed error +0.12 kg exceeds MPE limit ±0.05 kg (Rule: abs(observedError) <= mpe).",
            },
            {
                "testCode": "ECCENTRICITY",
                "testName": "Eccentricity",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"position": "CENTER", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "FRONT_LEFT", "load": 100, "reference": 100, "indication": 100.01},
                    {"position": "FRONT_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "REAR_LEFT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "REAR_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                ],
                "calculations": {"result": "PASS", "mpe": 0.05},
                "remarks": "Eccentricity is within limits.",
            },
        ],
    }

    rep2_obj = Report(**report_002_dict)
    report_repo.update(rep2_obj)

    audit_repo.append_event(
        AuditEvent(
            eventId="evt-demo-0002-submit",
            userId="user-tech-01",
            role="TECHNICIAN",
            action="SUBMIT",
            reportId="NAWI-2026-0002",
            fromStatus="IN_PROGRESS",
            toStatus="SUBMITTED_FOR_REVIEW",
            comment="Submitted with known non-conformity in weighing performance.",
            timestamp="2026-01-16T10:45:00Z",
            ruleSetVersion="OIML-R76-PROTOTYPE-V1",
        )
    )
    print("Seeded NAWI-2026-0002: FAIL with readable reason, SUBMITTED_FOR_REVIEW.")

    # =========================================================================
    # 3. NAWI-2026-0003: contains a WARNING (>90% of MPE), SUBMITTED_FOR_REVIEW
    # =========================================================================
    report_003_dict = {
        "reportId": "NAWI-2026-0003",
        "title": f"Re-verification Report — BP-Platform-300 ({DEMO_LABEL})",
        "applicationNumber": "DEMO-APP-2026-0003",
        "status": "SUBMITTED_FOR_REVIEW",
        "reportVersion": 1,
        "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
        "createdBy": "user-tech-01",
        "technicianId": "user-tech-01",
        "createdAt": "2026-01-17T14:00:00Z",
        "updatedAt": "2026-01-17T14:30:00Z",
        "laboratory": BASE_LABORATORY,
        "manufacturer": BASE_MANUFACTURER,
        "instrument": BASE_INSTRUMENT,
        "environment": BASE_ENVIRONMENT,
        "review": ReviewInfo(),
        "finalResult": "WARNING",
        "attachments": [],
        "auditEvents": [],
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "status": "COMPLETED",
                "result": "WARNING",
                "observations": [
                    {"testLoad": 150, "indication": 150.048, "zeroError": 0}
                ],
                "calculations": {
                    "result": "WARNING",
                    "observedError": 0.048,
                    "correctedError": 0.048,
                    "maxPermissibleError": 0.05,
                    "mpe": 0.05,
                    "mpeInE": 0.5,
                    "formulaUsed": "OBSERVED_ERROR_V1",
                    "criterion": "abs(correctedError) <= mpe (0.05)",
                    "messages": [
                        "Corrected error 0.048 is within MPE (0.05) but exceeds warning threshold (0.045)."
                    ],
                },
                "remarks": "Observed error 0.048 kg is within MPE limit ±0.050 kg, but exceeds 90% warning threshold (0.045 kg).",
            },
            {
                "testCode": "ECCENTRICITY",
                "testName": "Eccentricity",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "observations": [
                    {"position": "CENTER", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "FRONT_LEFT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "FRONT_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "REAR_LEFT", "load": 100, "reference": 100, "indication": 100.0},
                    {"position": "REAR_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                ],
                "calculations": {"result": "PASS", "mpe": 0.05},
                "remarks": "Eccentricity within tolerance.",
            },
        ],
    }

    rep3_obj = Report(**report_003_dict)
    report_repo.update(rep3_obj)

    audit_repo.append_event(
        AuditEvent(
            eventId="evt-demo-0003-submit",
            userId="user-tech-01",
            role="TECHNICIAN",
            action="SUBMIT",
            reportId="NAWI-2026-0003",
            fromStatus="IN_PROGRESS",
            toStatus="SUBMITTED_FOR_REVIEW",
            comment="Submitted with warning threshold trigger on weighing performance.",
            timestamp="2026-01-17T14:30:00Z",
            ruleSetVersion="OIML-R76-PROTOTYPE-V1",
        )
    )
    print("Seeded NAWI-2026-0003: WARNING (>90% MPE), SUBMITTED_FOR_REVIEW.")

    # Rebuild index to guarantee consistency
    report_repo._rebuild_index()
    print("Report search index rebuilt successfully.")


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for OIML R-76 NAWI system.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe storage/ directory before seeding fresh demo data.",
    )
    args = parser.parse_args()

    settings = get_settings()
    storage_dir = settings.STORAGE_PATH

    print("=" * 70)
    print(f"OIML R-76 NAWI System: Demo Data Seeder")
    print(f"{DEMO_LABEL}")
    print(f"Target Storage: {storage_dir}")
    print("=" * 70)

    if args.reset:
        wipe_storage(storage_dir)

    # 1. Users
    seed_users(storage_dir)

    # 2. Active Rule-set
    seed_active_ruleset(storage_dir)

    # 3. Reports
    seed_reports(storage_dir)

    print("=" * 70)
    print(f"Demo data seeded successfully and ready for evaluation.")
    print("Demo Users: technician, reviewer, admin, viewer (Password: demo123)")
    print("Seeded Reports: NAWI-2026-0001 (PASS/APPROVED), NAWI-2026-0002 (FAIL), NAWI-2026-0003 (WARNING)")
    print("=" * 70)


if __name__ == "__main__":
    main()
