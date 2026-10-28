import math
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sgp4.api import Satrec

from backend.app.models.satellite import Satellite
from backend.app.services.orbit_propagation import (
    compute_gmst_radians,
    teme_to_ecef,
    ecef_to_geodetic_wgs84,
    teme_to_geodetic,
    parse_utc_iso_datetime,
    propagate_satrec_point,
    SGP4PropagationError,
    WGS84_A_KM,
)

# Reference TLE 1: CARTOSAT-2F (NORAD 43111)
VALID_CARTOSAT_L1 = "1 43111U 18004A   26283.25833333  .00002154  00000+0  10425-3 0  9993"
VALID_CARTOSAT_L2 = "2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412854"

# Reference TLE 2: ISS (NORAD 25544)
VALID_ISS_L1 = "1 25544U 98067A   26300.17675415  .00005704  00000+0  11132-3 0  9993"
VALID_ISS_L2 = "2 25544  51.6336   6.9404 0006948 314.9066  45.1358 15.49073103592213"


@pytest.fixture
def test_satellite_cartosat(db_session: Session) -> Satellite:
    """Fixture inserting a valid Indian satellite with real TLE."""
    sat = Satellite(
        norad_id=43111,
        name="CARTOSAT-2F",
        object_type="PAYLOAD",
        type="PAYLOAD",
        country="India (ISRO)",
        owner_country="India (ISRO)",
        operator="ISRO ISTRAC",
        regime="LEO",
        is_indian=True,
        is_watchlist=True,
        tle_line1=VALID_CARTOSAT_L1,
        tle_line2=VALID_CARTOSAT_L2,
        tle_epoch="2026-10-10T06:12:00Z",
        data_source="CELESTRAK",
    )
    db_session.add(sat)
    db_session.commit()
    db_session.refresh(sat)
    return sat


@pytest.fixture
def test_satellite_iss(db_session: Session) -> Satellite:
    """Fixture inserting ISS with real TLE."""
    sat = Satellite(
        norad_id=25544,
        name="ISS (ZARYA)",
        object_type="PAYLOAD",
        type="PAYLOAD",
        country="International Space Station",
        owner_country="International Space Station",
        operator="NASA / Roscosmos",
        regime="LEO",
        is_indian=False,
        is_watchlist=True,
        tle_line1=VALID_ISS_L1,
        tle_line2=VALID_ISS_L2,
        tle_epoch="2026-10-27T04:14:31Z",
        data_source="CELESTRAK",
    )
    db_session.add(sat)
    db_session.commit()
    db_session.refresh(sat)
    return sat


def test_known_sgp4_reference_propagation():
    """
    Verifies that SGP4 propagation initializes properly and yields expected physical values.
    Position magnitude must equal Earth radius + LEO altitude (~6800 - 7000 km).
    Speed magnitude must match theoretical circular LEO speed (~7.4 - 7.8 km/s).
    """
    satrec = Satrec.twoline2rv(VALID_CARTOSAT_L1, VALID_CARTOSAT_L2)
    dt = datetime(2026, 10, 10, 12, 0, 0, tzinfo=timezone.utc)

    x, y, z, vx, vy, vz = propagate_satrec_point(satrec, dt)

    r_mag = math.sqrt(x ** 2 + y ** 2 + z ** 2)
    v_mag = math.sqrt(vx ** 2 + vy ** 2 + vz ** 2)

    assert 6800.0 <= r_mag <= 7000.0, f"Expected geocentric distance ~6880 km, got {r_mag}"
    assert 7.4 <= v_mag <= 7.8, f"Expected LEO orbital speed ~7.6 km/s, got {v_mag}"


def test_teme_to_geodetic_wgs84_conversion():
    """
    Verifies TEME -> ECEF -> Geodetic (WGS-84) transformation.
    Checks that latitude is within [-90, +90], longitude in [-180, +180],
    and altitude reflects LEO height above Earth (~400-600 km).
    """
    dt = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
    satrec = Satrec.twoline2rv(VALID_ISS_L1, VALID_ISS_L2)
    x, y, z, _, _, _ = propagate_satrec_point(satrec, dt)

    geo = teme_to_geodetic(x, y, z, dt)

    assert -90.0 <= geo.latitude_deg <= 90.0
    assert -180.0 <= geo.longitude_deg <= 180.0
    assert 380.0 <= geo.altitude_km <= 450.0  # ISS altitude
    assert geo.reference_ellipsoid == "WGS-84"


