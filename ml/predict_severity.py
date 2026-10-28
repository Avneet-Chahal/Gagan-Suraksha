"""
Gagan Suraksha — Reusable Conjunction Severity & Risk-Ranking Inference Service
================================================================================
Provides cached loading and high-throughput inference for operational conjunction
screening priority and risk-ranking using the trained calibrated pipeline.
"""

import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from backend.services.historical_ingestion import is_indian_spacecraft, sanitize_tle

logger = logging.getLogger("gagan_suraksha.ml_severity")

MODEL_DIR = Path(__file__).resolve().parent / "models" / "conjunction_severity"
if not (MODEL_DIR / "conjunction_severity_pipeline.joblib").exists():
    # Fallback to backend path
    MODEL_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "ml" / "models" / "conjunction_severity"

_PIPELINE_INSTANCE = None
_BASELINE_INSTANCE = None
_FEATURE_SCHEMA = None


def load_severity_pipeline():
    """Loads and caches the calibrated HistGradientBoosting severity pipeline."""
    global _PIPELINE_INSTANCE
    if _PIPELINE_INSTANCE is None:
        model_path = MODEL_DIR / "conjunction_severity_pipeline.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Severity model pipeline not found at {model_path}")
        logger.info("Loading Conjunction Severity model from %s...", model_path)
        _PIPELINE_INSTANCE = joblib.load(model_path)
    return _PIPELINE_INSTANCE


def load_baseline_model():
    """Loads and caches the baseline Logistic Regression model."""
    global _BASELINE_INSTANCE
    if _BASELINE_INSTANCE is None:
        model_path = MODEL_DIR / "baseline_model.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Baseline model not found at {model_path}")
        logger.info("Loading Baseline model from %s...", model_path)
        _BASELINE_INSTANCE = joblib.load(model_path)
    return _BASELINE_INSTANCE


def load_feature_schema() -> Dict[str, Any]:
    """Loads the feature schema dictionary defining units and types."""
    global _FEATURE_SCHEMA
    if _FEATURE_SCHEMA is None:
        schema_path = MODEL_DIR / "feature_schema.json"
        if not schema_path.exists():
            raise FileNotFoundError(f"Feature schema not found at {schema_path}")
        with open(schema_path, "r", encoding="utf-8") as f:
            _FEATURE_SCHEMA = json.load(f)
    return _FEATURE_SCHEMA


def parse_tle_line2_orbital_elements(l2: str) -> Tuple[float, float, float, float, float, float]:
    """Extracts inclination, eccentricity, mean motion, semi-major axis, altitude, and period."""
    try:
        inc = float(l2[8:16])
        ecc = float("0." + l2[26:33].strip())
        mm = float(l2[52:63])
        n_rad_s = mm * 2.0 * math.pi / 86400.0
        sma = (398600.4418 / (n_rad_s**2)) ** (1.0 / 3.0) if n_rad_s > 0 else 7000.0
        alt = sma - 6378.137
        period = 1440.0 / mm if mm > 0 else 95.0
        return inc, ecc, mm, sma, alt, period
    except Exception:
        return 98.0, 0.001, 14.5, 7100.0, 720.0, 99.0


