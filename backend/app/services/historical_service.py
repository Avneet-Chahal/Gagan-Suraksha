"""Proxy module for historical service in backend.app namespace."""
from backend.services.historical_service import (
    IRIDIUM_33_TLE_LINE1,
    IRIDIUM_33_TLE_LINE2,
    KOSMOS_2251_TLE_LINE1,
    KOSMOS_2251_TLE_LINE2,
    TCA_UTC_ISO,
    COLLISION_ALTITUDE_KM,
    get_historical_iridium_kosmos_conjunction,
    optimize_maneuver_plan,
)

__all__ = [
    "IRIDIUM_33_TLE_LINE1",
    "IRIDIUM_33_TLE_LINE2",
    "KOSMOS_2251_TLE_LINE1",
    "KOSMOS_2251_TLE_LINE2",
    "TCA_UTC_ISO",
    "COLLISION_ALTITUDE_KM",
    "get_historical_iridium_kosmos_conjunction",
    "optimize_maneuver_plan",
]
