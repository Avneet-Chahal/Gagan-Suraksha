import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any

from sgp4.api import Satrec, jday
from backend.app.models.satellite import Satellite
from backend.app.schemas.orbit import (
    PositionVector,
    VelocityVector,
    GeodeticCoordinates,
    SourceRecordInfo,
    SatellitePositionResponse,
    OrbitTrackPoint,
    OrbitTrackResponse,
)

# WGS-84 Ellipsoid Standard Geodetic Constants
WGS84_A_KM = 6378.137              # Semi-major axis in kilometres
WGS84_F = 1.0 / 298.257223563      # Flattening
WGS84_B_KM = WGS84_A_KM * (1.0 - WGS84_F)  # Semi-minor axis (6356.7523142 km)
WGS84_E_SQ = 2.0 * WGS84_F - (WGS84_F ** 2)  # First eccentricity squared
WGS84_E_PRIME_SQ = (WGS84_A_KM ** 2 - WGS84_B_KM ** 2) / (WGS84_B_KM ** 2)

# Astrodynamics Guardrails
MAX_TRACK_DURATION_SECONDS = 7 * 86400  # 7 days max
MAX_TRACK_POINTS = 5000                 # Maximum discrete computed points per track request
STALE_TLE_THRESHOLD_DAYS = 7.0          # Warning threshold for orbital element age
VERY_STALE_TLE_THRESHOLD_DAYS = 30.0    # Elevated warning threshold for orbital element age

# SGP4 Error Code Descriptions (Vallado / AFSPC standard)
SGP4_ERROR_DESCRIPTIONS = {
    1: "Mean elements error: eccentricity out of range (ecc < 0 or ecc >= 1.0) or mean motion invalid.",
    2: "Mean motion error: computed mean motion is non-positive (unphysical orbit).",
    3: "Perturbations error: osculating perturbed eccentricity out of physical range (ecc < 0 or ecc >= 1.0).",
    4: "Semi-latus rectum error: computed orbit geometry has non-positive semi-latus rectum (p <= 0).",
    5: "Sub-orbital epoch: epoch elements indicate an instantaneous impact or sub-orbital trajectory.",
    6: "Satellite decayed: orbit trajectory has decayed and re-entered the dense lower atmosphere.",
}


class SGP4PropagationError(Exception):
    """Raised when SGP4 propagation fails mathematically or due to invalid orbital data."""
    def __init__(self, message: str, error_code: Optional[int] = None):
        super().__init__(message)
        self.error_code = error_code
        self.message = message


def parse_utc_iso_datetime(dt_str: Optional[str]) -> datetime:
    """
    Parses an ISO 8601 string to a timezone-aware UTC datetime.
    If dt_str is None or empty, returns the current UTC datetime.
    Supports trailing 'Z' and explicit '+00:00' offsets.
    """
    if not dt_str or not dt_str.strip():
        return datetime.now(timezone.utc)

    cleaned = dt_str.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(
            f"Invalid ISO 8601 UTC timestamp: '{dt_str}'. Expected format like '2026-10-27T12:00:00Z'."
        ) from exc

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def compute_gmst_radians(dt: datetime) -> float:
    """
    Computes Greenwich Mean Sidereal Time (GMST) in radians for a given UTC datetime
    using the standard IAU-1982 / Vallado astrodynamics formula.
    """
    jd, fr = jday(
        dt.year,
        dt.month,
        dt.day,
        dt.hour,
        dt.minute,
        dt.second + dt.microsecond * 1e-6,
    )
    total_jd = jd + fr
    t_ut1 = (total_jd - 2451545.0) / 36525.0

    # GMST in seconds of day
    gmst_sec = (
        24110.54841
        + 8640184.812866 * t_ut1
        + 0.093104 * (t_ut1 ** 2)
        - 6.2e-6 * (t_ut1 ** 3)
    )
    # Convert seconds of day (86,400s per rev) to radians [0, 2*pi)
    gmst_rad = (gmst_sec % 86400.0) * (2.0 * math.pi / 86400.0)
    return gmst_rad % (2.0 * math.pi)


