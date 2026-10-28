from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import get_db
from backend.models.db_models import SatelliteModel

router = APIRouter(prefix="/satellites", tags=["Satellites"])


def serialize_satellite(sat: Any) -> Dict[str, Any]:
    """Serializes a satellite model to a dict with both camelCase and snake_case keys."""
    norad_id = getattr(sat, "norad_id", 0)
    name = getattr(sat, "name", "")
    obj_type = getattr(sat, "object_type", None) or getattr(sat, "type", "PAYLOAD")
    country = getattr(sat, "country", None) or getattr(sat, "owner_country", "India")
    operator = getattr(sat, "operator", "ISRO")
    sat_id = str(getattr(sat, "id", f"sat-{norad_id}"))

    created_at = getattr(sat, "created_at", None)
    if created_at and hasattr(created_at, "isoformat"):
        created_at_str = created_at.isoformat()
    else:
        created_at_str = "2026-10-27T12:00:00Z"

    updated_at = getattr(sat, "updated_at", None)
    if updated_at and hasattr(updated_at, "isoformat"):
        updated_at_str = updated_at.isoformat()
    else:
        updated_at_str = "2026-10-27T12:00:00Z"

    return {
        "id": sat_id,
        "norad_id": norad_id,
        "noradId": norad_id,
        "name": name,
        "intl_designator": getattr(sat, "intl_designator", ""),
        "intlDesignator": getattr(sat, "intl_designator", ""),
        "type": getattr(sat, "type", obj_type),
        "object_type": obj_type,
        "objectType": obj_type,
        "regime": getattr(sat, "regime", "LEO"),
        "is_indian": bool(getattr(sat, "is_indian", False)),
        "isIndian": bool(getattr(sat, "is_indian", False)),
        "is_watchlist": bool(getattr(sat, "is_watchlist", False)),
        "isWatchlist": bool(getattr(sat, "is_watchlist", False)),
        "launch_date": getattr(sat, "launch_date", None),
        "launchDate": getattr(sat, "launch_date", None),
        "owner_country": getattr(sat, "owner_country", country),
        "country": country,
        "operator": operator,
        "apogee_km": getattr(sat, "apogee_km", 550.0),
        "apogeeKm": getattr(sat, "apogee_km", 550.0),
        "perigee_km": getattr(sat, "perigee_km", 520.0),
        "perigeeKm": getattr(sat, "perigee_km", 520.0),
        "altitude_km": getattr(sat, "altitude_km", 535.0),
        "altitudeKm": getattr(sat, "altitude_km", 535.0),
        "inclination_deg": getattr(sat, "inclination_deg", 97.5),
        "inclinationDeg": getattr(sat, "inclination_deg", 97.5),
        "inclination": getattr(sat, "inclination_deg", 97.5),
        "period_min": getattr(sat, "period_min", 95.0),
        "periodMin": getattr(sat, "period_min", 95.0),
        "velocity_km_s": getattr(sat, "velocity_km_s", 7.6),
        "velocityKmS": getattr(sat, "velocity_km_s", 7.6),
        "tle_epoch": getattr(sat, "tle_epoch", "2026-10-27T12:00:00Z"),
        "tleEpoch": getattr(sat, "tle_epoch", "2026-10-27T12:00:00Z"),
        "tle_line1": getattr(sat, "tle_line1", ""),
        "tleLine1": getattr(sat, "tle_line1", ""),
        "tle_line2": getattr(sat, "tle_line2", ""),
        "tleLine2": getattr(sat, "tle_line2", ""),
        "data_source": getattr(sat, "data_source", "SYNTHETIC"),
        "dataSource": getattr(sat, "data_source", "SYNTHETIC"),
        "created_at": created_at_str,
        "updated_at": updated_at_str,
    }


