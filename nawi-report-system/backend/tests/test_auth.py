from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_technician_cannot_approve_report():
    # a. Log in as "technician", capture the token
    login_data = {
        "username": "technician",
        "password": "demo123"
    }
    login_response = client.post("/api/auth/login", json=login_data)
    assert login_response.status_code == 200, "Login failed for technician"
    
    token = login_response.json()["token"]
    
    # b. Call POST /api/reports/{id}/approve with that token
    headers = {
        "Authorization": f"Bearer {token}"
    }
    approve_response = client.post("/api/reports/NAWI-2026-0001/approve", headers=headers)
    
    # c. Assert the response is HTTP 403
    assert approve_response.status_code == 403, f"Expected 403 Forbidden, got {approve_response.status_code}"
    
    # Optional: Check the custom error format
    data = approve_response.json()
    assert "detail" in data
    assert data["detail"][0]["message"] == "Not authorized for this action"

def test_reviewer_can_approve_report():
    # 1. Login as tech and create & submit a report
    tech_login = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert tech_login.status_code == 200
    tech_token = tech_login.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}
    
    rep_res = client.post("/api/reports", json={
        "applicationNumber": "APP-2026-001",
        "instrument": {"model": "ScaleX", "serialNumber": "SN-001", "accuracyClass": "III", "maxCapacity": 3000, "minCapacity": 20, "verificationIntervalE": 1, "actualIntervalD": 1, "numberOfIntervalsN": 3000},
        "environment": {"temperatureStart": 20.0, "temperatureEnd": 22.0, "relativeHumidity": 50.0},
        "manufacturer": {},
        "laboratory": {"name": "National Weights and Measures Lab"}
    }, headers=tech_headers)
    assert rep_res.status_code == 200
    rep_id = rep_res.json()["reportId"]
    
    rep_data = client.get(f"/api/reports/{rep_id}", headers=tech_headers).json()
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
    client.put(f"/api/reports/{rep_id}", json=rep_data, headers=tech_headers)
    submit_res = client.post(f"/api/reports/{rep_id}/submit", headers=tech_headers)
    assert submit_res.status_code == 200

    # 2. Login as reviewer
    login_data = {
        "username": "reviewer",
        "password": "demo123"
    }
    login_response = client.post("/api/auth/login", json=login_data)
    assert login_response.status_code == 200
    
    token = login_response.json()["token"]
    headers = {
        "Authorization": f"Bearer {token}"
    }
    approve_response = client.post(f"/api/reports/{rep_id}/approve", headers=headers, json={"comment": "Approved by reviewer"})
    
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "APPROVED"