def extract_conjunction_features(record: Dict[str, Any]) -> pd.DataFrame:
    """
    Extracts all 18 astrodynamic features from a single raw conjunction record.
    Accepts keys: min_range, rel_vel, prop_time_1, prop_time_2, TLE_1, TLE_2, norad_1, norad_2.
    """
    mr = float(record.get("min_range") or record.get("min_range_km") or record.get("miss_distance_km") or 0.5)
    rv = float(record.get("rel_vel") or record.get("rel_vel_km_s") or record.get("relative_velocity_km_s") or 10.0)
    p1 = float(record.get("prop_time_1") or record.get("prop_time_1_days") or 0.5)
    p2 = float(record.get("prop_time_2") or record.get("prop_time_2_days") or 0.5)

    tle1_str = record.get("TLE_1") or record.get("tle_1_raw") or ""
    tle2_str = record.get("TLE_2") or record.get("tle_2_raw") or ""

    if tle1_str:
        try:
            _, l2_p = sanitize_tle(tle1_str)
            inc1, ecc1, _, _, alt1, per1 = parse_tle_line2_orbital_elements(l2_p)
        except Exception:
            inc1, ecc1, alt1, per1 = 98.0, 0.001, 700.0, 98.0
    else:
        inc1, ecc1, alt1, per1 = 98.0, 0.001, 700.0, 98.0

    if tle2_str:
        try:
            _, l2_s = sanitize_tle(tle2_str)
            inc2, ecc2, _, _, alt2, per2 = parse_tle_line2_orbital_elements(l2_s)
        except Exception:
            inc2, ecc2, alt2, per2 = 98.0, 0.001, 720.0, 99.0
    else:
        inc2, ecc2, alt2, per2 = 98.0, 0.001, 720.0, 99.0

    name1 = str(record.get("name_1", "")).upper()
    name2 = str(record.get("name_2", "")).upper()
    n1 = int(record.get("norad_1") or 0)
    n2 = int(record.get("norad_2") or 0)

    is_deb1 = 1 if ("DEB" in name1 or "R/B" in name1) else 0
    is_deb2 = 1 if ("DEB" in name2 or "R/B" in name2) else 0
    is_deb_enc = 1 if (is_deb1 or is_deb2) else 0
    is_ind = 1 if (is_indian_spacecraft(n1, name1) or is_indian_spacecraft(n2, name2)) else 0

    schema = load_feature_schema()
    feature_cols = list(schema.keys())

    row_data = {
        "min_range_km": mr,
        "rel_vel_km_s": rv,
        "relative_kinetic_energy": 0.5 * (rv**2),
        "momentum_transfer_potential": rv / max(mr, 0.005),
        "lead_time_days": p1,
        "secondary_lead_time_days": p2,
        "lead_time_diff_days": abs(p1 - p2),
        "max_propagation_horizon_days": max(abs(p1), abs(p2)),
        "inclination_1_deg": inc1,
        "inclination_2_deg": inc2,
        "inclination_diff_deg": abs(inc1 - inc2),
        "altitude_1_km": alt1,
        "altitude_2_km": alt2,
        "altitude_diff_km": abs(alt1 - alt2),
        "eccentricity_max": max(ecc1, ecc2),
        "period_diff_min": abs(per1 - per2),
        "is_debris_encounter": is_deb_enc,
        "is_indian_spacecraft": is_ind,
    }

    return pd.DataFrame([row_data], columns=feature_cols)


def predict_conjunction_severity(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reusable prediction function: computes calibrated severity probability
    and risk priority tier for an incoming conjunction record.
    """
    pipeline = load_severity_pipeline()
    X = extract_conjunction_features(record)

    prob_critical = float(pipeline.predict_proba(X)[0, 1])
    is_critical_tier = bool(prob_critical >= 0.50)

    # Risk ranking tiering
    if prob_critical >= 0.75:
        tier_label = "HIGH_CRITICAL"
        action = "IMMEDIATE_COLLISION_AVOIDANCE_EVALUATION"
    elif prob_critical >= 0.50:
        tier_label = "CRITICAL"
        action = "PRIORITY_TRACKING_AND_SCREENING"
    elif prob_critical >= 0.25:
        tier_label = "WARNING"
        action = "ELEVATED_MONITORING"
    else:
        tier_label = "NOMINAL"
        action = "ROUTINE_MONITORING"

    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "severity_score": round(prob_critical, 4),
        "predicted_tier": tier_label,
        "is_critical_tier": is_critical_tier,
        "action_recommendation": action,
        "prediction_timestamp_utc": now_iso,
        "input_element_epochs": {
            "primary_epoch": record.get("tle_epoch_1_utc") or record.get("epoch_1"),
            "secondary_epoch": record.get("tle_epoch_2_utc") or record.get("epoch_2"),
        },
        "model_version": "v1.0.0",
        "data_source": record.get("data_source", "real"),
        "data_freshness": record.get("freshness", "FRESH"),
        "extracted_features": {k: round(float(v), 4) for k, v in X.iloc[0].to_dict().items()},
        "model_metadata": {
            "model_version": "v1.0.0",
            "model_architecture": "Calibrated_HistGradientBoostingClassifier",
            "critical_threshold_km": 0.35,
            "disclaimer": (
                "Predicts Conjunction Operational Screening Priority Tier based on encounter kinematics. "
                "Does not predict or claim catastrophic satellite collision outcomes."
            ),
        },
        "disclaimer": (
            "Predicts Conjunction Operational Screening Priority Tier based on encounter kinematics. "
            "Fresh orbital elements alone do not constitute official conjunction warnings or operational collision avoidance certification."
        ),
    }
