"""
Seed script — replaces all prototype data with realistic, deploy-ready data.

Run from project root:
    python backend/seed.py

What it does:
  1. Replaces rule-set files — removes all "PROTOTYPE" naming and notes
  2. Replaces report files — rich, realistic OIML test data across all statuses
  3. Clears and regenerates audit log entries
  4. Updates users.json with a more realistic laboratory name
"""

import json
import os
import shutil
from datetime import datetime, timezone, timedelta

STORAGE = os.path.join(os.path.dirname(__file__), "storage")
RULES_DIR  = os.path.join(STORAGE, "rules")
REPORTS_DIR = os.path.join(STORAGE, "reports")
AUDIT_FILE  = os.path.join(STORAGE, "audit", "audit-log.json")
USERS_FILE  = os.path.join(STORAGE, "users", "users.json")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def ts(days_ago=0, hours_ago=0):
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ {os.path.relpath(path)}")

# ---------------------------------------------------------------------------
# 1. Rule Sets
# ---------------------------------------------------------------------------
def seed_rules():
    print("\n── Rule Sets ──────────────────────────────────────────────────")

    # Remove old PROTOTYPE-named files
    for f in os.listdir(RULES_DIR):
        os.remove(os.path.join(RULES_DIR, f))
        print(f"  ✗ removed {f}")

    # Class III MPE table (OIML R-76-1:2006 §3.5.2 Table 2)
    mpe_III = [
        {"minIntervals": 0,    "maxIntervals": 500,   "mpeInE": 0.5, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 500,  "maxIntervals": 2000,  "mpeInE": 1.0, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 2000, "maxIntervals": 10000, "mpeInE": 1.5, "note": "OIML R-76-1:2006 Table 2"},
    ]
    mpe_II = [
        {"minIntervals": 0,     "maxIntervals": 5000,   "mpeInE": 0.5, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 5000,  "maxIntervals": 20000,  "mpeInE": 1.0, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 20000, "maxIntervals": 100000, "mpeInE": 1.5, "note": "OIML R-76-1:2006 Table 2"},
    ]
    mpe_IIII = [
        {"minIntervals": 0,   "maxIntervals": 50,   "mpeInE": 0.5, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 50,  "maxIntervals": 200,  "mpeInE": 1.0, "note": "OIML R-76-1:2006 Table 2"},
        {"minIntervals": 200, "maxIntervals": 1000, "mpeInE": 1.5, "note": "OIML R-76-1:2006 Table 2"},
    ]

    test_rules = {
        "weighingPerformance": {
            "formulaId": "OBSERVED_ERROR_V1",
            "criterion": "abs(observedError) <= mpe",
            "reference": "OIML R-76-1:2006 §3.6.1"
        },
        "eccentricity": {
            "criterion": "abs(error_at_each_position) <= mpe",
            "positions": ["CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"],
            "reference": "OIML R-76-1:2006 §3.6.3"
        },
        "repeatability": {
            "criterion": "range_less_than_or_equal_to_mpe",
            "reference": "OIML R-76-1:2006 §3.6.2"
        },
        "discrimination": {
            "criterion": "indication_change_greater_than_or_equal_to_d",
            "reference": "OIML R-76-1:2006 §3.5.3"
        }
    }

    v1 = {
        "ruleSetId": "OIML-R76-2006-V1",
        "standard": "OIML R-76",
        "edition": "OIML R-76-1:2006 — Non-Automatic Weighing Instruments, Part 1: Metrological and Technical Requirements",
        "effectiveFrom": "2026-01-01",
        "changeNotes": "Initial production rule-set based on OIML R-76-1:2006 with IIII/III/II accuracy classes.",
        "mpeRules": {"III": mpe_III, "II": mpe_II, "IIII": mpe_IIII},
        "testRules": test_rules,
        "isActive": True,
        "isLocked": True
    }

    v2 = {
        "ruleSetId": "OIML-R76-2006-V2",
        "standard": "OIML R-76",
        "edition": "OIML R-76-1:2006 (Rev. A) — Class III MPE tightened at upper intervals",
        "effectiveFrom": "2026-06-01",
        "changeNotes": "Tightened Class III mpe at >2000 intervals from 1.5e to 1.4e per national supplement NMS/2026-06.",
        "mpeRules": {
            "III": [
                {"minIntervals": 0,    "maxIntervals": 500,   "mpeInE": 0.5, "note": "OIML R-76-1:2006 Table 2"},
                {"minIntervals": 500,  "maxIntervals": 2000,  "mpeInE": 1.0, "note": "OIML R-76-1:2006 Table 2"},
                {"minIntervals": 2000, "maxIntervals": 10000, "mpeInE": 1.4, "note": "NMS/2026-06 supplement — tightened"},
            ],
            "II": mpe_II,
            "IIII": mpe_IIII
        },
        "testRules": test_rules,
        "isActive": False,
        "isLocked": False
    }

    write_json(os.path.join(RULES_DIR, "OIML-R76-2006-V1.json"), v1)
    write_json(os.path.join(RULES_DIR, "OIML-R76-2006-V2.json"), v2)


