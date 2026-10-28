"""
Unified application entry point for Gagan Suraksha API.
Canonical FastAPI app defined in backend.main and re-exported here for backward compatibility
with existing scripts, tests, and active Uvicorn server processes.
"""
from backend.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    from backend.config import settings
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
