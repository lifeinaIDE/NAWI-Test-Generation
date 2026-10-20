import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_workflow_permissions_and_edge_cases():
    # 1. Login technician, reviewer, admin
    tech_login = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert tech_login.status_code == 200
    tech_token = tech_login.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    rev_login = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"})
    assert rev_login.status_code == 200
    rev_token = rev_login.json()["token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create fresh report as technician
    create_res = client.post("/api/reports", json={
        "applicationNumber": "APP-2026-001",
        "instrument": {
            "model": "XP-6000",
            "serialNumber": "SN-XP6000",
            "accuracyClass": "III",
            "maxCapacity": 6000,
            "minCapacity": 40,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 6000,
        },
        "environment": {
            "temperatureStart": 21.0,
            "temperatureEnd": 21.5,
            "relativeHumidity": 55.0,
        },
        "manufacturer": {"name": "Mettler"},
        "laboratory": {"name": "Legal Metrology Lab"}
    }, headers=tech_headers)
    assert create_res.status_code == 200
    report_id = create_res.json()["reportId"]

    # 3. Technician -> /approve = 403
    res = client.post(f"/api/reports/{report_id}/approve", json={"comment": "approve attempt"}, headers=tech_headers)
    assert res.status_code == 403

    # 4. Reviewer -> /submit = 403
    res = client.post(f"/api/reports/{report_id}/submit", headers=rev_headers)
    assert res.status_code == 403

    # 5. Approve from DRAFT = 409
    res = client.post(f"/api/reports/{report_id}/approve", json={"comment": "premature approval"}, headers=rev_headers)
    assert res.status_code == 409
    assert "Invalid transition" in str(res.json()["detail"])

    # 6. Submit with an INCOMPLETE applicable test = 422 with a validation message
    rep_data = client.get(f"/api/reports/{report_id}", headers=tech_headers).json()
    rep_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "Weighing Performance",
            "applicable": True,
            "status": "INCOMPLETE",
            "result": "INCOMPLETE",
            "observations": [],
            "calculations": {}
        }
    ]
    client.put(f"/api/reports/{report_id}", json=rep_data, headers=tech_headers)
    submit_incomplete = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert submit_incomplete.status_code == 422
    assert any("incomplete" in m.get("message", "").lower() for m in submit_incomplete.json()["detail"])

    # 7. Provide valid test data and submit successfully
    rep_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "Weighing Performance",
            "applicable": True,
            "status": "COMPLETED",
            "result": "PASS",
            "observations": [{"testLoad": 2000, "indication": 2000, "zeroError": 0}],
            "calculations": {"result": "PASS", "observedError": 0.0, "mpe": 1.0}
        }
    ]
    client.put(f"/api/reports/{report_id}", json=rep_data, headers=tech_headers)

    submit_ok = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert submit_ok.status_code == 200
    submitted_report = submit_ok.json()
    assert submitted_report["status"] == "SUBMITTED_FOR_REVIEW"
    # RuleSetVersion must be frozen
    assert submitted_report["ruleSetVersion"] != ""

    # 8. Return without a comment = 422
    return_no_comment = client.post(f"/api/reports/{report_id}/return", json={"comment": "   "}, headers=rev_headers)
    assert return_no_comment.status_code == 422
    assert "comment" in return_no_comment.json()["detail"][0]["field"]

    # Reject without a comment = 422
    reject_no_comment = client.post(f"/api/reports/{report_id}/reject", json={"comment": ""}, headers=rev_headers)
    assert reject_no_comment.status_code == 422


