from typing import Generator
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.database import engine, SessionLocal, get_db, Base


def check_db_connection() -> bool:
    """Verifies that the database engine can be reached and execute queries."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return True
    except Exception:
        return False


def run_migrations(target_engine) -> None:
    """Ensures existing SQLite databases have required schema additions without data loss."""
    if not str(target_engine.url).startswith("sqlite"):
        return
    with target_engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(satellites);")
            columns = [row[1] for row in result.fetchall()]
            if columns:
                additional_cols = [
                    ("object_type", "VARCHAR(64)"),
                    ("type", "VARCHAR(32)"),
                    ("country", "VARCHAR(128)"),
                    ("owner_country", "VARCHAR(128)"),
                    ("operator", "VARCHAR(128)"),
                    ("intl_designator", "VARCHAR(64)"),
                    ("regime", "VARCHAR(16)"),
                    ("is_indian", "BOOLEAN DEFAULT 0"),
                    ("is_watchlist", "BOOLEAN DEFAULT 0"),
                    ("launch_date", "VARCHAR(64)"),
                    ("apogee_km", "FLOAT"),
                    ("perigee_km", "FLOAT"),
                    ("altitude_km", "FLOAT"),
                    ("inclination_deg", "FLOAT"),
                    ("period_min", "FLOAT"),
                    ("velocity_km_s", "FLOAT"),
                    ("tle_epoch", "VARCHAR(64)"),
                    ("tle_line1", "TEXT"),
                    ("tle_line2", "TEXT"),
                    ("data_source", "VARCHAR(32) DEFAULT 'SYNTHETIC'"),
                    ("created_at", "DATETIME"),
                    ("updated_at", "DATETIME"),
                ]
                for col_name, col_type in additional_cols:
                    if col_name not in columns:
                        conn.exec_driver_sql(f"ALTER TABLE satellites ADD COLUMN {col_name} {col_type};")
                conn.commit()

                # Sync column values if both exist
                if "type" in columns:
                    conn.exec_driver_sql("UPDATE satellites SET object_type = type WHERE object_type IS NULL AND type IS NOT NULL;")
                if "owner_country" in columns:
                    conn.exec_driver_sql("UPDATE satellites SET country = owner_country WHERE country IS NULL AND owner_country IS NOT NULL;")
                conn.exec_driver_sql("UPDATE satellites SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;")
                conn.exec_driver_sql("UPDATE satellites SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;")
                conn.commit()
        except Exception:
            pass



# Ensure schema migrations run on database initialization
try:
    run_migrations(engine)
except Exception:
    pass

