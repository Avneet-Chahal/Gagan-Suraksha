import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.satellite import Satellite
from backend.app.services.celestrak_service import (
    compute_tle_checksum,
    validate_tle_record,
    derive_orbital_parameters,
    refresh_single_satellite,
)


def test_health_endpoint_still_works(client: TestClient):
    """
    Check 1: GET /api/health still works and reports healthy + database connected.
    """
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "timestamp" in data
    assert "version" in data


def test_data_status_reports_actual_empty_database(client: TestClient):
    """
    Check 2a: GET /api/data/status reports actual status on empty test database.
    """
    response = client.get("/api/data/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["total_satellites"] == 0
    assert data["satellites_with_orbital_data"] == 0
    assert data["celestrak_records_count"] == 0
    assert data["synthetic_records_count"] == 0
    assert "timestamp" in data


def test_data_status_reports_actual_populated_database(client: TestClient, db_session: Session):
    """
    Check 2b: GET /api/data/status accurately counts satellites, orbital data, and data sources.
    """
    # Insert 2 synthetic satellites and 1 CelesTrak satellite
    sat1 = Satellite(
        norad_id=90001,
        name="SYNTH-SAT-1",
        object_type="PAYLOAD",
        country="India",
        is_indian=True,
        data_source="SYNTHETIC",
        altitude_km=550.0,
    )
    sat2 = Satellite(
        norad_id=90002,
        name="SYNTH-DEBRIS-2",
        object_type="DEBRIS",
        country="USA",
        is_indian=False,
        data_source="SYNTHETIC",
    )
    sat3 = Satellite(
        norad_id=90003,
        name="CELESTRAK-SAT-3",
        object_type="PAYLOAD",
        country="India",
        is_indian=True,
        data_source="CELESTRAK",
        altitude_km=700.0,
        tle_line1="1 90003U ...",
        tle_line2="2 90003U ...",
    )
    db_session.add_all([sat1, sat2, sat3])
    db_session.commit()

    response = client.get("/api/data/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total_satellites"] == 3
    assert data["satellites_with_orbital_data"] == 2  # sat1 and sat3 have altitude/tle
    assert data["celestrak_records_count"] == 1
    assert data["synthetic_records_count"] == 2
    assert data["indian_satellites_count"] == 2
    assert data["debris_count"] == 1
    assert data["last_refresh_utc"] is not None


def test_refresh_single_satellite_stores_real_orbital_record(client: TestClient, db_session: Session):
    """
    Check 3: Refreshing one satellite stores a real orbital record that you can retrieve through the API.
    Refreshes ISS (NORAD ID 25544) and verifies that orbital elements derived via SGP4 are persisted and retrievable.
    """
    # 1. Trigger satellite refresh via POST /api/satellites/25544/refresh
    refresh_resp = client.post("/api/satellites/25544/refresh")
    assert refresh_resp.status_code == status.HTTP_200_OK
    refresh_data = refresh_resp.json()

    # Verify refreshed fields in the POST response
    assert refresh_data["norad_id"] == 25544
    assert "ISS" in refresh_data["name"]
    assert refresh_data["data_source"] == "CELESTRAK"
    assert refresh_data["altitude_km"] is not None
    assert 350.0 <= refresh_data["altitude_km"] <= 500.0  # Physical ISS LEO orbit
    assert refresh_data["inclination_deg"] is not None
    assert 50.0 <= refresh_data["inclination_deg"] <= 53.0  # ISS inclination ~51.64 deg
    assert refresh_data["velocity_km_s"] is not None
    assert 7.0 <= refresh_data["velocity_km_s"] <= 8.0     # Typical LEO velocity ~7.66 km/s
    assert refresh_data["period_min"] is not None
    assert 90.0 <= refresh_data["period_min"] <= 95.0     # ISS period ~92.8 min
    assert refresh_data["tle_line1"] is not None and len(refresh_data["tle_line1"]) == 69
    assert refresh_data["tle_line2"] is not None and len(refresh_data["tle_line2"]) == 69

    # 2. Retrieve through GET /api/satellites/25544
    get_resp = client.get("/api/satellites/25544")
    assert get_resp.status_code == status.HTTP_200_OK
    retrieved_sat = get_resp.json()

    assert retrieved_sat["norad_id"] == 25544
    assert retrieved_sat["name"] == refresh_data["name"]
    assert retrieved_sat["data_source"] == "CELESTRAK"
    assert retrieved_sat["altitude_km"] == refresh_data["altitude_km"]
    assert retrieved_sat["apogee_km"] == refresh_data["apogee_km"]
    assert retrieved_sat["perigee_km"] == refresh_data["perigee_km"]
    assert retrieved_sat["inclination_deg"] == refresh_data["inclination_deg"]
    assert retrieved_sat["period_min"] == refresh_data["period_min"]
    assert retrieved_sat["velocity_km_s"] == refresh_data["velocity_km_s"]
    assert retrieved_sat["tle_epoch"] == refresh_data["tle_epoch"]
    assert retrieved_sat["tle_line1"] == refresh_data["tle_line1"]
    assert retrieved_sat["tle_line2"] == refresh_data["tle_line2"]

    # 3. Verify GET /api/data/status now reflects the stored real record
    status_resp = client.get("/api/data/status")
    assert status_resp.status_code == status.HTTP_200_OK
    status_data = status_resp.json()
    assert status_data["total_satellites"] == 1
    assert status_data["celestrak_records_count"] == 1
    assert status_data["satellites_with_orbital_data"] == 1


def test_data_refresh_endpoint_alternative_route(client: TestClient):
    """
    Check 3b: Verifies POST /api/data/refresh/43111 (CARTOSAT-2F) also performs real refresh.
    """
    refresh_resp = client.post("/api/data/refresh/43111")
    assert refresh_resp.status_code == status.HTTP_200_OK
    data = refresh_resp.json()
    assert data["norad_id"] == 43111
    assert "CARTOSAT" in data["name"]
    assert data["data_source"] == "CELESTRAK"
    assert data["altitude_km"] is not None
    assert 450.0 <= data["altitude_km"] <= 650.0
    assert data["inclination_deg"] is not None
    assert 96.0 <= data["inclination_deg"] <= 99.0  # Sun-synchronous orbit ~97.5 deg

    # Retrieve through GET /api/satellites/43111
    get_resp = client.get("/api/satellites/43111")
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json()["norad_id"] == 43111
    assert get_resp.json()["data_source"] == "CELESTRAK"
