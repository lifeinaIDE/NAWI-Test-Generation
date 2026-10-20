"""
Phase 10 Demo Script and Mandatory Failing Scenario verification.
Tests run unaided against the FastAPI test client.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.hashing import compute_report_hash
from app.repositories.report_repository import get_report_repository
from app.repositories.user_repository import user_repository
from app.rules.rule_loader import get_rule_repository
import scripts.seed_demo_data as seeder

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_fresh_demo_data():
    """Wipes and re-seeds fresh demo data for Phase 10 demo testing."""
    settings = seeder.get_settings()
    seeder.wipe_storage(settings.STORAGE_PATH)
    seeder.seed_users(settings.STORAGE_PATH)
    seeder.seed_active_ruleset(settings.STORAGE_PATH)
    seeder.seed_reports(settings.STORAGE_PATH)


def test_seeded_demo_data_integrity():
    """Verifies that seed_demo_data accurately creates the 4 users, active rule-set, and 3 reports."""
    repo = get_report_repository()
    
    # 1. Check reports
    r1 = repo.get("NAWI-2026-0001")
    assert r1 is not None
    assert r1.status == "APPROVED"
    assert r1.finalResult == "PASS"
    assert r1.instrument.model == "BP-Platform-300"
    assert r1.hash == compute_report_hash(r1)
    assert all(t.result == "PASS" for t in r1.tests)

    r2 = repo.get("NAWI-2026-0002")
    assert r2 is not None
    assert r2.status == "SUBMITTED_FOR_REVIEW"
    assert r2.finalResult == "FAIL"
    assert any(t.result == "FAIL" and t.calculations.get("failureReason") for t in r2.tests)

    r3 = repo.get("NAWI-2026-0003")
    assert r3 is not None
    assert r3.status == "SUBMITTED_FOR_REVIEW"
    assert r3.finalResult in ("WARNING", "PASS")
    assert any(t.result == "WARNING" for t in r3.tests)

    # 2. Check users
    for username in ["technician", "reviewer", "admin", "viewer"]:
        u = user_repository.get_by_username(username)
        assert u is not None
        assert u["active"] is True

    # 3. Check rule-set
    rule_repo = get_rule_repository()
    active_rule = rule_repo.get_active()
    assert active_rule.ruleSetId == "OIML-R76-PROTOTYPE-V1"
    assert active_rule.status == "ACTIVE"


def test_demo_script_unaided_flow():
    """
    Executes the 11-step demo script end to end unaided:
    1. Log in as technician
    2. Create a report with the demo instrument
    3. Enter all four tests and see PASS from the backend
    4. Submit
    5. Log in as reviewer
    6. Raise a query with a comment
    7. Log in as technician, fix and resubmit
    8. Log in as reviewer, approve
    9. Download the PDF and verify the hash
    10. Search the repository by model BP-Platform-300
    11. Verify screen shows Match: true
    """
    # 1. Log in as technician
    login_res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert login_res.status_code == 200, login_res.text
    tech_token = login_res.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    # 2. Create a report with the demo instrument
    create_payload = {
        "applicationNumber": "DEMO-APP-2026-TEST",
        "instrument": {
            "model": "BP-Platform-300",
            "serialNumber": "BP300-TEST-009",
            "type": "electronic platform scale",
            "accuracyClass": "III",
            "maxCapacity": 300.0,
            "minCapacity": 2.0,
            "verificationIntervalE": 0.1,
            "actualIntervalD": 0.1,
            "numberOfIntervalsN": 3000.0,
            "unit": "kg",
            "softwareVersion": "v1.0",
        },
        "manufacturer": {
            "name": "Demo Instruments Pvt Ltd",
            "address": "Industrial Zone",
            "country": "India",
        },
        "laboratory": {
            "name": "Central Demo Legal Metrology Laboratory",
            "location": "Main Lab",
        },
        "environment": {
            "temperatureStart": 21.5,
            "temperatureEnd": 22.0,
            "relativeHumidity": 50.0,
            "barometricPressure": 1013.25,
        },
    }
    create_res = client.post("/api/reports", json=create_payload, headers=tech_headers)
    assert create_res.status_code == 200, create_res.text
    report = create_res.json()
    report_id = report["reportId"]
    assert report_id.startswith("NAWI-2026-")

    # 3. Enter all four tests and see PASS from the backend
    tests_payload = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "Weighing Performance",
            "applicable": True,
            "status": "COMPLETED",
            "observations": [
                {"testLoad": 50, "indication": 50.01, "zeroError": 0},
                {"testLoad": 150, "indication": 150.01, "zeroError": 0},
                {"testLoad": 300, "indication": 300.02, "zeroError": 0},
            ],
            "calculations": {
                "result": "PASS",
                "observedError": 0.01,
                "correctedError": 0.01,
                "maxPermissibleError": 0.05,
                "mpe": 0.05,
                "formulaUsed": "OBSERVED_ERROR_V1",
                "criterion": "abs(observedError) <= mpe",
            },
            "result": "PASS",
        },
        {
            "testCode": "ECCENTRICITY",
            "testName": "Eccentricity",
            "applicable": True,
            "status": "COMPLETED",
            "observations": [
                {"position": "CENTER", "load": 100, "reference": 100, "indication": 100.0},
                {"position": "FRONT_LEFT", "load": 100, "reference": 100, "indication": 100.01},
                {"position": "FRONT_RIGHT", "load": 100, "reference": 100, "indication": 100.0},
                {"position": "REAR_LEFT", "load": 100, "reference": 100, "indication": 99.99},
                {"position": "REAR_RIGHT", "load": 100, "reference": 100, "indication": 100.01},
            ],
            "calculations": {"result": "PASS", "mpe": 0.05},
            "result": "PASS",
        },
        {
            "testCode": "REPEATABILITY",
            "testName": "Repeatability",
            "applicable": True,
            "status": "COMPLETED",
            "observations": [
                {"testLoad": 150.0, "reading": 150.0},
                {"testLoad": 150.0, "reading": 150.01},
                {"testLoad": 150.0, "reading": 150.0},
            ],
            "calculations": {"result": "PASS", "range": 0.01, "mpe": 0.05},
            "result": "PASS",
        },
        {
            "testCode": "DISCRIMINATION",
            "testName": "Discrimination",
            "applicable": True,
            "status": "COMPLETED",
            "observations": [
                {"initialIndication": 150.0, "addedLoad": 0.14, "newIndication": 150.1}
            ],
            "calculations": {"result": "PASS"},
            "result": "PASS",
        },
    ]

    update_res = client.put(f"/api/reports/{report_id}", json={"tests": tests_payload}, headers=tech_headers)
    assert update_res.status_code == 200, update_res.text
    saved_report = update_res.json()
    assert all(t["result"] == "PASS" for t in saved_report["tests"])

    # 4. Submit
    submit_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert submit_res.status_code == 200, submit_res.text
    assert submit_res.json()["status"] == "SUBMITTED_FOR_REVIEW"

    # 5. Log in as reviewer
    rev_login_res = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    assert rev_login_res.status_code == 200, rev_login_res.text
    rev_token = rev_login_res.json()["token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    # 6. Raise a query with a comment
    query_res = client.post(
        f"/api/reports/{report_id}/return",
        json={"comment": "Please verify the discrimination test extra load calibration."},
        headers=rev_headers,
    )
    assert query_res.status_code == 200, query_res.text
    assert query_res.json()["status"] == "QUERY_RAISED"

    # 7. Log in as technician, fix and resubmit
    resubmit_res = client.post(
        f"/api/reports/{report_id}/submit",
        json={"comment": "Clarified discrimination test load cell response."},
        headers=tech_headers,
    )
    assert resubmit_res.status_code == 200, resubmit_res.text
    assert resubmit_res.json()["status"] == "SUBMITTED_FOR_REVIEW"

    # 8. Log in as reviewer, approve
    approve_res = client.post(
        f"/api/reports/{report_id}/approve",
        json={"comment": "All criteria met. Fully approved."},
        headers=rev_headers,
    )
    assert approve_res.status_code == 200, approve_res.text
    approved_report = approve_res.json()
    assert approved_report["status"] == "APPROVED"
    assert approved_report["finalResult"] == "PASS"
    assert approved_report.get("hash") is not None

    # 9. Download the PDF and verify the hash
    pdf_res = client.get(f"/api/reports/{report_id}/pdf", headers=rev_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers.get("content-type") == "application/pdf"
    assert len(pdf_res.content) > 1000

    # Verify hash endpoint
    verify_res = client.post(f"/api/reports/{report_id}/verify", headers=rev_headers)
    assert verify_res.status_code == 200, verify_res.text
    verify_data = verify_res.json()
    assert verify_data["match"] is True
    assert verify_data["verified"] is True
    assert verify_data["storedHash"] == verify_data["computedHash"]

    # 10. Search the repository by model BP-Platform-300
    search_res = client.get("/api/reports?model=BP-Platform-300", headers=rev_headers)
    assert search_res.status_code == 200, search_res.text
    search_data = search_res.json()
    assert search_data["total"] >= 1
    found_ids = [item["reportId"] for item in search_data["items"]]
    assert report_id in found_ids

    # 11. Verify screen endpoint shows Match: true
    verify_get_res = client.get(f"/api/reports/{report_id}/verify", headers=rev_headers)
    assert verify_get_res.status_code == 200
    assert verify_get_res.json()["match"] is True


def test_mandatory_failing_scenario():
    """
    Mandatory failing scenario:
    Enter data where abs(error) > MPE;
    The backend and calculation response must show a FAIL result
    naming the exact rule (OBSERVED_ERROR_V1 / criterion) and limit (MPE: 0.05).
    """
    # Authenticate as technician
    login_res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    tech_token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {tech_token}"}

    # Calculation endpoint: testLoad = 150 kg, indication = 150.25 kg, e = 0.1, Class III
    # MPE = 0.5e = 0.05 kg. Observed error = +0.25 kg > 0.05 kg.
    calc_payload = {
        "testLoad": 150.0,
        "indication": 150.25,
        "zeroError": 0.0,
        "e": 0.1,
        "accuracyClass": "III",
    }

    calc_res = client.post("/api/calculations/weighing-performance", json=calc_payload, headers=headers)
    assert calc_res.status_code == 200, calc_res.text
    result = calc_res.json()

    assert result["result"] == "FAIL"
    assert result["observedError"] == 0.25
    assert result["maxPermissibleError"] == 0.05
    assert "OBSERVED_ERROR_V1" in result["formulaUsed"]
    assert "abs(correctedError) <= mpe" in result["criterion"]
    assert "exceeds maximum permissible error" in result["failureReason"]
    assert "0.05" in result["failureReason"]

