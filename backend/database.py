from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from backend.config import settings

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI workers.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def run_migrations(engine) -> None:
    """Ensures existing SQLite databases have required schema additions."""
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(satellites);")
            columns = [row[1] for row in result.fetchall()]
            if columns and "data_source" not in columns:
                conn.exec_driver_sql("ALTER TABLE satellites ADD COLUMN data_source VARCHAR(32) DEFAULT 'SYNTHETIC';")
                conn.commit()
        except Exception:
            pass

        try:
            result = conn.exec_driver_sql("PRAGMA table_info(conjunctions);")
            columns = [row[1] for row in result.fetchall()]
            if columns:
                if "pc_raw" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN pc_raw FLOAT DEFAULT 0.0;")
                if "pc_ml" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN pc_ml FLOAT DEFAULT 0.0;")
                if "pc_ml_calibrated" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN pc_ml_calibrated FLOAT DEFAULT 0.0;")
                if "ml_available" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN ml_available BOOLEAN DEFAULT 0;")
                if "model_version" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN model_version VARCHAR(32) DEFAULT 'v1.0.0';")
                if "data_source" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN data_source VARCHAR(32) DEFAULT 'real';")
                if "is_historical" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN is_historical BOOLEAN DEFAULT 0;")
                if "prop_time_1_days" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN prop_time_1_days FLOAT;")
                if "prop_time_2_days" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN prop_time_2_days FLOAT;")
                if "raw_min_range_km" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN raw_min_range_km FLOAT;")
                if "raw_rel_vel_km_s" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN raw_rel_vel_km_s FLOAT;")
                if "tle_epoch_1_utc" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN tle_epoch_1_utc VARCHAR(64);")
                if "tle_epoch_2_utc" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN tle_epoch_2_utc VARCHAR(64);")
                if "tle_1_raw" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN tle_1_raw TEXT;")
                if "tle_2_raw" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN tle_2_raw TEXT;")
                if "raw_payload_json" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN raw_payload_json TEXT;")
                if "outcome_status" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conjunctions ADD COLUMN outcome_status VARCHAR(32) DEFAULT 'CLOSE_APPROACH';")

                # Create helpful indexes for conjunction filtering and queries
                conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_conjunctions_is_historical ON conjunctions(is_historical);")
                conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_conjunctions_tca_ms ON conjunctions(tca_ms);")
                conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_conjunctions_risk_level ON conjunctions(risk_level);")
                conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_conjunctions_outcome_status ON conjunctions(outcome_status);")
                conn.commit()
        except Exception:
            pass

        try:
            result = conn.exec_driver_sql("PRAGMA table_info(ingestion_status);")
            columns = [row[1] for row in result.fetchall()]
            if columns:
                if "is_cached_fallback" not in columns:
                    conn.exec_driver_sql("ALTER TABLE ingestion_status ADD COLUMN is_cached_fallback BOOLEAN DEFAULT 0;")
                if "raw_storage_path" not in columns:
                    conn.exec_driver_sql("ALTER TABLE ingestion_status ADD COLUMN raw_storage_path VARCHAR(256);")
                conn.commit()
        except Exception:
            pass


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides an active SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure schema migrations run on database initialization
try:
    run_migrations(engine)
except Exception:
    pass

