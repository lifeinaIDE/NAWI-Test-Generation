from fastapi.testclient import TestClient
from app.main import app
from app.core.disclaimers import D1, D2, D3, D4, DISCLAIMERS
from app.core.config import settings

client = TestClient(app)

def test_health_endpoints():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "service" in data

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "running"

def test_disclaimers_constants():
    assert "Preliminary automated evaluation" in D1
    assert "Planned — Not implemented" in D2
    assert "Requires domain validation" in D3
    assert "Prototype integrity hash" in D4
    assert len(DISCLAIMERS) == 4

def test_config_settings():
    assert settings.STORAGE_PATH is not None
    assert "http://localhost:5173" in settings.CORS_ORIGINS or "http://127.0.0.1:5173" in settings.CORS_ORIGINS

def test_users_router_role_gating():
    # Anonymous request
    res = client.get("/api/users")
    assert res.status_code in (401, 403)

    # Login as tech -> 403
    tech_login = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    tech_token = tech_login.json()["token"]
    res = client.get("/api/users", headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 403

    # Login as admin -> 200
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "demo123"})
    admin_token = admin_login.json()["token"]
    res = client.get("/api/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4

def test_validate_and_verify_endpoints():
    tech_login = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    tech_token = tech_login.json()["token"]
    headers = {"Authorization": f"Bearer {tech_token}"}

    # Validate endpoint
    res = client.post("/api/reports/NAWI-2026-0001/validate", headers=headers)
    assert res.status_code == 200
    assert "valid" in res.json()
    assert "messages" in res.json()

    # Verify endpoint
    res = client.get("/api/reports/NAWI-2026-0001/verify", headers=headers)
    assert res.status_code == 200
    assert res.json()["reportId"] == "NAWI-2026-0001"
    assert "verified" in res.json()
