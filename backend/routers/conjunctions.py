import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import get_db, SessionLocal
from backend.models.db_models import ConjunctionModel
from backend.schemas.types import (
    ConjunctionEvent,
    SatelliteRecord,
    CovarianceMatrix,
)
from backend.services.screening import screen_all_watchlist_pairs
from backend.routers.sources import verify_sync_api_key

logger = logging.getLogger("gagan_suraksha.screening")
router = APIRouter(prefix="/conjunctions", tags=["Conjunctions"])


def run_screening_task() -> int:
    logger.info("Executing background conjunction screening task...")
    db = SessionLocal()
    try:
        results = screen_all_watchlist_pairs(db)
        logger.info("Background screening task completed: %d conjunctions found.", len(results))
        return len(results)
    except Exception as exc:
        logger.error("Error during background conjunction screening task: %s", exc, exc_info=True)
        return 0
    finally:
        db.close()


def to_conjunction_event(c: ConjunctionModel) -> ConjunctionEvent:
    """Converts a database ConjunctionModel to a Pydantic ConjunctionEvent."""
    return ConjunctionEvent(
        id=c.id,
        primary_sat=SatelliteRecord.model_validate(c.primary_sat),
        secondary_sat=SatelliteRecord.model_validate(c.secondary_sat),
        tca_utc=c.tca_utc,
        tca_ms=c.tca_ms,
        miss_distance_km=c.miss_distance_km,
        radial_miss_km=c.radial_miss_km,
        in_track_miss_km=c.in_track_miss_km,
        cross_track_miss_km=c.cross_track_miss_km,
        relative_velocity_km_s=c.relative_velocity_km_s,
        raw_probability=c.raw_probability,
        calibrated_probability=c.calibrated_probability,
        risk_level=c.risk_level,  # type: ignore[arg-type]
        primary_covariance=CovarianceMatrix(
            radial_sigma_m=c.primary_radial_sigma_m,
            in_track_sigma_m=c.primary_in_track_sigma_m,
            cross_track_sigma_m=c.primary_cross_track_sigma_m,
        ),
        secondary_covariance=CovarianceMatrix(
            radial_sigma_m=c.secondary_radial_sigma_m,
            in_track_sigma_m=c.secondary_in_track_sigma_m,
            cross_track_sigma_m=c.secondary_cross_track_sigma_m,
        ),
        recommended_action=c.recommended_action,  # type: ignore[arg-type]
        recommended_delta_v_ms=c.recommended_delta_v_ms,
        maneuver_fuel_cost_kg=c.maneuver_fuel_cost_kg,
        data_freshness_utc=c.data_freshness_utc,
        data_quality_note=c.data_quality_note,
        pc_raw=c.pc_raw if getattr(c, "pc_raw", None) is not None else c.raw_probability,
        pc_ml=c.pc_ml if getattr(c, "pc_ml", None) is not None else c.calibrated_probability,
        pc_ml_calibrated=c.pc_ml_calibrated if getattr(c, "pc_ml_calibrated", None) is not None else c.calibrated_probability,
        ml_available=getattr(c, "ml_available", True),
        model_version=getattr(c, "model_version", "v1.0.0"),
        covariance={
            "primary": {
                "radialM": c.primary_radial_sigma_m,
                "inTrackM": c.primary_in_track_sigma_m,
                "crossTrackM": c.primary_cross_track_sigma_m,
            },
            "secondary": {
                "radialM": c.secondary_radial_sigma_m,
                "inTrackM": c.secondary_in_track_sigma_m,
                "crossTrackM": c.secondary_cross_track_sigma_m,
            },
        },
        data_source=getattr(c, "data_source", "real"),
        is_historical=getattr(c, "is_historical", False),
        prop_time_1_days=getattr(c, "prop_time_1_days", None),
        prop_time_2_days=getattr(c, "prop_time_2_days", None),
        raw_min_range_km=getattr(c, "raw_min_range_km", None),
        raw_rel_vel_km_s=getattr(c, "raw_rel_vel_km_s", None),
        tle_epoch_1_utc=getattr(c, "tle_epoch_1_utc", None),
        tle_epoch_2_utc=getattr(c, "tle_epoch_2_utc", None),
        tle_1_raw=getattr(c, "tle_1_raw", None),
        tle_2_raw=getattr(c, "tle_2_raw", None),
        raw_payload_json=getattr(c, "raw_payload_json", None),
        outcome_status=getattr(c, "outcome_status", "CLOSE_APPROACH"),
    )


