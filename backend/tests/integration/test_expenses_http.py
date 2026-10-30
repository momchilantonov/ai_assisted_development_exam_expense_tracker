"""Black-box HTTP tests for categories, expenses and dashboard (docs/api-contract.md)."""

import re
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from .conftest import COOKIE, PASSWORD, USERNAME

CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Healthcare", "Other"]
ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def body(amount: Any = "12.34", category: str = "Food", date: str = "2026-03-01", **extra: Any):
    return {"amount": amount, "category": category, "expense_date": date, **extra}


def create(c: TestClient, **kwargs: Any) -> dict[str, Any]:
    r = c.post("/api/expenses", json=body(**kwargs))
    assert r.status_code == 201, r.text
    return r.json()


def assert_error(r, status: int, code: str) -> dict[str, Any]:
    assert r.status_code == status, r.text
    data = r.json()
    assert set(data) == {"error"}
    assert data["error"]["code"] == code
    text = r.text
    for leak in ("Traceback", "sqlalchemy", "sqlite", 'File "', "/home/", PASSWORD):
        assert leak not in text
    return data["error"]


# ---------- authentication on every route ----------

PROTECTED: list[tuple[str, str, dict[str, Any] | None]] = [
    ("GET", "/api/categories", None),
    ("POST", "/api/expenses", body()),
    ("GET", "/api/expenses", None),
    ("GET", "/api/expenses/1", None),
    ("PUT", "/api/expenses/1", body()),
    ("DELETE", "/api/expenses/1", None),
    ("GET", "/api/dashboard/summary", None),
]


@pytest.mark.parametrize(("method", "path", "payload"), PROTECTED)
def test_route_rejects_anonymous_request_with_401(client: TestClient, method, path, payload):
    r = client.request(method, path, json=payload)
    assert_error(r, 401, "not_authenticated")


@pytest.mark.parametrize(("method", "path", "payload"), PROTECTED)
def test_route_rejects_tampered_cookie_with_401(client: TestClient, method, path, payload):
    client.cookies.set(COOKIE, "tampered-value")
    assert_error(client.request(method, path, json=payload), 401, "not_authenticated")


def test_old_cookie_is_rejected_on_expense_routes_after_logout(logged_in: TestClient):
    token = logged_in.cookies.get(COOKIE)
    assert logged_in.post("/api/auth/logout").status_code == 204
    logged_in.cookies.set(COOKIE, token)
    assert_error(logged_in.get("/api/expenses"), 401, "not_authenticated")
    assert_error(logged_in.get("/api/dashboard/summary"), 401, "not_authenticated")


def test_expired_session_is_rejected_on_expense_routes(logged_in: TestClient, clock):
    clock.advance(60 * 24)
    assert_error(logged_in.get("/api/expenses"), 401, "not_authenticated")


def test_forged_origin_on_unsafe_expense_requests_returns_403(logged_in: TestClient):
    created = create(logged_in)
    evil = {"Origin": "http://evil.example"}
    assert_error(
        logged_in.post("/api/expenses", json=body(), headers=evil), 403, "forbidden_origin"
    )
    assert_error(
        logged_in.put(f"/api/expenses/{created['id']}", json=body(), headers=evil),
        403,
        "forbidden_origin",
    )
    assert_error(
        logged_in.delete(f"/api/expenses/{created['id']}", headers=evil), 403, "forbidden_origin"
    )
    assert logged_in.get(f"/api/expenses/{created['id']}").status_code == 200


def test_allowed_origin_is_accepted_on_unsafe_request(logged_in: TestClient):
    r = logged_in.post("/api/expenses", json=body(), headers={"Origin": "http://testserver"})
    assert r.status_code == 201


# ---------- categories ----------


def test_categories_lists_the_seven_fixed_categories(logged_in: TestClient):
    r = logged_in.get("/api/categories")
    assert r.status_code == 200
    assert sorted(r.json()) == sorted(CATEGORIES)
    assert len(r.json()) == 7


# ---------- CRUD ----------


def test_create_expense_returns_201_with_location_and_full_shape(logged_in: TestClient):
    r = logged_in.post(
        "/api/expenses", json=body("12.34", "Food", "2026-02-10", description="Lunch")
    )
    assert r.status_code == 201
    data = r.json()
    assert set(data) == {
        "id",
        "amount",
        "category",
        "description",
        "expense_date",
        "created_at",
        "updated_at",
    }
    assert data["amount"] == "12.34"
    assert data["category"] == "Food"
    assert data["description"] == "Lunch"
    assert data["expense_date"] == "2026-02-10"
    assert ISO_UTC.match(data["created_at"]) and ISO_UTC.match(data["updated_at"])
    assert r.headers["location"].endswith(f"/api/expenses/{data['id']}")


