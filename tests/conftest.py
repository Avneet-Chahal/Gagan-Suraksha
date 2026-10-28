import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app

TEST_DB_FILE = "./test_gagan_chunk1.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initializes a separate test SQLite database and cleans it up after tests complete."""
    # Ensure fresh test database
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()

    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass


@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back after each test."""
    session = TestingSessionLocal()
    try:
        # Clear satellites before each test to guarantee isolated state
        from backend.app.models.satellite import Satellite
        session.query(Satellite).delete()
        session.commit()
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Provides a TestClient with database session overridden to the test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
