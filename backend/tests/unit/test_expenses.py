import os
from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.schemas.expense import ExpenseInput, format_cents, parse_amount_to_cents


def body(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "amount": "12.34",
        "category": "Food",
        "description": "  lunch  ",
        "expense_date": "2026-01-15",
    }
    data.update(overrides)
    return data


def create(client: TestClient, **overrides: object) -> dict:
    response = client.post("/api/expenses", json=body(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


# --- money / schema (X-01) ---


@pytest.mark.parametrize(
    ("value", "cents"),
    [("0.01", 1), ("12.3", 1230), ("12", 1200), ("999999.99", 99_999_999), (12.5, 1250), (7, 700)],
)
def test_parse_amount_valid(value: object, cents: int) -> None:
    assert parse_amount_to_cents(value) == cents


@pytest.mark.parametrize(
    "value",
    ["0", "0.00", "-1", "1.234", "1000000.00", "abc", "", "1e2", "NaN"]
    + [1.234, 1_000_000, True, None, []],
)
def test_parse_amount_invalid(value: object) -> None:
    with pytest.raises(ValueError):
        parse_amount_to_cents(value)


def test_format_cents_pads_two_decimals() -> None:
    assert format_cents(5) == "0.05"
    assert format_cents(1200) == "12.00"
    assert format_cents(99_999_999) == "999999.99"


def test_input_trims_description_and_blank_becomes_none() -> None:
    assert ExpenseInput(**body()).description == "lunch"  # type: ignore[arg-type]
    assert ExpenseInput(**body(description="   ")).description is None  # type: ignore[arg-type]


def test_input_rejects_long_description_and_bad_date() -> None:
    with pytest.raises(ValidationError):
        ExpenseInput(**body(description="x" * 501))  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        ExpenseInput(**body(expense_date="2026-02-30"))  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        ExpenseInput(**body(expense_date=1700000000))  # type: ignore[arg-type]


# --- CRUD (X-02) ---


def test_create_returns_201_location_and_decimal_string(auth_client: TestClient) -> None:
    response = auth_client.post("/api/expenses", json=body(amount=12.3))
    assert response.status_code == 201
    data = response.json()
    assert response.headers["location"] == f"/api/expenses/{data['id']}"
    assert data["amount"] == "12.30"
    assert data["description"] == "lunch"
    assert data["expense_date"] == "2026-01-15"
    assert data["created_at"].endswith("Z")
    assert set(data) == {
        "id",
        "amount",
        "category",
        "description",
        "expense_date",
        "created_at",
        "updated_at",
    }


def test_amount_stored_as_integer_cents(auth_client: TestClient, app) -> None:
    from app.models.expense import Expense

    created = create(auth_client, amount="0.07")
    with app.state.session_factory() as db:
        assert db.get(Expense, created["id"]).amount_cents == 7


@pytest.mark.parametrize(
    "overrides",
    [
        {"amount": "1.001"},
        {"amount": "0"},
        {"amount": "1000000"},
        {"amount": "-5"},
        {"category": "Custom"},
        {"expense_date": "nope"},
        {"description": "x" * 501},
    ],
)
def test_create_invalid_returns_422_envelope(auth_client: TestClient, overrides: dict) -> None:
    response = auth_client.post("/api/expenses", json=body(**overrides))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_create_missing_field_returns_422(auth_client: TestClient) -> None:
    response = auth_client.post("/api/expenses", json={"amount": "1.00"})
    assert response.status_code == 422


def test_read_update_delete_roundtrip(auth_client: TestClient) -> None:
    created = create(auth_client)
    url = f"/api/expenses/{created['id']}"
    assert auth_client.get(url).json()["amount"] == "12.34"

    updated = auth_client.put(
        url, json=body(amount="20", category="Bills", description=None, expense_date="2026-02-01")
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == "20.00"
    assert updated.json()["category"] == "Bills"
    assert updated.json()["description"] is None
    assert updated.json()["created_at"] == created["created_at"]

    assert auth_client.delete(url).status_code == 204
    assert auth_client.get(url).status_code == 404


def test_unknown_id_returns_404_not_found(auth_client: TestClient) -> None:
    for response in (
        auth_client.get("/api/expenses/999"),
        auth_client.put("/api/expenses/999", json=body()),
        auth_client.delete("/api/expenses/999"),
    ):
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"


def test_non_positive_id_returns_422(auth_client: TestClient) -> None:
    assert auth_client.get("/api/expenses/0").status_code == 422
    assert auth_client.get("/api/expenses/abc").status_code == 422


def test_put_invalid_does_not_change_row(auth_client: TestClient) -> None:
    created = create(auth_client)
    url = f"/api/expenses/{created['id']}"
    assert auth_client.put(url, json=body(amount="1.234")).status_code == 422
    assert auth_client.get(url).json()["amount"] == "12.34"


def test_unsafe_methods_reject_foreign_origin(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/expenses", json=body(), headers={"Origin": "http://evil.example"}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden_origin"


# --- filters, sorting, pagination (X-03) ---


@pytest.fixture
def seeded(auth_client: TestClient) -> TestClient:
    create(auth_client, amount="1.00", category="Food", expense_date="2026-01-10")
    create(auth_client, amount="2.00", category="Bills", expense_date="2026-01-20")
    create(auth_client, amount="3.00", category="Food", expense_date="2026-01-20")
    create(auth_client, amount="4.00", category="Other", expense_date="2026-02-05")
    return auth_client


def amounts(response) -> list[str]:  # noqa: ANN001
    return [i["amount"] for i in response.json()["items"]]


def test_list_default_sort_date_desc_ties_by_id_desc(seeded: TestClient) -> None:
    response = seeded.get("/api/expenses")
    assert response.status_code == 200
    assert amounts(response) == ["4.00", "3.00", "2.00", "1.00"]
    assert {k: response.json()[k] for k in ("total", "limit", "offset")} == {
        "total": 4,
        "limit": 50,
        "offset": 0,
    }


def test_list_sort_date_asc_ties_by_id_asc(seeded: TestClient) -> None:
    assert amounts(seeded.get("/api/expenses?sort=date_asc")) == ["1.00", "2.00", "3.00", "4.00"]


def test_list_filters_category_and_inclusive_dates(seeded: TestClient) -> None:
    assert amounts(seeded.get("/api/expenses?category=Food")) == ["3.00", "1.00"]
    both = seeded.get("/api/expenses?date_from=2026-01-20&date_to=2026-01-20")
    assert amounts(both) == ["3.00", "2.00"]
    assert both.json()["total"] == 2


def test_list_pagination_total_ignores_limit(seeded: TestClient) -> None:
    page = seeded.get("/api/expenses?limit=2&offset=1")
    assert amounts(page) == ["3.00", "2.00"]
    assert page.json()["total"] == 4
    assert (page.json()["limit"], page.json()["offset"]) == (2, 1)
    assert amounts(seeded.get("/api/expenses?offset=10")) == []


@pytest.mark.parametrize(
    "query",
    [
        "category=Nope",
        "sort=random",
        "limit=0",
        "limit=201",
        "offset=-1",
        "date_from=bad",
        "date_from=2026-02-01&date_to=2026-01-01",
    ],
)
def test_list_invalid_query_returns_422(auth_client: TestClient, query: str) -> None:
    response = auth_client.get(f"/api/expenses?{query}")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# --- categories and dashboard (X-04) ---


def test_categories_lists_all_seven(auth_client: TestClient) -> None:
    response = auth_client.get("/api/categories")
    assert response.status_code == 200
    assert response.json() == [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Entertainment",
        "Healthcare",
        "Other",
    ]


def test_summary_empty_is_zero_filled(auth_client: TestClient) -> None:
    data = auth_client.get("/api/dashboard/summary").json()
    assert data["total_amount"] == "0.00"
    assert data["current_month_amount"] == "0.00"
    assert data["expense_count"] == 0
    assert data["recent"] == []
    assert len(data["by_category"]) == 7
    assert all(c["total"] == "0.00" and c["count"] == 0 for c in data["by_category"])


def jump_clock(client: TestClient, clock, **fields: int) -> None:  # noqa: ANN001
    # Session TTL is clock-based, so log in again after moving the clock.
    clock.now = clock.now.replace(**fields)
    password = os.environ["_TEST_RUN_PASSWORD"]
    login = client.post("/api/auth/login", json={"username": "tester", "password": password})
    assert login.status_code == 200


def test_summary_totals_month_categories_and_recent(auth_client: TestClient, clock) -> None:
    jump_clock(auth_client, clock, year=2026, month=1, day=31, hour=12)
    create(auth_client, amount="10.10", category="Food", expense_date="2025-12-31")
    create(auth_client, amount="0.20", category="Food", expense_date="2026-01-01")
    create(auth_client, amount="5.00", category="Bills", expense_date="2026-01-31")
    create(auth_client, amount="9.99", category="Other", expense_date="2026-02-01")
    for day in range(2, 6):
        create(auth_client, amount="1.00", category="Other", expense_date=f"2026-03-0{day}")

    data = auth_client.get("/api/dashboard/summary?category=Food&limit=1").json()
    assert data["total_amount"] == "29.29"
    assert data["current_month_amount"] == "5.20"
    assert data["expense_count"] == 8
    by_cat = {c["category"]: c for c in data["by_category"]}
    assert by_cat["Food"] == {"category": "Food", "total": "10.30", "count": 2}
    assert by_cat["Other"]["count"] == 5
    assert by_cat["Transport"] == {"category": "Transport", "total": "0.00", "count": 0}
    assert [r["expense_date"] for r in data["recent"]] == [
        "2026-03-05",
        "2026-03-04",
        "2026-03-03",
        "2026-03-02",
        "2026-02-01",
    ]


def test_summary_current_month_uses_app_timezone(app, auth_client: TestClient, clock) -> None:
    app.state.settings.app_timezone = "Pacific/Auckland"
    jump_clock(auth_client, clock, year=2026, month=1, day=31, hour=12)  # 02-01 01:00 local
    create(auth_client, amount="3.00", expense_date="2026-02-01")
    create(auth_client, amount="4.00", expense_date="2026-01-31")
    assert auth_client.get("/api/dashboard/summary").json()["current_month_amount"] == "3.00"


def test_summary_date_type_roundtrip(auth_client: TestClient) -> None:
    created = create(auth_client)
    assert date.fromisoformat(created["expense_date"]) == date(2026, 1, 15)


def test_expense_routes_require_auth_and_check_before_validation(client: TestClient) -> None:
    for method, path in [
        ("GET", "/api/categories"),
        ("GET", "/api/expenses"),
        ("POST", "/api/expenses"),
        ("GET", "/api/expenses/1"),
        ("PUT", "/api/expenses/1"),
        ("DELETE", "/api/expenses/1"),
        ("GET", "/api/dashboard/summary"),
    ]:
        response = client.request(method, path, json={} if method in ("POST", "PUT") else None)
        assert response.status_code == 401, (method, path)
        assert response.json()["error"]["code"] == "not_authenticated"
