"""API routes package."""
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.satellites import router as satellites_router

__all__ = ["health_router", "satellites_router"]