def teme_to_ecef(x_teme: float, y_teme: float, z_teme: float, dt: datetime) -> Tuple[float, float, float]:
    """
    Rotates a Cartesian vector from the inertial True Equator, Mean Equinox (TEME) frame
    to the Earth-Centered, Earth-Fixed (ECEF / pseudo-ITRF) frame using Greenwich Mean Sidereal Time.
    """
    theta = compute_gmst_radians(dt)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    # Rotation around Z-axis by theta (GMST)
    x_ecef = x_teme * cos_t + y_teme * sin_t
    y_ecef = -x_teme * sin_t + y_teme * cos_t
    z_ecef = z_teme
    return x_ecef, y_ecef, z_ecef


def ecef_to_geodetic_wgs84(x_ecef: float, y_ecef: float, z_ecef: float) -> Tuple[float, float, float]:
    """
    Converts Cartesian ECEF coordinates (km) to geodetic latitude (deg), longitude (deg),
    and ellipsoidal height (km) referenced to the WGS-84 reference ellipsoid using Bowring's method.
    """
    p = math.hypot(x_ecef, y_ecef)
    lon_rad = math.atan2(y_ecef, x_ecef)

    if p < 1e-6:
        # Polar singularity
        lat_rad = (math.pi / 2.0) if z_ecef > 0 else (-math.pi / 2.0)
        alt_km = abs(z_ecef) - WGS84_B_KM
    else:
        # Closed-form Bowring formula
        theta_lat = math.atan2(z_ecef * WGS84_A_KM, p * WGS84_B_KM)
        lat_rad = math.atan2(
            z_ecef + WGS84_E_PRIME_SQ * WGS84_B_KM * (math.sin(theta_lat) ** 3),
            p - WGS84_E_SQ * WGS84_A_KM * (math.cos(theta_lat) ** 3),
        )
        n = WGS84_A_KM / math.sqrt(1.0 - WGS84_E_SQ * (math.sin(lat_rad) ** 2))
        alt_km = (p / math.cos(lat_rad)) - n

    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(lon_rad)
    return lat_deg, lon_deg, alt_km


def teme_to_geodetic(x_teme: float, y_teme: float, z_teme: float, dt: datetime) -> GeodeticCoordinates:
    """
    Complete coordinate conversion pipeline from TEME inertial Cartesian coordinates (km)
    to Earth-fixed WGS-84 geodetic latitude, longitude, and ellipsoidal altitude.
    """
    x_ecef, y_ecef, z_ecef = teme_to_ecef(x_teme, y_teme, z_teme, dt)
    lat_deg, lon_deg, alt_km = ecef_to_geodetic_wgs84(x_ecef, y_ecef, z_ecef)
    return GeodeticCoordinates(
        latitude_deg=round(lat_deg, 4),
        longitude_deg=round(lon_deg, 4),
        altitude_km=round(alt_km, 2),
        reference_ellipsoid="WGS-84",
    )


def initialize_satrec_from_satellite(satellite: Satellite) -> Tuple[Satrec, str, str]:
    """
    Initializes a validated SGP4 Satrec instance from the satellite's stored TLE elements.
    Raises SGP4PropagationError if TLE elements are absent or invalid.
    """
    l1 = satellite.tle_line1
    l2 = satellite.tle_line2

    if not l1 or not l2:
        raise SGP4PropagationError(
            f"Satellite '{satellite.name}' (NORAD {satellite.norad_id}) does not have stored TLE records. "
            "Refresh satellite via POST /api/satellites/{norad_id}/refresh before propagation."
        )

    l1_clean = l1.strip()
    l2_clean = l2.strip()

    if len(l1_clean) != 69 or len(l2_clean) != 69:
        raise SGP4PropagationError(
            f"Stored TLE for satellite {satellite.norad_id} is malformed: "
            f"Line 1 length is {len(l1_clean)}, Line 2 length is {len(l2_clean)} (expected 69)."
        )

    try:
        satrec = Satrec.twoline2rv(l1_clean, l2_clean)
    except Exception as exc:
        raise SGP4PropagationError(
            f"Failed to initialize SGP4 Satrec for satellite {satellite.norad_id}: {exc}"
        ) from exc

    if satrec.error != 0:
        desc = SGP4_ERROR_DESCRIPTIONS.get(satrec.error, f"Unknown error code {satrec.error}")
        raise SGP4PropagationError(
            f"SGP4 initialization rejected orbital elements: {desc}",
            error_code=satrec.error,
        )

    return satrec, l1_clean, l2_clean


