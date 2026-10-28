from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DataStatusResponse(BaseModel):
    """
    Response model detailing the current operational status of the database and ingested datasets.
    """
    status: str = Field("healthy", description="Overall system data status: healthy, degraded, or offline")
    database: str = Field("connected", description="Database reachability state")
    total_satellites: int = Field(..., description="Total satellite records stored in catalog")
    satellites_with_orbital_data: int = Field(..., description="Number of satellites with valid orbital elements and TLEs")
    celestrak_records_count: int = Field(..., description="Satellites ingested from CelesTrak GP API")
    synthetic_records_count: int = Field(..., description="Satellites initialized with baseline/synthetic parameters")
    indian_satellites_count: int = Field(..., description="Total Indian national space assets")
    debris_count: int = Field(..., description="Total tracked space debris objects")
    last_refresh_utc: Optional[str] = Field(None, description="Timestamp of the most recent catalog update in UTC")
    timestamp: datetime = Field(..., description="UTC timestamp when this status probe was executed")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "database": "connected",
                "total_satellites": 164,
                "satellites_with_orbital_data": 164,
                "celestrak_records_count": 8,
                "synthetic_records_count": 156,
                "indian_satellites_count": 18,
                "debris_count": 120,
                "last_refresh_utc": "2026-10-27T12:00:00Z",
                "timestamp": "2026-10-27T12:30:00Z",
            }
        }
    }
