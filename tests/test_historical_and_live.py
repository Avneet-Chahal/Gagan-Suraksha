import pytest
from fastapi import status
from fastapi.testclient import TestClient


def test_historical_iridium_kosmos_endpoint(client: TestClient):
    """
    Verifies GET /api/conjunctions/historical/iridium:
    - Target: Iridium 33 (NORAD 24946) vs Kosmos 2251 (NORAD 22675)
    - TCA: 2009-02-10T16:56:00Z
    - Miss distance at TCA: 0.281 km (281 m)
    - RIC coordinate frame decomposition (radial, in-track, cross-track)
    - Relative closing velocity: 11.65 km/s
    - Classical Foster Pc vs ML-calibrated Pc comparison
    - 1-sigma covariance uncertainties
    - Recommended CAM parameters (Prograde, TCA - 12h, post-burn miss > 2.0 km, fuel cost via Tsiolkovsky)
    - Multi-day CDM evolution history
    """
    resp = client.get("/api/conjunctions/historical/iridium")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["targetNoradId"] == 24946
    assert data["chaserNoradId"] == 22675
    assert data["tcaUtc"] == "2009-02-10T16:56:00Z"

    # 3D relative geometry
    assert data["missDistanceKm"] == 0.281
    assert data["radialDistanceKm"] == 0.042
    assert data["inTrackDistanceKm"] == 0.274
    assert data["crossTrackDistanceKm"] == 0.044
    assert data["relativeVelocityKmS"] == 11.65
    assert data["riskLevel"] == "CRITICAL"

    # Covariance 1-sigma uncertainties
    assert data["sigmaRadialMeters"] == 14.2
    assert data["sigmaInTrackMeters"] == 185.0
    assert data["sigmaCrossTrackMeters"] == 22.4

    # Classical vs ML risk comparison
    assert "rawCollisionProbability" in data
    assert "calibratedCollisionProbability" in data
    assert data["collisionProbability"] > 0

    # Recommended CAM parameters
    cam = data["recommendedCAM"]
    assert cam["burnDirection"] == "POSIGRADE"
    assert cam["hoursBeforeTca"] == 12.0
    assert cam["deltaVMs"] > 0
    assert cam["postManeuverMissDistanceKm"] > 2.0
    assert cam["fuelMassCostKg"] > 0
    assert cam["separationTargetSatisfied"] is True

    # CDM history
    assert "cdmHistory" in data
    assert len(data["cdmHistory"]) >= 3
    assert data["cdmHistory"][-1]["missDistanceKm"] == 0.281


def test_live_satellite_state_endpoint(client: TestClient):
    """
    Verifies GET /api/satellites/live/{norad_id}:
    - Retrieves real-time state vectors and pass prediction schedules for CARTOSAT-2F (43111)
    - Matches frontend Satellite & GroundPass contracts
    """
    resp = client.get("/api/satellites/live/43111")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["noradId"] == 43111
    assert "CARTOSAT" in data["name"]
    assert data["country"] == "India"
    assert data["status"] == "OPERATIONAL"

    # Orbital parameters
    assert 480.0 <= data["altitudeKm"] <= 550.0
    assert 7.4 <= data["velocityKmS"] <= 7.8
    assert 96.0 <= data["inclination"] <= 99.0
    assert 90.0 <= data["periodMin"] <= 100.0

    # Geodetic coordinates
    assert -90.0 <= data["latitude"] <= 90.0
    assert -180.0 <= data["longitude"] <= 180.0
    assert data["groundTrackRateKmS"] > 0

    # 3D State Vector in TEME
    sv = data["stateVector"]
    assert sv["referenceFrame"] == "TEME"
    assert "xKm" in sv and "yKm" in sv and "zKm" in sv
    assert "vxKmS" in sv and "vyKmS" in sv and "vzKmS" in sv

    # Ground pass predictions
    passes = data["passes"]
    assert len(passes) >= 2
    for p in passes:
        assert "groundStation" in p
        assert "aosUtc" in p
        assert "losUtc" in p
        assert "duration" in p
        assert "maxElevationDeg" in p
        assert p["maxElevationDeg"] > 0


def test_live_satellite_not_found(client: TestClient):
    """Verifies that an unknown satellite returns 404."""
    resp = client.get("/api/satellites/live/99999999")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_optimize_maneuver_endpoint(client: TestClient):
    """
    Verifies POST /api/maneuvers/optimize:
    - Accepts custom spacecraft mass, Isp, and lead time
    - Computes delta-V, fuel consumption via Tsiolkovsky equation, and post-burn miss distance
    - Confirms target miss distance past 2.0 km
    """
    payload = {
        "spacecraftMassKg": 556.0,
        "ispSeconds": 220.0,
        "leadTimeHours": 12.0,
        "targetMissDistanceKm": 2.0,
        "burnDirection": "POSIGRADE",
        "conjunctionId": "historical-iridium-33-kosmos-2251",
    }
    resp = client.post("/api/maneuvers/optimize", json=payload)
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()
    assert data["spacecraftMassKg"] == 556.0
    assert data["ispSeconds"] == 220.0
    assert data["leadTimeHours"] == 12.0
    assert data["targetMissDistanceKm"] == 2.0
    assert data["deltaVMs"] > 0
    assert data["burnDirection"] == "POSIGRADE"
    assert data["postBurnMissDistanceKm"] >= 2.0
    assert data["fuelMassCostKg"] > 0
    assert data["achievedTarget"] is True
    assert data["status"] == "OPTIMAL"


def test_optimize_maneuver_custom_delta_v(client: TestClient):
    """
    Verifies POST /api/maneuvers/optimize with explicitly provided delta-V.
    """
    payload = {
        "spacecraft_mass_kg": 500.0,
        "isp_seconds": 230.0,
        "lead_time_hours": 6.0,
        "target_miss_distance_km": 2.0,
        "delta_v_ms": 0.5,
        "burn_direction": "POSIGRADE",
    }
    resp = client.post("/api/maneuvers/optimize", json=payload)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["deltaVMs"] == 0.5
    assert data["postBurnMissDistanceKm"] > 2.0
    assert data["achievedTarget"] is True
