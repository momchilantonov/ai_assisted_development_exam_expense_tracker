import os
import re
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from .conftest import BACKEND_DIR, COOKIE, ORIGIN, OTHER_PASSWORD, PASSWORD, USERNAME, Clock

LOGIN = "/api/auth/login"
LOGOUT = "/api/auth/logout"
ME = "/api/auth/me"


def login(client: TestClient, username: str = USERNAME, password: str = PASSWORD, **kw):
    return client.post(LOGIN, json={"username": username, "password": password}, **kw)


def assert_error(response, status: int, code: str) -> dict:
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert isinstance(body["error"]["message"], str)
    return body


# --- login success and cookie flags -------------------------------------------------


def test_login_succeeds_with_valid_credentials(client: TestClient):
    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == USERNAME
    assert "expires_at" in body
    assert COOKIE in response.cookies


def test_login_cookie_has_httponly_samesite_strict_and_root_path(client: TestClient):
    set_cookie = login(client).headers["set-cookie"]
    assert set_cookie.startswith(f"{COOKIE}=")
    lowered = set_cookie.lower()
    assert "httponly" in lowered
    assert "samesite=strict" in lowered
    assert "path=/" in lowered
    assert "max-age=" in lowered


def test_login_cookie_is_secure_when_configured(make_client, provision):
    assert provision().returncode == 0
    secure_client = make_client(cookie_secure=True)
    assert "secure" in login(secure_client).headers["set-cookie"].lower()


def test_login_cookie_value_is_opaque_and_unique_per_login(client: TestClient):
    first = login(client).cookies[COOKIE]
    second = login(client).cookies[COOKIE]
    assert len(first) >= 32
    assert first != second
    assert USERNAME not in first
    assert PASSWORD not in first


def test_login_response_body_has_no_secrets(client: TestClient):
    response = login(client)
    text = response.text.lower()
    assert set(response.json()) == {"username", "expires_at"}
    assert PASSWORD not in response.text
    assert "argon2" not in text
    assert "hash" not in text
    assert "password" not in text


# --- wrong credentials --------------------------------------------------------------


def test_wrong_username_and_wrong_password_give_identical_response(client: TestClient):
    wrong_user = login(client, username="nobody")
    wrong_pass = login(client, password="not-the-password")
    assert_error(wrong_user, 401, "invalid_credentials")
    assert wrong_user.status_code == wrong_pass.status_code
    assert wrong_user.json() == wrong_pass.json()
    assert COOKIE not in wrong_user.cookies
    assert COOKIE not in wrong_pass.cookies
    assert "set-cookie" not in wrong_user.headers
    assert "set-cookie" not in wrong_pass.headers


def test_wrong_credentials_do_not_authenticate_later_requests(client: TestClient):
    login(client, password="bad")
    assert_error(client.get(ME), 401, "not_authenticated")


def test_login_before_any_user_is_provisioned_is_invalid_credentials(make_client):
    fresh = make_client()
    assert_error(login(fresh), 401, "invalid_credentials")


# --- validation ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"username": USERNAME},
        {"password": PASSWORD},
        {"username": "", "password": PASSWORD},
        {"username": USERNAME, "password": ""},
        {"username": "", "password": ""},
        {"username": None, "password": None},
        {"username": 123, "password": ["x"]},
    ],
)
def test_login_rejects_invalid_payload_with_validation_error(client: TestClient, payload):
    response = client.post(LOGIN, json=payload)
    assert_error(response, 422, "validation_error")
    assert COOKIE not in response.cookies


def test_login_rejects_non_json_body_with_validation_error(client: TestClient):
    response = client.post(LOGIN, content="username=a&password=b")
    assert_error(response, 422, "validation_error")


def test_validation_error_does_not_echo_the_password(client: TestClient):
    response = client.post(LOGIN, json={"username": "", "password": PASSWORD})
    assert PASSWORD not in response.text


# --- protected routes and /me -------------------------------------------------------


def test_me_without_cookie_returns_401(client: TestClient):
    assert_error(client.get(ME), 401, "not_authenticated")


def test_me_returns_username_and_expiry_when_logged_in(logged_in: TestClient):
    response = logged_in.get(ME)
    assert response.status_code == 200
    assert response.json()["username"] == USERNAME
    assert "expires_at" in response.json()


def test_me_matches_expiry_from_login(client: TestClient):
    login_body = login(client).json()
    assert client.get(ME).json() == login_body


def test_me_with_garbage_cookie_returns_401(client: TestClient):
    client.cookies.set(COOKIE, "not-a-real-session-token")
    assert_error(client.get(ME), 401, "not_authenticated")


def test_me_with_empty_cookie_returns_401(client: TestClient):
    client.cookies.set(COOKIE, "")
    assert_error(client.get(ME), 401, "not_authenticated")


