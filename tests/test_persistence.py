import uuid
from backend.database import SessionLocal
from backend.models.db_models import SatelliteModel, SentAlert

def test_sqlite_persistence_across_sessions():
    """
    Verifies that records inserted in one database session survive session
    teardown and remain durable in the SQLite database file on disk.
    """
    test_id = f"test-persisted-{uuid.uuid4().hex[:8]}"
    test_norad = 99991

    # Step 1: Insert record
    db = SessionLocal()
    try:
        # Cleanup if previously left
        db.query(SatelliteModel).filter(SatelliteModel.norad_id == test_norad).delete()
        db.commit()

        sat = SatelliteModel(
            id=test_id,
            norad_id=test_norad,
            name="GS-PERSISTENCE-PROBE",
            intl_designator="2026-999A",
            type="PAYLOAD",
            regime="LEO",
            is_indian=True,
            is_watchlist=True,
            owner_country="India",
            data_source="TEST_PERSISTENCE",
            apogee_km=550.0,
            perigee_km=540.0,
            altitude_km=545.0,
            inclination_deg=97.5,
            period_min=95.5,
            velocity_km_s=7.58,
            tle_epoch="2026-10-27T00:00:00Z",
            tle_line1="1 99991U 26999A   26300.00000000  .00001000  00000-0  50000-4 0  9991",
            tle_line2="2 99991  97.5000  45.0000 0008000  80.0000 280.0000 15.07000000    12",
        )
        db.add(sat)
        db.commit()
    finally:
        db.close()

    # Step 2: Simulate restart by opening a completely fresh SessionLocal from disk
    db_after = SessionLocal()
    try:
        read_sat = db_after.query(SatelliteModel).filter(SatelliteModel.norad_id == test_norad).first()
        assert read_sat is not None
        assert read_sat.id == test_id
        assert read_sat.name == "GS-PERSISTENCE-PROBE"
        assert read_sat.is_indian is True

        # Clean up test probe
        db_after.delete(read_sat)
        db_after.commit()
    finally:
        db_after.close()

    # Step 3: Verify clean deletion
    db_final = SessionLocal()
    try:
        deleted = db_final.query(SatelliteModel).filter(SatelliteModel.norad_id == test_norad).first()
        assert deleted is None
    finally:
        db_final.close()
