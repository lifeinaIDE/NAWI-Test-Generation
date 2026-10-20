import pytest
import os
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.repositories.user_repository import user_repository
from app.repositories.report_repository import get_report_repository, REPORTS_DIR

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_tokens():
    # Login technician A
    res_a = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert res_a.status_code == 200
    token_a = res_a.json()["token"]

    # Ensure technician B exists
    if not user_repository.get_by_username("technician2"):
        user_repository.create_user({
            "userId": "user-tech-02",
            "username": "technician2",
            "displayName": "Technician Two",
            "password": "demo123",
            "role": "TECHNICIAN",
            "active": True
        })

    # Login technician B
    res_b = client.post("/api/auth/login", json={"username": "technician2", "password": "demo123"})
    assert res_b.status_code == 200
    token_b = res_b.json()["token"]

    return {
        "headers_a": {"Authorization": f"Bearer {token_a}"},
        "headers_b": {"Authorization": f"Bearer {token_b}"},
    }

def test_create_put_get_nested_objects_match(auth_tokens):
    headers_a = auth_tokens["headers_a"]

    # 1. Create a draft report
    create_payload = {
        "applicationNumber": "APP-2026-9999",
        "laboratory": {
            "name": "National Weights and Measures Lab",
            "address": "100 Metrology Boulevard",
            "location": "New Delhi",
            "contact": "contact@nawi-lab.gov.in"
        },
        "manufacturer": {
            "name": "Precision Scale Co.",
            "address": "45 Industrial Zone",
            "country": "India"
        },
        "instrument": {
            "model": "PS-6000",
            "serialNumber": "SN-2026-X1",
            "type": "Electronic Platform",
            "accuracyClass": "III",
            "maxCapacity": 6000.0,
            "minCapacity": 20.0,
            "verificationIntervalE": 2.0,
            "actualIntervalD": 1.0,
            "numberOfIntervalsN": 3000.0,
            "unit": "kg",
            "softwareVersion": "v2.4.1",
            "loadCell": {"model": "LC-6T", "capacity": 6000}
        },
        "environment": {
            "temperatureStart": 22.5,
            "temperatureEnd": 23.0,
            "relativeHumidity": 55.0,
            "barometricPressure": 1013.25
        }
    }

    create_res = client.post("/api/reports", json=create_payload, headers=headers_a)
    assert create_res.status_code == 200
    created = create_res.json()
    report_id = created["reportId"]
    assert report_id.startswith("NAWI-")
    assert created["status"] == "DRAFT"

    # 2. PUT update with modifications
    update_payload = {
        "applicationNumber": "APP-2026-9999-REV1",
        "laboratory": {
            "name": "National Weights and Measures Lab — Updated",
            "address": "100 Metrology Boulevard",
            "location": "New Delhi",
            "contact": "support@nawi-lab.gov.in"
        },
        "manufacturer": {
            "name": "Precision Scale Co. Ltd.",
            "address": "45 Industrial Zone Sector 5",
            "country": "India"
        },
        "instrument": {
            "model": "PS-6000-HD",
            "serialNumber": "SN-2026-X1-MOD",
            "type": "Heavy Duty Electronic Platform",
            "accuracyClass": "III",
            "maxCapacity": 6000.0,
            "minCapacity": 40.0,
            "verificationIntervalE": 2.0,
            "actualIntervalD": 2.0,
            "numberOfIntervalsN": 3000.0,
            "unit": "kg",
            "softwareVersion": "v2.5.0",
            "loadCell": {"model": "LC-6T-PRO", "capacity": 6000, "serial": "LC9912"}
        },
        "environment": {
            "temperatureStart": 21.0,
            "temperatureEnd": 22.0,
            "relativeHumidity": 60.0,
            "barometricPressure": 1015.0
        }
    }

    put_res = client.put(f"/api/reports/{report_id}", json=update_payload, headers=headers_a)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["status"] == "IN_PROGRESS" # First substantive save moves DRAFT -> IN_PROGRESS

    # 3. GET back and verify every field and nested object matches
    get_res = client.get(f"/api/reports/{report_id}", headers=headers_a)
    assert get_res.status_code == 200
    fetched = get_res.json()

    assert fetched["reportId"] == report_id
    assert fetched["status"] == "IN_PROGRESS"
    assert fetched["applicationNumber"] == "APP-2026-9999-REV1"

    # Nested laboratory
    assert fetched["laboratory"]["name"] == "National Weights and Measures Lab — Updated"
    assert fetched["laboratory"]["contact"] == "support@nawi-lab.gov.in"

    # Nested manufacturer
    assert fetched["manufacturer"]["name"] == "Precision Scale Co. Ltd."
    assert fetched["manufacturer"]["address"] == "45 Industrial Zone Sector 5"

    # Nested instrument
    assert fetched["instrument"]["model"] == "PS-6000-HD"
    assert fetched["instrument"]["serialNumber"] == "SN-2026-X1-MOD"
    assert fetched["instrument"]["maxCapacity"] == 6000.0
    assert fetched["instrument"]["minCapacity"] == 40.0
    assert fetched["instrument"]["verificationIntervalE"] == 2.0
    assert fetched["instrument"]["actualIntervalD"] == 2.0
    assert fetched["instrument"]["numberOfIntervalsN"] == 3000.0
    assert fetched["instrument"]["loadCell"] == {"model": "LC-6T-PRO", "capacity": 6000, "serial": "LC9912"}

    # Nested environment
    assert fetched["environment"]["temperatureStart"] == 21.0
    assert fetched["environment"]["temperatureEnd"] == 22.0
    assert fetched["environment"]["relativeHumidity"] == 60.0
    assert fetched["environment"]["barometricPressure"] == 1015.0

    # Ensure JSON file exists on disk
    file_on_disk = os.path.join(REPORTS_DIR, f"{report_id}.json")
    assert os.path.exists(file_on_disk)
    with open(file_on_disk, "r", encoding="utf-8") as f:
        disk_data = json.load(f)
    assert disk_data["instrument"]["model"] == "PS-6000-HD"

