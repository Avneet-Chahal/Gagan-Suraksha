import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.satellite import Satellite


def test_list_satellites_empty(client: TestClient):
    """Verifies that GET /api/satellites returns an empty list when the database has no records."""
    response = client.get("/api/satellites")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_satellites_with_records(client: TestClient, db_session: Session):
    """Verifies that GET /api/satellites returns inserted records."""
    sat = Satellite(
        norad_id=12345,
        name="TEST-LEO-SAT",
        object_type="PAYLOAD",
        country="INDIA",
        operator="ISRO",
    )
    db_session.add(sat)
    db_session.commit()

    response = client.get("/api/satellites")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data) == 1
    assert data[0]["norad_id"] == 12345
    assert data[0]["name"] == "TEST-LEO-SAT"
    assert data[0]["object_type"] == "PAYLOAD"
    assert data[0]["country"] == "INDIA"
    assert data[0]["operator"] == "ISRO"
    assert "id" in data[0]
    assert "created_at" in data[0]
    assert "updated_at" in data[0]


def test_get_satellite_by_norad_id_success(client: TestClient, db_session: Session):
    """Verifies that GET /api/satellites/{norad_id} retrieves the correct satellite metadata."""
    sat = Satellite(
        norad_id=54321,
        name="TEST-OBSERVATION-SAT",
        object_type="PAYLOAD",
        country="INDIA",
        operator="ISRO",
    )
    db_session.add(sat)
    db_session.commit()

    response = client.get("/api/satellites/54321")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["norad_id"] == 54321
    assert data["name"] == "TEST-OBSERVATION-SAT"
    assert data["object_type"] == "PAYLOAD"
    assert data["country"] == "INDIA"
    assert data["operator"] == "ISRO"


def test_get_satellite_by_norad_id_not_found(client: TestClient):
    """Verifies that GET /api/satellites/{norad_id} returns 404 when the satellite does not exist."""
    response = client.get("/api/satellites/999999")
    assert response.status_code == status.HTTP_404_NOT_FOUND

    data = response.json()
    assert "detail" in data
    assert "999999" in data["detail"]


def test_satellites_pagination(client: TestClient, db_session: Session):
    """Verifies pagination behavior with limit and offset query parameters."""
    # Insert 5 test satellites with sequential NORAD IDs
    sats = [
        Satellite(norad_id=10001, name="PAGINATED-SAT-1"),
        Satellite(norad_id=10002, name="PAGINATED-SAT-2"),
        Satellite(norad_id=10003, name="PAGINATED-SAT-3"),
        Satellite(norad_id=10004, name="PAGINATED-SAT-4"),
        Satellite(norad_id=10005, name="PAGINATED-SAT-5"),
    ]
    db_session.add_all(sats)
    db_session.commit()

    # Query first page: limit=2, offset=0
    resp1 = client.get("/api/satellites?limit=2&offset=0")
    assert resp1.status_code == status.HTTP_200_OK
    data1 = resp1.json()
    assert len(data1) == 2
    assert data1[0]["norad_id"] == 10001
    assert data1[1]["norad_id"] == 10002

    # Query second page: limit=2, offset=2
    resp2 = client.get("/api/satellites?limit=2&offset=2")
    assert resp2.status_code == status.HTTP_200_OK
    data2 = resp2.json()
    assert len(data2) == 2
    assert data2[0]["norad_id"] == 10003
    assert data2[1]["norad_id"] == 10004

    # Query third page: limit=2, offset=4
    resp3 = client.get("/api/satellites?limit=2&offset=4")
    assert resp3.status_code == status.HTTP_200_OK
    data3 = resp3.json()
    assert len(data3) == 1
    assert data3[0]["norad_id"] == 10005


def test_duplicate_norad_id_rejected(db_session: Session):
    """Verifies that the database rejects duplicate NORAD IDs with an IntegrityError."""
    sat1 = Satellite(norad_id=88888, name="SAT-ALPHA")
    db_session.add(sat1)
    db_session.commit()

    sat2 = Satellite(norad_id=88888, name="SAT-DUPLICATE")
    db_session.add(sat2)

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()
