from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from sgp4.api import Satrec
from backend.services.celestrak_service import get_satellite_tle, calculate_ground_passes

router = APIRouter(prefix="/passes", tags=["Ground Passes"])


@router.get("/{satellite_id}", summary="Get Ground Passes for Satellite")
def get_ground_passes(satellite_id: str) -> List[Dict[str, Any]]:
    """
    Computes upcoming ground pass prediction schedules for ISRO ISTRAC tracking stations
    using authentic SGP4 orbital propagation.
    """
    clean_id = satellite_id.replace("sat-", "").replace("orbit-", "").strip()
    try:
        norad_id = int(clean_id)
    except ValueError:
        norad_id = 43111  # Default to primary CARTOSAT-2F

    try:
        name_raw, l1, l2 = get_satellite_tle(norad_id)
        satrec = Satrec.twoline2rv(l1, l2)
        return calculate_ground_passes(satrec, norad_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate ground passes for satellite '{satellite_id}': {exc}",
        )