def test_get_satellite_position_default_timestamp(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies GET /api/satellites/{norad_id}/position when no timestamp is passed (uses current UTC).
    """
    resp = client.get("/api/satellites/43111/position")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["norad_id"] == 43111
    assert data["name"] == "CARTOSAT-2F"
    assert data["reference_frame"] == "TEME (True Equator, Mean Equinox)"
    assert data["status"] == "SUCCESS"
    assert data["error"] is None

    # Check PositionVector
    pos = data["position"]
    assert "x_km" in pos and "y_km" in pos and "z_km" in pos
    assert 6800.0 <= pos["r_km"] <= 7000.0
    assert 450.0 <= pos["altitude_km"] <= 650.0

    # Check VelocityVector
    vel = data["velocity"]
    assert "vx_km_s" in vel and "vy_km_s" in vel and "vz_km_s" in vel
    assert 7.4 <= vel["speed_km_s"] <= 7.8

    # Check GeodeticCoordinates
    geo = data["geodetic"]
    assert -90.0 <= geo["latitude_deg"] <= 90.0
    assert -180.0 <= geo["longitude_deg"] <= 180.0
    assert geo["reference_ellipsoid"] == "WGS-84"

    # Check SourceRecordInfo
    src = data["source_record"]
    assert src["norad_id"] == 43111
    assert src["data_source"] == "CELESTRAK"
    assert "epoch" in src
    assert "age_days" in src


def test_get_satellite_position_explicit_timestamp(client: TestClient, test_satellite_iss: Satellite):
    """
    Verifies GET /api/satellites/{norad_id}/position with an explicit ISO 8601 UTC timestamp.
    """
    target_time = "2026-10-27T12:00:00Z"
    resp = client.get(f"/api/satellites/25544/position?timestamp={target_time}")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["norad_id"] == 25544
    assert data["timestamp"] == target_time
    assert data["status"] == "SUCCESS"
    assert 390.0 <= data["position"]["altitude_km"] <= 440.0


def test_get_satellite_position_invalid_timestamp_format(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies that malformed timestamp strings return HTTP 422.
    """
    resp = client.get("/api/satellites/43111/position?timestamp=not-a-valid-date")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Invalid ISO 8601 UTC timestamp" in resp.json()["detail"]


def test_get_satellite_position_not_found(client: TestClient):
    """
    Verifies that querying a non-existent NORAD ID returns HTTP 404.
    """
    resp = client.get("/api/satellites/999999/position")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert "999999 not found" in resp.json()["detail"]


def test_get_satellite_position_missing_tle(client: TestClient, db_session: Session):
    """
    Verifies that querying a satellite without TLE records returns HTTP 422 with a helpful message.
    """
    sat = Satellite(norad_id=77777, name="NO-TLE-SAT")
    db_session.add(sat)
    db_session.commit()

    resp = client.get("/api/satellites/77777/position")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "does not have stored TLE records" in resp.json()["detail"]


def test_orbit_track_success(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies GET /api/satellites/{norad_id}/orbit/track generates a valid time-series sequence.
    """
    start_iso = "2026-10-27T12:00:00Z"
    end_iso = "2026-10-27T12:30:00Z"  # 30 minutes
    step = 60  # 1-minute steps -> 31 points inclusive

    resp = client.get(
        f"/api/satellites/43111/orbit/track?start={start_iso}&end={end_iso}&step={step}"
    )
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["norad_id"] == 43111
    assert data["name"] == "CARTOSAT-2F"
    assert data["reference_frame"] == "TEME (True Equator, Mean Equinox)"
    assert data["step_seconds"] == 60
    assert data["total_points"] == 31
    assert len(data["points"]) == 31

    # Verify first and last point timestamps
    assert data["points"][0]["timestamp"] == start_iso
    assert data["points"][-1]["timestamp"] == end_iso

    # Verify point spacing and physical properties
    for i, pt in enumerate(data["points"]):
        assert pt["status"] == "SUCCESS"
        assert -90.0 <= pt["latitude_deg"] <= 90.0
        assert -180.0 <= pt["longitude_deg"] <= 180.0
        assert 450.0 <= pt["altitude_km"] <= 650.0
        assert 7.4 <= pt["speed_km_s"] <= 7.8
        if i > 0:
            assert pt["time_ms"] - data["points"][i - 1]["time_ms"] == 60000


def test_orbit_track_end_before_start_rejected(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies that end timestamp before or equal to start returns HTTP 422.
    """
    start_iso = "2026-10-27T14:00:00Z"
    end_iso = "2026-10-27T12:00:00Z"

    resp = client.get(
        f"/api/satellites/43111/orbit/track?start={start_iso}&end={end_iso}&step=60"
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "strictly after start timestamp" in resp.json()["detail"]


def test_orbit_track_duration_exceeds_max_rejected(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies that time window exceeding 7 days returns HTTP 422.
    """
    start_iso = "2026-10-01T00:00:00Z"
    end_iso = "2026-10-15T00:00:00Z"  # 14 days

    resp = client.get(
        f"/api/satellites/43111/orbit/track?start={start_iso}&end={end_iso}&step=120"
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "exceeds maximum limit of 7 days" in resp.json()["detail"]


def test_orbit_track_too_many_points_rejected(client: TestClient, test_satellite_cartosat: Satellite):
    """
    Verifies that requesting excessive points (> 5,000) returns HTTP 422.
    e.g., 6 days window with 1-second step = 518,401 points.
    """
    start_iso = "2026-10-20T00:00:00Z"
    end_iso = "2026-10-26T00:00:00Z"

    resp = client.get(
        f"/api/satellites/43111/orbit/track?start={start_iso}&end={end_iso}&step=1"
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "exceeds the maximum limit of 5,000 points" in resp.json()["detail"]


def test_stale_tle_extrapolation_warning(client: TestClient, db_session: Session):
    """
    Verifies that propagating a satellite with an old TLE relative to requested timestamp
    reports age_days, is_extrapolated=True, and generates an accuracy warning.
    """
    old_tle_sat = Satellite(
        norad_id=33333,
        name="STALE-LEO-SAT",
        tle_line1=VALID_CARTOSAT_L1,
        tle_line2=VALID_CARTOSAT_L2,
        tle_epoch="2026-08-01T00:00:00Z",  # ~3 months before requested date
        data_source="CELESTRAK",
    )
    db_session.add(old_tle_sat)
    db_session.commit()

    target_time = "2026-10-27T12:00:00Z"
    resp = client.get(f"/api/satellites/33333/position?timestamp={target_time}")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    src = data["source_record"]
    assert src["is_extrapolated"] is True
    assert src["age_days"] > 80.0
    assert src["warning"] is not None
    assert "ORBITAL DATA STALE" in src["warning"]
