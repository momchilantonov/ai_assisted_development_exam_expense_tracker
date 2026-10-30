import os
import subprocess
import sys
from collections.abc import Callable, Iterator
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

BACKEND_DIR = Path(__file__).resolve().parents[2]
ORIGIN = "http://testserver"
USERNAME = "integration-user"
PASSWORD = "integration-pass-123"  # noqa: S105 - throwaway test credential
COOKIE = "expense_session"


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 3, 1, 9, 0, 0)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, minutes: int) -> None:
        self.now += timedelta(minutes=minutes)


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "integration.db"


@pytest.fixture
def provision(db_path: Path) -> Callable[..., subprocess.CompletedProcess[str]]:
    """Provision the user through the documented CLI, like a real operator."""

    def run(
        username: str = USERNAME, password: str = PASSWORD, *extra: str
    ) -> subprocess.CompletedProcess[str]:
        env = {
            **os.environ,
            "DATABASE_URL": f"sqlite:///{db_path}",
            "INITIAL_USERNAME": username,
            "INITIAL_PASSWORD": password,
        }
        return subprocess.run(
            [sys.executable, "-m", "app.cli", "create-user", *extra],
            cwd=BACKEND_DIR,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            check=False,
        )

    return run


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def make_client(db_path: Path, clock: Clock) -> Iterator[Callable[..., TestClient]]:
    clients: list[TestClient] = []

    def build(**overrides: object) -> TestClient:
        settings = Settings(
            _env_file=None,  # type: ignore[call-arg]
            database_url=f"sqlite:///{db_path}",
            allowed_origins=ORIGIN,
            **overrides,  # type: ignore[arg-type]
        )
        app = create_app(settings)
        app.state.clock = clock
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield build
    for c in clients:
        c.__exit__(None, None, None)


@pytest.fixture
def client(make_client: Callable[..., TestClient], provision) -> TestClient:
    assert provision().returncode == 0
    return make_client()


@pytest.fixture
def logged_in(client: TestClient) -> TestClient:
    response = client.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
    assert response.status_code == 200
    return client
