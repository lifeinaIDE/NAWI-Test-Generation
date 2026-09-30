import pytest
from app.schemas import User, Report, Instrument
from app.services.search_service import SearchService

class MockRepo:
    def __init__(self, reports):
        self._reports = reports

    def list(self):
        return self._reports

@pytest.fixture
def sample_reports():
    return [
        Report(reportId="1", status="DRAFT", createdBy="user-tech-01", finalResult="PENDING",
               instrument=Instrument(model="ModelA", accuracyClass="III", serialNumber="123"), manufacturer={"name": "MfgA"}),
        Report(reportId="2", status="APPROVED", createdBy="user-tech-01", finalResult="PASS",
               instrument=Instrument(model="ModelB", accuracyClass="II", serialNumber="456"), manufacturer={"name": "MfgB"}),
        Report(reportId="3", status="APPROVED", createdBy="user-tech-02", finalResult="FAIL",
               instrument=Instrument(model="ModelA", accuracyClass="III", serialNumber="789"), manufacturer={"name": "MfgA"}),
    ]

def test_search_by_status(sample_reports):
    service = SearchService(repo=MockRepo(sample_reports))
    admin = User(id="admin", username="admin", role="ADMIN", laboratory="")
    
    res = service.search(current_user=admin, status="APPROVED")
    assert len(res) == 2
    assert res[0].reportId in ["2", "3"]
    assert res[1].reportId in ["2", "3"]

def test_search_by_model(sample_reports):
    service = SearchService(repo=MockRepo(sample_reports))
    admin = User(id="admin", username="admin", role="ADMIN", laboratory="")
    
    res = service.search(current_user=admin, model="ModelA")
    assert len(res) == 2
    assert res[0].reportId in ["1", "3"]

def test_search_combining_filters(sample_reports):
    service = SearchService(repo=MockRepo(sample_reports))
    admin = User(id="admin", username="admin", role="ADMIN", laboratory="")
    
    res = service.search(current_user=admin, model="ModelA", status="APPROVED")
    assert len(res) == 1
    assert res[0].reportId == "3"

def test_search_viewer_visibility(sample_reports):
    service = SearchService(repo=MockRepo(sample_reports))
    viewer = User(id="viewer", username="viewer", role="VIEWER", laboratory="")
    
    # Viewer searches all, should only see APPROVED
    res = service.search(current_user=viewer)
    assert len(res) == 2
    assert "2" in [r.reportId for r in res]
    assert "3" in [r.reportId for r in res]
    
    # Viewer searches for DRAFT explicitly, should get none
    res = service.search(current_user=viewer, status="DRAFT")
    assert len(res) == 0

def test_search_technician_visibility(sample_reports):
    service = SearchService(repo=MockRepo(sample_reports))
    tech = User(id="user-tech-01", username="tech", role="TECHNICIAN", laboratory="")
    
    # Tech sees own (1, 2) + APPROVED (2, 3) -> should see 1, 2, 3
    res = service.search(current_user=tech)
    assert len(res) == 3
