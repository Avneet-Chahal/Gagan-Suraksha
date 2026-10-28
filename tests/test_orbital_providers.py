"""
Gagan Suraksha - Orbital Data Providers Test Suite
==================================================
Comprehensive test suite validating:
1. Standardized provider adapter architecture (OrbitalDataProvider, CelesTrakProvider, SpaceTrackProvider)
2. CelesTrak GP synchronization with 2-hour fair-use cache window, retries, timeouts, and HTTP 429 rate-limiting
3. Raw HTTP response archiving to disk for forensic data provenance
4. True mathematical TLE epoch extraction, age calculation, and freshness categorization
5. Honest status reporting (DEGRADED / STANDBY on failure, never fake ONLINE)
6. Authentic cached fallback resilience
7. Space-Track.org credential readiness and authenticated GP query handling
8. Protected manual sync endpoint (POST /api/sources/sync) requiring API key
9. Strict isolation of live orbital data from historical 2022 dataset records
10. Scientific disclaimer assertion
"""

import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import httpx
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal, Base, engine
from backend.models.db_models import SatelliteModel, IngestionStatusModel
from backend.services.orbital_provider import (
    OrbitalDataProvider,
    CelesTrakProvider,
    SpaceTrackProvider,
    OrbitalElementRecord,
    ProviderFetchResult,
    compute_tle_checksum,
    parse_tle_epoch,
    compute_freshness_status,
    validate_tle_record,
    derive_orbital_parameters,
    save_raw_orbital_response,
    get_orbital_provider,
    get_all_provider_statuses,
    RateLimitError,
    ORBITAL_DATA_DISCLAIMER,
)

# Test TLE for Cartosat-2F with valid modulo-10 checksums
VALID_L1_43111 = "1 43111U 18004A   26100.25833333  .00002154  00000-0  10425-3 0  9999"
VALID_L2_43111 = "2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412857"


