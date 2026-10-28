from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import get_db
from backend.models.db_models import ConjunctionModel
from backend.schemas.types import ManeuverRequest, ManeuverResult
from backend.services.maneuver_service import plan_collision_avoidance_maneuver

router = APIRouter(prefix="/maneuver", tags=["Maneuver"])


@router.get("")
def get_maneuvers(db: Session = Depends(get_db)):
    """Proxies GET /api/maneuvers."""
    from backend.app.api.routes.maneuvers import get_maneuver_recommendations
    return get_maneuver_recommendations(db=db)


@router.post("", response_model=ManeuverResult)
def post_plan_maneuver(
    req: ManeuverRequest,
    db: Session = Depends(get_db),
) -> ManeuverResult:
    """
    Computes delta-V requirements, propellant mass consumption (Tsiolkovsky equation),
    post-burn miss distance, and calibrated collision probability for an avoidance maneuver.
    """
    stmt = select(ConjunctionModel).where(ConjunctionModel.id == req.conjunction_id)
    conjunction = db.scalars(stmt).first()

    if not conjunction:
        raise HTTPException(status_code=404, detail=f"Conjunction event '{req.conjunction_id}' not found.")

    orig_miss = conjunction.miss_distance_km
    orig_pc = conjunction.pc_ml_calibrated if getattr(conjunction, "pc_ml_calibrated", None) is not None else conjunction.calibrated_probability
    tca_utc = conjunction.tca_utc
    primary_sigmas = (
        conjunction.primary_radial_sigma_m,
        conjunction.primary_in_track_sigma_m,
        conjunction.primary_cross_track_sigma_m,
    )
    secondary_sigmas = (
        conjunction.secondary_radial_sigma_m,
        conjunction.secondary_in_track_sigma_m,
        conjunction.secondary_cross_track_sigma_m,
    )
    primary_alt = conjunction.primary_sat.altitude_km if conjunction.primary_sat else 780.0

    try:
        return plan_collision_avoidance_maneuver(
            req=req,
            original_miss_distance_km=orig_miss,
            original_calibrated_probability=orig_pc,
            primary_sigmas_m=primary_sigmas,
            secondary_sigmas_m=secondary_sigmas,
            tca_utc=tca_utc,
            original_radial_km=conjunction.radial_miss_km,
            original_in_track_km=conjunction.in_track_miss_km,
            original_cross_track_km=conjunction.cross_track_miss_km,
            primary_altitude_km=primary_alt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/optimize")
def post_optimize_maneuver(req: dict):
    """
    Optimizes collision avoidance maneuver parameters: computes required delta-V to reach target
    separation, propellant consumption via Tsiolkovsky equation, and residual collision probability.
    """
    from backend.services.historical_service import optimize_maneuver_plan

    try:
        mass = float(req.get("spacecraftMassKg") or req.get("spacecraft_mass_kg") or 556.0)
        isp = float(req.get("ispSeconds") or req.get("isp_seconds") or 220.0)
        lead = float(req.get("leadTimeHours") or req.get("lead_time_hours") or 12.0)
        target = float(req.get("targetMissDistanceKm") or req.get("target_miss_distance_km") or 2.0)
        dv = req.get("deltaVMs") or req.get("delta_v_ms")
        dv_val = float(dv) if dv is not None else None
        direction = req.get("burnDirection") or req.get("burn_direction") or "POSIGRADE"
        conj_id = req.get("conjunctionId") or req.get("conjunction_id") or "historical-iridium-kosmos"

        return optimize_maneuver_plan(
            spacecraft_mass_kg=mass,
            isp_seconds=isp,
            lead_time_hours=lead,
            target_miss_distance_km=target,
            delta_v_ms=dv_val,
            burn_direction=direction,
            conjunction_id=conj_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


