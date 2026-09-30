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
    # Verify a reviewer CAN access the endpoint
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
    approve_response = client.post("/api/reports/NAWI-2026-0001/approve", headers=headers)
    
    # Should be 200 OK since it's a stub that returns the stubbed object
    assert approve_response.status_code == 200
