from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall service status (healthy or unhealthy)", examples=["healthy"])
    database: str = Field(..., description="Database connectivity status (connected or disconnected)", examples=["connected"])
    timestamp: datetime = Field(..., description="Current UTC timestamp of the health check evaluation")
    version: str = Field(..., description="Application backend version", examples=["0.1.0"])
