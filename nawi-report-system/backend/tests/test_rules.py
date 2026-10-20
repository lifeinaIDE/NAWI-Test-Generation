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


@pytest.fixture
def viewer_headers():
    res = client.post("/api/auth/login", json={"username": "viewer", "password": "demo123"})
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_write_endpoints_return_403_for_non_admins(tech_headers, viewer_headers, admin_headers):
    """Every write endpoint returns 403 for non-admins."""
    # 1. Non-admin POST /api/rules -> 403
    res = client.post("/api/rules", headers=tech_headers)
    assert res.status_code == 403

    res_viewer = client.post("/api/rules", headers=viewer_headers)
    assert res_viewer.status_code == 403

    # Admin creates a draft to test PUT and activate
    admin_create = client.post("/api/rules", headers=admin_headers)
    assert admin_create.status_code == 200
    draft_id = admin_create.json()["ruleSetId"]
    draft_data = admin_create.json()

    # 2. Non-admin PUT /api/rules/{id} -> 403
    res = client.put(f"/api/rules/{draft_id}", json=draft_data, headers=tech_headers)
    assert res.status_code == 403

    res = client.put(f"/api/rules/{draft_id}", json=draft_data, headers=viewer_headers)
    assert res.status_code == 403

    # 3. Non-admin POST /api/rules/{id}/activate -> 403
    res = client.post(f"/api/rules/{draft_id}/activate", headers=tech_headers)
    assert res.status_code == 403

    res = client.post(f"/api/rules/{draft_id}/activate", headers=viewer_headers)
    assert res.status_code == 403


def test_edit_locked_rule_referenced_by_approved_report(admin_headers, tech_headers):
    """Edit a rule-set referenced by an APPROVED report -> 409."""
    # Get active rule
    active = client.get("/api/rules/active", headers=admin_headers).json()
    active_id = active["ruleSetId"]

    # Technician creates a report
    rep_res = client.post("/api/reports", json={
        "reportId": "stub",
        "title": "Locking Test Report",
        "applicationNumber": "APP-LOCK-001",
        "laboratory": {"name": "Lab"},
        "manufacturer": {"name": "Mfg"},
        "environment": {
            "temperatureStart": 20.0,
            "temperatureEnd": 21.0,
            "relativeHumidity": 50.0,
        },
        "instrument": {
            "model": "XP-100",
            "serialNumber": "SN-LOCK-1",
            "type": "ELECTRONIC",
            "accuracyClass": "III",
            "maxCapacity": 1000,
            "minCapacity": 10,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 1000,
            "unit": "kg",
            "softwareVersion": "1.0",
        },
    }, headers=tech_headers)
    assert rep_res.status_code == 200
    report_id = rep_res.json()["reportId"]

    # Populate observations for Weighing Performance
    client.put(f"/api/reports/{report_id}", json={
        **rep_res.json(),
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "observations": [{"testLoad": 500, "indication": 500.1, "zeroError": 0}],
                "result": "PASS",
            }
        ],
    }, headers=tech_headers)

    # Submit report (freezes ruleSetVersion)
    sub_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert sub_res.status_code == 200

    # Approve report (Admin approves)
    appr_res = client.post(
        f"/api/reports/{report_id}/approve",
        json={"comment": "Approved for rule locking test"},
        headers=admin_headers,
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # Now admin attempts to edit the locked rule-set
    res = client.put(f"/api/rules/{active_id}", json=active, headers=admin_headers)
    assert res.status_code == 409
    detail = res.json()["detail"]
    assert "Rule-set is referenced by an approved report and cannot be edited." in detail or "locked" in detail.lower()


def test_activate_new_version(admin_headers):
    """Activate a new version -> GET /rules/active returns it."""
    # 1. Admin creates a new draft
    create_res = client.post("/api/rules", headers=admin_headers)
    assert create_res.status_code == 200
    new_rule = create_res.json()
    new_id = new_rule["ruleSetId"]
    assert new_rule["status"] == "DRAFT"
    assert new_rule["isActive"] is False

    # 2. Activate the new version
    act_res = client.post(f"/api/rules/{new_id}/activate", headers=admin_headers)
    assert act_res.status_code == 200
    activated_rule = act_res.json()
    assert activated_rule["ruleSetId"] == new_id
    assert activated_rule["status"] == "ACTIVE"
    assert activated_rule["isActive"] is True

    # 3. GET /api/rules/active returns the newly activated version
    active_res = client.get("/api/rules/active", headers=admin_headers)
    assert active_res.status_code == 200
    assert active_res.json()["ruleSetId"] == new_id
    assert active_res.json()["isActive"] is True


def test_report_submitted_before_activation_keeps_old_ruleset(admin_headers, tech_headers):
    """A report submitted before activation still shows the old ruleSetVersion."""
    # Active rule at the start
    active_before = client.get("/api/rules/active", headers=admin_headers).json()
    old_version_id = active_before["ruleSetId"]

    # Technician creates and submits report
    rep_res = client.post("/api/reports", json={
        "reportId": "stub",
        "title": "Version Freeze Test",
        "applicationNumber": "APP-FRZ-001",
        "laboratory": {"name": "Lab"},
        "manufacturer": {"name": "Mfg"},
        "environment": {
            "temperatureStart": 20.0,
            "temperatureEnd": 21.0,
            "relativeHumidity": 50.0,
        },
        "instrument": {
            "model": "Freeze-200",
            "serialNumber": "SN-FRZ-1",
            "type": "ELECTRONIC",
            "accuracyClass": "III",
            "maxCapacity": 1000,
            "minCapacity": 10,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 1000,
            "unit": "kg",
            "softwareVersion": "1.0",
        },
    }, headers=tech_headers)
    rep_id = rep_res.json()["reportId"]

    client.put(f"/api/reports/{rep_id}", json={
        **rep_res.json(),
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "observations": [{"testLoad": 100, "indication": 100, "zeroError": 0}],
                "result": "PASS",
            }
        ],
    }, headers=tech_headers)

    # Submit freezes the ruleSetVersion to old_version_id
    client.post(f"/api/reports/{rep_id}/submit", headers=tech_headers)

    # Admin creates and activates a new rule-set version
    new_draft = client.post("/api/rules", headers=admin_headers).json()
    new_version_id = new_draft["ruleSetId"]
    client.post(f"/api/rules/{new_version_id}/activate", headers=admin_headers)

    # Active rule is now new_version_id
    assert client.get("/api/rules/active", headers=admin_headers).json()["ruleSetId"] == new_version_id

    # But the report submitted before activation still holds old_version_id
    rep_fetched = client.get(f"/api/reports/{rep_id}", headers=tech_headers).json()
    assert rep_fetched["ruleSetVersion"] == old_version_id
    assert rep_fetched["ruleSetVersion"] != new_version_id


