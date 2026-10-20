import os
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.hashing import compute_report_hash
from app.reportgen.pdf_generator import generate_report
from app.core.config import get_settings

client = TestClient(app)


def test_hash_canonical_json_and_key_order_invariance():
    """
    Same content -> same hash, also when keys are inserted in a different order.
    Excludes 'hash' and 'auditEvents'.
    """
    dict_a = {
        "reportId": "NAWI-2026-TEST",
        "status": "APPROVED",
        "instrument": {
            "model": "Model-A",
            "maxCapacity": 1000,
            "verificationIntervalE": 1,
        },
        "finalResult": "PASS",
        "hash": "some-old-hash",
        "auditEvents": [{"action": "SUBMIT"}],
    }

    # Different key insertion order at top level and nested level
    dict_b = {
        "auditEvents": [{"action": "OTHER_ACTION"}],
        "finalResult": "PASS",
        "instrument": {
            "verificationIntervalE": 1,
            "maxCapacity": 1000,
            "model": "Model-A",
        },
        "status": "APPROVED",
        "hash": "different-hash-ignored",
        "reportId": "NAWI-2026-TEST",
    }

    hash_a = compute_report_hash(dict_a)
    hash_b = compute_report_hash(dict_b)

    assert hash_a == hash_b
    assert len(hash_a) == 64  # SHA-256 hex string


def test_changing_any_field_changes_hash():
    """
    Changing any substantive field changes the hash.
    """
    base = {
        "reportId": "NAWI-2026-TEST",
        "status": "APPROVED",
        "applicationNumber": "APP-001",
        "instrument": {
            "model": "Model-A",
            "maxCapacity": 1000,
        },
        "finalResult": "PASS",
    }

    base_hash = compute_report_hash(base)

    # 1. Change top-level field
    mod1 = dict(base, applicationNumber="APP-002")
    assert compute_report_hash(mod1) != base_hash

    # 2. Change nested field
    mod2 = {
        "reportId": "NAWI-2026-TEST",
        "status": "APPROVED",
        "applicationNumber": "APP-001",
        "instrument": {
            "model": "Model-B",
            "maxCapacity": 1000,
        },
        "finalResult": "PASS",
    }
    assert compute_report_hash(mod2) != base_hash

    # 3. Change status
    mod3 = dict(base, status="REJECTED")
    assert compute_report_hash(mod3) != base_hash


def test_pdf_bytes_start_with_magic_bytes():
    """
    PDF bytes start with %PDF.
    """
    sample_report = {
        "reportId": "NAWI-2026-PDFTEST",
        "applicationNumber": "APP-PDF-001",
        "status": "APPROVED",
        "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
        "finalResult": "PASS",
        "createdBy": "tech1",
        "laboratory": {"name": "Legal Metrology Lab"},
        "manufacturer": {"name": "WeighCo"},
        "instrument": {
            "model": "WC-100",
            "serialNumber": "SN-999",
            "accuracyClass": "III",
            "maxCapacity": 150.0,
            "minCapacity": 1.0,
            "verificationIntervalE": 0.05,
            "actualIntervalD": 0.05,
            "numberOfIntervalsN": 3000,
            "unit": "kg",
        },
        "environment": {
            "temperatureStart": 20.0,
            "temperatureEnd": 20.5,
            "relativeHumidity": 50.0,
        },
        "tests": [
            {
                "testCode": "WP",
                "testName": "Weighing Performance",
                "applicable": True,
                "status": "COMPLETED",
                "result": "PASS",
                "remarks": "Normal",
                "observations": [{"testLoad": 50.0, "indication": 50.0, "zeroError": 0.0}],
                "calculations": {"observedError": 0.0, "mpe": 1.0},
            }
        ],
        "attachments": [],
        "hash": "abcdef1234567890" * 4,
    }

    pdf_bytes = generate_report(sample_report)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000