def test_d_greater_than_e_returns_error(auth_tokens):
    headers_a = auth_tokens["headers_a"]

    # Create draft
    create_res = client.post("/api/reports", json={
        "instrument": {"model": "TestScale", "maxCapacity": 1000, "verificationIntervalE": 1.0, "actualIntervalD": 1.0}
    }, headers=headers_a)
    assert create_res.status_code == 200
    report_id = create_res.json()["reportId"]

    # PUT with d > e (e = 1.0, d = 2.0)
    bad_payload = {
        "instrument": {
            "model": "TestScale",
            "maxCapacity": 1000,
            "verificationIntervalE": 1.0,
            "actualIntervalD": 2.0
        }
    }
    put_res = client.put(f"/api/reports/{report_id}", json=bad_payload, headers=headers_a)
    assert put_res.status_code == 422
    details = put_res.json()["detail"]
    d_error = next((d for d in details if d["field"] == "instrument.actualIntervalD"), None)
    assert d_error is not None
    assert d_error["level"] == "ERROR"
    assert "d must not be greater than e." in d_error["message"]

def test_simulated_failure_between_temp_write_and_replace_preserves_original(auth_tokens):
    headers_a = auth_tokens["headers_a"]

    # Create and save a valid report
    create_res = client.post("/api/reports", json={
        "instrument": {"model": "OriginalModel", "maxCapacity": 500, "verificationIntervalE": 1.0, "actualIntervalD": 1.0}
    }, headers=headers_a)
    assert create_res.status_code == 200
    report_id = create_res.json()["reportId"]

    # Verify original file content on disk
    file_path = os.path.join(REPORTS_DIR, f"{report_id}.json")
    assert os.path.exists(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        orig_content = json.load(f)
    assert orig_content["instrument"]["model"] == "OriginalModel"

    # Simulate failure on os.replace
    repo = get_report_repository()
    report_obj = repo.get(report_id)
    report_obj.instrument.model = "CorruptedAttemptModel"

    with patch("os.replace", side_effect=IOError("Simulated disk error during replace")):
        with pytest.raises(IOError):
            repo.update(report_obj)

    # Verify original file remains completely intact and uncorrupted
    assert os.path.exists(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        intact_content = json.load(f)
    assert intact_content["instrument"]["model"] == "OriginalModel"

def test_technician_b_cannot_read_technician_a_draft(auth_tokens):
    headers_a = auth_tokens["headers_a"]
    headers_b = auth_tokens["headers_b"]

    # Tech A creates a draft
    create_res = client.post("/api/reports", json={
        "instrument": {"model": "TechA_Scale"}
    }, headers=headers_a)
    assert create_res.status_code == 200
    report_id = create_res.json()["reportId"]

    # Tech A can read it
    res_a = client.get(f"/api/reports/{report_id}", headers=headers_a)
    assert res_a.status_code == 200

    # Tech B tries to read Tech A's draft -> 403 Forbidden
    res_b = client.get(f"/api/reports/{report_id}", headers=headers_b)
    assert res_b.status_code in [403, 404]
