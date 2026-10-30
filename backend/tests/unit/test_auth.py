import re

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


def test_provision_creates_once_and_does_not_overwrite(app, client: TestClient) -> None:
    with app.state.session_factory() as db:
        assert provision_user(db, "a", "pw-one") == "created"
        before = db.get(User, 1).password_hash
        assert provision_user(db, "b", "pw-two") == "exists"
        user = db.get(User, 1)
        assert (user.username, user.password_hash) == ("a", before)
        assert provision_user(db, "b", "pw-two", reset_password=True) == "reset"
        assert db.get(User, 1).username == "b"


def test_reset_password_invalidates_existing_sessions(auth_client: TestClient, app) -> None:
    with app.state.session_factory() as db:
        provision_user(db, TEST_USERNAME, "new-password", reset_password=True)

    assert auth_client.get("/api/auth/me").status_code == 401


def test_cli_creates_user_from_env_without_printing_password(
    settings: Settings, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], app
) -> None:
    monkeypatch.setattr("app.cli.get_settings", lambda: settings)
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
    settings: Settings, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr("app.cli.get_settings", lambda: settings)
    monkeypatch.delenv("INITIAL_USERNAME", raising=False)
    monkeypatch.delenv("INITIAL_PASSWORD", raising=False)
    monkeypatch.setattr("sys.stdin.isatty", lambda: False, raising=False)

    assert cli_main(["create-user"]) == 2
    assert "required" in capsys.readouterr().err


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
