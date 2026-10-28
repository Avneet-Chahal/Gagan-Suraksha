"""
Gagan Suraksha — Conjunction Severity & Risk-Ranking ML Pipeline Test Suite
==========================================================================
Verifies:
1. Label Audit & Integrity: Absence of fake collision labels; prediction of operational screening tier.
2. Feature Engineering: All 18 physical astrodynamic features extracted; zero leakage; NORAD IDs excluded.
3. Preprocessing & Temporal Split: Strict chronological splitting without future leakage.
4. Model Performance: Measured PR-AUC, ROC-AUC, Brier calibration score, and confusion matrix.
5. Reusable Prediction Service: predict_conjunction_severity returns valid probabilities in [0, 1].
6. API Endpoints: GET /api/conjunctions/ml-metrics and POST /api/conjunctions/predict-severity.
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from ml.predict_severity import (
    load_severity_pipeline,
    load_baseline_model,
    load_feature_schema,
    extract_conjunction_features,
    predict_conjunction_severity,
)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_feature_schema_excludes_norad_ids():
    """Verifies that arbitrary sequential NORAD catalog IDs are strictly excluded from numerical feature schema."""
    schema = load_feature_schema()
    assert isinstance(schema, dict)
    assert len(schema) == 18
    assert "norad_1" not in schema
    assert "norad_2" not in schema
    assert "min_range_km" in schema
    assert "rel_vel_km_s" in schema
    assert "relative_kinetic_energy" in schema
    assert "is_debris_encounter" in schema


def test_feature_extraction_completeness():
    """Verifies that extract_conjunction_features computes all 18 features with finite float/int values."""
    sample = {
        "norad_1": 43111,
        "name_1": "CARTOSAT-2F",
        "prop_time_1": 0.35,
        "norad_2": 12176,
        "name_2": "DELTA 1 DEB",
        "prop_time_2": 0.42,
        "min_range": 0.185,
        "rel_vel": 11.2,
        "TLE_1": "1 43111U 18004A   22115.91667824  .00002154  00000-0  10425-3 0  9999\r\n2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412857",
        "TLE_2": "1 12176U 78026R   22115.55327716  .00000041  00000-0  68196-4 0  9996\r\n2 12176  99.0413  31.9108 0066242  79.6893  94.9656 13.88529998 88174",
    }
    df = extract_conjunction_features(sample)
    assert len(df) == 1
    assert df.shape[1] == 18
    # No nulls or NaNs
    assert df.isna().sum().sum() == 0
    assert float(df["min_range_km"].iloc[0]) == 0.185
    assert float(df["rel_vel_km_s"].iloc[0]) == 11.2
    assert int(df["is_debris_encounter"].iloc[0]) == 1
    assert int(df["is_indian_spacecraft"].iloc[0]) == 1


def test_predict_conjunction_severity_inference():
    """Verifies that inference returns calibrated probabilities and actionable tier recommendations."""
    critical_sample = {
        "min_range": 0.08,
        "rel_vel": 12.5,
        "prop_time_1": 0.2,
        "prop_time_2": 0.25,
        "TLE_1": "1 43111U 18004A   22115.91667824  .00002154  00000-0  10425-3 0  9999\r\n2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412857",
        "TLE_2": "1 12176U 78026R   22115.55327716  .00000041  00000-0  68196-4 0  9996\r\n2 12176  99.0413  31.9108 0066242  79.6893  94.9656 13.88529998 88174",
    }
    res_crit = predict_conjunction_severity(critical_sample)
    assert 0.0 <= res_crit["severity_score"] <= 1.0
    assert res_crit["severity_score"] >= 0.70
    assert res_crit["predicted_tier"] in ["CRITICAL", "HIGH_CRITICAL"]
    assert res_crit["is_critical_tier"] is True

    nominal_sample = {
        "min_range": 0.95,
        "rel_vel": 4.2,
        "prop_time_1": 1.2,
        "prop_time_2": 1.3,
        "TLE_1": critical_sample["TLE_1"],
        "TLE_2": critical_sample["TLE_2"],
    }
    res_nom = predict_conjunction_severity(nominal_sample)
    assert 0.0 <= res_nom["severity_score"] <= 1.0
    assert res_nom["severity_score"] <= 0.30
    assert res_nom["predicted_tier"] == "NOMINAL"
    assert res_nom["is_critical_tier"] is False


def test_metrics_and_temporal_metadata_file_integrity():
    """Verifies that saved metrics and dataset metadata contain rigorous measured evaluation values."""
    metrics_file = Path("ml/models/conjunction_severity/metrics.json")
    meta_file = Path("ml/models/conjunction_severity/dataset_metadata.json")

    assert metrics_file.exists(), "metrics.json must be persisted"
    assert meta_file.exists(), "dataset_metadata.json must be persisted"

    with open(metrics_file, "r", encoding="utf-8") as f:
        metrics_data = json.load(f)

    primary = metrics_data["primary_model"]
    assert primary["pr_auc"] >= 0.95
    assert primary["roc_auc"] >= 0.95
    assert primary["brier_score"] <= 0.05
    assert "confusion_matrix" in primary

    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["verified_collision_outcomes_exist"] is False
    assert meta["total_records"] == 10960
    assert meta["train_records"] + meta["test_records"] == 10960
    # Verify temporal ordering (train end precedes test start)
    assert meta["temporal_coverage"]["train_end_utc"] <= meta["temporal_coverage"]["test_start_utc"]


def test_api_predict_severity_endpoint(client: TestClient):
    """Verifies POST /api/conjunctions/predict-severity endpoint."""
    payload = {
        "min_range_km": 0.12,
        "rel_vel_km_s": 9.8,
        "prop_time_1_days": 0.5,
        "prop_time_2_days": 0.6,
        "norad_1": 43111,
        "name_1": "CARTOSAT-2F",
        "norad_2": 12176,
        "name_2": "DELTA 1 DEB",
        "tle_1": "1 43111U 18004A   22115.91667824  .00002154  00000-0  10425-3 0  9999\r\n2 43111  97.5214 240.1142 0010412 112.5412 247.6214 15.20145212412857",
        "tle_2": "1 12176U 78026R   22115.55327716  .00000041  00000-0  68196-4 0  9996\r\n2 12176  99.0413  31.9108 0066242  79.6893  94.9656 13.88529998 88174",
    }
    res = client.post("/api/conjunctions/predict-severity", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "severity_score" in data
    assert "predicted_tier" in data
    assert "action_recommendation" in data
    assert "extracted_features" in data
    assert data["severity_score"] > 0.5


def test_api_get_ml_metrics_endpoint(client: TestClient):
    """Verifies GET /api/conjunctions/ml-metrics endpoint."""
    res = client.get("/api/conjunctions/ml-metrics")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "dataset_metadata" in data
    assert "primary_model" in data["metrics"]
    assert "baseline_model" in data["metrics"]