def test_full_query_and_resubmit_loop_and_audit():
    # Login tech and reviewer
    tech_token = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"}).json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    rev_token = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"}).json()["token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    admin_token = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"}).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Technician creates report
    res = client.post("/api/reports", json={
        "applicationNumber": "APP-2026-002",
        "instrument": {
            "model": "Defender-3000",
            "serialNumber": "SN-DEF3000",
            "accuracyClass": "III",
            "maxCapacity": 3000,
            "minCapacity": 20,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 3000,
        },
        "environment": {
            "temperatureStart": 22.0,
            "temperatureEnd": 22.5,
            "relativeHumidity": 50.0,
        },
        "manufacturer": {"name": "Ohaus"},
        "laboratory": {"name": "NABL Lab 101"}
    }, headers=tech_headers)
    assert res.status_code == 200
    report_id = res.json()["reportId"]

    # Add valid test
    rep_data = client.get(f"/api/reports/{report_id}", headers=tech_headers).json()
    rep_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "Weighing Performance",
            "applicable": True,
            "status": "COMPLETED",
            "result": "PASS",
            "observations": [{"testLoad": 1500, "indication": 1500, "zeroError": 0}],
            "calculations": {"result": "PASS", "observedError": 0.0, "mpe": 1.0}
        }
    ]
    client.put(f"/api/reports/{report_id}", json=rep_data, headers=tech_headers)

    # 2. Submit -> SUBMITTED_FOR_REVIEW
    sub_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "SUBMITTED_FOR_REVIEW"

    # 3. Reviewer returns with comment -> QUERY_RAISED
    ret_res = client.post(f"/api/reports/{report_id}/return", json={"comment": "Please verify zero error value"}, headers=rev_headers)
    assert ret_res.status_code == 200
    assert ret_res.json()["status"] == "QUERY_RAISED"
    assert ret_res.json()["review"]["reviewerComments"] == "Please verify zero error value"

    # 4. Technician edits report in QUERY_RAISED status
    rep_data = client.get(f"/api/reports/{report_id}", headers=tech_headers).json()
    rep_data["tests"][0]["remarks"] = "Zero error confirmed as 0.0 e."
    edit_res = client.put(f"/api/reports/{report_id}", json=rep_data, headers=tech_headers)
    assert edit_res.status_code == 200

    # 5. Technician resubmits -> SUBMITTED_FOR_REVIEW
    resub_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert resub_res.status_code == 200
    assert resub_res.json()["status"] == "SUBMITTED_FOR_REVIEW"

    # 6. Reviewer approves -> APPROVED
    appr_res = client.post(f"/api/reports/{report_id}/approve", json={"comment": "All corrections verified, approved."}, headers=rev_headers)
    assert appr_res.status_code == 200
    approved_report = appr_res.json()
    assert approved_report["status"] == "APPROVED"
    assert approved_report["finalResult"] == "PASS"

    # 7. Audit trail assertions
    # Reviewer gets report audit
    audit_res = client.get(f"/api/reports/{report_id}/audit", headers=rev_headers)
    assert audit_res.status_code == 200
    events = audit_res.json()["events"]
    assert len(events) >= 4

    actions = [e["action"] for e in events]
    assert actions == ["SUBMIT", "RETURN", "RESUBMIT", "APPROVE"]

    # Verify transitions and comments
    return_event = next(e for e in events if e["action"] == "RETURN")
    assert return_event["fromStatus"] == "SUBMITTED_FOR_REVIEW"
    assert return_event["toStatus"] == "QUERY_RAISED"
    assert return_event["comment"] == "Please verify zero error value"

    resubmit_event = next(e for e in events if e["action"] == "RESUBMIT")
    assert resubmit_event["fromStatus"] == "QUERY_RAISED"
    assert resubmit_event["toStatus"] == "SUBMITTED_FOR_REVIEW"

    approve_event = next(e for e in events if e["action"] == "APPROVE")
    assert approve_event["fromStatus"] == "SUBMITTED_FOR_REVIEW"
    assert approve_event["toStatus"] == "APPROVED"

    # 8. Check GET /api/audit endpoint (Admin only)
    admin_all_audit = client.get("/api/audit", headers=admin_headers)
    assert admin_all_audit.status_code == 200
    all_events = admin_all_audit.json()["events"]
    assert any(e.get("reportId") == report_id for e in all_events)

    rev_all_audit = client.get("/api/audit", headers=rev_headers)
    assert rev_all_audit.status_code == 403


def test_reject_workflow():
    tech_token = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"}).json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    rev_token = client.post("/api/auth/login", json={"username": "reviewer", "password": "demo123"}).json()["token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    # Create & submit
    res = client.post("/api/reports", json={
        "applicationNumber": "APP-2026-003",
        "instrument": {
            "model": "Rejection-Model",
            "serialNumber": "SN-REJ1000",
            "accuracyClass": "III",
            "maxCapacity": 1000,
            "minCapacity": 10,
            "verificationIntervalE": 1,
            "actualIntervalD": 1,
            "numberOfIntervalsN": 1000,
        },
        "environment": {
            "temperatureStart": 20.0,
            "temperatureEnd": 20.0,
            "relativeHumidity": 50.0,
        },
        "manufacturer": {},
        "laboratory": {"name": "Rejection Test Lab"}
    }, headers=tech_headers)
    report_id = res.json()["reportId"]

    rep_data = client.get(f"/api/reports/{report_id}", headers=tech_headers).json()
    rep_data["tests"] = [
        {
            "testCode": "WEIGHING_PERFORMANCE",
            "testName": "Weighing Performance",
            "applicable": True,
            "status": "COMPLETED",
            "result": "PASS",
            "observations": [{"testLoad": 500, "indication": 500, "zeroError": 0}],
            "calculations": {"result": "PASS"}
        }
    ]
    client.put(f"/api/reports/{report_id}", json=rep_data, headers=tech_headers)
    sub_res = client.post(f"/api/reports/{report_id}/submit", headers=tech_headers)
    assert sub_res.status_code == 200

    # Reviewer rejects
    rej_res = client.post(f"/api/reports/{report_id}/reject", json={"comment": "Instrument damaged beyond tolerance"}, headers=rev_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # Check audit log
    audit_res = client.get(f"/api/reports/{report_id}/audit", headers=rev_headers)
    actions = [e["action"] for e in audit_res.json()["events"]]
    assert "REJECT" in actions
