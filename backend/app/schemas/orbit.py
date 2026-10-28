from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class PositionVector(BaseModel):
    """3D Cartesian position vector in the True Equator, Mean Equinox (TEME) frame."""
    x_km: float = Field(..., description="X coordinate in TEME frame (km)", examples=[-2345.67])
    y_km: float = Field(..., description="Y coordinate in TEME frame (km)", examples=[5432.10])
    z_km: float = Field(..., description="Z coordinate in TEME frame (km)", examples=[3210.98])
    r_km: float = Field(..., description="Euclidean distance from geocenter (|r|) in km", examples=[6798.5])
    altitude_km: float = Field(..., description="Approximate altitude above mean spherical Earth (km)", examples=[420.36])


class VelocityVector(BaseModel):
    """3D Cartesian velocity vector in the True Equator, Mean Equinox (TEME) frame."""
    vx_km_s: float = Field(..., description="Velocity component along X axis in TEME (km/s)", examples=[-4.521])
    vy_km_s: float = Field(..., description="Velocity component along Y axis in TEME (km/s)", examples=[-3.124])
    vz_km_s: float = Field(..., description="Velocity component along Z axis in TEME (km/s)", examples=[5.102])
    speed_km_s: float = Field(..., description="Scalar speed magnitude (|v|) in km/s", examples=[7.662])


class GeodeticCoordinates(BaseModel):
    """Geodetic coordinates referenced to the WGS-84 Earth ellipsoid."""
    latitude_deg: float = Field(..., description="Geodetic latitude in degrees [-90.0, +90.0]", examples=[28.6139])
    longitude_deg: float = Field(..., description="Geodetic longitude in degrees [-180.0, +180.0]", examples=[77.2090])
    altitude_km: float = Field(..., description="Height above WGS-84 reference ellipsoid in km", examples=[418.52])
    reference_ellipsoid: str = Field("WGS-84", description="Reference ellipsoid model used for geodetic projection")


class SourceRecordInfo(BaseModel):
    """Metadata regarding the source orbital record (TLE) used for propagation."""
    record_id: Union[int, str] = Field(..., description="Internal database ID of the source orbital record")
    norad_id: int = Field(..., description="NORAD Catalog ID of the satellite")
    epoch: str = Field(..., description="UTC timestamp of the orbital epoch")
    data_source: str = Field(..., description="Origin of orbital elements: CELESTRAK, SYNTHETIC, etc.")
    age_days: float = Field(..., description="Age of the TLE relative to the requested propagation timestamp in decimal days")
    is_extrapolated: bool = Field(..., description="True if requested propagation timestamp differs from the TLE epoch")
    warning: Optional[str] = Field(None, description="Warning if TLE is stale (> 7 days) and accuracy has degraded")


class SatellitePositionResponse(BaseModel):
    """Complete SGP4 state vector response at a requested instant."""
    norad_id: int = Field(..., description="NORAD Catalog ID")
    name: str = Field(..., description="Satellite name")
    timestamp: str = Field(..., description="Requested propagation timestamp in ISO 8601 UTC format")
    reference_frame: str = Field(
        "TEME (True Equator, Mean Equinox)",
        description="Standard inertial coordinate reference frame for SGP4 propagation",
    )
    propagator: str = Field(
        "SGP4 (Simplified General Perturbations-4 / Vallado)",
        description="Analytical astrodynamics propagation model",
    )
    position: PositionVector = Field(..., description="Position vector in TEME frame")
    velocity: VelocityVector = Field(..., description="Velocity vector in TEME frame")
    geodetic: Optional[GeodeticCoordinates] = Field(None, description="Earth-fixed geodetic coordinates on WGS-84 ellipsoid")
    source_record: SourceRecordInfo = Field(..., description="Source orbital elements and epoch metadata")
    status: str = Field("SUCCESS", description="Propagation status: SUCCESS, DEGRADED, or ERROR")
    error: Optional[str] = Field(None, description="Description of any mathematical or physical propagation anomaly")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "norad_id": 25544,
                "name": "ISS (ZARYA)",
                "timestamp": "2026-10-27T12:00:00Z",
                "reference_frame": "TEME (True Equator, Mean Equinox)",
                "propagator": "SGP4 (Simplified General Perturbations-4 / Vallado)",
                "position": {
                    "x_km": -2345.67,
                    "y_km": 5432.10,
                    "z_km": 3210.98,
                    "r_km": 6798.50,
                    "altitude_km": 420.36,
                },
                "velocity": {
                    "vx_km_s": -4.521,
                    "vy_km_s": -3.124,
                    "vz_km_s": 5.102,
                    "speed_km_s": 7.662,
                },
                "geodetic": {
                    "latitude_deg": 28.6139,
                    "longitude_deg": 77.2090,
                    "altitude_km": 418.52,
                    "reference_ellipsoid": "WGS-84",
                },
                "source_record": {
                    "record_id": "f5f1b2ef-51a9-49a5-a2c2-206fa923f1d5",
                    "norad_id": 25544,
                    "epoch": "2026-10-27T04:14:31.558560Z",
                    "data_source": "CELESTRAK",
                    "age_days": 0.32,
                    "is_extrapolated": True,
                    "warning": None,
                },
                "status": "SUCCESS",
                "error": None,
            }
        }
    )