# ---------------------------------------------------------------------------
# 2. Users
# ---------------------------------------------------------------------------
def seed_users():
    print("\n── Users ───────────────────────────────────────────────────────")
    users = [
        {"id": "user-tech-01", "username": "technician", "password": "demo123",
         "role": "TECHNICIAN", "laboratory": "National Metrology Institute — Legal Weighing Division"},
        {"id": "user-tech-02", "username": "tech2",      "password": "demo123",
         "role": "TECHNICIAN", "laboratory": "National Metrology Institute — Legal Weighing Division"},
        {"id": "user-rev-01",  "username": "reviewer",   "password": "demo123",
         "role": "REVIEWER",   "laboratory": "National Metrology Institute — Legal Weighing Division"},
        {"id": "user-admin-01","username": "admin",       "password": "demo123",
         "role": "ADMIN",      "laboratory": "National Metrology Institute — Legal Weighing Division"},
        {"id": "user-view-01", "username": "viewer",      "password": "demo123",
         "role": "VIEWER",     "laboratory": "National Metrology Institute — Legal Weighing Division"},
    ]
    write_json(USERS_FILE, users)


# ---------------------------------------------------------------------------
# 3. Helpers for rich test data
# ---------------------------------------------------------------------------
LAB = {
    "name": "National Metrology Institute — Legal Weighing Division",
    "address": "14 Standards House, Metrology Road, New Delhi 110 001",
    "location": "New Delhi, India",
    "contact": "+91-11-2301-4000 | nmi-weighing@gov.in"
}

def mfr(name, address="", country="India"):
    return {"name": name, "address": address, "country": country}

def instrument(model, serial, typ, cls, maxCap, minCap, e, d, n, unit="kg", sw=""):
    return {
        "model": model, "serialNumber": serial, "type": typ,
        "accuracyClass": cls, "maxCapacity": maxCap, "minCapacity": minCap,
        "verificationIntervalE": e, "actualIntervalD": d,
        "numberOfIntervalsN": n, "unit": unit, "softwareVersion": sw,
        "loadCell": {"manufacturer": "", "model": "", "capacity": maxCap, "class": cls}
    }

def env(tStart, tEnd, rh, bp):
    return {"temperatureStart": tStart, "temperatureEnd": tEnd,
            "relativeHumidity": rh, "barometricPressure": bp}

def wp_test(obs, result="PASS"):
    return {
        "testCode": "WP", "testName": "Weighing Performance",
        "applicable": True, "status": "COMPLETE",
        "observations": obs,
        "calculations": {
            "rows": [{"load": o["load"], "indication": o["indication"],
                      "zeroError": o.get("zeroError", 0.0),
                      "observedError": o["indication"] - o["load"],
                      "mpe": 0.5 * o.get("e", 0.1)} for o in obs]
        },
        "result": result, "remarks": ""
    }

def ecc_test(obs, result="PASS"):
    return {
        "testCode": "ECC", "testName": "Eccentricity",
        "applicable": True, "status": "COMPLETE",
        "observations": obs,
        "calculations": {"positionErrors": [o["indication"] - o["load"] for o in obs]},
        "result": result, "remarks": ""
    }

