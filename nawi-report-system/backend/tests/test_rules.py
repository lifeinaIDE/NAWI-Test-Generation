import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def admin_headers():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"})
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def tech_headers():
    res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_rule_admin_permissions(tech_headers, admin_headers):
    # Non-admin trying to create
    res = client.post("/api/rules", headers=tech_headers)
    assert res.status_code == 403

    # Admin trying to create
    res = client.post("/api/rules", headers=admin_headers)
    assert res.status_code == 200
    new_rule = res.json()
    assert new_rule["isActive"] == False
    assert new_rule["ruleSetId"].startswith("OIML-R76-PROTOTYPE-V")

def test_activate_rule(admin_headers):
    # Create new rule
    res = client.post("/api/rules", headers=admin_headers)
    new_rule = res.json()
    new_id = new_rule["ruleSetId"]

    # Activate it
    res = client.post(f"/api/rules/{new_id}/activate", headers=admin_headers)
    assert res.status_code == 200

    # Fetch active
    res = client.get("/api/rules/active", headers=admin_headers)
    assert res.json()["ruleSetId"] == new_id

def test_edit_locked_rule(admin_headers, tech_headers):
    # Admin gets active
    active = client.get("/api/rules/active", headers=admin_headers).json()
    active_id = active["ruleSetId"]

    # Technician creates and approves a report using this active rule
    # (Simplified workflow creation to test locking)
    # 1. Create
    rep_res = client.post("/api/reports", json={
        "reportId": "stub",
        "title": "Locking Test",
        "applicationNumber": "APP-999",
        "laboratory": {"name": "Lab"},
        "manufacturer": {"name": "Mfg"},
        "instrument": {"model": "A", "serialNumber": "1", "type": "T", "accuracyClass": "III", "maxCapacity": 100, "minCapacity": 1, "verificationIntervalE": 0.1, "actualIntervalD": 0.1, "numberOfIntervalsN": 1000, "unit": "kg", "softwareVersion": "1"}
    }, headers=tech_headers)
    report_id = rep_res.json()["reportId"]

    # 2. Update to have observations
    client.put(f"/api/reports/{report_id}", json={
        **rep_res.json(),
        "tests": [
            {
                "testCode": "WP",
                "testName": "Weighing Performance",
                "testType": "WEIGHING_PERFORMANCE", 
                "applicable": True, 
                "observations": [{"testLoad": 10, "indication": 10, "zeroError": 0}], 
                "result": "PASS"
            }
        ]
    }, headers=tech_headers)
    
    # 3. Submit
    client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)

    # 4. Approve (by Admin)
    client.post(f"/api/reports/{report_id}/approve", json={"comment": "Approve for locking test"}, headers=admin_headers)

    # Now attempt to edit the rule
    res = client.put(f"/api/rules/{active_id}", json=active, headers=admin_headers)
    assert res.status_code == 409
    assert "locked" in res.json()["detail"].lower()
