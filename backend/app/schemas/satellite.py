from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, model_validator


class SatelliteBase(BaseModel):
    norad_id: int = Field(
        ...,
        description="Unique NORAD Catalog ID assigned by Space Track",
        gt=0,
        examples=[25544],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Satellite / Space Object Name",
        examples=["ISS (ZARYA)"],
    )
    object_type: Optional[str] = Field(
        default=None,
        description="Classification: PAYLOAD, ROCKET BODY, DEBRIS, or UNKNOWN",
        examples=["PAYLOAD"],
    )
    type: Optional[str] = Field(
        default=None,
        description="Type classification alias",
        examples=["PAYLOAD"],
    )
    intl_designator: Optional[str] = Field(
        default=None,
        description="International COSPAR Designator",
        examples=["1998-067A"],
    )
    country: Optional[str] = Field(
        default=None,
        description="Country of origin or registry",
        examples=["International Space Station"],
    )
    owner_country: Optional[str] = Field(
        default=None,
        description="Owner country or space agency entity",
        examples=["International Space Station"],
    )
    operator: Optional[str] = Field(
        default=None,
        description="Operating space agency or commercial entity",
        examples=["NASA / Roscosmos"],
    )
    regime: Optional[str] = Field(
        default=None,
        description="Orbital regime: LEO, MEO, GEO, or HEO",
        examples=["LEO"],
    )
    is_indian: Optional[bool] = Field(
        default=False,
        description="Whether this is an Indian space asset",
    )
    is_watchlist: Optional[bool] = Field(
        default=False,
        description="Whether this object is on the high-priority conjunction monitoring watchlist",
    )
    launch_date: Optional[str] = Field(
        default=None,
        description="Launch date string",
    )
    apogee_km: Optional[float] = Field(
        default=None,
        description="Apogee altitude above Earth surface in kilometers",
        examples=[422.5],
    )
    perigee_km: Optional[float] = Field(
        default=None,
        description="Perigee altitude above Earth surface in kilometers",
        examples=[416.3],
    )
    altitude_km: Optional[float] = Field(
        default=None,
        description="Mean altitude above Earth surface in kilometers",
        examples=[419.4],
    )
    inclination_deg: Optional[float] = Field(
        default=None,
        description="Orbital inclination relative to equatorial plane in degrees",
        examples=[51.64],
    )
    period_min: Optional[float] = Field(
        default=None,
        description="Orbital period in minutes",
        examples=[92.87],
    )
    velocity_km_s: Optional[float] = Field(
        default=None,
        description="Instantaneous orbital velocity in km/s",
        examples=[7.66],
    )
    tle_epoch: Optional[str] = Field(
        default=None,
        description="UTC timestamp of the TLE epoch",
        examples=["2026-10-27T10:30:00Z"],
    )
    tle_line1: Optional[str] = Field(
        default=None,
        description="Standard 69-character TLE Line 1",
    )
    tle_line2: Optional[str] = Field(
        default=None,
        description="Standard 69-character TLE Line 2",
    )
    data_source: Optional[str] = Field(
        default=None,
        description="Source of orbital record: CELESTRAK, SYNTHETIC, etc.",
        examples=["CELESTRAK"],
    )

    @model_validator(mode="before")
    @classmethod
    def sync_aliases(cls, data: dict):
        if hasattr(data, "__dict__"):
            data_dict = data.__dict__.copy()
        elif isinstance(data, dict):
            data_dict = data.copy()
        else:
            return data

        # Sync object_type <-> type
        if not data_dict.get("object_type") and data_dict.get("type"):
            data_dict["object_type"] = data_dict["type"]
        if not data_dict.get("type") and data_dict.get("object_type"):
            data_dict["type"] = data_dict["object_type"]

        # Sync country <-> owner_country
        if not data_dict.get("country") and data_dict.get("owner_country"):
            data_dict["country"] = data_dict["owner_country"]
        if not data_dict.get("owner_country") and data_dict.get("country"):
            data_dict["owner_country"] = data_dict["country"]

        return data_dict


class SatelliteCreate(SatelliteBase):
    """Schema for inserting a new satellite record."""
    pass


class SatelliteResponse(SatelliteBase):
    """Public satellite response schema."""
    id: Union[int, str] = Field(..., description="Internal database unique ID", examples=[1])
    created_at: Optional[datetime] = Field(default=None, description="Timestamp of record creation in UTC")
    updated_at: Optional[datetime] = Field(default=None, description="Timestamp of last update in UTC")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "norad_id": 25544,
                "name": "ISS (ZARYA)",
                "object_type": "PAYLOAD",
                "country": "International Space Station",
                "operator": "NASA / Roscosmos",
                "apogee_km": 422.5,
                "perigee_km": 416.3,
                "altitude_km": 419.4,
                "inclination_deg": 51.64,
                "period_min": 92.87,
                "velocity_km_s": 7.66,
                "tle_epoch": "2026-10-27T10:30:00Z",
                "data_source": "CELESTRAK",
                "created_at": "2026-10-27T12:00:00Z",
                "updated_at": "2026-10-27T12:00:00Z",
            }
        },
    )


class PaginatedSatellitesResponse(BaseModel):
    """Paginated list of satellites."""
    total: int = Field(..., description="Total number of satellite records matching query", examples=[0])
    limit: int = Field(..., description="Pagination page limit applied", examples=[100])
    offset: int = Field(..., description="Pagination page offset applied", examples=[0])
    items: List[SatelliteResponse] = Field(default_factory=list, description="Array of satellite records")