def test_immutability_and_verification_workflow():
    """
    Tests end-to-end Phase 7 requirements:
    1. Technician submits report, Reviewer approves it.
    2. Approval finalizes PDF and sets report.hash.
    3. PUT on an APPROVED report -> 403.
    4. DELETE on an APPROVED report -> 403.
    5. Attachment upload/delete on APPROVED report -> 403.
    6. Verify returns match: True.
    7. After manually editing stored JSON on disk, /verify returns match: False.
    8. POST /finalize is idempotent for APPROVED reports.
    9. GET /download streams PDF with role filtering.
    """
    # 1. Login users
    tech_login = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert tech_login.status_code == 200
    tech_token = tech_login.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    rev_login = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    assert rev_login.status_code == 200
    rev_token = rev_login.json()["token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    viewer_login = client.post("/api/auth/login", json={"username": "viewer", "password": "demo123"})
    assert viewer_login.status_code == 200
    viewer_token = viewer_login.json()["token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 2. Create and fill report
    create_res = client.post("/api/reports", json={
        "applicationNumber": "APP-PHASE7-001",
        "instrument": {
            "model": "PX-3000",
            "serialNumber": "SN-PX3000",
            "accuracyClass": "III",
            "maxCapacity": 3000,
            "minCapacity": 20,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 3000,
            "unit": "kg",
        },
        "environment": {
            "temperatureStart": 21.0,
            "temperatureEnd": 21.5,
            "relativeHumidity": 50.0,
        },
        "manufacturer": {"name": "Precision Ltd"},
        "laboratory": {"name": "National Lab"}
    }, headers=tech_headers)
    assert create_res.status_code == 200
    report_id = create_res.json()["reportId"]

    # Add a valid test
    put_res = client.put(f"/api/reports/{report_id}", json={
        "tests": [
            {
                "testCode": "WP",
                "testName": "Weighing Performance",
                "applicable": True,
                "status": "COMPLETED",
                "observations": [
                    {"testLoad": 500, "indication": 500.0, "zeroError": 0.0}
                ],
                "calculations": {},
                "result": "PASS",
                "remarks": "Valid",
            }
        ]
    }, headers=tech_headers)
    assert put_res.status_code == 200

    # Submit report
    submit_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED_FOR_REVIEW"

    # 3. Approve report -> triggers finalize()
    app_res = client.post(
        f"/api/reports/{report_id}/approve",
        json={"comment": "Certified compliant with OIML R-76."},
        headers=rev_headers,
    )
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["status"] == "APPROVED"
    stored_hash = app_data["hash"]
    assert stored_hash is not None and len(stored_hash) == 64

    # Verify generated PDF file exists on disk
    settings = get_settings()
    pdf_path = os.path.join(settings.STORAGE_PATH, "generated-reports", f"{report_id}.pdf")
    assert os.path.exists(pdf_path)
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    assert pdf_bytes.startswith(b"%PDF")

    # 4. PUT on an APPROVED report -> 403
    put_approved = client.put(
        f"/api/reports/{report_id}",
        json={"applicationNumber": "MODIFIED-APP-NUM"},
        headers=tech_headers,
    )
    assert put_approved.status_code == 403

    # 5. DELETE on an APPROVED report -> 403
    del_approved = client.delete(f"/api/reports/{report_id}", headers=tech_headers)
    assert del_approved.status_code == 403

    # 6. Attachment upload on APPROVED report -> 403
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    att_upload = client.post(
        f"/api/reports/{report_id}/attachments",
        files={"file": ("test.png", fake_png, "image/png")},
        data={"category": "photo"},
        headers=tech_headers,
    )
    assert att_upload.status_code == 403

    # 7. POST /verify returns match: True
    verify_res = client.post(f"/api/reports/{report_id}/verify", headers=tech_headers)
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["match"] is True
    assert v_data["storedHash"] == stored_hash
    assert v_data["computedHash"] == stored_hash

    # 8. POST /finalize is idempotent for APPROVED reports
    # It regenerates only if file is missing, and never changes stored hash
    fin_res = client.post(f"/api/reports/{report_id}/finalize", headers=rev_headers)
    assert fin_res.status_code == 200
    assert fin_res.json()["hash"] == stored_hash

    # Test re-generation when PDF is missing
    os.remove(pdf_path)
    assert not os.path.exists(pdf_path)
    fin_regen_res = client.post(f"/api/reports/{report_id}/finalize", headers=rev_headers)
    assert fin_regen_res.status_code == 200
    assert fin_regen_res.json()["hash"] == stored_hash
    assert os.path.exists(pdf_path)

    # 9. GET /download streams PDF with role filtering
    # Technician downloads own approved report -> 200
    dl_tech = client.get(f"/api/reports/{report_id}/download", headers=tech_headers)
    assert dl_tech.status_code == 200
    assert dl_tech.headers["content-type"] == "application/pdf"
    assert dl_tech.content.startswith(b"%PDF")

    # Viewer downloads approved report -> 200
    dl_viewer = client.get(f"/api/reports/{report_id}/download", headers=viewer_headers)
    assert dl_viewer.status_code == 200
    assert dl_viewer.headers["content-type"] == "application/pdf"

    # Reviewer downloads approved report -> 200
    dl_rev = client.get(f"/api/reports/{report_id}/download", headers=rev_headers)
    assert dl_rev.status_code == 200

    # 10. After manually editing the stored JSON, /verify returns match false
    report_file_path = os.path.join(settings.STORAGE_PATH, "reports", f"{report_id}.json")
    with open(report_file_path, "r", encoding="utf-8") as f:
        stored_json = json.load(f)

    # Tamper with serialNumber
    stored_json["instrument"]["serialNumber"] = "TAMPERED_SERIAL_123"
    with open(report_file_path, "w", encoding="utf-8") as f:
        json.dump(stored_json, f, indent=2)

    # Now verify should return match: False
    tampered_verify = client.post(f"/api/reports/{report_id}/verify", headers=tech_headers)
    assert tampered_verify.status_code == 200
    tv_data = tampered_verify.json()
    assert tv_data["match"] is False
    assert tv_data["storedHash"] == stored_hash
    assert tv_data["computedHash"] != stored_hash
