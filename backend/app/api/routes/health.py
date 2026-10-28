from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.schemas.health import HealthResponse

router = APIRouter(prefix="", tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service and Database Health Check",
    description="Probes the operational status of the Gagan Suraksha API and actively verifies database reachability.",
    responses={
        200: {
            "description": "API is online and the database is connected and responsive.",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "database": "connected",
                        "timestamp": "2026-10-27T12:30:00Z",
                        "version": "0.1.0",
                    }
                }
            },
        },
        503: {
            "description": "Database is unreachable or failed health check query.",
            "content": {
                "application/json": {
                    "example": {
                        "status": "unhealthy",
                        "database": "disconnected",
                        "timestamp": "2026-10-27T12:30:00Z",
                        "version": "0.1.0",
                    }
                }
            },
        },
    },
)
def get_health(db: Session = Depends(get_db)):
    """
    Evaluates backend and database health.
    Executes a lightweight query on the database. If connectivity fails,
    returns HTTP 503 Service Unavailable with database: disconnected.
    """
    now_utc = datetime.now(timezone.utc)
    try:
        # Actively test database connectivity
        db.execute(text("SELECT 1"))
        return HealthResponse(
            status="healthy",
            database="connected",
            timestamp=now_utc,
            version=settings.VERSION,
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "timestamp": now_utc.isoformat(),
                "version": settings.VERSION,
            },
        )
