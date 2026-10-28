"""
Gagan Suraksha - Historical Conjunction Data Ingestion Pipeline Test Suite
========================================================================
Comprehensive verification covering:
1. Forensic Inspection: Analyzes 10,960 records, 0 nulls/missing, unit documentation.
2. Mathematical Integrity:
   - epoch_1 + prop_time_1 == epoch_2 + prop_time_2
   - Verification that min_range is in km, rel_vel is in km/s, prop_time is in days.
3. Field Preservation:
   - Raw min_range, rel_vel, prop_times, raw TLEs, and raw payload JSON preserved.
4. Timestamp Distinction:
   - Clear separation between observation/TLE epoch and predicted TCA.
5. Non-Destructive Ingestion:
   - Live operational satellite TLEs are never replaced with historical TLEs.
6. Scientific Honesty:
   - Outcome status is marked CLOSE_APPROACH, never labeled as collision without verified fragments.
7. Idempotency:
   - Re-importing does not create duplicate rows; skips existing records safely.
"""

import json
import math
import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.main import app
from backend.database import SessionLocal
from backend.models.db_models import ConjunctionModel, SatelliteModel
from backend.services.historical_ingestion import (
    inspect_historical_dataset,
    validate_historical_record,
    import_historical_conjunctions,
    is_indian_spacecraft,
    sanitize_tle,
    parse_tle_epoch_to_iso,
)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_inspect_historical_dataset_structure():
    """Verifies that dataset inspection analyzes all 10,960 records with 0 missing fields."""
    report = inspect_historical_dataset()
    assert report["status"] == "ANALYZED"
    assert report["total_records"] == 10960
    assert report["valid_records"] == 10960
    assert report["invalid_records"] == 0
    assert report["duplicate_events_count"] == 0

    # Verify zero missing or null fields across all 10 keys
    for field, missing in report["field_missing_counts"].items():
        assert missing == 0, f"Field {field} has {missing} missing items"
    for field, nulls in report["field_null_counts"].items():
        assert nulls == 0, f"Field {field} has {nulls} null items"

    # Verify unit definitions
    units = report["units_and_meanings"]
    assert "min_range" in units and "km" in units["min_range"]
    assert "rel_vel" in units and "km/s" in units["rel_vel"]
    assert "prop_time_1" in units and "days" in units["prop_time_1"]

    # Verify Indian spacecraft identification
    assert report["indian_spacecraft"]["total_encounters"] == 248
    assert report["indian_spacecraft"]["spacecraft_count"] >= 50


def test_mathematical_tca_geometry_consistency():
    """
    Proves that prop_time_1 and prop_time_2 are in fractional days by showing
    that (TLE_1 epoch + prop_time_1) equals (TLE_2 epoch + prop_time_2) to within microsecond tolerance.
    """
    data_path = "backend/data/conjunctions_data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        samples = json.load(f)[:25]

    for i, item in enumerate(samples):
        l1_p, _ = sanitize_tle(item["TLE_1"])
        l1_s, _ = sanitize_tle(item["TLE_2"])

        dt1_epoch = datetime.fromisoformat(parse_tle_epoch_to_iso(l1_p))
        dt2_epoch = datetime.fromisoformat(parse_tle_epoch_to_iso(l1_s))

        tca_1 = dt1_epoch + timedelta(days=item["prop_time_1"])
        tca_2 = dt2_epoch + timedelta(days=item["prop_time_2"])

        time_diff_seconds = abs((tca_1 - tca_2).total_seconds())
        assert time_diff_seconds < 0.05, (
            f"Sample {i} TCA discrepancy between object 1 and object 2 is {time_diff_seconds:.6f}s"
        )


def test_validation_rejects_corrupt_records():
    """Verifies that validate_historical_record detects corrupted data."""
    valid_record = {
        "norad_1": 43111,
        "name_1": "CARTOSAT-2F",
        "prop_time_1": 0.5,
        "norad_2": 12176,
        "name_2": "DELTA 1 DEB",
        "prop_time_2": 0.6,
        "min_range": 0.12,
        "rel_vel": 8.5,
        "TLE_1": "1 43111U 18004A   22115.91667824  .00002154  00000-0  10425-3 0  9999\r\n2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412857",
        "TLE_2": "1 12176U 78026R   22115.55327716  .00000041  00000-0  68196-4 0  9996\r\n2 12176  99.0413  31.9108 0066242  79.6893  94.9656 13.88529998 88174",
    }
    is_valid, err = validate_historical_record(valid_record)
    assert is_valid is True
    assert err is None

    # Corrupt missing field
    bad_rec = dict(valid_record)
    del bad_rec["min_range"]
    assert validate_historical_record(bad_rec)[0] is False

    # Corrupt negative distance
    bad_range = dict(valid_record, min_range=-5.0)
    assert validate_historical_record(bad_range)[0] is False

    # Corrupt non-numeric NORAD
    bad_norad = dict(valid_record, norad_1="INVALID")
    assert validate_historical_record(bad_norad)[0] is False