def propagate_satrec_point(
    satrec: Satrec,
    dt: datetime,
) -> Tuple[float, float, float, float, float, float]:
    """
    Executes SGP4 analytical propagation at datetime dt.
    Returns (x_km, y_km, z_km, vx_km_s, vy_km_s, vz_km_s) in the TEME reference frame.
    Raises SGP4PropagationError if propagation returns a non-zero error code or produces NaNs.
    """
    jd, fr = jday(
        dt.year,
        dt.month,
        dt.day,
        dt.hour,
        dt.minute,
        dt.second + dt.microsecond * 1e-6,
    )

    err_code, r, v = satrec.sgp4(jd, fr)

    if err_code != 0:
        desc = SGP4_ERROR_DESCRIPTIONS.get(err_code, f"SGP4 error code {err_code}")
        raise SGP4PropagationError(
            f"SGP4 propagation failed at {dt.isoformat()}: {desc}",
            error_code=err_code,
        )

    if any(math.isnan(c) for c in r) or any(math.isnan(c) for c in v):
        raise SGP4PropagationError(
            f"SGP4 propagation produced NaN coordinates at {dt.isoformat()}."
        )

    return r[0], r[1], r[2], v[0], v[1], v[2]


def evaluate_source_record_metadata(
    satellite: Satellite,
    satrec: Satrec,
    target_dt: datetime,
) -> SourceRecordInfo:
    """
    Constructs SourceRecordInfo including TLE epoch, age calculation,
    and stale-record warning indicators.
    """
    epoch_iso = satellite.tle_epoch
    epoch_dt: Optional[datetime] = None

    if epoch_iso:
        try:
            epoch_dt = parse_utc_iso_datetime(epoch_iso)
        except Exception:
            pass

    # If satellite.tle_epoch wasn't parsed, derive from satrec jdsatepoch
    if epoch_dt is None:
        try:
            # SGP4 satrec epoch calculation
            epoch_dt = datetime(2000, 1, 1, tzinfo=timezone.utc) + timedelta(
                days=(satrec.jdsatepoch + satrec.jdsatepochF - 2451544.5)
            )
            epoch_iso = epoch_dt.isoformat().replace("+00:00", "Z")
        except Exception:
            epoch_dt = target_dt
            epoch_iso = target_dt.isoformat()

    age_delta = target_dt - epoch_dt
    age_days = round(age_delta.total_seconds() / 86400.0, 3)
    is_extrapolated = abs(age_delta.total_seconds()) > 1.0

    warning: Optional[str] = None
    if abs(age_days) > VERY_STALE_TLE_THRESHOLD_DAYS:
        warning = (
            f"ORBITAL DATA STALE: TLE epoch is {abs(age_days):.1f} days from requested time. "
            "Propagation accuracy is severely degraded due to cumulative unmodeled atmospheric drag, "
            "solar radiation pressure, and potential orbital station-keeping maneuvers. "
            "Refresh satellite TLE from CelesTrak for operational tracking."
        )
    elif abs(age_days) > STALE_TLE_THRESHOLD_DAYS:
        warning = (
            f"ACCURACY WARNING: TLE epoch is {abs(age_days):.1f} days from requested time. "
            "Analytical SGP4 propagation accuracy degrades over multi-day extrapolations, especially for LEO orbits."
        )

    return SourceRecordInfo(
        record_id=satellite.id,
        norad_id=satellite.norad_id,
        epoch=epoch_iso,
        data_source=satellite.data_source or "SYNTHETIC",
        age_days=age_days,
        is_extrapolated=is_extrapolated,
        warning=warning,
    )


