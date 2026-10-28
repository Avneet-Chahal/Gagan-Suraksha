from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import get_db
from backend.models.db_models import ConjunctionModel
from backend.app.schemas.maneuver import ManeuverOptimizeRequest, ManeuverOptimizeResponse
from backend.services.historical_service import optimize_maneuver_plan, get_historical_iridium_kosmos_conjunction

router = APIRouter(prefix="/maneuvers", tags=["Maneuver Planning"])


@router.get(
    "",
    summary="List Maneuver Recommendations",
    description="Returns maneuver recommendations for active close approach conjunctions exceeding collision risk thresholds.",
)
def get_maneuver_recommendations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns maneuver recommendations for critical and warning conjunctions from the database.
    Matches frontend ManeuverRecommendation contract.
    """
    stmt = (
        select(ConjunctionModel)
        .where(ConjunctionModel.risk_level.in_(["CRITICAL", "WARNING"]))
        .order_by(ConjunctionModel.miss_distance_km.asc())
        .limit(10)
    )
    conjunctions = db.scalars(stmt).all()
    recs: List[Dict[str, Any]] = []

    for conj in conjunctions:
        p_name = conj.primary_sat.name if conj.primary_sat else "CARTOSAT-2F"
        s_name = conj.secondary_sat.name if conj.secondary_sat else "DEBRIS"
        dv = round(conj.recommended_delta_v_ms or 0.38, 3)
        fuel = round(conj.maneuver_fuel_cost_kg or 0.095, 4)
        post_miss = round(conj.miss_distance_km + 45.2, 2)

        recs.append({
            "id": f"maneuver-{conj.id}",
            "conjunctionId": conj.id,
            "title": f"Avoidance Burn: {p_name} vs {s_name}",
            "description": f"Tangential prograde impulse to clear {conj.miss_distance_km:.2f} km miss distance prior to TCA.",
            "scheduledBurnUtc": conj.tca_utc,
            "hoursBeforeTca": 12.0,
            "deltaVMs": dv,
            "burnDirection": "POSIGRADE",
            "postManeuverMissDistanceKm": post_miss,
            "postManeuverCollisionProbability": 1.2e-8,
            "fuelMassCostKg": fuel,
            "orbitalShiftKm": 1.1,
            "thrusterType": "CHEMICAL",
            "uplinkPassStation": "ISTRAC Bangalore",
            "uplinkDeadlineUtc": conj.tca_utc,
            "secondaryConjunctionsCount": 0,
            "status": "RECOMMENDED",
        })

    # Include historical CAM recommendation
    try:
        hist_cam = get_historical_iridium_kosmos_conjunction().get("recommendedCAM")
        if hist_cam:
            recs.append(hist_cam)
    except Exception:
        pass

    return recs


@router.post(
    "/optimize",
    response_model=ManeuverOptimizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize Collision Avoidance Maneuver",
    description="Accepts custom spacecraft mass, Isp, and lead time parameters to compute updated post-burn miss distances, fuel mass consumed, and residual risk.",
)
def optimize_maneuver(req: ManeuverOptimizeRequest) -> ManeuverOptimizeResponse:
    """
    Computes optimal delta-V and propellant consumption to boost separation past safety thresholds.
    """
    try:
        res = optimize_maneuver_plan(
            spacecraft_mass_kg=req.spacecraft_mass_kg,
            isp_seconds=req.isp_seconds,
            lead_time_hours=req.lead_time_hours,
            target_miss_distance_km=req.target_miss_distance_km,
            delta_v_ms=req.delta_v_ms,
            burn_direction=req.burn_direction,
            conjunction_id=req.conjunction_id,
        )
        return ManeuverOptimizeResponse.model_validate(res)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {exc}",
        )
