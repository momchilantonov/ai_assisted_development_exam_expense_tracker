import re
import secrets
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cli import main as cli_main
from app.config import Settings
from app.core.security import hash_password, hash_token, needs_rehash, verify_password
from app.models.session import Session as AuthSession
from app.models.user import User
from app.services.auth import provision_user
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, FakeClock

PUBLIC = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/logout"),
}


def test_hash_round_trip_verifies_and_rejects_wrong_password() -> None:
    hashed = hash_password("s3cret-pass")

    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, "s3cret-pass")
    assert not verify_password(hashed, "other")
    assert not needs_rehash(hashed)


def test_verify_password_returns_false_when_no_hash() -> None:
    assert not verify_password(None, "anything")
    assert not verify_password("not-a-hash", "anything")


def test_login_stores_hashed_password_and_hashed_token(auth_client: TestClient, app) -> None:
    token = auth_client.cookies.get("expense_session")
    with app.state.session_factory() as db:
        user = db.scalar(select(User))
        rows = db.scalars(select(AuthSession)).all()

    assert user is not None and TEST_PASSWORD not in user.password_hash
    assert user.password_hash.startswith("$argon2id$")
    assert token and len(rows) == 1
    assert rows[0].token_hash == hash_token(token) != token


def test_login_sets_secure_cookie_flags_and_body(client: TestClient, user: str) -> None:
    response = client.post("/api/auth/login", json={"username": user, "password": TEST_PASSWORD})

    cookie = response.headers["set-cookie"]
    assert response.status_code == 200
    assert response.json() == {"username": user, "expires_at": "2026-01-01T20:00:00Z"}
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie and "Path=/" in cookie
    assert "Max-Age=28800" in cookie


def test_login_sets_secure_flag_when_configured(settings: Settings, tmp_path) -> None:
    from app.main import create_app

    secure = settings.model_copy(update={"cookie_secure": True})
    app = create_app(secure)
    with TestClient(app, base_url="https://testserver") as c:
        with app.state.session_factory() as db:
            provision_user(db, TEST_USERNAME, TEST_PASSWORD)
        r = c.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
    assert "Secure" in r.headers["set-cookie"]


def test_login_errors_are_identical_for_unknown_user_and_wrong_password(
    client: TestClient, user: str
) -> None:
    bad_pw = client.post("/api/auth/login", json={"username": user, "password": "wrong"})
    bad_user = client.post("/api/auth/login", json={"username": "nobody", "password": "wrong"})

    assert bad_pw.status_code == bad_user.status_code == 401
    assert bad_pw.json() == bad_user.json()
    assert bad_pw.json()["error"]["code"] == "invalid_credentials"
    assert "set-cookie" not in bad_pw.headers


@pytest.mark.parametrize(
    "body", [{}, {"username": "", "password": "x"}, {"username": "u", "password": ""}]
)
def test_login_rejects_empty_fields_with_422(client: TestClient, body: dict) -> None:
    response = client.post("/api/auth/login", json=body)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_me_returns_user_when_logged_in(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["username"] == TEST_USERNAME


def test_me_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_session_expires_after_ttl(auth_client: TestClient, clock: FakeClock) -> None:
    clock.advance(479)
    assert auth_client.get("/api/auth/me").status_code == 200

    clock.advance(1)
    assert auth_client.get("/api/auth/me").status_code == 401


def test_expired_sessions_are_purged_at_login(
    auth_client: TestClient, clock: FakeClock, app
) -> None:
    clock.advance(500)
    auth_client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})

    with app.state.session_factory() as db:
        assert len(db.scalars(select(AuthSession)).all()) == 1


def test_logout_invalidates_old_cookie_server_side(auth_client: TestClient, app) -> None:
    old = auth_client.cookies.get("expense_session")

    response = auth_client.post("/api/auth/logout")
    auth_client.cookies.set("expense_session", old)

    assert response.status_code == 204
    assert auth_client.get("/api/auth/me").status_code == 401
    with app.state.session_factory() as db:
        assert db.scalars(select(AuthSession)).all() == []


