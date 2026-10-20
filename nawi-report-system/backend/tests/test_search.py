import os
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import User, Report, Instrument, Manufacturer
from app.services.search_service import SearchService
from app.repositories.report_repository import JsonReportRepository

client = TestClient(app)


class MockRepo:
    def __init__(self, reports):
        self._reports = reports

    def list(self):
        return self._reports


@pytest.fixture
def rich_sample_reports():
    return [
        Report(
            reportId="NAWI-2026-0001",
            status="DRAFT",
            createdBy="user-tech-01",
            createdAt="2026-01-10T10:00:00Z",
            finalResult="PENDING",
            instrument=Instrument(model="XP-Compact", accuracyClass="III", serialNumber="SN-001"),
            manufacturer=Manufacturer(name="Precision Scales Ltd"),
        ),
        Report(
            reportId="NAWI-2026-0002",
            status="APPROVED",
            createdBy="user-tech-01",
            createdAt="2026-03-15T12:00:00Z",
            finalResult="PASS",
            instrument=Instrument(model="XP-Industrial", accuracyClass="II", serialNumber="SN-002"),
            manufacturer=Manufacturer(name="Mettler Systems"),
        ),
        Report(
            reportId="NAWI-2026-0003",
            status="APPROVED",
            createdBy="user-tech-02",
            createdAt="2026-06-20T14:00:00Z",
            finalResult="FAIL",
            instrument=Instrument(model="XP-Compact", accuracyClass="III", serialNumber="SN-003"),
            manufacturer=Manufacturer(name="Precision Scales Ltd"),
        ),
        Report(
            reportId="NAWI-2026-0004",
            status="IN_PROGRESS",
            createdBy="user-tech-02",
            createdAt="2026-07-01T09:00:00Z",
            finalResult="PENDING",
            instrument=Instrument(model="Delta-500", accuracyClass="IIII", serialNumber="SN-004"),
            manufacturer=Manufacturer(name="Delta Metrology"),
        ),
        Report(
            reportId="NAWI-2026-0005",
            status="SUBMITTED_FOR_REVIEW",
            createdBy="user-tech-02",
            createdAt="2026-08-10T11:00:00Z",
            finalResult="PENDING",
            instrument=Instrument(model="XP-Ultra", accuracyClass="I", serialNumber="SN-005"),
            manufacturer=Manufacturer(name="Precision Scales Ltd"),
        ),
    ]


def test_each_of_the_8_filters(rich_sample_reports):
    """
    Test that each of the 8 filters returns only matching reports:
    1 status, 2 model, 3 manufacturer, 4 serialNumber, 5 dateFrom, 6 dateTo, 7 accuracyClass, 8 finalResult, plus q.
    """
    service = SearchService(repo=MockRepo(rich_sample_reports))
    admin = User(id="admin", username="admin", role="ADMIN")

    # 1. status
    res = service.search(current_user=admin, status="APPROVED")
    assert len(res) == 2
    assert all(r.status == "APPROVED" for r in res)

    # 2. model (case-insensitive substring)
    res = service.search(current_user=admin, model="compact")
    assert len(res) == 2
    assert all("compact" in r.instrument.model.lower() for r in res)

    # 3. manufacturer (case-insensitive substring)
    res = service.search(current_user=admin, manufacturer="mettler")
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0002"

    # 4. serialNumber
    res = service.search(current_user=admin, serialNumber="SN-003")
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0003"

    # 5. dateFrom
    res = service.search(current_user=admin, dateFrom="2026-06-01")
    assert len(res) == 3
    assert all(r.createdAt >= "2026-06-01" for r in res)

    # 6. dateTo
    res = service.search(current_user=admin, dateTo="2026-03-31")
    assert len(res) == 2
    assert all(r.createdAt <= "2026-03-31T23:59:59.999999Z" for r in res)

    # 7. accuracyClass
    res = service.search(current_user=admin, accuracyClass="II")
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0002"

    # 8. finalResult
    res = service.search(current_user=admin, finalResult="FAIL")
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0003"

    # 9. Free-text q
    res = service.search(current_user=admin, q="Delta")
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0004"


def test_combined_filters_return_intersection(rich_sample_reports):
    """
    Combined filters return the intersection of all matching criteria.
    """
    service = SearchService(repo=MockRepo(rich_sample_reports))
    admin = User(id="admin", username="admin", role="ADMIN")

    # model="compact", accuracyClass="III", status="APPROVED" -> only NAWI-2026-0003
    res = service.search(
        current_user=admin,
        model="compact",
        accuracyClass="III",
        status="APPROVED",
    )
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0003"

    # Same model + class + status="DRAFT" -> only NAWI-2026-0001
    res = service.search(
        current_user=admin,
        model="compact",
        accuracyClass="III",
        status="DRAFT",
    )
    assert len(res) == 1
    assert res[0].reportId == "NAWI-2026-0001"

    # Intersection with no match
    res = service.search(
        current_user=admin,
        model="compact",
        accuracyClass="II",
    )
    assert len(res) == 0


