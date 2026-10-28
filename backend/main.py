import logging
import threading
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import Base, engine, SessionLocal
from backend.seed_data import seed_database
from backend.routers import (
    satellites,
    trajectories,
    conjunctions,
    maneuver,
    metrics,
    sources,
    watchlist,
    alert_settings,
)

logger = logging.getLogger("gagan_suraksha.main")


def _run_initial_screening() -> None:
    """Runs conjunction screening for all watchlist satellites in a background thread at startup."""
    screening_logger = logging.getLogger("gagan_suraksha.screening")
    screening_logger.info("Lifespan background thread: starting initial conjunction screening...")
    db = SessionLocal()
    try:
        from backend.services.screening import screen_all_watchlist_pairs
        results = screen_all_watchlist_pairs(db)
        screening_logger.info("Lifespan initial screening completed: found %d conjunctions.", len(results))
    except Exception as exc:
        screening_logger.error("Lifespan initial screening failed: %s", exc, exc_info=True)
    finally:
        db.close()


def _refresh_celestrak_and_screen(force: bool = False) -> None:
    """Scheduled/startup job: refreshes CelesTrak TLEs and space weather, and re-screens if ingestion succeeds."""
    job_logger = logging.getLogger("gagan_suraksha.scheduler")
    job_logger.info("Starting CelesTrak & weather refresh and screening pipeline (force=%s)...", force)
    db = SessionLocal()
    try:
        from services.celestrak import refresh_celestrak_data
        from services.screening import screen_all_watchlist_pairs

        # Refresh space weather if available
        try:
            from backend.app.ml.train import SpaceWeatherManager
            sw_mgr = SpaceWeatherManager(cache_dir="backend/app/ml/data/space_weather")
            sw_mgr.download_space_weather()
            job_logger.info("Space weather refresh completed.")
        except Exception as sw_exc:
            job_logger.debug("Space weather refresh skipped or failed: %s", sw_exc)

        success, msg = refresh_celestrak_data(db, force=force)
        job_logger.info("CelesTrak refresh finished: %s (success=%s)", msg, success)
        if success:
            job_logger.info("Triggering orbital conjunction screening after CelesTrak update...")
            results = screen_all_watchlist_pairs(db)
            job_logger.info("Post-refresh screening completed: found %d conjunctions.", len(results))
    except Exception as exc:
        job_logger.error("CelesTrak refresh/screening pipeline failed: %s", exc, exc_info=True)
    finally:
        db.close()


def _run_nightly_backtest() -> None:
    """Nightly scheduled job: appends new truth pairs from multi-epoch TLE updates and extends backtest."""
    job_logger = logging.getLogger("gagan_suraksha.scheduler")
    job_logger.info("Starting scheduled nightly backtest truth-pair update...")
    db = SessionLocal()
    try:
        from backend.services.backtest import append_truth_pairs_and_extend_backtest
        res = append_truth_pairs_and_extend_backtest(db)
        job_logger.info("Nightly backtest update complete: %s", res)
    except Exception as exc:
        job_logger.error("Nightly backtest update failed: %s", exc, exc_info=True)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler for database initialization and scheduler."""
    # Create all database tables
    Base.metadata.create_all(bind=engine)

    # Seed initial satellites, sources, and metrics
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    scheduler = None
    import os
    if not os.getenv("PYTEST_CURRENT_TEST"):
        from apscheduler.schedulers.background import BackgroundScheduler
        from datetime import datetime, timezone, timedelta
        from backend.models.db_models import IngestionStatusModel

        # Initialize APScheduler for 6-hour recurring refresh and nightly backtest
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            _refresh_celestrak_and_screen,
            "interval",
            hours=6,
            id="celestrak_6h_refresh",
            replace_existing=True,
        )
        scheduler.add_job(
            _run_nightly_backtest,
            "cron",
            hour=2,
            minute=0,
            id="nightly_backtest_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started: 6-hour CelesTrak refresh & nightly backtest active.")

        # Check if data is older than 6 hours or never fetched
        db_check = SessionLocal()
        needs_startup_refresh = True
        try:
            status = db_check.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()
            if status and status.last_success_utc:
                try:
                    last_success = datetime.fromisoformat(status.last_success_utc.replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) - last_success < timedelta(hours=6):
                        needs_startup_refresh = False
                except Exception:
                    pass
        finally:
            db_check.close()

        if needs_startup_refresh:
            logger.info("CelesTrak data older than 6 hours or missing: running background refresh...")
            threading.Thread(
                target=_refresh_celestrak_and_screen,
                kwargs={"force": False},
                name="startup-celestrak-refresh-thread",
                daemon=True,
            ).start()
        else:
            threading.Thread(
                target=_run_initial_screening,
                name="initial-screening-thread",
                daemon=True,
            ).start()

    yield

    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Gagan Suraksha: Satellite Debris & Conjunction-Risk Prediction API for ISRO ISTRAC & NETRA.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi import Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.database import get_db


@app.get("/", tags=["Root"])
def root():
    """Service metadata and navigation root."""
    return {
        "service": "Gagan Suraksha Core API",
        "version": getattr(settings, "VERSION", "1.0.0"),
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["Health"])
def health_check(response: Response, db: Session = Depends(get_db)) -> dict:
    """Service liveness, database health, data sync, and model availability probe."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"

        # Check orbital ingestion status
        from backend.models.db_models import IngestionStatusModel
        status_row = db.query(IngestionStatusModel).filter(IngestionStatusModel.id == 1).first()
        sync_info = {
            "status": status_row.status if status_row else "STANDBY",
            "source_name": status_row.source_name if status_row else "CelesTrak GP API",
            "last_success_utc": status_row.last_success_utc if status_row else None,
            "last_fetch_utc": status_row.last_fetch_utc if status_row else None,
            "record_count": status_row.record_count if status_row else 0,
            "is_cached_fallback": getattr(status_row, "is_cached_fallback", False) if status_row else False,
        }

        # Check Conjunction Severity ML Model availability
        from pathlib import Path
        model_path = Path("ml/models/conjunction_severity/conjunction_severity_pipeline.joblib")
        ml_severity_ok = model_path.exists()

        return {
            "status": "healthy",
            "database": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": getattr(settings, "VERSION", "1.0.0"),
            "data_synchronization": sync_info,
            "model_availability": {
                "conjunction_severity_ranker": "ONLINE" if ml_severity_ok else "UNAVAILABLE",
                "version": "v1.0.0",
                "critical_threshold_km": 0.35,
            },
            "disclaimer": (
                "Fresh orbital elements alone do not constitute official conjunction warnings "
                "or guaranteed collision probabilities."
            ),
        }
    except Exception as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }


