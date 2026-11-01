"""Black-box HTTP tests for sign-up (CR-002, docs/api-contract.md)."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from .conftest import COOKIE, ORIGIN, PASSWORD, USERNAME

REGISTER = "/api/auth/register"
LOGIN = "/api/auth/login"
LOGOUT = "/api/auth/logout"
ME = "/api/auth/me"
NEW_PASSWORD = "Another-Pass-123"


def register(c: TestClient, username: str = "newcomer", password: str = NEW_PASSWORD, **kw):
    return c.post(REGISTER, json={"username": username, "password": password}, **kw)


def _flags(set_cookie: str) -> list[str]:
    return sorted(p.strip().lower().split("=")[0] for p in set_cookie.split(";")[1:])


def assert_error(r, status: int, code: str) -> dict:
    assert r.status_code == status, r.text
    data = r.json()
    assert set(data) == {"error"}
    assert data["error"]["code"] == code
    return data


# --- success ------------------------------------------------------------------------


def test_register_creates_user_and_returns_201_with_username_and_expiry(client: TestClient):
    r = register(client)
    assert r.status_code == 201
    assert set(r.json()) == {"username", "expires_at"}
    assert r.json()["username"] == "newcomer"


def test_register_works_on_a_fresh_database_without_any_provisioned_user(make_client):
    fresh = make_client()
    assert register(fresh).status_code == 201


def test_register_logs_the_new_user_in_immediately(client: TestClient):
    register(client)
    me = client.get(ME)
    assert me.status_code == 200
    assert me.json()["username"] == "newcomer"


def test_registered_user_can_log_in_again_after_logout(client: TestClient):
    register(client)
    assert client.post(LOGOUT).status_code == 204
    r = client.post(LOGIN, json={"username": "newcomer", "password": NEW_PASSWORD})
    assert r.status_code == 200
    assert r.json()["username"] == "newcomer"


def test_login_matches_username_case_insensitively_after_register(client: TestClient):
    register(client, "MixedCase")
    client.post(LOGOUT)
    r = client.post(LOGIN, json={"username": "mixedcase", "password": NEW_PASSWORD})
    assert r.status_code == 200
    assert r.json()["username"] == "MixedCase"


def test_register_keeps_typed_case_for_display(client: TestClient):
    assert register(client, "CamelCaseUser").json()["username"] == "CamelCaseUser"
    assert client.get(ME).json()["username"] == "CamelCaseUser"


def test_register_trims_surrounding_whitespace_from_username(client: TestClient):
    assert register(client, "  padded  ").json()["username"] == "padded"


def test_register_response_has_no_secrets(client: TestClient):
    r = register(client)
    assert NEW_PASSWORD not in r.text
    assert "$argon2" not in r.text
    assert "hash" not in r.text.lower()
    assert "password" not in r.text.lower()


# --- auto-login cookie --------------------------------------------------------------


def test_register_cookie_has_same_name_and_flags_as_login(client: TestClient):
    reg = register(client)
    assert COOKIE in reg.cookies
    reg_cookie = reg.headers["set-cookie"].lower()
    assert reg_cookie.startswith(f"{COOKIE}=")
    assert "httponly" in reg_cookie
    assert "samesite=strict" in reg_cookie
    assert "path=/" in reg_cookie
    assert "max-age=28800" in reg_cookie

    login_resp = client.post(LOGIN, json={"username": USERNAME, "password": PASSWORD})
    assert _flags(reg.headers["set-cookie"]) == _flags(login_resp.headers["set-cookie"])


def test_register_cookie_is_secure_when_configured(make_client):
    secure = make_client(cookie_secure=True)
    assert "secure" in register(secure).headers["set-cookie"].lower()


def test_register_cookie_value_is_opaque_and_unique_per_registration(make_client):
    a, b = make_client(), make_client()
    ta = register(a, "user-one").cookies[COOKIE]
    tb = register(b, "user-two").cookies[COOKIE]
    assert ta != tb
    assert len(ta) >= 32
    assert "user-one" not in ta
    assert NEW_PASSWORD not in ta


def test_register_session_token_is_not_stored_in_plaintext(client: TestClient, db_path: Path):
    token = register(client).cookies[COOKIE]
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute("SELECT * FROM sessions").fetchall()
    assert rows
    assert all(token not in " ".join(str(v) for v in row) for row in rows)


def test_registered_password_is_stored_only_as_argon2_hash(client: TestClient, db_path: Path):
    register(client)
    with sqlite3.connect(db_path) as conn:
        (stored,) = conn.execute(
            "SELECT password_hash FROM users WHERE username = 'newcomer'"
        ).fetchone()
    assert stored.startswith("$argon2")
    assert NEW_PASSWORD not in stored


def test_registered_session_expires_after_ttl(client: TestClient, clock):
    register(client)
    clock.advance(479)
    assert client.get(ME).status_code == 200
    clock.advance(2)
    assert_error(client.get(ME), 401, "not_authenticated")


# --- duplicates ---------------------------------------------------------------------


def test_duplicate_username_returns_409_username_taken(client: TestClient):
    assert register(client, "dupe-user").status_code == 201
    other = TestClient(client.app)
    r = register(other, "dupe-user")
    assert_error(r, 409, "username_taken")
    assert COOKIE not in r.cookies
    assert "set-cookie" not in r.headers


@pytest.mark.parametrize("variant", ["DUPE-USER", "Dupe-User", "dupe-USER"])
def test_duplicate_username_in_different_letter_case_returns_409(client: TestClient, variant):
    assert register(client, "dupe-user").status_code == 201
    other = TestClient(client.app)
    assert_error(register(other, variant), 409, "username_taken")


def test_registering_the_provisioned_users_name_in_other_case_returns_409(make_client, provision):
    assert provision().returncode == 0
    app = make_client()
    assert_error(register(app, USERNAME.upper()), 409, "username_taken")
    assert_error(register(app, USERNAME), 409, "username_taken")


def test_duplicate_with_surrounding_whitespace_is_still_taken(client: TestClient):
    assert register(client, "spacey").status_code == 201
    other = TestClient(client.app)
    assert_error(register(other, "  SPACEY "), 409, "username_taken")


def test_duplicate_attempt_does_not_change_existing_password(client: TestClient):
    register(client, "keeper")
    client.post(LOGOUT)
    other = TestClient(client.app)
    assert register(other, "KEEPER", "attacker-password").status_code == 409
    assert (
        client.post(LOGIN, json={"username": "keeper", "password": NEW_PASSWORD}).status_code == 200
    )
    assert (
        client.post(LOGIN, json={"username": "keeper", "password": "attacker-password"}).status_code
        == 401
    )


def test_duplicate_error_does_not_leak_internals_or_password(client: TestClient):
    register(client, "leaky")
    text = register(TestClient(client.app), "leaky", "Secret-Pass-999").text
    for leak in ("Traceback", "sqlalchemy", "sqlite", "UNIQUE", "Secret-Pass-999", "$argon2"):
        assert leak not in text


# --- validation limits --------------------------------------------------------------


@pytest.mark.parametrize(("length", "status"), [(2, 422), (3, 201), (64, 201), (65, 422)])
def test_username_length_limits(client: TestClient, length: int, status: int):
    r = register(client, "u" * length)
    assert r.status_code == status, r.text
    if status == 422:
        assert_error(r, 422, "validation_error")
        assert COOKIE not in r.cookies


@pytest.mark.parametrize(("length", "status"), [(7, 422), (8, 201), (128, 201), (129, 422)])
def test_password_length_limits(client: TestClient, length: int, status: int):
    r = register(client, "pw-limits", "p" * length)
    assert r.status_code == status, r.text
    if status == 422:
        assert_error(r, 422, "validation_error")
        assert COOKIE not in r.cookies


def test_username_shorter_than_3_after_trimming_is_rejected(client: TestClient):
    assert_error(register(client, "  ab  "), 422, "validation_error")


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"username": "someone"},
        {"password": NEW_PASSWORD},
        {"username": "", "password": ""},
        {"username": None, "password": None},
        {"username": 12345, "password": ["x"]},
    ],
)
def test_register_rejects_missing_or_wrong_typed_fields(client: TestClient, payload):
    assert_error(client.post(REGISTER, json=payload), 422, "validation_error")


def test_register_rejects_non_json_body(client: TestClient):
    assert_error(client.post(REGISTER, content="username=a&password=b"), 422, "validation_error")


def test_rejected_registration_creates_no_user(client: TestClient, db_path: Path):
    register(client, "ab")
    register(client, "okname", "short")
    with sqlite3.connect(db_path) as conn:
        names = [r[0] for r in conn.execute("SELECT username FROM users")]
    assert names == [USERNAME]


def test_validation_error_does_not_echo_the_password(client: TestClient):
    r = register(client, "ab", "Secret-Pass-999")
    assert "Secret-Pass-999" not in r.text


# --- Origin / CSRF ------------------------------------------------------------------


def test_register_with_forged_origin_is_forbidden_and_creates_nothing(client: TestClient):
    r = register(client, "evil-signup", headers={"Origin": "https://evil.example"})
    assert_error(r, 403, "forbidden_origin")
    assert COOKIE not in r.cookies
    assert_error(client.get(ME), 401, "not_authenticated")
    login = client.post(LOGIN, json={"username": "evil-signup", "password": NEW_PASSWORD})
    assert_error(login, 401, "invalid_credentials")


def test_register_origin_must_match_exactly(client: TestClient):
    for origin in (ORIGIN + ".evil.example", "https://testserver", ORIGIN + ":8080", "null"):
        assert_error(register(client, headers={"Origin": origin}), 403, "forbidden_origin")


def test_register_with_allowed_origin_succeeds(client: TestClient):
    assert register(client, headers={"Origin": ORIGIN}).status_code == 201


def test_register_without_origin_header_succeeds(client: TestClient):
    request = client.build_request(
        "POST", REGISTER, json={"username": "no-origin", "password": NEW_PASSWORD}
    )
    assert "origin" not in request.headers
    assert client.send(request).status_code == 201


# --- other methods / enumeration ----------------------------------------------------


def test_register_rejects_get(client: TestClient):
    assert client.get(REGISTER).status_code in (404, 405)


def test_setup_status_endpoint_no_longer_exists(client: TestClient):
    assert client.get("/api/auth/setup-status").status_code in (401, 404)
