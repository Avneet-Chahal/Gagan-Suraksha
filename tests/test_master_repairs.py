import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models.db_models import SatelliteModel, SentAlert

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_ready_endpoint(client: TestClient):
    """Verifies that /api/ready returns service readiness and dependency status."""
    res = client.get("/api/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["READY", "NOT_READY"]
    assert data["database"] == "CONNECTED"
    assert "spaceWeatherCache" in data


def test_conjunctions_endpoint(client: TestClient):
    """Verifies /api/conjunctions returns list with required schema."""
    res = client.get("/api/conjunctions")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        conj = data[0]
        assert "id" in conj
        assert "primarySat" in conj or "primarySatId" in conj or "primary_sat_id" in conj


def test_maneuvers_endpoint(client: TestClient):
    """Verifies /api/maneuvers returns CAM plans."""
    res = client.get("/api/maneuvers")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_space_weather_endpoint(client: TestClient):
    """Verifies /api/space-weather returns real solar and geomagnetic indices."""
    res = client.get("/api/space-weather")
    assert res.status_code == 200
    data = res.json()
    assert "solarFluxF107" in data
    assert "kpIndex" in data
    assert "provenance" in data


def test_alerts_endpoint_and_ack(client: TestClient):
    """Verifies /api/alerts returns alerts and ack endpoint functions."""
    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        alert_id = data[0]["id"]
        ack_res = client.post(f"/api/alerts/{alert_id}/ack")
        assert ack_res.status_code == 200
        assert ack_res.json()["status"] == "SUCCESS"


def test_ground_passes_endpoint(client: TestClient):
    """Verifies /api/passes/{norad_id} computes ground passes for valid satellite."""
    res = client.get("/api/passes/43111")
    assert res.status_code == 200
    passes = res.json()
    assert isinstance(passes, list)
    if len(passes) > 0:
        first_pass = passes[0]
        assert "groundStation" in first_pass
        assert "aosUtc" in first_pass
        assert "losUtc" in first_pass


def test_historical_events_endpoint(client: TestClient):
    """Verifies /api/events queries date ranges with category filtering and coverage metadata."""
    # Query January 2025
    res = client.get("/api/events?start_date=2025-01-01&end_date=2025-01-31")
    assert res.status_code == 200
    data = res.json()
    assert data["startDate"] == "2025-01-01"
    assert data["endDate"] == "2025-01-31"
    assert "coverageStatus" in data
    assert "events" in data
    assert "totalCount" in data
    assert isinstance(data["events"], list)

    # Test category filter
    res_launches = client.get("/api/events?start_date=2025-01-01&end_date=2025-01-31&category=launches")
    assert res_launches.status_code == 200
    assert res_launches.json()["category"] == "launches"


def test_historical_incidents_library(client: TestClient):
    """Verifies /api/incidents returns library containing Iridium collision and verified/awaiting Starlink incidents."""
    res = client.get("/api/incidents")
    assert res.status_code == 200
    incidents = res.json()
    assert isinstance(incidents, list)
    assert len(incidents) >= 3

    # Check Incident A: Iridium 33 x Cosmos 2251
    iridium = next((inc for inc in incidents if inc["id"] == "iridium-33-cosmos-2251"), None)
    assert iridium is not None
    assert iridium["date"] == "2009-02-10"
    assert "16:56" in iridium["timeUtc"]
    assert iridium["verificationStatus"] == "VERIFIED_HISTORICAL_FACT"
    assert "Iridium 33" in iridium["primarySat"]["name"]
    assert len(iridium["sourceLinks"]) > 0

    # Detail view
    res_det = client.get("/api/incidents/iridium-33-cosmos-2251")
    assert res_det.status_code == 200
    assert res_det.json()["id"] == "iridium-33-cosmos-2251"

    # Check Incidents B and C
    starlink_incidents = [inc for inc in incidents if "starlink" in inc["id"]]
    assert len(starlink_incidents) == 2
    for s_inc in starlink_incidents:
        assert s_inc["verificationStatus"] in ["VERIFIED_HISTORICAL_FACT", "AWAITING_INCIDENT_VERIFICATION"]


def test_spacetrack_adapter_status_and_auth_guard(client: TestClient):
    """Verifies Space-Track adapter status truthfully reports credentials availability."""
    res = client.get("/api/sources/spacetrack/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "configured" in data
    # If not configured, query must report credentials required
    if not data["configured"]:
        res_query = client.post("/api/sources/spacetrack/query?norad_id=43111&start_date=2025-01-01&end_date=2025-01-10")
        assert res_query.status_code == 200
        result = res_query.json()
        assert result["status"] == "CREDENTIALS_REQUIRED"
