from typing import Optional
from pydantic import BaseModel, Field, model_validator


class ManeuverOptimizeRequest(BaseModel):
    """Request schema for optimizing collision avoidance maneuvers."""
    spacecraft_mass_kg: float = Field(default=556.0, description="Spacecraft wet mass in kg", gt=0)
    isp_seconds: float = Field(default=220.0, description="Thruster specific impulse in seconds", gt=0)
    lead_time_hours: float = Field(default=12.0, description="Maneuver burn lead time prior to TCA in hours", ge=0.1)
    target_miss_distance_km: float = Field(default=2.0, description="Target separation threshold in km", gt=0)
    delta_v_ms: Optional[float] = Field(default=None, description="Optional specified delta-V in m/s (0 to 5 m/s)", ge=0, le=5.0)
    burn_direction: str = Field(default="POSIGRADE", description="Burn direction: POSIGRADE, RETROGRADE, RADIAL_OUT, or NORMAL")
    conjunction_id: Optional[str] = Field(default="historical-iridium-kosmos", description="Conjunction event ID")

    @model_validator(mode="before")
    @classmethod
    def accept_camel_case(cls, data: dict):
        if not isinstance(data, dict):
            return data
        mapping = {
            "spacecraftMassKg": "spacecraft_mass_kg",
            "ispSeconds": "isp_seconds",
            "leadTimeHours": "lead_time_hours",
            "targetMissDistanceKm": "target_miss_distance_km",
            "deltaVMs": "delta_v_ms",
            "burnDirection": "burn_direction",
            "conjunctionId": "conjunction_id",
        }
        converted = data.copy()
        for camel, snake in mapping.items():
            if camel in converted and snake not in converted:
                converted[snake] = converted[camel]
        return converted


class ManeuverOptimizeResponse(BaseModel):
    """Response schema detailing the optimized avoidance maneuver results."""
    conjunctionId: Optional[str] = Field(..., description="Target conjunction event ID")
    spacecraftMassKg: float = Field(..., description="Spacecraft wet mass (kg)")
    ispSeconds: float = Field(..., description="Specific impulse (s)")
    leadTimeHours: float = Field(..., description="Burn lead time relative to TCA (hours)")
    deltaVMs: float = Field(..., description="Impulsive velocity change (m/s)")
    burnDirection: str = Field(..., description="Thrust vector orientation")
    initialMissDistanceKm: float = Field(..., description="Pre-maneuver miss distance (km)")
    targetMissDistanceKm: float = Field(..., description="Target safety separation (km)")
    separationGainKm: float = Field(..., description="Additional separation gained via secular orbital drift (km)")
    postBurnMissDistanceKm: float = Field(..., description="Final miss distance achieved at TCA (km)")
    fuelMassCostKg: float = Field(..., description="Propellant mass consumed via Tsiolkovsky rocket equation (kg)")
    postManeuverCollisionProbability: float = Field(..., description="Residual collision probability after maneuver")
    achievedTarget: bool = Field(..., description="Whether separation exceeds target threshold (> 2.0 km)")
    status: str = Field("OPTIMAL", description="Optimization status: OPTIMAL, SUBOPTIMAL, or INSUFFICIENT")