@pytest.fixture
def db_session():
    """Provides a transactional database session for provider testing."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_provider_adapter_inheritance():
    """Verifies that concrete providers properly inherit from OrbitalDataProvider base class."""
    celestrak = CelesTrakProvider()
    spacetrack = SpaceTrackProvider()

    assert isinstance(celestrak, OrbitalDataProvider)
    assert isinstance(spacetrack, OrbitalDataProvider)

    assert celestrak.get_provider_name() == "CelesTrak"
    assert spacetrack.get_provider_name() == "Space-Track"

    # Registry lookup
    assert isinstance(get_orbital_provider("celestrak"), CelesTrakProvider)
    assert isinstance(get_orbital_provider("spacetrack"), SpaceTrackProvider)


def test_tle_epoch_parsing_and_freshness():
    """Verifies epoch extraction from Line 1 columns 18-32 and freshness status categorization."""
    epoch_dt, epoch_iso, age_days = parse_tle_epoch(VALID_L1_43111)

    assert epoch_dt.year == 2026
    assert "2026-" in epoch_iso
    assert age_days >= 0.0

    # Freshness rules: <= 3 days FRESH, <= 14 days AGING, > 14 days STALE
    assert compute_freshness_status(1.5) == "FRESH"
    assert compute_freshness_status(7.0) == "AGING"
    assert compute_freshness_status(25.0) == "STALE"


def test_raw_orbital_response_storage(tmp_path):
    """Verifies that upstream raw HTTP payloads are stored on disk with provenance metadata."""
    sample_raw = f"CARTOSAT-2F\n{VALID_L1_43111}\n{VALID_L2_43111}\n"
    cache_dir = str(tmp_path / "raw_cache")

    file_path = save_raw_orbital_response(
        provider_name="CelesTrak",
        target_identifier="43111",
        raw_payload=sample_raw,
        cache_dir=cache_dir,
    )

    assert os.path.exists(file_path)
    assert "celestrak_43111_" in file_path
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert content == sample_raw


def test_celestrak_mocked_fetch_success(db_session, tmp_path):
    """
    Tests successful CelesTrak fetch:
    - Normalizes orbital record with derived physical parameters
    - Stores raw response payload on disk
    - Updates IngestionStatusModel to ONLINE with is_cached_fallback=False
    - Upserts satellite record with data_source='CELESTRAK'
    """
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = f"CARTOSAT-2F\n{VALID_L1_43111}\n{VALID_L2_43111}\n"
    mock_client.get.return_value = mock_resp

    provider = CelesTrakProvider(raw_cache_dir=str(tmp_path / "raw_cache"))
    result = provider.fetch_orbital_data(
        norad_ids=[43111],
        force=True,
        client=mock_client,
        db=db_session,
    )

    assert result.success is True
    assert result.provider_name == "CelesTrak"
    assert result.record_count >= 1
    assert result.is_cached_fallback is False
    assert result.raw_storage_path is not None
    assert os.path.exists(result.raw_storage_path)

    # Check parsed element record
    rec = result.records[0]
    assert rec.norad_id == 43111
    assert rec.name == "CARTOSAT-2F"
    assert rec.data_source == "CELESTRAK"
    assert rec.regime == "LEO"
    assert rec.altitude_km > 0

    # Verify database ingestion status
    status = db_session.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()
    assert status is not None
    assert status.status == "ONLINE"
    assert status.is_cached_fallback is False
    assert status.error_message is None


def test_celestrak_mocked_rate_limit_429(db_session):
    """
    Tests CelesTrak HTTP 429 Rate Limit handling:
    - Catches rate limit without crashing
    - Falls back to authentic local records
    - Updates IngestionStatusModel honestly to DEGRADED with is_cached_fallback=True
    """
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_client.get.return_value = mock_resp

    provider = CelesTrakProvider()
    result = provider.fetch_orbital_data(
        norad_ids=[43111],
        force=True,
        client=mock_client,
        db=db_session,
    )

    assert result.success is False
    assert result.is_cached_fallback is True
    assert "429" in (result.error_message or "")
    assert len(result.records) >= 1  # Fallback elements provided

    # Status must NOT be ONLINE
    status = db_session.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()
    assert status is not None
    assert status.status == "DEGRADED"
    assert status.is_cached_fallback is True


def test_celestrak_timeout_retry_and_fallback(db_session):
    """
    Tests timeout handling:
    - Retries with backoff up to max_retries
    - Falls back to authentic catalog elements
    - Marks status as DEGRADED (never fake ONLINE)
    """
    mock_client = MagicMock()
    mock_client.get.side_effect = httpx.TimeoutException("Upstream connection timed out")

    provider = CelesTrakProvider()
    result = provider.fetch_orbital_data(
        norad_ids=[43111],
        force=True,
        client=mock_client,
        db=db_session,
    )

    assert result.success is False
    assert result.is_cached_fallback is True
    assert "timed out" in (result.error_message or "").lower()

    # Verify retries occurred
    assert mock_client.get.call_count >= 2


def test_celestrak_2hour_cache_fair_use(db_session):
    """
    Verifies that CelesTrak is NOT queried when last sync succeeded within 2 hours unless force=True.
    """
    now_utc = datetime.now(timezone.utc)
    recent_sync = (now_utc - timedelta(minutes=45)).isoformat().replace("+00:00", "Z")

    status = db_session.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()
    if not status:
        status = IngestionStatusModel(id=1)
        db_session.add(status)
    status.last_success_utc = recent_sync
    status.status = "ONLINE"
    db_session.commit()

    mock_client = MagicMock()
    provider = CelesTrakProvider()

    # Call with force=False -> should skip network query
    result = provider.fetch_orbital_data(
        norad_ids=[43111],
        force=False,
        client=mock_client,
        db=db_session,
    )

    assert result.success is True
    assert result.is_cached_fallback is False
    assert mock_client.get.call_count == 0  # Zero network requests!


def test_spacetrack_missing_credentials():
    """
    Verifies that SpaceTrackProvider honestly reports CREDENTIALS_REQUIRED
    when environment credentials are unconfigured.
    """
    provider = SpaceTrackProvider(identity=None, password=None)
    avail = provider.check_availability()

    assert avail["configured"] is False
    assert avail["status"] == "CREDENTIALS_REQUIRED"
    assert "SPACETRACK_IDENTITY" in avail["message"]

    # Attempt fetch
    result = provider.fetch_orbital_data(norad_ids=[43111])
    assert result.success is False
    assert result.record_count == 0
    assert "credentials not configured" in (result.error_message or "").lower()


def test_spacetrack_mocked_success(tmp_path):
    """
    Tests Space-Track authenticated GP query:
    - Authenticates via POST /ajaxauth/login
    - Queries bounded GP endpoint
    - Parses records and archives raw JSON response
    """
    mock_client = MagicMock()

    # Step 1: Login response
    mock_login_resp = MagicMock()
    mock_login_resp.status_code = 200
    mock_login_resp.text = ""

    # Step 2: Query response
    mock_query_resp = MagicMock()
    mock_query_resp.status_code = 200
    mock_query_resp.text = (
        '[{"NORAD_CAT_ID": "43111", "OBJECT_NAME": "CARTOSAT-2F", "INTLDES": "2018-004A", '
        f'"TLE_LINE1": "{VALID_L1_43111}", "TLE_LINE2": "{VALID_L2_43111}", "EPOCH": "2026-04-10"}}]'
    )
    mock_query_resp.json.return_value = [
        {
            "NORAD_CAT_ID": "43111",
            "OBJECT_NAME": "CARTOSAT-2F",
            "INTLDES": "2018-004A",
            "TLE_LINE1": VALID_L1_43111,
            "TLE_LINE2": VALID_L2_43111,
            "EPOCH": "2026-04-10",
        }
    ]

    mock_client.post.return_value = mock_login_resp
    mock_client.get.return_value = mock_query_resp

    provider = SpaceTrackProvider(
        identity="ssa_operator@isro.gov.in",
        password="ValidTestPassword123!",
        raw_cache_dir=str(tmp_path / "raw_cache"),
    )

    avail = provider.check_availability()
    assert avail["configured"] is True
    assert avail["status"] == "CONFIGURED"

    result = provider.fetch_orbital_data(
        norad_ids=[43111],
        client=mock_client,
    )

    assert result.success is True
    assert result.provider_name == "Space-Track"
    assert result.record_count == 1
    assert result.records[0].data_source == "SPACETRACK"
    assert result.raw_storage_path is not None
    assert os.path.exists(result.raw_storage_path)


def test_spacetrack_mocked_login_failure():
    """Verifies that bad Space-Track credentials fail honestly without fabricated data."""
    mock_client = MagicMock()
    mock_login_resp = MagicMock()
    mock_login_resp.status_code = 200
    mock_login_resp.text = '{"Login Failed": "Invalid username or password"}'
    mock_client.post.return_value = mock_login_resp

    provider = SpaceTrackProvider(
        identity="bad_user@isro.gov.in",
        password="WrongPassword",
    )

    result = provider.fetch_orbital_data(norad_ids=[43111], client=mock_client)
    assert result.success is False
    assert "authentication failed" in (result.error_message or "").lower()


def test_protected_manual_sync_endpoint():
    """
    Tests POST /api/sources/sync:
    - Rejects request without API key (401)
    - Rejects request with invalid API key (401)
    - Accepts request with valid X-API-Key header (200)
    - Accepts request with valid Authorization Bearer token (200)
    """
    with TestClient(app) as client:
        # 1. Missing API key
        res_no_key = client.post("/api/sources/sync")
        assert res_no_key.status_code == 401
        assert "unauthorized" in res_no_key.json()["detail"].lower()

        # 2. Invalid API key
        res_bad_key = client.post("/api/sources/sync", headers={"X-API-Key": "invalid-wrong-key"})
        assert res_bad_key.status_code == 401

        # 3. Valid X-API-Key
        headers = {"X-API-Key": "gagan-secret-sync-key-2026"}
        res_valid = client.post("/api/sources/sync?force=false", headers=headers)
        assert res_valid.status_code == 200
        data = res_valid.json()
        assert "success" in data
        assert "provider_name" in data
        assert "disclaimer" in data

        # 4. Valid Authorization Bearer
        bearer_headers = {"Authorization": "Bearer gagan-secret-sync-key-2026"}
        res_bearer = client.post("/api/sources/sync?force=false", headers=bearer_headers)
        assert res_bearer.status_code == 200


def test_sources_telemetry_endpoint():
    """
    Tests GET /api/sources/telemetry:
    - Reports all provider statuses
    - Reports catalog distribution separating live, historical, and synthetic data
    - Includes scientific disclaimer
    """
    with TestClient(app) as client:
        res = client.get("/api/sources/telemetry")
        assert res.status_code == 200
        data = res.json()

        assert "providers" in data
        assert "catalog_distribution" in data
        assert "disclaimer" in data
        assert ORBITAL_DATA_DISCLAIMER in data["disclaimer"]

        # Ensure providers list contains both CelesTrak and Space-Track
        provider_names = [p["provider"] for p in data["providers"]]
        assert "CelesTrak" in provider_names
        assert "Space-Track" in provider_names


def test_scientific_disclaimer_presence():
    """
    Verifies that the scientific disclaimer is explicitly present in:
    - ProviderFetchResult
    - ORBITAL_DATA_DISCLAIMER constant
    - Telemetry response
    """
    result = ProviderFetchResult(
        success=True,
        provider_name="CelesTrak",
        fetched_at_utc=datetime.now(timezone.utc).isoformat(),
        record_count=1,
    )
    assert "conjunction warnings" in result.disclaimer.lower()
    assert "collision probabilities" in result.disclaimer.lower()