def propagate_satellite_position(
    satellite: Satellite,
    target_dt: datetime,
) -> SatellitePositionResponse:
    """
    Calculates the instantaneous SGP4 position and velocity vectors in the TEME reference frame
    and converts to WGS-84 Earth-fixed geodetic coordinates for a single satellite.
    """
    satrec, l1, l2 = initialize_satrec_from_satellite(satellite)
    x, y, z, vx, vy, vz = propagate_satrec_point(satrec, target_dt)

    r_mag = math.sqrt(x ** 2 + y ** 2 + z ** 2)
    v_mag = math.sqrt(vx ** 2 + vy ** 2 + vz ** 2)
    spherical_alt = r_mag - WGS84_A_KM

    position = PositionVector(
        x_km=round(x, 3),
        y_km=round(y, 3),
        z_km=round(z, 3),
        r_km=round(r_mag, 3),
        altitude_km=round(spherical_alt, 2),
    )
    velocity = VelocityVector(
        vx_km_s=round(vx, 4),
        vy_km_s=round(vy, 4),
        vz_km_s=round(vz, 4),
        speed_km_s=round(v_mag, 4),
    )
    geodetic = teme_to_geodetic(x, y, z, target_dt)
    source_record = evaluate_source_record_metadata(satellite, satrec, target_dt)

    return SatellitePositionResponse(
        norad_id=satellite.norad_id,
        name=satellite.name,
        timestamp=target_dt.isoformat().replace("+00:00", "Z"),
        reference_frame="TEME (True Equator, Mean Equinox)",
        propagator="SGP4 (Simplified General Perturbations-4 / Vallado)",
        position=position,
        velocity=velocity,
        geodetic=geodetic,
        source_record=source_record,
        status="SUCCESS",
        error=None,
    )


def propagate_satellite_track(
    satellite: Satellite,
    start_dt: datetime,
    end_dt: datetime,
    step_seconds: int = 60,
) -> OrbitTrackResponse:
    """
    Generates a sequence of propagated positions across a requested time range [start_dt, end_dt].
    Enforces maximum duration and point limits. Uses a single database model lookup and Satrec instance.
    """
    if end_dt <= start_dt:
        raise ValueError(
            f"End timestamp '{end_dt.isoformat()}' must be strictly after start timestamp '{start_dt.isoformat()}'."
        )

    duration_seconds = (end_dt - start_dt).total_seconds()
    if duration_seconds > MAX_TRACK_DURATION_SECONDS:
        raise ValueError(
            f"Requested track duration ({duration_seconds / 86400:.1f} days) exceeds maximum limit "
            f"of {MAX_TRACK_DURATION_SECONDS / 86400:.0f} days ({MAX_TRACK_DURATION_SECONDS:,} seconds)."
        )

    if step_seconds <= 0:
        raise ValueError(f"Step interval must be a positive integer, got {step_seconds}s.")

    total_points = int(duration_seconds // step_seconds) + 1
    if total_points > MAX_TRACK_POINTS:
        raise ValueError(
            f"Requested track would generate {total_points:,} points, which exceeds the maximum limit "
            f"of {MAX_TRACK_POINTS:,} points. Increase the step interval (currently {step_seconds}s) "
            "or shorten the time window."
        )

    satrec, l1, l2 = initialize_satrec_from_satellite(satellite)
    source_record = evaluate_source_record_metadata(satellite, satrec, start_dt)

    points: List[OrbitTrackPoint] = []
    current_dt = start_dt

    while current_dt <= end_dt:
        time_ms = int(current_dt.timestamp() * 1000)
        x, y, z, vx, vy, vz = propagate_satrec_point(satrec, current_dt)
        v_mag = math.sqrt(vx ** 2 + vy ** 2 + vz ** 2)
        geo = teme_to_geodetic(x, y, z, current_dt)

        points.append(
            OrbitTrackPoint(
                timestamp=current_dt.isoformat().replace("+00:00", "Z"),
                time_ms=time_ms,
                x_km=round(x, 3),
                y_km=round(y, 3),
                z_km=round(z, 3),
                vx_km_s=round(vx, 4),
                vy_km_s=round(vy, 4),
                vz_km_s=round(vz, 4),
                speed_km_s=round(v_mag, 4),
                latitude_deg=geo.latitude_deg,
                longitude_deg=geo.longitude_deg,
                altitude_km=geo.altitude_km,
                status="SUCCESS",
            )
        )
        current_dt += timedelta(seconds=step_seconds)

    return OrbitTrackResponse(
        norad_id=satellite.norad_id,
        name=satellite.name,
        reference_frame="TEME (True Equator, Mean Equinox)",
        propagator="SGP4 (Simplified General Perturbations-4 / Vallado)",
        start_time=start_dt.isoformat().replace("+00:00", "Z"),
        end_time=end_dt.isoformat().replace("+00:00", "Z"),
        step_seconds=step_seconds,
        total_points=len(points),
        source_record=source_record,
        points=points,
    )