def test_me_with_tampered_cookie_returns_401(logged_in: TestClient):
    token = logged_in.cookies[COOKIE]
    flipped = ("A" if token[0] != "A" else "B") + token[1:]
    logged_in.cookies.clear()
    logged_in.cookies.set(COOKIE, flipped)
    assert_error(logged_in.get(ME), 401, "not_authenticated")


def test_me_with_truncated_cookie_returns_401(logged_in: TestClient):
    token = logged_in.cookies[COOKIE]
    logged_in.cookies.clear()
    logged_in.cookies.set(COOKIE, token[:-4])
    assert_error(logged_in.get(ME), 401, "not_authenticated")


def test_me_error_does_not_leak_internals(client: TestClient):
    text = client.get(ME).text
    assert "Traceback" not in text
    assert "sqlalchemy" not in text.lower()


def test_health_is_public(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_every_non_public_route_in_openapi_requires_auth(client: TestClient):
    public = {"/api/health", LOGIN, LOGOUT}
    paths = client.get("/api/openapi.json").json()["paths"]
    for path, methods in paths.items():
        if path in public:
            continue
        for method in methods:
            concrete = re.sub(r"\{[^}]+\}", "1", path)
            response = client.request(method.upper(), concrete)
            assert_error(response, 401, "not_authenticated")


# --- logout -------------------------------------------------------------------------


def test_logout_returns_204_and_clears_cookie(logged_in: TestClient):
    response = logged_in.post(LOGOUT)
    assert response.status_code == 204
    assert response.content == b""
    set_cookie = response.headers["set-cookie"].lower()
    assert f"{COOKIE}=" in set_cookie
    assert "max-age=0" in set_cookie or "expires=" in set_cookie


def test_logout_invalidates_session_server_side_for_old_cookie(logged_in: TestClient):
    old_token = logged_in.cookies[COOKIE]
    assert logged_in.post(LOGOUT).status_code == 204
    logged_in.cookies.clear()
    logged_in.cookies.set(COOKIE, old_token)
    assert_error(logged_in.get(ME), 401, "not_authenticated")


def test_logout_without_session_is_idempotent(client: TestClient):
    assert client.post(LOGOUT).status_code == 204
    assert client.post(LOGOUT).status_code == 204


def test_logout_with_unknown_cookie_returns_204(client: TestClient):
    client.cookies.set(COOKIE, "unknown-token")
    assert client.post(LOGOUT).status_code == 204


def test_logout_only_ends_the_presented_session(client: TestClient, make_client):
    first = login(client).cookies[COOKIE]
    second = login(client).cookies[COOKIE]
    client.cookies.clear()
    client.cookies.set(COOKIE, first)
    assert client.post(LOGOUT).status_code == 204
    client.cookies.clear()
    client.cookies.set(COOKIE, second)
    assert client.get(ME).status_code == 200


def test_login_after_logout_creates_a_working_new_session(logged_in: TestClient):
    logged_in.post(LOGOUT)
    assert login(logged_in).status_code == 200
    assert logged_in.get(ME).status_code == 200


# --- expiry -------------------------------------------------------------------------


def test_session_is_valid_just_before_expiry(logged_in: TestClient, clock: Clock):
    clock.advance(479)
    assert logged_in.get(ME).status_code == 200


def test_session_is_rejected_after_default_ttl(logged_in: TestClient, clock: Clock):
    clock.advance(481)
    assert_error(logged_in.get(ME), 401, "not_authenticated")


def test_session_expiry_is_absolute_not_sliding(logged_in: TestClient, clock: Clock):
    clock.advance(300)
    assert logged_in.get(ME).status_code == 200
    clock.advance(200)
    assert_error(logged_in.get(ME), 401, "not_authenticated")


def test_session_ttl_follows_configuration(make_client, provision, clock: Clock):
    assert provision().returncode == 0
    short = make_client(session_ttl_minutes=10)
    login(short)
    clock.advance(11)
    assert_error(short.get(ME), 401, "not_authenticated")


def test_expired_session_can_be_replaced_by_new_login(logged_in: TestClient, clock: Clock):
    clock.advance(600)
    assert logged_in.get(ME).status_code == 401
    assert login(logged_in).status_code == 200
    assert logged_in.get(ME).status_code == 200


# --- Origin / CSRF ------------------------------------------------------------------


def test_login_with_forged_origin_is_forbidden(client: TestClient):
    response = login(client, headers={"Origin": "https://evil.example"})
    assert_error(response, 403, "forbidden_origin")
    assert COOKIE not in response.cookies


def test_logout_with_forged_origin_is_forbidden_and_keeps_session(logged_in: TestClient):
    response = logged_in.post(LOGOUT, headers={"Origin": "https://evil.example"})
    assert_error(response, 403, "forbidden_origin")
    assert logged_in.get(ME).status_code == 200


def test_login_with_allowed_origin_succeeds(client: TestClient):
    assert login(client, headers={"Origin": ORIGIN}).status_code == 200


def test_login_without_origin_header_succeeds(client: TestClient):
    request = client.build_request("POST", LOGIN, json={"username": USERNAME, "password": PASSWORD})
    assert "origin" not in request.headers
    assert client.send(request).status_code == 200


def test_origin_must_match_exactly(client: TestClient):
    for origin in (ORIGIN + ".evil.example", "https://testserver", ORIGIN + ":8080", "null"):
        assert_error(login(client, headers={"Origin": origin}), 403, "forbidden_origin")


def test_safe_get_requests_are_not_origin_checked(logged_in: TestClient):
    response = logged_in.get(ME, headers={"Origin": "https://evil.example"})
    assert response.status_code == 200


def test_forged_origin_is_rejected_before_credential_check(client: TestClient):
    response = login(client, password="wrong", headers={"Origin": "https://evil.example"})
    assert_error(response, 403, "forbidden_origin")


# --- secrets and storage ------------------------------------------------------------


def _rows(db_path: Path, sql: str) -> list[tuple]:
    with sqlite3.connect(db_path) as conn:
        return conn.execute(sql).fetchall()


def test_password_is_stored_only_as_hash(client: TestClient, db_path: Path):
    (stored,) = _rows(db_path, "SELECT password_hash FROM users")[0]
    assert stored != PASSWORD
    assert PASSWORD not in stored
    assert stored.startswith("$argon2")


def test_session_token_is_not_stored_in_plaintext(client: TestClient, db_path: Path):
    token = login(client).cookies[COOKIE]
    rows = _rows(db_path, "SELECT * FROM sessions")
    assert len(rows) == 1
    assert token not in " ".join(str(v) for v in rows[0])


def test_logout_removes_session_row(logged_in: TestClient, db_path: Path):
    assert len(_rows(db_path, "SELECT 1 FROM sessions")) == 1
    logged_in.post(LOGOUT)
    assert _rows(db_path, "SELECT 1 FROM sessions") == []


def test_no_response_leaks_hash_or_password(logged_in: TestClient):
    responses = [
        login(logged_in),
        login(logged_in, password="wrong"),
        logged_in.get(ME),
        logged_in.post(LOGOUT),
        logged_in.get(ME),
    ]
    for response in responses:
        assert "$argon2" not in response.text
        assert PASSWORD not in response.text
        assert "password_hash" not in response.text


def test_session_cookie_is_not_readable_via_response_body(logged_in: TestClient):
    token = logged_in.cookies[COOKIE]
    assert token not in logged_in.get(ME).text


# --- provisioning (CLI) -------------------------------------------------------------


def test_provisioning_twice_does_not_overwrite_user(provision, make_client):
    assert provision().returncode == 0
    second = provision(USERNAME, OTHER_PASSWORD)
    assert second.returncode == 0
    assert "already exists" in second.stdout
    app_client = make_client()
    assert login(app_client).status_code == 200
    assert_error(login(app_client, password=OTHER_PASSWORD), 401, "invalid_credentials")


def test_reset_password_replaces_the_credentials(provision, make_client):
    assert provision().returncode == 0
    assert provision(USERNAME, OTHER_PASSWORD, "--reset-password").returncode == 0
    app_client = make_client()
    assert login(app_client, password=OTHER_PASSWORD).status_code == 200
    assert_error(login(app_client), 401, "invalid_credentials")


def test_provisioning_without_credentials_fails_and_creates_no_user(tmp_path, db_path, make_client):
    # Scratch repo layout: a developer's real repo-root .env must not leak into this test.
    scratch = tmp_path / "scratch_repo"
    shutil.copytree(
        BACKEND_DIR / "app",
        scratch / "backend" / "app",
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    env = {k: v for k, v in os.environ.items() if not k.startswith("INITIAL_")}
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    result = subprocess.run(
        [sys.executable, "-m", "app.cli", "create-user"],
        cwd=scratch / "backend",
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert_error(login(make_client()), 401, "invalid_credentials")


def test_provisioning_reads_initial_credentials_from_dotenv_file(tmp_path, db_path, make_client):
    # Copy the app into a scratch repo layout so its repo-root .env is a temp file.
    scratch = tmp_path / "scratch_repo"
    shutil.copytree(
        BACKEND_DIR / "app",
        scratch / "backend" / "app",
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    (scratch / ".env").write_text(f"INITIAL_USERNAME={USERNAME}\nINITIAL_PASSWORD={PASSWORD}\n")
    env = {k: v for k, v in os.environ.items() if not k.startswith("INITIAL_")}
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    result = subprocess.run(
        [sys.executable, "-m", "app.cli", "create-user"],
        cwd=scratch / "backend",
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert PASSWORD not in result.stdout + result.stderr
    assert login(make_client()).status_code == 200


def test_provisioning_output_does_not_print_the_password(provision):
    result = provision()
    assert PASSWORD not in result.stdout
    assert PASSWORD not in result.stderr
