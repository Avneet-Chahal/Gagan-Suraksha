"""
Unified Satellites router for Gagan Suraksha API.
Re-exported from backend.routers.satellites to provide all satellite metadata, live state, and SGP4 propagation endpoints.
"""
from backend.routers.satellites import router

__all__ = ["router"]