class OrbitTrackPoint(BaseModel):
    """Single discrete point in an orbit trajectory sequence."""
    timestamp: str = Field(..., description="Point timestamp in ISO 8601 UTC format")
    time_ms: int = Field(..., description="Epoch milliseconds since Unix epoch (1970-01-01T00:00:00Z)")
    x_km: float = Field(..., description="X coordinate in TEME frame (km)")
    y_km: float = Field(..., description="Y coordinate in TEME frame (km)")
    z_km: float = Field(..., description="Z coordinate in TEME frame (km)")
    vx_km_s: float = Field(..., description="Velocity component along X axis (km/s)")
    vy_km_s: float = Field(..., description="Velocity component along Y axis (km/s)")
    vz_km_s: float = Field(..., description="Velocity component along Z axis (km/s)")
    speed_km_s: float = Field(..., description="Speed magnitude (km/s)")
    latitude_deg: float = Field(..., description="Geodetic latitude on WGS-84 (deg)")
    longitude_deg: float = Field(..., description="Geodetic longitude on WGS-84 (deg)")
    altitude_km: float = Field(..., description="Height above WGS-84 ellipsoid (km)")
    status: str = Field("SUCCESS", description="Point propagation status")


class OrbitTrackResponse(BaseModel):
    """Response containing time-series orbit track positions generated by SGP4."""
    norad_id: int = Field(..., description="NORAD Catalog ID")
    name: str = Field(..., description="Satellite name")
    reference_frame: str = Field("TEME (True Equator, Mean Equinox)", description="Inertial coordinate reference frame")
    propagator: str = Field("SGP4 (Simplified General Perturbations-4 / Vallado)", description="Propagator algorithm")
    start_time: str = Field(..., description="Beginning of track time window in ISO 8601 UTC")
    end_time: str = Field(..., description="End of track time window in ISO 8601 UTC")
    step_seconds: int = Field(..., description="Step interval between successive trajectory points in seconds")
    total_points: int = Field(..., description="Number of trajectory points generated")
    source_record: SourceRecordInfo = Field(..., description="Metadata of source orbital elements used")
    points: List[OrbitTrackPoint] = Field(default_factory=list, description="Array of time-series propagated points")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "norad_id": 25544,
                "name": "ISS (ZARYA)",
                "reference_frame": "TEME (True Equator, Mean Equinox)",
                "propagator": "SGP4 (Simplified General Perturbations-4 / Vallado)",
                "start_time": "2026-10-27T12:00:00Z",
                "end_time": "2026-10-27T13:30:00Z",
                "step_seconds": 60,
                "total_points": 91,
                "source_record": {
                    "record_id": "f5f1b2ef-51a9-49a5-a2c2-206fa923f1d5",
                    "norad_id": 25544,
                    "epoch": "2026-10-27T04:14:31.558560Z",
                    "data_source": "CELESTRAK",
                    "age_days": 0.32,
                    "is_extrapolated": True,
                    "warning": None,
                },
                "points": [],
            }
        }
    )
