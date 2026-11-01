"""Black-box HTTP tests for per-user data isolation (CR-002, ADR-011)."""

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from .conftest import COOKIE

B_PASSWORD = "User-B-Password-1"
LOGOUT = "/api/auth/logout"
ME = "/api/auth/me"


def body(amount: str = "10.00", category: str = "Food", date: str = "2026-03-01", **extra: Any):
    return {"amount": amount, "category": category, "expense_date": date, **extra}


def create(c: TestClient, **kwargs: Any) -> dict[str, Any]:
    r = c.post("/api/expenses", json=body(**kwargs))
    assert r.status_code == 201, r.text
    return r.json()


def assert_not_found(r) -> None:
    assert r.status_code == 404, r.text
    data = r.json()
    assert set(data) == {"error"}
    assert data["error"]["code"] == "not_found"


@pytest.fixture
def user_a(logged_in: TestClient) -> TestClient:
    return logged_in


@pytest.fixture
def user_b(user_a: TestClient, make_client: Callable[..., TestClient]) -> TestClient:
    other = make_client()
    r = other.post("/api/auth/register", json={"username": "user-b", "password": B_PASSWORD})
    assert r.status_code == 201
    assert other.cookies[COOKIE] != user_a.cookies[COOKIE]
    return other


# --- single object access -----------------------------------------------------------


def test_user_b_cannot_read_user_a_expense(user_a, user_b):
    a_exp = create(user_a, description="a-private")
    assert_not_found(user_b.get(f"/api/expenses/{a_exp['id']}"))


def test_user_b_cannot_update_user_a_expense_and_it_stays_unchanged(user_a, user_b):
    a_exp = create(user_a, amount="5.00", description="a-private")
    r = user_b.put(
        f"/api/expenses/{a_exp['id']}", json=body("999.00", "Bills", description="hijacked")
    )
    assert_not_found(r)
    assert user_a.get(f"/api/expenses/{a_exp['id']}").json() == a_exp


def test_user_b_cannot_delete_user_a_expense_and_it_survives(user_a, user_b):
    a_exp = create(user_a, description="a-private")
    assert_not_found(user_b.delete(f"/api/expenses/{a_exp['id']}"))
    assert user_a.get(f"/api/expenses/{a_exp['id']}").json() == a_exp
    assert user_a.get("/api/expenses").json()["total"] == 1


def test_foreign_id_gives_the_same_response_as_a_nonexistent_id(user_a, user_b):
    a_exp = create(user_a)
    foreign = user_b.get(f"/api/expenses/{a_exp['id']}")
    missing = user_b.get("/api/expenses/987654")
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()
    for method in ("put", "delete"):
        kwargs = {"json": body()} if method == "put" else {}
        f = getattr(user_b, method)(f"/api/expenses/{a_exp['id']}", **kwargs)
        m = getattr(user_b, method)("/api/expenses/987654", **kwargs)
        assert f.status_code == m.status_code == 404
        assert f.json() == m.json()


def test_foreign_expense_access_is_never_403(user_a, user_b):
    a_exp = create(user_a)
    url = f"/api/expenses/{a_exp['id']}"
    statuses = {
        user_b.get(url).status_code,
        user_b.put(url, json=body()).status_code,
        user_b.delete(url).status_code,
    }
    assert statuses == {404}


def test_deleting_own_expense_after_foreign_attempt_still_works(user_a, user_b):
    a_exp = create(user_a)
    user_b.delete(f"/api/expenses/{a_exp['id']}")
    assert user_a.delete(f"/api/expenses/{a_exp['id']}").status_code == 204


# --- lists --------------------------------------------------------------------------


def test_list_excludes_other_users_expenses(user_a, user_b):
    a_exp = create(user_a, description="a-private")
    b_exp = create(user_b, description="b-private")
    a_list = user_a.get("/api/expenses").json()
    b_list = user_b.get("/api/expenses").json()
    assert [i["id"] for i in a_list["items"]] == [a_exp["id"]]
    assert [i["id"] for i in b_list["items"]] == [b_exp["id"]]
    assert a_list["total"] == 1
    assert b_list["total"] == 1
    assert "b-private" not in user_a.get("/api/expenses").text
    assert "a-private" not in user_b.get("/api/expenses").text


def test_new_user_starts_with_an_empty_list_and_empty_dashboard(user_a, user_b):
    create(user_a, amount="50.00")
    assert user_b.get("/api/expenses").json()["items"] == []
    assert user_b.get("/api/expenses").json()["total"] == 0
    summary = user_b.get("/api/dashboard/summary").json()
    assert summary["total_amount"] == "0.00"
    assert summary["expense_count"] == 0
    assert summary["recent"] == []


def test_filters_and_pagination_never_expose_other_users_rows(user_a, user_b):
    for i in range(3):
        create(user_a, category="Bills", date=f"2026-03-0{i + 1}")
    create(user_b, category="Bills", date="2026-03-05")
    r = user_b.get("/api/expenses", params={"category": "Bills", "limit": 200, "offset": 0})
    assert r.json()["total"] == 1
    r = user_b.get("/api/expenses", params={"date_from": "2026-03-01", "date_to": "2026-03-04"})
    assert r.json()["items"] == []
    r = user_a.get("/api/expenses", params={"category": "Bills", "limit": 200})
    assert r.json()["total"] == 3


