from unittest.mock import MagicMock
from fastapi import status
from fastapi.testclient import TestClient

from backend.app.db.session import get_db
from backend.app.main import app


def test_health_check_healthy(client: TestClient):
    """Verifies that /api/health returns 200 OK and database connected when DB is responsive."""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "timestamp" in data
    assert "version" in data


def test_health_check_db_failure():
    """Verifies that /api/health returns 503 Service Unavailable when the database cannot be queried."""
    # Create a mock session where execute raises an operational exception
    mock_session = MagicMock()
    mock_session.execute.side_effect = Exception("Simulated SQLite connectivity failure")

    def broken_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = broken_get_db
    try:
        with TestClient(app) as test_client:
            response = test_client.get("/api/health")
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["database"] == "disconnected"
            assert "timestamp" in data
    finally:
        app.dependency_overrides.clear()


def test_root_endpoint_metadata(client: TestClient):
    """Verifies that GET / returns service information and docs link."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["docs"] == "/docs"
    assert data["health"] == "/api/health"
