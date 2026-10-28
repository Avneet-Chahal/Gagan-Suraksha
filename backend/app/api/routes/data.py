from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.satellite import Satellite
from backend.app.schemas.data_status import DataStatusResponse
from backend.app.schemas.satellite import SatelliteResponse
from backend.app.services.celestrak_service import (
    refresh_single_satellite,
    CelesTrakServiceError,
)

router = APIRouter(prefix="/data", tags=["Data Status & Ingestion"])


@router.get(
    "/status",
    response_model=DataStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Database Data Status",
    description="Reports the database's actual data status, including satellite counts, verified orbital elements count, CelesTrak vs synthetic breakdown, and last refresh timestamp.",
)
def get_data_status(db: Session = Depends(get_db)) -> DataStatusResponse:
    """
    Evaluates and reports honest, actual metrics directly queried from the database.
    """
    now_utc = datetime.now(timezone.utc)

    # Total satellites in database
    total_satellites = db.execute(select(func.count(Satellite.id))).scalar() or 0

    # Satellites with real/calculated orbital parameters
    satellites_with_orbital = db.execute(
        select(func.count(Satellite.id)).where(
            (Satellite.altitude_km.isnot(None)) | (Satellite.tle_line1.isnot(None))
        )
    ).scalar() or 0

    # CelesTrak ingested satellites
    celestrak_count = db.execute(
        select(func.count(Satellite.id)).where(Satellite.data_source == "CELESTRAK")
    ).scalar() or 0

    # Synthetic satellites
    synthetic_count = db.execute(
        select(func.count(Satellite.id)).where(
            (Satellite.data_source == "SYNTHETIC") | (Satellite.data_source.is_(None))
        )
    ).scalar() or 0

    # Indian space assets
    indian_count = db.execute(
        select(func.count(Satellite.id)).where(
            (Satellite.is_indian == True)
            | (Satellite.country.ilike("%India%"))
            | (Satellite.owner_country.ilike("%India%"))
        )
    ).scalar() or 0

    # Debris objects
    debris_count = db.execute(
        select(func.count(Satellite.id)).where(
            (Satellite.object_type == "DEBRIS") | (Satellite.type == "DEBRIS")
        )
    ).scalar() or 0

    # Most recent update timestamp
    max_updated = db.execute(select(func.max(Satellite.updated_at))).scalar()
    last_refresh_utc = max_updated.isoformat() if max_updated else None

    return DataStatusResponse(
        status="healthy",
        database="connected",
        total_satellites=total_satellites,
        satellites_with_orbital_data=satellites_with_orbital,
        celestrak_records_count=celestrak_count,
        synthetic_records_count=synthetic_count,
        indian_satellites_count=indian_count,
        debris_count=debris_count,
        last_refresh_utc=last_refresh_utc,
        timestamp=now_utc,
    )


@router.post(
    "/refresh/{norad_id}",
    response_model=SatelliteResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Satellite by NORAD ID",
    description="Fetches real TLE elements from CelesTrak GP API, validates SGP4 propagation, derives real orbital elements, and stores the updated record in the database.",
)
def refresh_satellite_data(
    norad_id: int,
    db: Session = Depends(get_db),
) -> SatelliteResponse:
    """
    Refresh orbital elements for a single satellite by NORAD ID.
    Stores real orbital records in the database.
    """
    try:
        updated_sat = refresh_single_satellite(db, norad_id)
        return updated_sat
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


@router.post(
    "/refresh",
    response_model=SatelliteResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Satellite or Primary Asset",
)
def refresh_satellite_query(
    norad_id: int = Query(default=25544, description="NORAD ID of satellite to refresh"),
    db: Session = Depends(get_db),
) -> SatelliteResponse:
    """
    Query-based refresh endpoint. Defaults to NORAD 25544 (ISS) if unspecified.
    """
    return refresh_satellite_data(norad_id=norad_id, db=db)