def test_ids_are_not_reused_to_leak_across_users(user_a, user_b):
    a_exp = create(user_a)
    b_exp = create(user_b)
    assert a_exp["id"] != b_exp["id"]
    assert user_a.get(f"/api/expenses/{b_exp['id']}").status_code == 404


# --- dashboard ----------------------------------------------------------------------


def test_dashboard_totals_are_per_user(user_a, user_b):
    create(user_a, amount="10.00", category="Food", date="2026-03-01")
    create(user_a, amount="20.50", category="Bills", date="2026-03-02")
    create(user_b, amount="7.25", category="Food", date="2026-03-03")
    a = user_a.get("/api/dashboard/summary").json()
    b = user_b.get("/api/dashboard/summary").json()
    assert a["total_amount"] == "30.50"
    assert a["expense_count"] == 2
    assert b["total_amount"] == "7.25"
    assert b["expense_count"] == 1
    by_a = {c["category"]: (c["total"], c["count"]) for c in a["by_category"]}
    by_b = {c["category"]: (c["total"], c["count"]) for c in b["by_category"]}
    assert by_a["Food"] == ("10.00", 1)
    assert by_a["Bills"] == ("20.50", 1)
    assert by_b["Food"] == ("7.25", 1)
    assert by_b["Bills"] == ("0.00", 0)
    assert len(a["by_category"]) == len(b["by_category"]) == 7


def test_dashboard_recent_lists_only_own_expenses(user_a, user_b):
    a_exp = create(user_a, description="a-private")
    b_exp = create(user_b, description="b-private")
    assert [e["id"] for e in user_a.get("/api/dashboard/summary").json()["recent"]] == [a_exp["id"]]
    assert [e["id"] for e in user_b.get("/api/dashboard/summary").json()["recent"]] == [b_exp["id"]]


def test_user_b_failed_delete_does_not_change_user_a_dashboard(user_a, user_b):
    a_exp = create(user_a, amount="12.00")
    before = user_a.get("/api/dashboard/summary").json()
    assert_not_found(user_b.delete(f"/api/expenses/{a_exp['id']}"))
    assert user_a.get("/api/dashboard/summary").json() == before


def test_user_b_own_changes_do_not_change_user_a_dashboard(user_a, user_b):
    create(user_a, amount="12.00")
    before = user_a.get("/api/dashboard/summary").json()
    mine = create(user_b, amount="500.00")
    user_b.put(f"/api/expenses/{mine['id']}", json=body("600.00"))
    user_b.delete(f"/api/expenses/{mine['id']}")
    assert user_a.get("/api/dashboard/summary").json() == before


# --- user id is taken from the session only -----------------------------------------


def test_client_supplied_user_id_in_body_is_ignored(user_a, user_b):
    r = user_b.post("/api/expenses", json=body(user_id=1, owner_id=1))
    assert r.status_code in (201, 422), r.text
    assert user_a.get("/api/expenses").json()["total"] == 0
    if r.status_code == 201:
        assert user_b.get("/api/expenses").json()["total"] == 1


def test_user_id_query_parameter_does_not_widen_the_list(user_a, user_b):
    create(user_a)
    r = user_b.get("/api/expenses", params={"user_id": 1})
    assert r.status_code in (200, 422)
    if r.status_code == 200:
        assert r.json()["items"] == []


# --- session separation -------------------------------------------------------------


def test_each_session_resolves_to_its_own_user(user_a, user_b):
    assert user_a.get(ME).json()["username"] == "integration-user"
    assert user_b.get(ME).json()["username"] == "user-b"


def test_logging_out_user_b_does_not_end_user_a_session(user_a, user_b):
    assert user_b.post(LOGOUT).status_code == 204
    assert user_b.get(ME).status_code == 401
    assert user_a.get(ME).status_code == 200


def test_user_b_cookie_after_logout_cannot_reach_data(user_a, user_b):
    token = user_b.cookies[COOKIE]
    user_b.post(LOGOUT)
    user_b.cookies.clear()
    user_b.cookies.set(COOKIE, token)
    assert user_b.get("/api/expenses").status_code == 401


def test_data_survives_logout_and_login_per_user(user_a, user_b, make_client):
    a_exp = create(user_a, description="a-private")
    b_exp = create(user_b, description="b-private")
    user_b.post(LOGOUT)
    r = user_b.post("/api/auth/login", json={"username": "USER-B", "password": B_PASSWORD})
    assert r.status_code == 200
    assert [i["id"] for i in user_b.get("/api/expenses").json()["items"]] == [b_exp["id"]]
    assert_not_found(user_b.get(f"/api/expenses/{a_exp['id']}"))


# --- anonymous counterparts ---------------------------------------------------------


def test_anonymous_cannot_read_any_users_expense(user_a, user_b, make_client):
    a_exp = create(user_a)
    anon = make_client()
    for method, path in (
        ("get", f"/api/expenses/{a_exp['id']}"),
        ("delete", f"/api/expenses/{a_exp['id']}"),
        ("get", "/api/expenses"),
        ("get", "/api/dashboard/summary"),
    ):
        assert getattr(anon, method)(path).status_code == 401
