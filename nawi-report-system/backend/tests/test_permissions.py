import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_wrong_password_returns_401():
    res = client.post("/api/auth/login", json={"username": "technician", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "detail" in res.json()

def test_no_token_on_protected_endpoints_returns_401():
    # Calling various protected endpoints without Authorization header must return 401
    res1 = client.get("/api/auth/me")
    assert res1.status_code == 401

    res2 = client.post("/api/reports", json={})
    assert res2.status_code == 401

    res3 = client.post("/api/reports/NAWI-2026-0001/approve", json={})
    assert res3.status_code == 401

    res4 = client.get("/api/rules")
    assert res4.status_code == 401

    res5 = client.get("/api/audit")
    assert res5.status_code == 401

def test_technician_token_on_post_approve_returns_403():
    # Login as technician
    login_res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert login_res.status_code == 200
    tech_token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {tech_token}"}

    # Attempt to approve report -> 403 Forbidden
    res = client.post("/api/reports/NAWI-2026-0001/approve", headers=headers, json={"comment": "approve"})
    assert res.status_code == 403
    assert res.json()["detail"][0]["message"] == "Not authorized for this action"

def test_viewer_token_on_post_reports_returns_403():
    # Login as viewer
    login_res = client.post("/api/auth/login", json={"username": "viewer", "password": "demo123"})
    assert login_res.status_code == 200
    viewer_token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {viewer_token}"}

    # Attempt to create a report -> 403 Forbidden
    res = client.post("/api/reports", headers=headers, json={
        "instrument": {"model": "ScaleX"},
        "manufacturer": {},
        "laboratory": {}
    })
    assert res.status_code == 403
    assert res.json()["detail"][0]["message"] == "Not authorized for this action"

def test_jwt_claims_and_me_endpoint():
    # Login as reviewer
    login_res = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    user = login_res.json()["user"]
    assert user["role"] == "REVIEWER"
    assert "userId" in user or "id" in user

    # /api/auth/me returns current user
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_user = me_res.json()
    assert me_user["username"] == "reviewer"
    assert me_user["role"] == "REVIEWER"

def test_reviewer_token_on_post_submit_returns_403():
    # Login as reviewer
    login_res = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    assert login_res.status_code == 200
    reviewer_token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {reviewer_token}"}

    # Attempt to submit -> 403 Forbidden
    res = client.post("/api/reports/NAWI-2026-0001/submit", headers=headers)
    assert res.status_code == 403

def test_admin_cannot_approve_own_report_returns_403():
    # Login as admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"})
    assert login_res.status_code == 200
    admin_token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin creates a report
    rep_res = client.post("/api/reports", json={
        "applicationNumber": "APP-ADMIN-001",
        "instrument": {"model": "AdminScale", "serialNumber": "SN-ADMIN-01", "accuracyClass": "III", "maxCapacity": 5000, "minCapacity": 20, "verificationIntervalE": 1, "actualIntervalD": 1, "numberOfIntervalsN": 5000},
        "environment": {"temperatureStart": 20.0, "temperatureEnd": 22.0, "relativeHumidity": 50.0},
        "manufacturer": {},
        "laboratory": {"name": "Admin Metrology Lab"}
    }, headers=headers)
    assert rep_res.status_code == 200
    rep_id = rep_res.json()["reportId"]

    # Admin adds tests and submits
    rep_data = client.get(f"/api/reports/{rep_id}", headers=headers).json()
    rep_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "WP",
            "applicable": True,
            "status": "COMPLETED",
            "result": "PASS",
            "observations": [{"testLoad": 1000, "indication": 1000, "zeroError": 0}],
            "calculations": {"result": "PASS"}
        }
    ]
    client.put(f"/api/reports/{rep_id}", json=rep_data, headers=headers)
    sub_res = client.post(f"/api/reports/{rep_id}/submit", headers=headers)
    assert sub_res.status_code == 200

    # Admin tries to approve own report -> 403 Forbidden
    appr_res = client.post(f"/api/reports/{rep_id}/approve", json={"comment": "Self-approval"}, headers=headers)
    assert appr_res.status_code == 403
    assert "Admins cannot approve a report they created" in str(appr_res.json())