def rep_test(obs, result="PASS"):
    return {
        "testCode": "REP", "testName": "Repeatability",
        "applicable": True, "status": "COMPLETE",
        "observations": obs,
        "calculations": {"range": max(o["indication"] for o in obs) - min(o["indication"] for o in obs)},
        "result": result, "remarks": ""
    }

def disc_test(obs, result="PASS"):
    return {
        "testCode": "DISC", "testName": "Discrimination",
        "applicable": True, "status": "COMPLETE",
        "observations": obs,
        "calculations": {"indicationChange": obs[1]["indication"] - obs[0]["indication"] if len(obs) > 1 else 0},
        "result": result, "remarks": ""
    }

def review_obj(reviewer_id=None, comments="", at=None):
    return {"reviewerId": reviewer_id, "reviewerComments": comments, "reviewedAt": at}


# ---------------------------------------------------------------------------
# 4. Reports
# ---------------------------------------------------------------------------
def seed_reports():
    print("\n── Reports ─────────────────────────────────────────────────────")

    # Remove all existing report files
    for f in os.listdir(REPORTS_DIR):
        if f.endswith(".json"):
            os.remove(os.path.join(REPORTS_DIR, f))
            print(f"  ✗ removed {f}")

    reports = [

        # ── APPROVED / PASS ──────────────────────────────────────────────────
        {
            "reportId": "NAWI-2026-001",
            "applicationNumber": "APP/2026/WS/0012",
            "status": "APPROVED",
            "reportVersion": 2,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(30), "updatedAt": ts(22),
            "laboratory": LAB,
            "manufacturer": mfr("Avery Weigh-Tronix", "Smethwick, West Midlands, UK", "United Kingdom"),
            "instrument": instrument("ZM510", "ZM510-2026-1138", "Bench Scale",
                                     "III", 30.0, 0.2, 0.01, 0.01, 3000),
            "environment": env(22.4, 22.8, 44.0, 1012.8),
            "tests": [
                wp_test([
                    {"load": 0.0,  "indication": 0.00, "zeroError": 0.00, "e": 0.01},
                    {"load": 5.0,  "indication": 5.01, "zeroError": 0.00, "e": 0.01},
                    {"load": 10.0, "indication": 9.99, "zeroError": 0.00, "e": 0.01},
                    {"load": 15.0, "indication": 15.01,"zeroError": 0.00, "e": 0.01},
                    {"load": 20.0, "indication": 20.00,"zeroError": 0.00, "e": 0.01},
                    {"load": 25.0, "indication": 25.01,"zeroError": 0.00, "e": 0.01},
                    {"load": 30.0, "indication": 30.00,"zeroError": 0.00, "e": 0.01},
                ]),
                ecc_test([
                    {"load": 10.0, "indication": 10.00, "position": "CENTER"},
                    {"load": 10.0, "indication": 10.01, "position": "FRONT_LEFT"},
                    {"load": 10.0, "indication": 9.99,  "position": "FRONT_RIGHT"},
                    {"load": 10.0, "indication": 10.01, "position": "REAR_LEFT"},
                    {"load": 10.0, "indication": 10.00, "position": "REAR_RIGHT"},
                ]),
                rep_test([
                    {"indication": 20.00}, {"indication": 20.01},
                    {"indication": 20.00}, {"indication": 20.00},
                    {"indication": 20.01}, {"indication": 20.00},
                ]),
                disc_test([{"indication": 20.00}, {"indication": 20.01}]),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01", "All four tests within OIML R-76 tolerances. Approved for certification.", ts(22)),
            "finalResult": "PASS", "hash": None, "auditEvents": []
        },

        # ── APPROVED / PASS (retail grocery scale) ───────────────────────────
        {
            "reportId": "NAWI-2026-002",
            "applicationNumber": "APP/2026/RS/0031",
            "status": "APPROVED",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(25), "updatedAt": ts(18),
            "laboratory": LAB,
            "manufacturer": mfr("Mettler Toledo", "Im Langacher, Greifensee", "Switzerland"),
            "instrument": instrument("ICS429s", "ICS-2026-00872", "Retail Counter Scale",
                                     "III", 6.0, 0.05, 0.002, 0.002, 3000, sw="V3.11"),
            "environment": env(23.0, 23.5, 48.0, 1011.2),
            "tests": [
                wp_test([
                    {"load": 0.0, "indication": 0.00, "zeroError": 0.00, "e": 0.002},
                    {"load": 1.0, "indication": 1.00, "zeroError": 0.00, "e": 0.002},
                    {"load": 3.0, "indication": 3.00, "zeroError": 0.00, "e": 0.002},
                    {"load": 6.0, "indication": 6.00, "zeroError": 0.00, "e": 0.002},
                ]),
                ecc_test([
                    {"load": 2.0, "indication": 2.00, "position": "CENTER"},
                    {"load": 2.0, "indication": 2.00, "position": "FRONT_LEFT"},
                    {"load": 2.0, "indication": 2.00, "position": "FRONT_RIGHT"},
                    {"load": 2.0, "indication": 2.00, "position": "REAR_LEFT"},
                    {"load": 2.0, "indication": 2.00, "position": "REAR_RIGHT"},
                ]),
                rep_test([
                    {"indication": 3.000}, {"indication": 3.002},
                    {"indication": 3.000}, {"indication": 3.002},
                    {"indication": 3.000}, {"indication": 3.000},
                ]),
                disc_test([{"indication": 3.000}, {"indication": 3.002}]),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01", "All tests pass. Instrument verified for retail use per OIML R-76.", ts(18)),
            "finalResult": "PASS", "hash": None, "auditEvents": []
        },

        # ── APPROVED / FAIL (axle weighbridge) ───────────────────────────────
        {
            "reportId": "NAWI-2026-003",
            "applicationNumber": "APP/2026/AW/0007",
            "status": "APPROVED",
            "reportVersion": 3,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-02",
            "createdAt": ts(20), "updatedAt": ts(12),
            "laboratory": LAB,
            "manufacturer": mfr("Tamtron Group", "Tampere", "Finland"),
            "instrument": instrument("LOADMAN 40T", "LM40-2026-0443", "Axle Weighbridge",
                                     "III", 40000.0, 200.0, 20.0, 20.0, 2000, unit="kg", sw="6.2.1"),
            "environment": env(28.0, 29.2, 62.0, 1008.5),
            "tests": [
                wp_test([
                    {"load": 0.0,    "indication": 0.0,    "zeroError": 0.0, "e": 20.0},
                    {"load": 5000.0, "indication": 5020.0, "zeroError": 0.0, "e": 20.0},
                    {"load": 10000.0,"indication": 10060.0,"zeroError": 0.0, "e": 20.0},  # error > 1.5e
                    {"load": 20000.0,"indication": 20040.0,"zeroError": 0.0, "e": 20.0},
                    {"load": 40000.0,"indication": 40080.0,"zeroError": 0.0, "e": 20.0},  # error > 1.5e
                ], result="FAIL"),
                ecc_test([
                    {"load": 10000.0, "indication": 10060.0, "position": "CENTER"},
                    {"load": 10000.0, "indication": 10040.0, "position": "FRONT_LEFT"},
                    {"load": 10000.0, "indication": 10080.0, "position": "FRONT_RIGHT"},
                    {"load": 10000.0, "indication": 10020.0, "position": "REAR_LEFT"},
                    {"load": 10000.0, "indication": 10100.0, "position": "REAR_RIGHT"},
                ], result="FAIL"),
                rep_test([
                    {"indication": 10000.0}, {"indication": 10020.0},
                    {"indication": 10060.0}, {"indication": 10000.0},
                    {"indication": 10040.0}, {"indication": 10080.0},
                ], result="FAIL"),
                disc_test([{"indication": 10000.0}, {"indication": 10020.0}]),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01",
                                 "Weighing performance and eccentricity tests exceed OIML tolerances at mid and full load. "
                                 "Instrument FAILS verification — requires recalibration of load cells and re-test.",
                                 ts(12)),
            "finalResult": "FAIL", "hash": None, "auditEvents": []
        },

        # ── SUBMITTED FOR REVIEW (platform scale) ────────────────────────────
        {
            "reportId": "NAWI-2026-004",
            "applicationNumber": "APP/2026/PS/0018",
            "status": "SUBMITTED_FOR_REVIEW",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(5), "updatedAt": ts(1, 4),
            "laboratory": LAB,
            "manufacturer": mfr("Ohaus Corporation", "Parsippany, NJ", "United States"),
            "instrument": instrument("Defender 5000", "DF5K-2026-0091", "Platform Scale",
                                     "III", 300.0, 2.0, 0.1, 0.1, 3000, sw="1.5.0"),
            "environment": env(21.5, 22.0, 42.0, 1014.0),
            "tests": [
                wp_test([
                    {"load": 0.0,   "indication": 0.00,  "zeroError": 0.00, "e": 0.1},
                    {"load": 50.0,  "indication": 50.00, "zeroError": 0.00, "e": 0.1},
                    {"load": 100.0, "indication": 100.05,"zeroError": 0.00, "e": 0.1},
                    {"load": 200.0, "indication": 200.10,"zeroError": 0.00, "e": 0.1},
                    {"load": 300.0, "indication": 300.10,"zeroError": 0.00, "e": 0.1},
                ]),
                ecc_test([
                    {"load": 100.0, "indication": 100.05, "position": "CENTER"},
                    {"load": 100.0, "indication": 100.00, "position": "FRONT_LEFT"},
                    {"load": 100.0, "indication": 100.10, "position": "FRONT_RIGHT"},
                    {"load": 100.0, "indication": 100.05, "position": "REAR_LEFT"},
                    {"load": 100.0, "indication": 100.05, "position": "REAR_RIGHT"},
                ]),
                rep_test([
                    {"indication": 100.0}, {"indication": 100.05},
                    {"indication": 100.00}, {"indication": 100.05},
                    {"indication": 100.00}, {"indication": 100.00},
                ]),
                disc_test([{"indication": 100.0}, {"indication": 100.1}]),
            ],
            "attachments": [],
            "review": review_obj(),
            "finalResult": "PENDING", "hash": None, "auditEvents": []
        },

        # ── IN_PROGRESS (hopper scale) ───────────────────────────────────────
        {
            "reportId": "NAWI-2026-005",
            "applicationNumber": "APP/2026/HS/0022",
            "status": "IN_PROGRESS",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-02",
            "createdAt": ts(2), "updatedAt": ts(0, 3),
            "laboratory": LAB,
            "manufacturer": mfr("Flintec", "Braintree, Essex", "United Kingdom"),
            "instrument": instrument("PC6D Hopper", "PC6D-2026-0558", "Hopper Scale",
                                     "III", 2000.0, 10.0, 1.0, 1.0, 2000, unit="kg", sw="2.0"),
            "environment": env(25.0, 25.8, 55.0, 1010.3),
            "tests": [
                wp_test([
                    {"load": 0.0,    "indication": 0.0,    "zeroError": 0.0, "e": 1.0},
                    {"load": 500.0,  "indication": 500.5,  "zeroError": 0.0, "e": 1.0},
                    {"load": 1000.0, "indication": 1001.0, "zeroError": 0.0, "e": 1.0},
                ]),
            ],
            "attachments": [],
            "review": review_obj(),
            "finalResult": "PENDING", "hash": None, "auditEvents": []
        },

        # ── DRAFT (newly created) ────────────────────────────────────────────
        {
            "reportId": "NAWI-2026-006",
            "applicationNumber": "",
            "status": "DRAFT",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(0, 2), "updatedAt": ts(0, 2),
            "laboratory": LAB,
            "manufacturer": mfr("", "", ""),
            "instrument": instrument("", "", "Floor Scale", "III", 1000.0, 5.0, 0.5, 0.5, 2000),
            "environment": env(0.0, 0.0, 0.0, 0.0),
            "tests": [],
            "attachments": [],
            "review": review_obj(),
            "finalResult": "PENDING", "hash": None, "auditEvents": []
        },

        # ── QUERY RAISED (reviewer sent back) ───────────────────────────────
        {
            "reportId": "NAWI-2026-007",
            "applicationNumber": "APP/2026/BS/0041",
            "status": "QUERY_RAISED",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-02",
            "createdAt": ts(8), "updatedAt": ts(3),
            "laboratory": LAB,
            "manufacturer": mfr("CAS Corporation", "Yangju-si, Gyeonggi-do", "South Korea"),
            "instrument": instrument("BW-150H", "BW150H-2026-1024", "Bench Scale",
                                     "III", 150.0, 1.0, 0.05, 0.05, 3000, sw="2.3.1"),
            "environment": env(24.0, 24.5, 50.0, 1013.0),
            "tests": [
                wp_test([
                    {"load": 0.0,   "indication": 0.00, "zeroError": 0.00, "e": 0.05},
                    {"load": 50.0,  "indication": 50.05,"zeroError": 0.00, "e": 0.05},
                    {"load": 100.0, "indication": 99.95,"zeroError": 0.00, "e": 0.05},
                    {"load": 150.0, "indication": 150.00,"zeroError": 0.00, "e": 0.05},
                ]),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01",
                                 "Missing eccentricity, repeatability, and discrimination test data. "
                                 "Please complete all required tests before resubmitting.",
                                 ts(3)),
            "finalResult": "PENDING", "hash": None, "auditEvents": []
        },

        # ── APPROVED / PASS (Class II precision balance) ─────────────────────
        {
            "reportId": "NAWI-2026-008",
            "applicationNumber": "APP/2026/PB/0003",
            "status": "APPROVED",
            "reportVersion": 2,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(45), "updatedAt": ts(38),
            "laboratory": LAB,
            "manufacturer": mfr("Sartorius AG", "Weender Landstraße 94-108, Göttingen", "Germany"),
            "instrument": instrument("Practum2102-1S", "PT2102-2026-0027", "Precision Balance",
                                     "II", 2100.0, 0.01, 0.01, 0.01, 210000, sw="2.0.5.0"),
            "environment": env(20.1, 20.3, 38.0, 1015.2),
            "tests": [
                wp_test([
                    {"load": 0.0,    "indication": 0.000, "zeroError": 0.000, "e": 0.01},
                    {"load": 100.0,  "indication": 100.002,"zeroError": 0.000,"e": 0.01},
                    {"load": 500.0,  "indication": 499.997,"zeroError": 0.000,"e": 0.01},
                    {"load": 1000.0, "indication": 1000.003,"zeroError": 0.000,"e": 0.01},
                    {"load": 2100.0, "indication": 2100.005,"zeroError": 0.000,"e": 0.01},
                ]),
                ecc_test([
                    {"load": 500.0, "indication": 499.998, "position": "CENTER"},
                    {"load": 500.0, "indication": 500.000, "position": "FRONT_LEFT"},
                    {"load": 500.0, "indication": 500.003, "position": "FRONT_RIGHT"},
                    {"load": 500.0, "indication": 499.999, "position": "REAR_LEFT"},
                    {"load": 500.0, "indication": 500.001, "position": "REAR_RIGHT"},
                ]),
                rep_test([
                    {"indication": 1000.001}, {"indication": 1000.002},
                    {"indication": 1000.001}, {"indication": 1000.001},
                    {"indication": 1000.002}, {"indication": 1000.001},
                ]),
                disc_test([{"indication": 1000.000}, {"indication": 1000.010}]),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01",
                                 "Class II precision balance — all four OIML tests within tolerance. Certified.",
                                 ts(38)),
            "finalResult": "PASS", "hash": None, "auditEvents": []
        },

        # ── REJECTED ─────────────────────────────────────────────────────────
        {
            "reportId": "NAWI-2026-009",
            "applicationNumber": "APP/2026/FW/0009",
            "status": "REJECTED",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-02",
            "createdAt": ts(15), "updatedAt": ts(10),
            "laboratory": LAB,
            "manufacturer": mfr("Fairbanks Scales", "Kansas City, MO", "United States"),
            "instrument": instrument("FB2255SS", "FB2255-2026-0187", "Floor Scale",
                                     "III", 500.0, 2.0, 0.2, 0.2, 2500, sw="4.1"),
            "environment": env(30.0, 31.5, 70.0, 1007.0),
            "tests": [
                wp_test([
                    {"load": 0.0,   "indication": 0.0,   "zeroError": 0.0, "e": 0.2},
                    {"load": 100.0, "indication": 100.4, "zeroError": 0.0, "e": 0.2},
                    {"load": 250.0, "indication": 250.8, "zeroError": 0.0, "e": 0.2},
                    {"load": 500.0, "indication": 501.2, "zeroError": 0.0, "e": 0.2},
                ], result="FAIL"),
            ],
            "attachments": [],
            "review": review_obj("user-rev-01",
                                 "Report rejected — significant thermal drift observed (ambient 30–31.5°C exceeds "
                                 "standard test conditions). Errors exceed 1.5e at multiple load points. "
                                 "Instrument must be retested under controlled environmental conditions.",
                                 ts(10)),
            "finalResult": "FAIL", "hash": None, "auditEvents": []
        },

        # ── SUBMITTED FOR REVIEW (Class III trade scale) ──────────────────────
        {
            "reportId": "NAWI-2026-010",
            "applicationNumber": "APP/2026/TS/0055",
            "status": "SUBMITTED_FOR_REVIEW",
            "reportVersion": 1,
            "ruleSetVersion": "OIML-R76-2006-V1",
            "createdBy": "user-tech-01",
            "createdAt": ts(3), "updatedAt": ts(0, 6),
            "laboratory": LAB,
            "manufacturer": mfr("Adam Equipment", "Oxford", "United Kingdom"),
            "instrument": instrument("CPWplus 300", "CPW300-2026-0632", "Trade Scale",
                                     "III", 300.0, 2.0, 0.1, 0.1, 3000, sw="2.1"),
            "environment": env(22.0, 22.3, 46.0, 1013.5),
            "tests": [
                wp_test([
                    {"load": 0.0,   "indication": 0.00,  "zeroError": 0.00, "e": 0.1},
                    {"load": 50.0,  "indication": 50.00, "zeroError": 0.00, "e": 0.1},
                    {"load": 150.0, "indication": 150.05,"zeroError": 0.00, "e": 0.1},
                    {"load": 300.0, "indication": 300.05,"zeroError": 0.00, "e": 0.1},
                ]),
                ecc_test([
                    {"load": 100.0, "indication": 100.05, "position": "CENTER"},
                    {"load": 100.0, "indication": 100.00, "position": "FRONT_LEFT"},
                    {"load": 100.0, "indication": 100.05, "position": "FRONT_RIGHT"},
                    {"load": 100.0, "indication": 100.05, "position": "REAR_LEFT"},
                    {"load": 100.0, "indication": 100.10, "position": "REAR_RIGHT"},
                ]),
                rep_test([
                    {"indication": 150.0}, {"indication": 150.05},
                    {"indication": 150.0}, {"indication": 150.05},
                    {"indication": 150.0}, {"indication": 150.0},
                ]),
                disc_test([{"indication": 150.0}, {"indication": 150.1}]),
            ],
            "attachments": [],
            "review": review_obj(),
            "finalResult": "PENDING", "hash": None, "auditEvents": []
        },
    ]

    for r in reports:
        path = os.path.join(REPORTS_DIR, f"{r['reportId']}.json")
        write_json(path, r)


# ---------------------------------------------------------------------------
# 5. Audit Log
# ---------------------------------------------------------------------------
def seed_audit():
    print("\n── Audit Log ────────────────────────────────────────────────────")
    os.makedirs(os.path.dirname(AUDIT_FILE), exist_ok=True)

    events = [
        # NAWI-2026-001 lifecycle
        {"timestamp": ts(30),    "userId": "user-tech-01", "role": "TECHNICIAN", "action": "CREATE",
         "reportId": "NAWI-2026-001", "fromStatus": "NONE",        "toStatus": "DRAFT",               "comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(29),    "userId": "user-tech-01", "role": "TECHNICIAN", "action": "UPDATE",
         "reportId": "NAWI-2026-001", "fromStatus": "DRAFT",       "toStatus": "DRAFT",               "comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(28),    "userId": "user-tech-01", "role": "TECHNICIAN", "action": "SUBMIT",
         "reportId": "NAWI-2026-001", "fromStatus": "DRAFT",       "toStatus": "SUBMITTED_FOR_REVIEW","comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(22),    "userId": "user-rev-01",  "role": "REVIEWER",   "action": "APPROVE",
         "reportId": "NAWI-2026-001", "fromStatus": "SUBMITTED_FOR_REVIEW", "toStatus": "APPROVED",   "comment": "All four tests within OIML R-76 tolerances. Approved for certification.", "ruleSetVersion": "OIML-R76-2006-V1"},

        # NAWI-2026-003 lifecycle (fail)
        {"timestamp": ts(20),    "userId": "user-tech-02", "role": "TECHNICIAN", "action": "CREATE",
         "reportId": "NAWI-2026-003", "fromStatus": "NONE",        "toStatus": "DRAFT",               "comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(18),    "userId": "user-tech-02", "role": "TECHNICIAN", "action": "SUBMIT",
         "reportId": "NAWI-2026-003", "fromStatus": "DRAFT",       "toStatus": "SUBMITTED_FOR_REVIEW","comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(15),    "userId": "user-rev-01",  "role": "REVIEWER",   "action": "RETURN",
         "reportId": "NAWI-2026-003", "fromStatus": "SUBMITTED_FOR_REVIEW", "toStatus": "QUERY_RAISED","comment": "Please add load cell calibration certificate number.", "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(14),    "userId": "user-tech-02", "role": "TECHNICIAN", "action": "RESUBMIT",
         "reportId": "NAWI-2026-003", "fromStatus": "QUERY_RAISED","toStatus": "SUBMITTED_FOR_REVIEW","comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(12),    "userId": "user-rev-01",  "role": "REVIEWER",   "action": "APPROVE",
         "reportId": "NAWI-2026-003", "fromStatus": "SUBMITTED_FOR_REVIEW", "toStatus": "APPROVED",   "comment": "Weighing performance and eccentricity tests exceed OIML tolerances. Instrument FAILS.", "ruleSetVersion": "OIML-R76-2006-V1"},

        # NAWI-2026-007 query raised
        {"timestamp": ts(8),     "userId": "user-tech-02", "role": "TECHNICIAN", "action": "CREATE",
         "reportId": "NAWI-2026-007", "fromStatus": "NONE",        "toStatus": "DRAFT",               "comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(7),     "userId": "user-tech-02", "role": "TECHNICIAN", "action": "SUBMIT",
         "reportId": "NAWI-2026-007", "fromStatus": "DRAFT",       "toStatus": "SUBMITTED_FOR_REVIEW","comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(3),     "userId": "user-rev-01",  "role": "REVIEWER",   "action": "RETURN",
         "reportId": "NAWI-2026-007", "fromStatus": "SUBMITTED_FOR_REVIEW", "toStatus": "QUERY_RAISED","comment": "Missing eccentricity, repeatability, and discrimination test data.", "ruleSetVersion": "OIML-R76-2006-V1"},

        # NAWI-2026-004 submitted
        {"timestamp": ts(5),     "userId": "user-tech-01", "role": "TECHNICIAN", "action": "CREATE",
         "reportId": "NAWI-2026-004", "fromStatus": "NONE",        "toStatus": "DRAFT",               "comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
        {"timestamp": ts(1, 4),  "userId": "user-tech-01", "role": "TECHNICIAN", "action": "SUBMIT",
         "reportId": "NAWI-2026-004", "fromStatus": "DRAFT",       "toStatus": "SUBMITTED_FOR_REVIEW","comment": None, "ruleSetVersion": "OIML-R76-2006-V1"},
    ]

    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        for e in events:
            f.write(json.dumps(e) + "\n")
    print(f"  ✓ {os.path.relpath(AUDIT_FILE)} ({len(events)} events)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("NAWI Report System — Data Seeder")
    print("=" * 50)
    seed_rules()
    seed_users()
    seed_reports()
    seed_audit()
    print("\n✅  Seeding complete.")