def test_logout_is_idempotent_without_session(client: TestClient) -> None:
    assert client.post("/api/auth/logout").status_code == 204


def test_login_rejects_foreign_origin(client: TestClient, user: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": user, "password": TEST_PASSWORD},
        headers={"Origin": "http://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden_origin"


def test_logout_rejects_foreign_origin_and_keeps_session(auth_client: TestClient) -> None:
    response = auth_client.post("/api/auth/logout", headers={"Origin": "http://evil.example"})

    assert response.status_code == 403
    assert auth_client.get("/api/auth/me").status_code == 200


def test_allowed_origin_and_missing_origin_pass(client: TestClient, user: str) -> None:
    body = {"username": user, "password": TEST_PASSWORD}

    assert (
        client.post(
            "/api/auth/login", json=body, headers={"Origin": "http://testserver"}
        ).status_code
        == 200
    )
    assert client.post("/api/auth/login", json=body).status_code == 200


def test_provision_creates_if_absent_and_does_not_overwrite(app, client: TestClient) -> None:
    with app.state.session_factory() as db:
        assert provision_user(db, "a", "pw-one") == "created"
        before = db.get(User, 1).password_hash
        assert provision_user(db, "A", "pw-two") == "exists"
        assert db.get(User, 1).password_hash == before
        assert provision_user(db, "b", "pw-two") == "created"
        assert db.get(User, 2).username == "b"
        assert provision_user(db, "b", "pw-three", reset_password=True) == "reset"
        assert db.get(User, 1).password_hash == before


def test_reset_password_invalidates_only_that_users_sessions(auth_client: TestClient, app) -> None:
    with app.state.session_factory() as db:
        provision_user(db, "other", "other-password")
        provision_user(db, TEST_USERNAME, "new-password", reset_password=True)

    assert auth_client.get("/api/auth/me").status_code == 401


# --- registration (CR-002) ---


def register(client: TestClient, username: str = "alice", password: str = "alice-password"):
    return client.post("/api/auth/register", json={"username": username, "password": password})


def test_register_creates_user_and_logs_in(client: TestClient, app) -> None:
    response = register(client)

    cookie = response.headers["set-cookie"]
    assert response.status_code == 201
    assert response.json() == {"username": "alice", "expires_at": "2026-01-01T20:00:00Z"}
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie and "Max-Age=28800" in cookie
    assert client.get("/api/auth/me").json()["username"] == "alice"
    with app.state.session_factory() as db:
        stored = db.scalar(select(User))
    assert stored is not None and stored.password_hash.startswith("$argon2id$")
    assert "alice-password" not in stored.password_hash


def test_register_allows_login_afterwards(client: TestClient) -> None:
    register(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login", json={"username": "alice", "password": "alice-password"}
    )
    assert response.status_code == 200


@pytest.mark.parametrize("name", ["alice", "ALICE", "Alice", "  alice  "])
def test_register_duplicate_username_any_case_returns_409(client: TestClient, name: str) -> None:
    register(client)

    response = register(client, name, "another-password")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "username_taken"
    assert "another-password" not in response.text


def test_register_race_on_unique_index_returns_409(client: TestClient, monkeypatch) -> None:
    # Simulate the lookup missing a row that another request inserted meanwhile.
    register(client)
    monkeypatch.setattr("app.services.auth._find_user", lambda db, username: None)

    response = register(client, "ALICE")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "username_taken"


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"username": "ab", "password": "long-enough"},
        {"username": "a" * 65, "password": "long-enough"},
        {"username": "   ", "password": "long-enough"},
        {"username": "alice", "password": "short"},
        {"username": "alice", "password": "x" * 129},
    ],
)
def test_register_validation_returns_422(client: TestClient, body: dict) -> None:
    response = client.post("/api/auth/register", json=body)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert "set-cookie" not in response.headers


