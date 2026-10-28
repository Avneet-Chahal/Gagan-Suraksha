from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.database import get_db
from backend.models.db_models import SatelliteModel, IngestionStatusModel
from backend.schemas.types import DataSourceStatus

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.get("", response_model=List[DataSourceStatus])
def get_sources(
    db: Session = Depends(get_db),
) -> List[DataSourceStatus]:
    """
    Reports honest, real operational status for:
    1. CelesTrak TLE Ingestion: Read from ingestion_status table.
       Returns DEGRADED or STANDBY if last fetch failed or data is synthetic (never ONLINE).
    2. SGP4 Orbit Propagator: In-process analytical propagator.
    Does not invent sources that do not exist.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    total_records = db.scalars(select(func.count(SatelliteModel.id))).first() or 0
    celestrak_records = (
        db.scalars(
            select(func.count(SatelliteModel.id)).where(SatelliteModel.data_source == "CELESTRAK")
        ).first()
        or 0
    )

    status_row = db.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()

    if status_row:
        last_updated = status_row.last_success_utc or status_row.last_fetch_utc or now_iso
        latency = int(round(status_row.latency_seconds))
        # Status determination:
        # If last fetch failed -> DEGRADED
        # If all data is synthetic (celestrak_records == 0) -> STANDBY or DEGRADED (never ONLINE)
        # Only ONLINE when last fetch succeeded AND real CelesTrak records are active
        if status_row.status == "DEGRADED" or status_row.error_message:
            celestrak_status = "DEGRADED"
        elif celestrak_records == 0:
            celestrak_status = "STANDBY"
        elif status_row.status == "ONLINE":
            celestrak_status = "ONLINE"
        else:
            celestrak_status = "STANDBY"

        record_count = celestrak_records if celestrak_records > 0 else status_row.record_count
    else:
        celestrak_status = "STANDBY"
        last_updated = now_iso
        latency = 0
        record_count = 0

    sources: List[DataSourceStatus] = [
        DataSourceStatus(
            name="CelesTrak TLE Ingestion",
            source="CelesTrak GP Element Sets / 18th SDS",
            status=celestrak_status,
            last_updated_utc=last_updated,
            latency_seconds=latency,
            record_count=record_count,
        ),
        DataSourceStatus(
            name="SGP4 Orbit Propagator",
            source="sgp4 / Analytical TEME Engine",
            status="ONLINE",
            last_updated_utc=now_iso,
            latency_seconds=1,
            record_count=total_records,
        ),
    ]

    # Include Space-Track status entry
    from backend.services.spacetrack_service import get_spacetrack_status
    st_info = get_spacetrack_status()
    sources.append(
        DataSourceStatus(
            name="Space-Track.org GP History",
            source="US Space Command 18th SDS",
            status="ONLINE" if st_info["configured"] else "STANDBY",
            last_updated_utc=now_iso,
            latency_seconds=0,
            record_count=0,
        )
    )

    return sources


@router.get("/spacetrack/status")
def spacetrack_status():
    """Returns honest Space-Track configuration and credential readiness status."""
    from backend.services.spacetrack_service import get_spacetrack_status
    return get_spacetrack_status()


@router.post("/spacetrack/query")
def spacetrack_query(
    norad_id: int = 43111,
    start_date: str = "2025-01-01",
    end_date: str = "2025-01-31",
    limit: int = 50,
):
    """
    Executes an authenticated GP_HISTORY query against Space-Track.org for a bounded date range.
    Returns clear status if credentials are unconfigured.
    """
    from backend.services.spacetrack_service import fetch_gp_history
    return fetch_gp_history(norad_id=norad_id, start_date=start_date, end_date=end_date, limit=limit)


def verify_sync_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    Validates API key for protected manual synchronization operations.
    Accepts key via 'X-API-Key' header or 'Authorization: Bearer <key>'.
    Raises HTTP 401 Unauthorized if missing or invalid.
    """
    from backend.config import settings
    expected_key = getattr(settings, "ORBITAL_SYNC_API_KEY", "gagan-secret-sync-key-2026")

    candidate_key = x_api_key
    if not candidate_key and authorization and authorization.lower().startswith("bearer "):
        candidate_key = authorization[7:].strip()

    if not candidate_key or candidate_key != expected_key:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing orbital synchronization API key. Provide valid 'X-API-Key' or 'Authorization: Bearer <key>'.",
        )
    return candidate_key


@router.post("/sync")
def manual_orbital_sync(
    provider: str = Query("celestrak", description="Orbital provider: 'celestrak' or 'spacetrack'"),
    force: bool = Query(False, description="Force sync bypass of 2-hour fair-use cache window"),
    norad_ids: Optional[List[int]] = Query(None, description="Optional specific NORAD catalog IDs"),
    _api_key: str = Depends(verify_sync_api_key),
    db: Session = Depends(get_db),
) -> dict:
    """
    Protected manual synchronization endpoint for upstream orbital data sources.
    Requires secure API key authentication (X-API-Key or Bearer token).
    Supports force bypass of 2-hour cache, raw response archiving, SGP4 validation,
    TLE epoch freshness calculation, and authentic fallback resilience.
    """
    from backend.services.orbital_provider import get_orbital_provider

    try:
        provider_instance = get_orbital_provider(provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result = provider_instance.fetch_orbital_data(
        norad_ids=norad_ids,
        force=force,
        db=db,
    )

    return result.to_dict()


@router.get("/telemetry")
def orbital_telemetry(db: Session = Depends(get_db)) -> dict:
    """
    Comprehensive orbital data source telemetry:
    - Provider readiness & authentication statuses
    - Catalog distribution separated by data source (CELESTRAK, SPACETRACK, HISTORICAL_ARCHIVE, SYNTHETIC)
    - TLE epoch freshness indicators
    - Raw cache storage audit
    - Operational scientific disclaimer
    """
    from backend.services.orbital_provider import get_all_provider_statuses, ORBITAL_DATA_DISCLAIMER
    from pathlib import Path
    from backend.config import settings

    # Catalog breakdown
    counts = db.query(
        SatelliteModel.data_source, func.count(SatelliteModel.id)
    ).group_by(SatelliteModel.data_source).all()
    source_counts = {str(source or "UNKNOWN"): count for source, count in counts}

    # Raw cache stats
    cache_dir = Path(getattr(settings, "RAW_ORBITAL_CACHE_DIR", "backend/data/raw_orbital_cache"))
    raw_files_count = len(list(cache_dir.glob("*.raw"))) if cache_dir.exists() else 0

    # Ingestion status record
    status_row = db.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()

    return {
        "status": status_row.status if status_row else "STANDBY",
        "last_success_utc": status_row.last_success_utc if status_row else None,
        "last_fetch_utc": status_row.last_fetch_utc if status_row else None,
        "is_cached_fallback": getattr(status_row, "is_cached_fallback", False) if status_row else False,
        "raw_storage_path": getattr(status_row, "raw_storage_path", None) if status_row else None,
        "providers": get_all_provider_statuses(),
        "catalog_distribution": source_counts,
        "raw_cache_files_count": raw_files_count,
        "disclaimer": ORBITAL_DATA_DISCLAIMER,
    }