def test_create_without_description_stores_null(logged_in: TestClient):
    assert create(logged_in)["description"] is None


def test_description_is_trimmed_and_blank_becomes_null(logged_in: TestClient):
    assert create(logged_in, description="  coffee  ")["description"] == "coffee"
    assert create(logged_in, description="   ")["description"] is None


def test_get_expense_returns_what_was_created(logged_in: TestClient):
    created = create(logged_in, amount="7.50", category="Bills", description="Water")
    r = logged_in.get(f"/api/expenses/{created['id']}")
    assert r.status_code == 200
    assert r.json() == created


def test_put_replaces_all_fields_and_keeps_created_at(logged_in: TestClient):
    created = create(logged_in, description="old")
    r = logged_in.put(
        f"/api/expenses/{created['id']}",
        json=body("99.99", "Transport", "2026-01-05"),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == created["id"]
    assert data["amount"] == "99.99"
    assert data["category"] == "Transport"
    assert data["expense_date"] == "2026-01-05"
    assert data["description"] is None
    assert data["created_at"] == created["created_at"]
    assert logged_in.get(f"/api/expenses/{created['id']}").json() == data


def test_delete_removes_expense_and_second_delete_is_404(logged_in: TestClient):
    created = create(logged_in)
    assert logged_in.delete(f"/api/expenses/{created['id']}").status_code == 204
    assert_error(logged_in.get(f"/api/expenses/{created['id']}"), 404, "not_found")
    assert_error(logged_in.delete(f"/api/expenses/{created['id']}"), 404, "not_found")
    assert logged_in.get("/api/expenses").json()["total"] == 0


def test_unknown_id_returns_404_for_get_put_delete(logged_in: TestClient):
    assert_error(logged_in.get("/api/expenses/987654"), 404, "not_found")
    assert_error(logged_in.put("/api/expenses/987654", json=body()), 404, "not_found")
    assert_error(logged_in.delete("/api/expenses/987654"), 404, "not_found")


@pytest.mark.parametrize("bad_id", ["0", "-1", "abc", "1.5"])
def test_bad_path_id_returns_422(logged_in: TestClient, bad_id: str):
    assert_error(logged_in.get(f"/api/expenses/{bad_id}"), 422, "validation_error")
    assert_error(logged_in.put(f"/api/expenses/{bad_id}", json=body()), 422, "validation_error")
    assert_error(logged_in.delete(f"/api/expenses/{bad_id}"), 422, "validation_error")


def test_failed_update_does_not_change_stored_expense(logged_in: TestClient):
    created = create(logged_in, amount="5.00")
    r = logged_in.put(f"/api/expenses/{created['id']}", json=body("-1"))
    assert_error(r, 422, "validation_error")
    assert logged_in.get(f"/api/expenses/{created['id']}").json() == created


# ---------- validation ----------


@pytest.mark.parametrize("amount", ["0.01", "0.1", "1", "999999.99", "10.5", 12.5, 3, 0.01])
def test_valid_amount_formats_are_accepted(logged_in: TestClient, amount):
    r = logged_in.post("/api/expenses", json=body(amount))
    assert r.status_code == 201, r.text


@pytest.mark.parametrize(
    "amount",
    [
        "0",
        "0.00",
        "-1",
        "-0.01",
        "1.234",
        "1000000",
        "1000000.00",
        "999999.995",
        "1e3",
        "1,5",
        "abc",
        "",
        "NaN",
        "Infinity",
        "+5",
        None,
        True,
        [],
        {},
        0,
        -5,
        1.005,
        12.345,
    ],
)
def test_invalid_amount_is_rejected_with_422(logged_in: TestClient, amount):
    r = logged_in.post("/api/expenses", json=body(amount))
    assert_error(r, 422, "validation_error")
    assert logged_in.get("/api/expenses").json()["total"] == 0


@pytest.mark.parametrize("amount", [" 5", "5 "])
def test_amount_string_with_surrounding_spaces_is_rejected_with_422(logged_in: TestClient, amount):
    assert_error(logged_in.post("/api/expenses", json=body(amount)), 422, "validation_error")


def test_missing_required_fields_are_rejected(logged_in: TestClient):
    for field in ("amount", "category", "expense_date"):
        payload = body()
        del payload[field]
        assert_error(logged_in.post("/api/expenses", json=payload), 422, "validation_error")
    assert_error(logged_in.post("/api/expenses", json={}), 422, "validation_error")


@pytest.mark.parametrize("category", ["food", "FOOD", "Groceries", "", None, 1, "Food "])
def test_invalid_category_is_rejected_with_422(logged_in: TestClient, category):
    assert_error(
        logged_in.post("/api/expenses", json=body(category=category)), 422, "validation_error"
    )


@pytest.mark.parametrize(
    "date",
    [
        "2026-02-30",
        "2026-13-01",
        "01-03-2026",
        "2026/03/01",
        "2026-3-1",
        "tomorrow",
        "",
        "2026-03-01T10:00:00",
        "2026-03-01T10:00:00Z",
        None,
        20260301,
    ],
)
def test_invalid_date_is_rejected_with_422(logged_in: TestClient, date):
    assert_error(logged_in.post("/api/expenses", json=body(date=date)), 422, "validation_error")


def test_leap_day_is_accepted_and_non_leap_day_rejected(logged_in: TestClient):
    assert logged_in.post("/api/expenses", json=body(date="2028-02-29")).status_code == 201
    assert_error(
        logged_in.post("/api/expenses", json=body(date="2027-02-29")), 422, "validation_error"
    )


def test_description_of_500_characters_is_accepted_and_501_rejected(logged_in: TestClient):
    ok = logged_in.post("/api/expenses", json=body(description="x" * 500))
    assert ok.status_code == 201
    assert len(ok.json()["description"]) == 500
    assert_error(
        logged_in.post("/api/expenses", json=body(description="x" * 501)), 422, "validation_error"
    )


def test_description_with_padding_is_measured_after_trimming(logged_in: TestClient):
    r = logged_in.post("/api/expenses", json=body(description="  " + "x" * 500 + "  "))
    assert r.status_code == 201


def test_non_string_description_is_rejected(logged_in: TestClient):
    assert_error(
        logged_in.post("/api/expenses", json=body(description=123)), 422, "validation_error"
    )


def test_malformed_json_returns_validation_error_without_internals(logged_in: TestClient):
    r = logged_in.post(
        "/api/expenses", content=b"{not json", headers={"Content-Type": "application/json"}
    )
    assert_error(r, 422, "validation_error")


def test_special_characters_in_description_are_stored_verbatim(logged_in: TestClient):
    text = "'; DROP TABLE expenses; -- <script>alert(1)</script> café ☕"
    created = create(logged_in, description=text)
    assert logged_in.get(f"/api/expenses/{created['id']}").json()["description"] == text
    assert logged_in.get("/api/expenses").json()["total"] == 1


# ---------- money exactness ----------


def test_amounts_round_trip_exactly_as_two_decimal_strings(logged_in: TestClient):
    cases = {"0.1": "0.10", "0.01": "0.01", "1": "1.00", "19.99": "19.99", "999999.99": "999999.99"}
    for sent, expected in cases.items():
        created = create(logged_in, amount=sent)
        assert isinstance(created["amount"], str)
        assert created["amount"] == expected
        assert logged_in.get(f"/api/expenses/{created['id']}").json()["amount"] == expected


def test_json_number_amount_does_not_drift(logged_in: TestClient):
    assert create(logged_in, amount=0.1)["amount"] == "0.10"
    assert create(logged_in, amount=19.99)["amount"] == "19.99"
    assert create(logged_in, amount=1.1)["amount"] == "1.10"


def test_sum_of_many_small_amounts_is_exact(logged_in: TestClient):
    for _ in range(10):
        create(logged_in, amount="0.10")
    create(logged_in, amount="0.20")
    summary = logged_in.get("/api/dashboard/summary").json()
    assert summary["total_amount"] == "1.20"
    assert summary["expense_count"] == 11


def test_large_sum_has_no_float_error(logged_in: TestClient):
    for _ in range(3):
        create(logged_in, amount="999999.99")
    create(logged_in, amount="0.01")
    assert logged_in.get("/api/dashboard/summary").json()["total_amount"] == "2999999.98"


# ---------- list, filters, sorting, pagination ----------


@pytest.fixture
def seeded(logged_in: TestClient) -> TestClient:
    rows = [
        ("10.00", "Food", "2026-01-15"),
        ("20.00", "Transport", "2026-02-01"),
        ("30.00", "Food", "2026-02-15"),
        ("40.00", "Bills", "2026-02-28"),
        ("50.00", "Food", "2026-03-01"),
        ("60.00", "Other", "2026-03-01"),
    ]
    for amount, category, date in rows:
        create(logged_in, amount=amount, category=category, date=date)
    return logged_in


def amounts(r) -> list[str]:
    return [i["amount"] for i in r.json()["items"]]


def test_list_empty_returns_envelope_with_defaults(logged_in: TestClient):
    r = logged_in.get("/api/expenses")
    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


def test_list_default_sort_is_newest_first_with_id_desc_tiebreak(seeded: TestClient):
    r = seeded.get("/api/expenses")
    assert r.json()["total"] == 6
    assert amounts(r) == ["60.00", "50.00", "40.00", "30.00", "20.00", "10.00"]


def test_sort_date_asc_uses_id_asc_tiebreak(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"sort": "date_asc"})
    assert amounts(r) == ["10.00", "20.00", "30.00", "40.00", "50.00", "60.00"]


