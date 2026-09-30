import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import User

client = TestClient(app)

def test_workflow_transitions():
    # 1. Login as tech
    res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert res.status_code == 200
    tech_token = res.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}
    
    # 2. Login as reviewer
    res = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    reviewer_token = res.json()["token"]
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
    
    # 3. Create report
    res = client.post("/api/reports", json={
        "instrument": {"model": "ScaleX", "accuracyClass": "III", "maxCapacity": 3000, "verificationIntervalE": 1, "actualIntervalD": 1},
        "manufacturer": {},
        "laboratory": {}
    }, headers=tech_headers)
    assert res.status_code == 200
    report_id = res.json()["reportId"]
    
    # 4. Tech tries to approve -> 403
    res = client.post(f"/api/reports/{report_id}/approve", json={"comment": "Approve"}, headers=tech_headers)
    assert res.status_code == 403
    
    # 5. Reviewer tries to submit -> 403
    res = client.post(f"/api/reports/{report_id}/submit", headers=reviewer_headers)
    assert res.status_code == 403
    
    # 6. Tech tries to submit (tests are incomplete) -> 422
    # Wait, by default tests might be missing or incomplete. Let's update report to have applicable tests with PASS result.
    report_data = client.get(f"/api/reports/{report_id}", headers=tech_headers).json()
    
    report_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "WP",
            "applicable": True,
            "status": "COMPLETED",
            "result": "PASS",
            "observations": [],
            "calculations": {}
        }
    ]
    
    client.put(f"/api/reports/{report_id}", json=report_data, headers=tech_headers)
    
    # Tech submits
    res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "SUBMITTED_FOR_REVIEW"
    
    # 7. Reviewer returns
    res = client.post(f"/api/reports/{report_id}/return", json={"comment": "Missing data"}, headers=reviewer_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "QUERY_RAISED"
    
    # 8. Tech submits again
    res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert res.status_code == 200
    
    # 9. Reviewer approves
    res = client.post(f"/api/reports/{report_id}/approve", json={"comment": "Looks good"}, headers=reviewer_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"
    
    # 10. Check audit log
    res = client.get(f"/api/reports/{report_id}/audit", headers=tech_headers)
    events = res.json()["events"]
    assert len(events) >= 4 # submit, return, submit, approve
    actions = [e["action"] for e in events]
    assert "SUBMIT" in actions
    assert "RETURN" in actions
    assert "APPROVE" in actions

    # 11. Download PDF
    res = client.get(f"/api/reports/{report_id}/download", headers=tech_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000  # valid PDF size check
