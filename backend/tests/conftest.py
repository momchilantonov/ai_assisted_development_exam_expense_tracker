import os
import secrets
from collections.abc import Iterator
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.auth import provision_user


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,  # type: ignore[call-arg]
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        allowed_origins="http://testserver",
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


class FakeClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 1, 1, 12, 0, 0)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, minutes: int) -> None:
        self.now += timedelta(minutes=minutes)


TEST_USERNAME = "tester"
# conftest may be imported twice (as "conftest" and "tests.conftest"); share one value per run.
TEST_PASSWORD = os.environ.setdefault("_TEST_RUN_PASSWORD", secrets.token_urlsafe(16))


@pytest.fixture
def clock(app) -> FakeClock:
    fake = FakeClock()
    app.state.clock = fake
    return fake


@pytest.fixture
def client(app, clock: FakeClock) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def user(client: TestClient, app) -> str:
    with app.state.session_factory() as db:
        provision_user(db, TEST_USERNAME, TEST_PASSWORD)
    return TEST_USERNAME


@pytest.fixture
def auth_client(client: TestClient, user: str) -> TestClient:
    response = client.post("/api/auth/login", json={"username": user, "password": TEST_PASSWORD})
    assert response.status_code == 200
    return client