def test_sort_date_desc_explicit_matches_default(seeded: TestClient):
    assert amounts(seeded.get("/api/expenses", params={"sort": "date_desc"})) == amounts(
        seeded.get("/api/expenses")
    )


def test_filter_by_category(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"category": "Food"})
    assert r.json()["total"] == 3
    assert {i["category"] for i in r.json()["items"]} == {"Food"}
    assert seeded.get("/api/expenses", params={"category": "Healthcare"}).json()["total"] == 0


def test_filter_date_range_is_inclusive_on_both_ends(seeded: TestClient):
    r = seeded.get(
        "/api/expenses",
        params={"date_from": "2026-02-01", "date_to": "2026-02-28", "sort": "date_asc"},
    )
    assert amounts(r) == ["20.00", "30.00", "40.00"]


def test_filter_date_from_only_and_date_to_only(seeded: TestClient):
    assert seeded.get("/api/expenses", params={"date_from": "2026-03-01"}).json()["total"] == 2
    assert seeded.get("/api/expenses", params={"date_to": "2026-01-15"}).json()["total"] == 1


def test_filter_single_day_range(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"date_from": "2026-03-01", "date_to": "2026-03-01"})
    assert r.json()["total"] == 2


def test_filters_combine_with_and(seeded: TestClient):
    r = seeded.get(
        "/api/expenses",
        params={"category": "Food", "date_from": "2026-02-01", "date_to": "2026-02-28"},
    )
    assert amounts(r) == ["30.00"]


