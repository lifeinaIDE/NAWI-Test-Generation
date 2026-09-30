from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_persistence_round_trip():
    # 1. Login as technician to get a token
    login_response = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a report
    create_payload = {
        "instrument": {
            "model": "Initial Model"
        }
    }
    create_response = client.post("/api/reports", json=create_payload, headers=headers)
    assert create_response.status_code == 200
    report_id = create_response.json()["reportId"]

    # 3. PUT an update
    update_payload = {
        "instrument": {
            "model": "Updated Model XYZ",
            "serialNumber": "SN-12345",
            "maxCapacity": 100.0,
            "minCapacity": 1.0,
            "verificationIntervalE": 0.1,
            "actualIntervalD": 0.1,
            "numberOfIntervalsN": 1000
        },
        "environment": {
            "temperatureStart": 22.5,
            "temperatureEnd": 23.0,
            "relativeHumidity": 45.0,
            "barometricPressure": 1013.25
        }
    }
    update_response = client.put(f"/api/reports/{report_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 200

    # 4. GET it back and assert fields match
    get_response = client.get(f"/api/reports/{report_id}", headers=headers)
    assert get_response.status_code == 200
    
    data = get_response.json()
    assert data["reportId"] == report_id
    assert data["status"] == "DRAFT"
    
    inst = data["instrument"]
    assert inst["model"] == "Updated Model XYZ"
    assert inst["serialNumber"] == "SN-12345"
    assert inst["maxCapacity"] == 100.0
    assert inst["verificationIntervalE"] == 0.1
    
    env = data["environment"]
    assert env["temperatureStart"] == 22.5
    assert env["relativeHumidity"] == 45.0