@router.get("", response_model=List[Dict[str, Any]])
def get_satellites(
    regime: Optional[str] = Query(None, description="Filter by orbit regime (LEO, MEO, GEO, HEO)"),
    is_indian: Optional[bool] = Query(None, description="Filter by Indian nationality"),
    is_watchlist: Optional[bool] = Query(None, description="Filter by watchlist status"),
    type: Optional[str] = Query(None, description="Filter by satellite type (PAYLOAD, DEBRIS, etc.)"),
    search: Optional[str] = Query(None, description="Search by name or international designator"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max satellites to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieves all tracked satellites and space debris objects with optional filtering and pagination."""
    stmt = select(SatelliteModel)

    if regime:
        stmt = stmt.where(SatelliteModel.regime == regime.upper())
    if is_indian is not None:
        stmt = stmt.where(SatelliteModel.is_indian == is_indian)
    if is_watchlist is not None:
        stmt = stmt.where(SatelliteModel.is_watchlist == is_watchlist)
    if type:
        stmt = stmt.where(SatelliteModel.type == type.upper())
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            SatelliteModel.name.ilike(search_pattern)
            | SatelliteModel.intl_designator.ilike(search_pattern)
            | SatelliteModel.id.ilike(search_pattern)
        )

    stmt = stmt.order_by(SatelliteModel.norad_id.asc()).offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)

    satellites = db.scalars(stmt).all()
    return [serialize_satellite(sat) for sat in satellites]


@router.get("/primary")
def get_primary_satellite(db: Session = Depends(get_db)):
    """Returns primary satellite (CARTOSAT-2F, NORAD 43111)."""
    from backend.services.celestrak_service import get_live_satellite_state
    try:
        return get_live_satellite_state(43111)
    except Exception:
        sat = db.scalars(select(SatelliteModel).where(SatelliteModel.norad_id == 43111)).first()
        if sat:
            return serialize_satellite(sat)
        sat_any = db.scalars(select(SatelliteModel)).first()
        if sat_any:
            return serialize_satellite(sat_any)
        raise HTTPException(status_code=404, detail="Primary satellite not found")


@router.get("/live/{norad_id}")
def get_live_satellite(norad_id: int):
    """
    Retrieves live satellite state vectors and ground pass prediction schedules from live CelesTrak TLEs.
    """
    from backend.services.celestrak_service import get_live_satellite_state
    try:
        return get_live_satellite_state(norad_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{norad_id}")
def get_satellite(
    norad_id: int,
    db: Session = Depends(get_db),
):
    """Retrieves a single satellite record by NORAD catalog ID."""
    stmt = select(SatelliteModel).where(SatelliteModel.norad_id == norad_id)
    sat = db.scalars(stmt).first()
    if not sat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with NORAD ID {norad_id} not found",
        )
    return serialize_satellite(sat)


@router.post("/{norad_id}/refresh")
def refresh_satellite(
    norad_id: int,
    db: Session = Depends(get_db),
):
    """
    Refresh a single satellite's orbital data by NORAD ID from CelesTrak.
    """
    from backend.app.services.celestrak_service import (
        refresh_single_satellite,
        CelesTrakServiceError,
    )
    try:
        updated_sat = refresh_single_satellite(db, norad_id)
        return serialize_satellite(updated_sat)
    except CelesTrakServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh satellite {norad_id}: {exc}",
        )


@router.get("/{norad_id}/position")
def get_satellite_position(
    norad_id: int,
    timestamp: Optional[str] = Query(
        default=None,
        description="Target propagation UTC timestamp in ISO 8601 format (e.g., '2026-10-27T12:00:00Z')",
    ),
    db: Session = Depends(get_db),
):
    """Computes instantaneous satellite state vector via SGP4."""
    from backend.app.services.orbit_propagation import (
        parse_utc_iso_datetime,
        propagate_satellite_position,
        SGP4PropagationError,
    )

    stmt = select(SatelliteModel).where(SatelliteModel.norad_id == norad_id)
    sat = db.scalars(stmt).first()
    if not sat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with NORAD ID {norad_id} not found",
        )

    try:
        target_dt = parse_utc_iso_datetime(timestamp)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    try:
        return propagate_satellite_position(sat, target_dt)
    except SGP4PropagationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Propagation unexpected error: {exc}",
        )


@router.get("/{norad_id}/orbit/track")
def get_satellite_orbit_track(
    norad_id: int,
    start: str = Query(..., description="Start window UTC timestamp in ISO 8601 format"),
    end: str = Query(..., description="End window UTC timestamp in ISO 8601 format"),
    step: int = Query(default=60, ge=1, le=86400, description="Step interval in seconds"),
    db: Session = Depends(get_db),
):
    """Computes time-series orbit trajectory points via SGP4."""
    from backend.app.services.orbit_propagation import (
        parse_utc_iso_datetime,
        propagate_satellite_track,
        SGP4PropagationError,
    )

    stmt = select(SatelliteModel).where(SatelliteModel.norad_id == norad_id)
    sat = db.scalars(stmt).first()
    if not sat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with NORAD ID {norad_id} not found",
        )

    try:
        start_dt = parse_utc_iso_datetime(start)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid 'start' timestamp: {exc}",
        )

    try:
        end_dt = parse_utc_iso_datetime(end)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid 'end' timestamp: {exc}",
        )

    try:
        return propagate_satellite_track(sat, start_dt, end_dt, step_seconds=step)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except SGP4PropagationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Track propagation unexpected error: {exc}",
        )