@router.get("", response_model=List[ConjunctionEvent])
def get_conjunctions(
    risk: Optional[str] = Query(None, description="Filter by risk level: CRITICAL, WARNING, or NOMINAL"),
    scope: str = Query("all", description="Scope filter: 'all', 'operational', or 'historical'"),
    limit: Optional[int] = Query(None, description="Maximum records to return"),
    offset: int = Query(0, description="Offset for pagination"),
    primary_norad: Optional[int] = Query(None, description="Filter by primary satellite NORAD ID"),
    db: Session = Depends(get_db),
) -> List[ConjunctionEvent]:
    """Retrieves close-approach conjunction events, supporting operational/historical scope and risk filtering."""
    stmt = select(ConjunctionModel)
    if scope.lower() == "operational":
        stmt = stmt.where(ConjunctionModel.is_historical == False)
    elif scope.lower() == "historical":
        stmt = stmt.where(ConjunctionModel.is_historical == True)

    if risk:
        stmt = stmt.where(ConjunctionModel.risk_level == risk.upper())

    if primary_norad:
        from backend.models.db_models import SatelliteModel
        stmt = stmt.join(ConjunctionModel.primary_sat).where(SatelliteModel.norad_id == primary_norad)

    stmt = stmt.order_by(ConjunctionModel.tca_ms.asc()).offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)

    conjunctions = db.scalars(stmt).all()
    return [to_conjunction_event(c) for c in conjunctions]


@router.get("/historical", response_model=List[ConjunctionEvent])
def get_historical_conjunctions(
    risk: Optional[str] = Query(None, description="Filter by risk level: CRITICAL, WARNING, or NOMINAL"),
    limit: int = Query(100, description="Maximum historical records to return"),
    offset: int = Query(0, description="Offset for pagination"),
    primary_norad: Optional[int] = Query(None, description="Filter by primary satellite NORAD ID"),
    db: Session = Depends(get_db),
) -> List[ConjunctionEvent]:
    """Retrieves verified historical close-approach events imported from conjunction datasets."""
    return get_conjunctions(
        risk=risk,
        scope="historical",
        limit=limit,
        offset=offset,
        primary_norad=primary_norad,
        db=db,
    )


@router.get("/historical/inspect")
def inspect_dataset_endpoint(
    file: Optional[str] = Query(None, description="Custom path to dataset file"),
) -> dict:
    """Forensically inspects historical conjunction dataset distributions, coverage, and completeness."""
    from backend.services.historical_ingestion import inspect_historical_dataset
    filepath = file or "backend/data/conjunctions_data.json"
    return inspect_historical_dataset(filepath)


@router.post("/historical/import")
def import_historical_endpoint(
    limit: Optional[int] = Query(None, description="Maximum records to ingest (None for all 10,960)"),
    batch_size: int = Query(500, description="Commit batch size"),
    prioritize_indian: bool = Query(True, description="Prioritize ISRO/Indian spacecraft"),
    force_update: bool = Query(False, description="Update existing records if found"),
    dry_run: bool = Query(False, description="Simulate parsing without writing to database"),
    db: Session = Depends(get_db),
) -> dict:
    """Triggers ingestion of historical conjunction dataset into SQLite database."""
    from backend.services.historical_ingestion import import_historical_conjunctions
    return import_historical_conjunctions(
        db=db,
        limit=limit,
        batch_size=batch_size,
        prioritize_indian=prioritize_indian,
        force_update=force_update,
        dry_run=dry_run,
    )


@router.get("/ml-metrics")
def get_ml_severity_metrics():
    """Returns measured performance metrics and metadata for the Conjunction Severity ML Model."""
    import json
    from pathlib import Path
    metrics_path = Path(__file__).resolve().parent.parent.parent / "ml" / "models" / "conjunction_severity" / "metrics.json"
    meta_path = Path(__file__).resolve().parent.parent.parent / "ml" / "models" / "conjunction_severity" / "dataset_metadata.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="ML metrics not yet generated.")
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)
    meta = {}
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
    return {"metrics": metrics, "dataset_metadata": meta}