def test_viewer_visibility_enforced_inside_service(rich_sample_reports):
    """
    VIEWER passing status=DRAFT still receives only APPROVED (role visibility cannot be bypassed).
    """
    service = SearchService(repo=MockRepo(rich_sample_reports))
    viewer = User(id="viewer", username="viewer", role="VIEWER")

    # Viewer without filter sees all APPROVED reports only
    res = service.search(current_user=viewer)
    assert len(res) == 2
    assert all(r.status == "APPROVED" for r in res)
    assert set(r.reportId for r in res) == {"NAWI-2026-0002", "NAWI-2026-0003"}

    # Viewer explicitly requesting DRAFT receives 0 reports (and any returned report is APPROVED)
    res_draft = service.search(current_user=viewer, status="DRAFT")
    assert len(res_draft) == 0
    assert all(r.status == "APPROVED" for r in res_draft)

    # Viewer explicitly requesting IN_PROGRESS receives 0 reports
    res_inprog = service.search(current_user=viewer, status="IN_PROGRESS")
    assert len(res_inprog) == 0


def test_technician_visibility_enforced_inside_service(rich_sample_reports):
    """
    TECHNICIAN cannot see another technician's non-approved reports.
    TECHNICIAN sees own (any status) + APPROVED reports.
    """
    service = SearchService(repo=MockRepo(rich_sample_reports))
    tech1 = User(id="user-tech-01", username="tech1", role="TECHNICIAN")

    res = service.search(current_user=tech1)
    report_ids = [r.reportId for r in res]

    # Tech1 sees own draft (0001) + own approved (0002) + tech2 approved (0003)
    assert "NAWI-2026-0001" in report_ids
    assert "NAWI-2026-0002" in report_ids
    assert "NAWI-2026-0003" in report_ids

    # Tech1 CANNOT see Tech2's IN_PROGRESS (0004) or SUBMITTED (0005)
    assert "NAWI-2026-0004" not in report_ids
    assert "NAWI-2026-0005" not in report_ids

    # Tech1 querying status="IN_PROGRESS" should see 0 (since 0004 belongs to tech2)
    res_inprog = service.search(current_user=tech1, status="IN_PROGRESS")
    assert len(res_inprog) == 0


def test_pagination_and_sorting_api():
    """
    Tests GET /api/reports returns { items, page, pageSize, total } with sorting and pagination.
    """
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"})
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query with page=1, pageSize=2
    res = client.get("/api/reports?page=1&pageSize=2", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "pageSize" in data
    assert data["page"] == 1
    assert data["pageSize"] == 2
    assert len(data["items"]) <= 2
    assert data["total"] >= len(data["items"])

    # Sorting
    res_asc = client.get("/api/reports?sortBy=reportId&sortOrder=asc&page=1&pageSize=10", headers=headers)
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    if len(items_asc) >= 2:
        assert items_asc[0]["reportId"] <= items_asc[1]["reportId"]


def test_index_file_maintenance(tmp_path):
    """
    Verifies that storage/reports/_index.json is created and maintained on report writes.
    """
    repo = JsonReportRepository(storage_dir=str(tmp_path))
    assert not os.path.exists(repo._index_path)

    # 1. Create report -> index is created
    rep1 = Report(
        reportId="NAWI-2026-9001",
        status="DRAFT",
        createdBy="tech1",
        instrument=Instrument(model="IndexTestModel"),
        manufacturer=Manufacturer(name="IndexMfg"),
    )
    repo.create(rep1)
    assert os.path.exists(repo._index_path)

    with open(repo._index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)
    assert "NAWI-2026-9001" in idx
    assert idx["NAWI-2026-9001"]["instrument"]["model"] == "IndexTestModel"

    # 2. Update report -> index updated
    rep1.status = "APPROVED"
    repo.update(rep1)
    with open(repo._index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)
    assert idx["NAWI-2026-9001"]["status"] == "APPROVED"

    # 3. repo.list() reads from index
    listed = repo.list()
    assert len(listed) == 1
    assert listed[0].reportId == "NAWI-2026-9001"

    # 4. Delete report -> index entry removed
    repo.delete("NAWI-2026-9001")
    with open(repo._index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)
    assert "NAWI-2026-9001" not in idx
    assert len(repo.list()) == 0