def test_changing_threshold_changes_calculation_without_touching_engine(admin_headers):
    """Changing a threshold through the API changes a new calculation without touching calculation_engine.py."""
    # 1. Admin creates a new draft rule-set
    draft_res = client.post("/api/rules", headers=admin_headers)
    draft = draft_res.json()
    draft_id = draft["ruleSetId"]

    # In Class III band 1 (0 to 5000 intervals), default mpeInE is 0.5.
    # We update mpeInE to 1.5 in the first band of Class III.
    draft["mpeRules"]["III"][0]["mpeInE"] = 1.5
    draft["changeNotes"] = "Relaxed first band threshold to 1.5e for demonstration"

    # Save draft
    update_res = client.put(f"/api/rules/{draft_id}", json=draft, headers=admin_headers)
    assert update_res.status_code == 200

    # Activate the modified rule-set
    act_res = client.post(f"/api/rules/{draft_id}/activate", headers=admin_headers)
    assert act_res.status_code == 200

    # 2. Test a calculation with load = 1000 kg, indication = 1000.7 kg, e = 1 kg.
    # Observed error = 0.7 kg.
    # Under standard rules (mpeInE=0.5), mpe=0.5 -> error 0.7 > 0.5 -> FAIL.
    # Under new activated threshold (mpeInE=1.5), mpe=1.5 -> error 0.7 <= 1.5 -> PASS.
    calc_res = client.post("/api/calculations/weighing-performance", json={
        "testLoad": 1000,
        "indication": 1000.7,
        "zeroError": 0,
        "e": 1,
        "accuracyClass": "III",
    }, headers=admin_headers)

    assert calc_res.status_code == 200
    calc = calc_res.json()
    assert calc["result"] == "PASS"
    assert calc["mpeInE"] == 1.5
    assert calc["maxPermissibleError"] == 1.5