@router.post("/model/retrain", status_code=202)
def retrain_severity_model_endpoint(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Force retraining bypass of dataset staleness check"),
    policy: str = Query("strict_temporal_split", description="Validation policy enforcing zero future leakage"),
    wait: bool = Query(False, description="If true, execute training synchronously"),
    _api_key: str = Depends(verify_sync_api_key),
) -> dict:
    """
    Triggers Conjunction Severity Ranker ML model retraining according to strict temporal validation policy.
    Retraining only runs when explicitly triggered by authorized operators; never on user requests.
    Validates that:
    1. Zero temporal leakage policy is enforced (80% chronological train, 20% held-out test).
    2. Runs as a separate background task without blocking API operations.
    """

    if policy != "strict_temporal_split":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported validation policy '{policy}'. Mandatory policy is 'strict_temporal_split'.",
        )

    def execute_training() -> dict:
        from ml.train_severity_model import train_conjunction_severity_pipeline
        logger.info("Executing Conjunction Severity Ranker retraining background job...")
        metrics, metadata = train_conjunction_severity_pipeline()
        logger.info("Retraining complete. PR-AUC=%.4f", metrics["primary_model"]["pr_auc"])
        return {"metrics": metrics, "metadata": metadata}

    if wait:
        result = execute_training()
        return {
            "status": "COMPLETED",
            "message": "Model retraining executed synchronously according to temporal validation policy.",
            "metrics": result["metrics"],
            "dataset_metadata": result["metadata"],
        }

    background_tasks.add_task(execute_training)
    return {
        "status": "QUEUED",
        "message": "Model retraining background job initiated under strict_temporal_split policy.",
        "policy": policy,
        "disclaimer": "Retraining runs in isolated background thread; existing model serves inference continuously.",
    }


@router.post("/predict-severity")
def predict_severity_endpoint(
    payload: dict,
    db: Session = Depends(get_db),
) -> dict:
    """
    Evaluates Conjunction Operational Severity Priority Tier using the trained calibrated ML pipeline.
    Accepts either an existing 'conjunction_id' or raw kinematic and TLE fields.
    """
    from ml.predict_severity import predict_conjunction_severity

    record_to_predict = dict(payload)
    conj_id = payload.get("conjunction_id")
    if conj_id:
        row = db.query(ConjunctionModel).filter(ConjunctionModel.id == conj_id).first()
        if row:
            record_to_predict.update({
                "min_range": row.raw_min_range_km or row.miss_distance_km,
                "rel_vel": row.raw_rel_vel_km_s or row.relative_velocity_km_s,
                "prop_time_1": row.prop_time_1_days or 0.5,
                "prop_time_2": row.prop_time_2_days or 0.5,
                "TLE_1": row.tle_1_raw or (row.primary_sat.tle_line1 + "\n" + row.primary_sat.tle_line2 if row.primary_sat else ""),
                "TLE_2": row.tle_2_raw or (row.secondary_sat.tle_line1 + "\n" + row.secondary_sat.tle_line2 if row.secondary_sat else ""),
                "norad_1": row.primary_sat.norad_id if row.primary_sat else 0,
                "norad_2": row.secondary_sat.norad_id if row.secondary_sat else 0,
                "name_1": row.primary_sat.name if row.primary_sat else "",
                "name_2": row.secondary_sat.name if row.secondary_sat else "",
            })

    return predict_conjunction_severity(record_to_predict)


@router.get("/{id}", response_model=ConjunctionEvent)
def get_conjunction_by_id(
    id: str,
    db: Session = Depends(get_db),
) -> ConjunctionEvent:
    """Retrieves a single conjunction event by its unique ID."""
    stmt = select(ConjunctionModel).where(ConjunctionModel.id == id)
    conjunction = db.scalars(stmt).first()
    if not conjunction:
        raise HTTPException(status_code=404, detail=f"Conjunction event '{id}' not found.")
    return to_conjunction_event(conjunction)


@router.post("/screen", status_code=202)
def trigger_screening_job(
    background_tasks: BackgroundTasks,
    wait: bool = Query(False, description="If true, execute screening synchronously and return count."),
    db: Session = Depends(get_db),
) -> dict:
    """Triggers conjunction screening for all watchlist satellites. Can run in background or synchronously with ?wait=true."""
    if wait:
        logger.info("Triggering synchronous conjunction screening via POST /conjunctions/screen?wait=true...")
        results = screen_all_watchlist_pairs(db)
        logger.info("Synchronous screening completed: %d conjunctions found.", len(results))
        return {
            "status": "COMPLETED",
            "message": f"Conjunction screening completed: found {len(results)} conjunctions.",
            "conjunctionsCount": len(results),
        }

    background_tasks.add_task(run_screening_task)
    return {"status": "QUEUED", "message": "Conjunction screening background job started."}


@router.get("/historical/iridium")
def get_historical_iridium_collision():
    """
    Returns the full JSON payload for the historical Iridium 33 vs Kosmos 2251 hypervelocity collision scenario:
    - 3D relative geometry at TCA in the RIC coordinate frame
    - Classical Foster Pc vs ML-calibrated collision probability
    - 1-sigma positional uncertainty covariances
    - Recommended Collision Avoidance Maneuver (CAM) parameters
    - Full CDM evolution history
    """
    from backend.services.historical_service import get_historical_iridium_kosmos_conjunction

    try:
        return get_historical_iridium_kosmos_conjunction()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