def test_date_from_after_date_to_is_422(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"date_from": "2026-03-02", "date_to": "2026-03-01"})
    assert_error(r, 422, "validation_error")


@pytest.mark.parametrize(
    "params",
    [
        {"category": "food"},
        {"category": "Nope"},
        {"date_from": "2026-02-30"},
        {"date_to": "garbage"},
        {"sort": "amount_desc"},
        {"limit": 0},
        {"limit": 201},
        {"limit": -1},
        {"limit": "abc"},
        {"offset": -1},
        {"offset": "x"},
    ],
)
def test_invalid_list_query_values_are_422(seeded: TestClient, params):
    assert_error(seeded.get("/api/expenses", params=params), 422, "validation_error")


def test_pagination_pages_and_total_is_independent_of_page(seeded: TestClient):
    first = seeded.get("/api/expenses", params={"limit": 4, "offset": 0}).json()
    second = seeded.get("/api/expenses", params={"limit": 4, "offset": 4}).json()
    assert (first["total"], first["limit"], first["offset"]) == (6, 4, 0)
    assert (second["total"], second["limit"], second["offset"]) == (6, 4, 4)
    assert len(first["items"]) == 4 and len(second["items"]) == 2
    ids = [i["id"] for i in first["items"] + second["items"]]
    assert len(set(ids)) == 6


def test_offset_beyond_total_returns_empty_items_with_total(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"offset": 100}).json()
    assert r["items"] == [] and r["total"] == 6


def test_limit_bounds_1_and_200_are_accepted(seeded: TestClient):
    assert len(seeded.get("/api/expenses", params={"limit": 1}).json()["items"]) == 1
    r = seeded.get("/api/expenses", params={"limit": 200}).json()
    assert r["limit"] == 200 and len(r["items"]) == 6


