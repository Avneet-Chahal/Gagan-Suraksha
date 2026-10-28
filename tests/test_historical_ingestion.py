import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models.db_models import ConjunctionModel, SatelliteModel
from backend.services.historical_ingestion import import_historical_conjunctions, is_indian_spacecraft

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_indian_spacecraft_identifier():
    """Verifies that known ISRO NORAD IDs and names are recognized."""
    assert is_indian_spacecraft(43111, "CARTOSAT-2F") is True
    assert is_indian_spacecraft(44857, "RISAT-2BR1") is True
    assert is_indian_spacecraft(99999, "EOS-04") is True
    assert is_indian_spacecraft(12176, "DELTA 1 DEB") is False


def test_conjunction_endpoints_historical_scope(client: TestClient):
    """Verifies that /api/conjunctions and /api/conjunctions/historical return historical data."""
    # Historical endpoint
    res_hist = client.get("/api/conjunctions/historical?limit=10")
    assert res_hist.status_code == 200
    hist_data = res_hist.json()
    assert isinstance(hist_data, list)
    if len(hist_data) > 0:
        first = hist_data[0]
        assert "id" in first
        assert "missDistanceKm" in first
        assert "riskLevel" in first
        assert first.get("isHistorical") is True or first.get("is_historical") is True

    # Operational scope
    res_op = client.get("/api/conjunctions?scope=operational&limit=10")
    assert res_op.status_code == 200
    op_data = res_op.json()
    assert isinstance(op_data, list)
    for c in op_data:
        assert c.get("isHistorical") is False or c.get("is_historical") is False


def test_historical_persistence_in_database():
    """Verifies that historical conjunctions are flagged with is_historical=True in SQLite."""
    db = SessionLocal()
    try:
        hist_count = db.query(ConjunctionModel).filter(ConjunctionModel.is_historical == True).count()
        assert hist_count >= 100
        first_hist = db.query(ConjunctionModel).filter(ConjunctionModel.is_historical == True).first()
        assert first_hist is not None
        assert first_hist.data_source == "HISTORICAL_ARCHIVE"
        assert first_hist.miss_distance_km > 0
    finally:
        db.close()
