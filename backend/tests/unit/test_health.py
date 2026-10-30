from pathlib import Path

from fastapi.testclient import TestClient


def test_health_returns_ok_without_authentication(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_init_db_creates_database_file_at_configured_path(
    client: TestClient, tmp_path: Path
) -> None:
    assert (tmp_path / "test.db").exists()


def test_docs_are_served_under_api_prefix(client: TestClient) -> None:
    assert client.get("/api/docs").status_code == 200