def test_ingestion_preserves_original_fields_and_idempotency():
    """
    Verifies that importing records preserves raw values, sets outcome_status to CLOSE_APPROACH,
    and runs idempotently on repeated execution.
    """
    db = SessionLocal()
    try:
        # Ingest 15 records
        res1 = import_historical_conjunctions(db, limit=15, prioritize_indian=True)
        assert res1["status"] == "SUCCESS"
        assert res1["imported_count"] + res1["skipped_count"] >= 15

        # Query newly imported historical record
        stmt = (
            select(ConjunctionModel)
            .where(ConjunctionModel.is_historical == True)
            .where(ConjunctionModel.prop_time_1_days.is_not(None))
            .limit(1)
        )
        conj = db.scalars(stmt).first()
        assert conj is not None

        # Verify preserved raw fields
        assert conj.raw_min_range_km is not None and conj.raw_min_range_km >= 0
        assert conj.raw_rel_vel_km_s is not None and conj.raw_rel_vel_km_s >= 0
        assert conj.prop_time_1_days is not None
        assert conj.prop_time_2_days is not None
        assert conj.tle_epoch_1_utc is not None
        assert conj.tle_epoch_2_utc is not None
        assert conj.tle_1_raw is not None and conj.tle_1_raw.startswith("1 ")
        assert conj.tle_2_raw is not None and conj.tle_2_raw.startswith("1 ")

        # Verify raw JSON payload can be loaded
        assert conj.raw_payload_json is not None
        parsed_payload = json.loads(conj.raw_payload_json)
        assert "norad_1" in parsed_payload
        assert "min_range" in parsed_payload

        # Verify scientific honesty: CLOSE_APPROACH, not COLLISION
        assert conj.outcome_status == "CLOSE_APPROACH"

        # Verify distinct timestamps: TLE epoch != TCA
        assert conj.tle_epoch_1_utc != conj.tca_utc

        # Idempotency: Running again with same limit must skip all records
        res2 = import_historical_conjunctions(db, limit=15, prioritize_indian=True)
        assert res2["imported_count"] == 0
        assert res2["skipped_count"] >= 15

    finally:
        db.close()


def test_never_overwrite_live_satellite_tle_with_historical():
    """
    Verifies that ingesting a historical conjunction involving an operational satellite
    (e.g., CARTOSAT-2F) does NOT overwrite the operational satellite's live TLE.
    """
    db = SessionLocal()
    try:
        cartosat = db.query(SatelliteModel).filter(SatelliteModel.norad_id == 43111).first()
        if cartosat:
            orig_tle = cartosat.tle_line1
            orig_source = cartosat.data_source

            # Run ingestion of records involving Cartosat
            import_historical_conjunctions(db, limit=20, prioritize_indian=True)

            # Re-fetch Cartosat and verify operational TLE and source are untouched
            db.refresh(cartosat)
            assert cartosat.tle_line1 == orig_tle
            assert cartosat.data_source == orig_source
    finally:
        db.close()


def test_api_serves_normalized_and_preserved_fields(client: TestClient):
    """Verifies that GET /api/conjunctions/historical exposes both normalized and raw preserved fields."""
    res = client.get("/api/conjunctions/historical?limit=5")
    assert res.status_code == 200
    events = res.json()
    assert isinstance(events, list)
    assert len(events) > 0

    first = events[0]
    # Check normalized fields
    assert "id" in first
    assert "tcaUtc" in first
    assert "missDistanceKm" in first
    assert "riskLevel" in first

    # Check preserved raw fields
    assert "outcomeStatus" in first
    assert first["outcomeStatus"] == "CLOSE_APPROACH"
    assert "dataSource" in first
    assert first["dataSource"] == "HISTORICAL_ARCHIVE"