def test_pagination_total_respects_filters(seeded: TestClient):
    r = seeded.get("/api/expenses", params={"category": "Food", "limit": 2}).json()
    assert r["total"] == 3 and len(r["items"]) == 2


# ---------- dashboard ----------


def test_dashboard_empty_state_is_zero_filled(logged_in: TestClient):
    r = logged_in.get("/api/dashboard/summary")
    assert r.status_code == 200
    data = r.json()
    assert data["total_amount"] == "0.00"
    assert data["current_month_amount"] == "0.00"
    assert data["expense_count"] == 0
    assert data["recent"] == []
    assert sorted(b["category"] for b in data["by_category"]) == sorted(CATEGORIES)
    assert all(b["total"] == "0.00" and b["count"] == 0 for b in data["by_category"])


def test_dashboard_totals_by_category_and_current_month(seeded: TestClient):
    data = seeded.get("/api/dashboard/summary").json()
    assert set(data) == {
        "total_amount",
        "current_month_amount",
        "expense_count",
        "by_category",
        "recent",
    }
    assert data["total_amount"] == "210.00"
    assert data["expense_count"] == 6
    # injected clock is 2026-03-01: only the two 2026-03-01 rows are in the current month
    assert data["current_month_amount"] == "110.00"
    by = {b["category"]: b for b in data["by_category"]}
    assert len(data["by_category"]) == 7
    assert by["Food"] == {"category": "Food", "total": "90.00", "count": 3}
    assert by["Transport"]["total"] == "20.00" and by["Transport"]["count"] == 1
    assert by["Bills"]["total"] == "40.00"
    assert by["Other"]["total"] == "60.00"
    assert by["Shopping"] == {"category": "Shopping", "total": "0.00", "count": 0}
    assert sum(b["count"] for b in data["by_category"]) == data["expense_count"]


def test_dashboard_recent_is_latest_five_by_date_then_id(seeded: TestClient):
    recent = seeded.get("/api/dashboard/summary").json()["recent"]
    assert [e["amount"] for e in recent] == ["60.00", "50.00", "40.00", "30.00", "20.00"]
    assert set(recent[0]) >= {"id", "amount", "category", "expense_date"}


def test_dashboard_ignores_list_filters(seeded: TestClient):
    plain = seeded.get("/api/dashboard/summary").json()
    filtered = seeded.get("/api/dashboard/summary", params={"category": "Food"}).json()
    assert plain == filtered


def test_dashboard_month_boundary_follows_injected_clock(logged_in: TestClient, clock):
    create(logged_in, amount="5.00", date="2026-02-28")
    create(logged_in, amount="7.00", date="2026-03-01")
    create(logged_in, amount="9.00", date="2026-03-31")
    assert logged_in.get("/api/dashboard/summary").json()["current_month_amount"] == "16.00"
    clock.advance(60 * 24 * 31)  # session still valid? use a fresh login below if not
    r = logged_in.get("/api/dashboard/summary")
    if r.status_code == 401:
        logged_in.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
        r = logged_in.get("/api/dashboard/summary")
    assert r.json()["current_month_amount"] == "0.00"


def test_dashboard_reflects_update_and_delete(logged_in: TestClient):
    a = create(logged_in, amount="10.00", category="Food")
    b = create(logged_in, amount="5.00", category="Bills")
    logged_in.put(f"/api/expenses/{a['id']}", json=body("12.00", "Shopping"))
    logged_in.delete(f"/api/expenses/{b['id']}")
    data = logged_in.get("/api/dashboard/summary").json()
    by = {x["category"]: x for x in data["by_category"]}
    assert data["total_amount"] == "12.00" and data["expense_count"] == 1
    assert by["Shopping"]["total"] == "12.00" and by["Food"]["count"] == 0
    assert by["Bills"]["count"] == 0


# ---------- persistence ----------


def test_expenses_persist_across_application_restart(
    make_client: Callable[..., TestClient], provision, clock
):
    assert provision().returncode == 0
    first = make_client()
    first.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
    created = create(first, amount="42.42", category="Healthcare", description="persist")
    first.__exit__(None, None, None)

    second = make_client()
    r = second.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
    assert r.status_code == 200
    got = second.get(f"/api/expenses/{created['id']}")
    assert got.status_code == 200
    assert got.json() == created
    assert second.get("/api/dashboard/summary").json()["total_amount"] == "42.42"


def test_each_test_starts_with_empty_database(logged_in: TestClient):
    assert logged_in.get("/api/expenses").json()["total"] == 0
