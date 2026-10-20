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
    assert data["status"] in ["DRAFT", "IN_PROGRESS"]
    
    inst = data["instrument"]
    assert inst["model"] == "Updated Model XYZ"
    assert inst["serialNumber"] == "SN-12345"
    assert inst["maxCapacity"] == 100.0
    assert inst["verificationIntervalE"] == 0.1
    
    env = data["environment"]
    assert env["temperatureStart"] == 22.5
    assert env["relativeHumidity"] == 45.0


def test_attachment_upload_and_magic_byte_validation():
    # 1. Login as technician
    login_response = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a report
    rep = client.post("/api/reports", json={"instrument": {"model": "AttachmentTestModel"}}, headers=headers).json()
    report_id = rep["reportId"]

    # 3. Upload rejects .exe
    exe_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    res_exe = client.post(
        f"/api/reports/{report_id}/attachments",
        files={"file": ("malicious.exe", exe_content, "application/x-msdownload")},
        data={"category": "photo"},
        headers=headers,
    )
    assert res_exe.status_code == 400
    assert "not permitted" in res_exe.json()["detail"].lower()

    # 4. Upload rejects oversize files (> 10 MB)
    oversize_bytes = b"%PDF-" + b"0" * (10 * 1024 * 1024 + 10)
    res_oversize = client.post(
        f"/api/reports/{report_id}/attachments",
        files={"file": ("large.pdf", oversize_bytes, "application/pdf")},
        data={"category": "documentation"},
        headers=headers,
    )
    assert res_oversize.status_code == 400
    assert "exceeds maximum allowed size" in res_oversize.json()["detail"].lower()

    # 5. Upload rejects a PNG renamed to .pdf
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    res_fake_pdf = client.post(
        f"/api/reports/{report_id}/attachments",
        files={"file": ("fake_document.pdf", png_bytes, "application/pdf")},
        data={"category": "calibration_certificate"},
        headers=headers,
    )
    assert res_fake_pdf.status_code == 400
    assert "magic bytes do not match" in res_fake_pdf.json()["detail"].lower()

    # 6. Upload accepts valid PDF
    valid_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    res_valid_pdf = client.post(
        f"/api/reports/{report_id}/attachments",
        files={"file": ("certificate.pdf", valid_pdf_bytes, "application/pdf")},
        data={"category": "calibration_certificate", "expiryDate": "2020-01-01"},
        headers=headers,
    )
    assert res_valid_pdf.status_code == 200
    att_data = res_valid_pdf.json()
    att_id = att_data["id"]
    assert att_data["filename"] == "certificate.pdf"

    # 7. Expired certificate triggers ERROR in validation
    val_res = client.post(f"/api/reports/{report_id}/validate", headers=headers)
    assert val_res.status_code == 200
    error_messages = [m["message"] for m in val_res.json()["messages"] if m["level"] == "ERROR"]
    assert any("calibration certificate must not be expired" in m.lower() for m in error_messages)

    # 8. Download attachment
    down_res = client.get(f"/api/reports/{report_id}/attachments/{att_id}", headers=headers)
    assert down_res.status_code == 200
    assert down_res.content == valid_pdf_bytes

    # 9. Delete attachment
    del_res = client.delete(f"/api/reports/{report_id}/attachments/{att_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] == att_id

    # 10. Verify deleted
    down_res_deleted = client.get(f"/api/reports/{report_id}/attachments/{att_id}", headers=headers)
    assert down_res_deleted.status_code == 404


def test_server_side_calculation_recomputation_on_save():
    # Login as technician
    login_response = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create report with verification scale e = 1.0, Class III
    create_payload = {
        "instrument": {
            "model": "RecomputeTest",
            "accuracyClass": "III",
            "maxCapacity": 10000.0,
            "minCapacity": 10.0,
            "verificationIntervalE": 1.0,
            "actualIntervalD": 1.0
        }
    }
    rep = client.post("/api/reports", json=create_payload, headers=headers).json()
    report_id = rep["reportId"]

    # Client tries to send bogus result: "PASS" for a failing test (load=3000, indication=3010, error=10 >> MPE 0.5)
    failing_test_payload = {
        **rep,
        "tests": [
            {
                "testCode": "WEIGHING_PERFORMANCE",
                "testName": "Weighing Performance",
                "applicable": True,
                "observations": [{"testLoad": 3000.0, "indication": 3010.0, "zeroError": 0.0}],
                "result": "PASS",  # Client maliciously/falsely asserts PASS
                "calculations": {"result": "PASS"}
            }
        ]
    }
    update_res = client.put(f"/api/reports/{report_id}", json=failing_test_payload, headers=headers)
    assert update_res.status_code == 200

    saved_rep = client.get(f"/api/reports/{report_id}", headers=headers).json()
    saved_test = saved_rep["tests"][0]
    # Server MUST have recomputed the result and set it to FAIL
    assert saved_test["result"] == "FAIL"
    assert saved_test["calculations"]["result"] == "FAIL"
    assert saved_test["calculations"]["observedError"] == 10.0
