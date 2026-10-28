import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, synonym
from backend.app.db.base import Base


class Satellite(Base):
    """
    SQLAlchemy model representing satellite metadata, orbital elements, and catalog identity.
    NORAD catalog ID is unique and indexed.
    Compatible with existing database schemas and new instances.
    """
    __tablename__ = "satellites"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    norad_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    object_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # e.g., PAYLOAD, ROCKET BODY, DEBRIS, UNKNOWN
    type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    intl_designator: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    owner_country: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    operator: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    regime: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)  # LEO, MEO, GEO, HEO
    is_indian: Mapped[Optional[bool]] = mapped_column(Boolean, default=False, nullable=True)
    is_watchlist: Mapped[Optional[bool]] = mapped_column(Boolean, default=False, nullable=True)
    launch_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Orbital parameters derived via SGP4 from real TLE records
    apogee_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    perigee_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    altitude_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    inclination_deg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    period_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    velocity_km_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tle_epoch: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tle_line1: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tle_line2: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    line1 = synonym("tle_line1")
    line2 = synonym("tle_line2")
    data_source: Mapped[Optional[str]] = mapped_column(String(32), default="SYNTHETIC", nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Satellite(id='{self.id}', norad_id={self.norad_id}, name='{self.name}', data_source='{self.data_source}')>"
