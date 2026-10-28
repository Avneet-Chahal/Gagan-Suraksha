from fastapi import APIRouter
from backend.services.noaa_service import get_live_space_weather

router = APIRouter(prefix="/space-weather", tags=["Space Weather"])


@router.get("", summary="Get Current Space Weather & Atmospheric Drag Parameters")
def get_space_weather():
    """
    Returns authentic live space weather observations (Kp, F10.7, solar wind speed)
    retrieved directly from official NOAA SWPC products.
    """
    return get_live_space_weather(force_refresh=False)


@router.post("/refresh", summary="Force Refresh NOAA Space Weather Observations")
def refresh_space_weather():
    """
    Forces an immediate live HTTP fetch from NOAA SWPC service products.
    """
    return get_live_space_weather(force_refresh=True)