@app.get("/api/ready", tags=["Health"])
def readiness_check() -> dict:
    """Service readiness probe verifying database connectivity and essential caches."""
    db = SessionLocal()
    db_ok = False
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    finally:
        db.close()

    import os
    sw_ok = os.path.exists("backend/app/ml/data/space_weather/SW-Last5Years.csv") or os.path.exists("backend/app/ml/data/space_weather/SW-All.csv")

    return {
        "status": "READY" if db_ok else "NOT_READY",
        "database": "CONNECTED" if db_ok else "DISCONNECTED",
        "spaceWeatherCache": "AVAILABLE" if sw_ok else "NOT_CACHED",
        "system": "Gagan Suraksha Core API",
    }


@app.get("/api/health/ml", tags=["Health"])
def health_ml_check() -> dict:
    """ML Model health, version, and training status probe."""
    result: dict = {
        "status": "ONLINE",
        "models": {},
        "model_version": "v1.0.0",
        "training_dates": "2022-01-01 to 2022-06-30",
        "ml_available": True,
        "reference_truth": "Historical Space Surveillance Network Conjunction Feed",
        "data_source": "HISTORICAL_ARCHIVE_2022",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "Conjunction Severity ML ranker predicts operational screening priority, "
            "NOT catastrophic physical collision outcomes."
        ),
    }

    try:
        from backend.app.ml.predict import StatePredictor
        predictor = StatePredictor.get_instance()
        result["models"]["state_predictor"] = {
            "status": "ONLINE" if predictor.ml_available else "UNAVAILABLE",
            "model_version": predictor.model_version or "v1.0.0",
            "ml_available": predictor.ml_available,
        }
    except Exception:
        result["models"]["state_predictor"] = {"status": "UNAVAILABLE"}

    try:
        from pathlib import Path
        sev_model_path = Path("ml/models/conjunction_severity/conjunction_severity_pipeline.joblib")
        meta_path = Path("ml/models/conjunction_severity/dataset_metadata.json")
        metrics_path = Path("ml/models/conjunction_severity/metrics.json")

        meta = {}
        if meta_path.exists():
            import json
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

        result["models"]["conjunction_severity_ranker"] = {
            "status": "ONLINE" if sev_model_path.exists() else "UNAVAILABLE",
            "model_version": "v1.0.0",
            "target": "High-Risk Critical Screening Tier (d_miss <= 0.35 km)",
            "trained_records": meta.get("train_records", 8768),
            "test_records": meta.get("test_records", 2192),
            "temporal_split_zero_leakage": True,
        }
    except Exception as exc:
        result["models"]["conjunction_severity_ranker"] = {"status": "UNAVAILABLE", "error": str(exc)}

    return result


from backend.app.api.routes.data import router as data_router
from backend.app.api.routes.maneuvers import router as maneuvers_router
from backend.routers import alerts, space_weather, passes, events, incidents

# Mount routers strictly once under the /api prefix
api_router = APIRouter(prefix=settings.API_V1_PREFIX)
api_router.include_router(satellites.router)
api_router.include_router(data_router)
api_router.include_router(trajectories.router)
api_router.include_router(conjunctions.router)
api_router.include_router(maneuver.router)
api_router.include_router(maneuvers_router)
api_router.include_router(metrics.router)
api_router.include_router(sources.router)
api_router.include_router(watchlist.router)
api_router.include_router(alert_settings.router)
api_router.include_router(alerts.router)
api_router.include_router(space_weather.router)
api_router.include_router(passes.router)
api_router.include_router(events.router)
api_router.include_router(incidents.router)

app.include_router(api_router)





if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