def test_register_accepts_boundary_lengths(client: TestClient) -> None:
    assert register(client, "abc", "x" * 8).status_code == 201
    assert register(client, "b" * 64, "x" * 128).status_code == 201


def test_register_rejects_foreign_origin(client: TestClient, app) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "alice-password"},
        headers={"Origin": "http://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden_origin"
    with app.state.session_factory() as db:
        assert db.scalars(select(User)).all() == []


def test_two_users_have_independent_sessions(client: TestClient) -> None:
    register(client, "alice")
    client.cookies.clear()
    register(client, "bob")

    assert client.get("/api/auth/me").json()["username"] == "bob"
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_login_username_is_case_insensitive(client: TestClient, user: str) -> None:
    response = client.post(
        "/api/auth/login", json={"username": user.upper(), "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["username"] == user


def test_cli_creates_user_from_env_without_printing_password(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    app,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr("app.cli.get_settings", lambda: settings)
    monkeypatch.setattr("app.cli.ENV_FILE", tmp_path / "missing.env")
    monkeypatch.setenv("INITIAL_USERNAME", "cliuser")
    monkeypatch.setenv("INITIAL_PASSWORD", "cli-secret-pw")

    assert cli_main(["create-user"]) == 0
    assert cli_main(["create-user"]) == 0

    out = capsys.readouterr()
    assert "cli-secret-pw" not in out.out + out.err
    assert "already exists" in out.out
    with app.state.session_factory() as db:
        assert isinstance(db, Session)
        user = db.get(User, 1)
        assert user is not None and user.username == "cliuser"
        assert verify_password(user.password_hash, "cli-secret-pw")


def test_cli_fails_without_credentials_when_non_interactive(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    monkeypatch.setattr("app.cli.get_settings", lambda: settings)
    monkeypatch.delenv("INITIAL_USERNAME", raising=False)
    monkeypatch.delenv("INITIAL_PASSWORD", raising=False)
    monkeypatch.setattr("app.cli.ENV_FILE", tmp_path / "missing.env")
    monkeypatch.setattr("sys.stdin.isatty", lambda: False, raising=False)

    assert cli_main(["create-user"]) == 2
    assert "required" in capsys.readouterr().err


def test_cli_reads_credentials_from_env_file_and_process_env_wins(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
    app,
) -> None:
    file_password = secrets.token_urlsafe(16)
    env_password = secrets.token_urlsafe(16)
    env_file = tmp_path / ".env"
    env_file.write_text(f"INITIAL_USERNAME=fileuser\nINITIAL_PASSWORD={file_password}\n")
    monkeypatch.setattr("app.cli.get_settings", lambda: settings)
    monkeypatch.setattr("app.cli.ENV_FILE", env_file)
    monkeypatch.delenv("INITIAL_USERNAME", raising=False)
    monkeypatch.delenv("INITIAL_PASSWORD", raising=False)
    monkeypatch.setattr("sys.stdin.isatty", lambda: False, raising=False)

    assert cli_main(["create-user"]) == 0
    monkeypatch.setenv("INITIAL_PASSWORD", env_password)
    assert cli_main(["create-user", "--reset-password"]) == 0

    out = capsys.readouterr()
    assert file_password not in out.out + out.err
    assert env_password not in out.out + out.err
    with app.state.session_factory() as db:
        user = db.get(User, 1)
        assert user is not None and user.username == "fileuser"
        assert verify_password(user.password_hash, env_password)


def test_every_non_public_route_requires_authentication(client: TestClient) -> None:
    # OpenAPI lists every API operation; docs endpoints are not part of it.
    checked = 0
    for template, operations in client.app.openapi()["paths"].items():
        path = re.sub(r"\{[^}]+\}", "1", template)
        for method in operations:
            if (method.upper(), template) in PUBLIC:
                continue
            response = client.request(method.upper(), path)
            assert response.status_code == 401, f"{method.upper()} {template} is not protected"
            assert response.json()["error"]["code"] == "not_authenticated"
            checked += 1
    assert checked >= 1
