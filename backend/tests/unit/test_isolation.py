from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.expense import Expense
from tests.unit.test_expenses import body, create


@pytest.fixture
def alice(client: TestClient) -> TestClient:
    assert (
        client.post(
            "/api/auth/register", json={"username": "alice", "password": "alice-password"}
        ).status_code
        == 201
    )
    return client


@pytest.fixture
def bob(app, clock) -> Iterator[TestClient]:
    with TestClient(app) as other:
        response = other.post(
            "/api/auth/register", json={"username": "bob", "password": "bob-password-1"}
        )
        assert response.status_code == 201
        yield other


def test_list_returns_only_own_expenses_and_total(alice: TestClient, bob: TestClient) -> None:
    create(alice, amount="1.00")
    create(alice, amount="2.00")
    create(bob, amount="50.00")

    mine = alice.get("/api/expenses").json()
    theirs = bob.get("/api/expenses").json()

    assert mine["total"] == 2 and [i["amount"] for i in mine["items"]] == ["2.00", "1.00"]
    assert theirs["total"] == 1 and theirs["items"][0]["amount"] == "50.00"


def test_list_filters_never_include_other_users(alice: TestClient, bob: TestClient) -> None:
    create(bob, category="Food", expense_date="2026-01-15")

    response = alice.get("/api/expenses?category=Food&date_from=2026-01-01&date_to=2026-01-31")

    assert response.json()["total"] == 0


def test_get_other_users_expense_returns_404(alice: TestClient, bob: TestClient) -> None:
    expense_id = create(alice)["id"]

    response = bob.get(f"/api/expenses/{expense_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert alice.get(f"/api/expenses/{expense_id}").status_code == 200


def test_create_assigns_session_user_ignoring_body_user_id(
    alice: TestClient, bob: TestClient, app
) -> None:
    response = alice.post("/api/expenses", json={**body(), "user_id": 2})
    assert response.status_code == 201

    with app.state.session_factory() as db:
        row = db.scalar(select(Expense).where(Expense.id == response.json()["id"]))
    assert row is not None and row.user_id == 1
    assert bob.get("/api/expenses").json()["total"] == 0


def test_update_other_users_expense_returns_404_and_keeps_data(
    alice: TestClient, bob: TestClient
) -> None:
    expense_id = create(alice, amount="9.99")["id"]

    response = bob.put(f"/api/expenses/{expense_id}", json=body(amount="1.00"))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert alice.get(f"/api/expenses/{expense_id}").json()["amount"] == "9.99"


def test_delete_other_users_expense_returns_404_and_keeps_row(
    alice: TestClient, bob: TestClient
) -> None:
    expense_id = create(alice)["id"]

    response = bob.delete(f"/api/expenses/{expense_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert alice.get(f"/api/expenses/{expense_id}").status_code == 200


def test_other_users_id_is_indistinguishable_from_unknown_id(
    alice: TestClient, bob: TestClient
) -> None:
    expense_id = create(alice)["id"]

    foreign = bob.get(f"/api/expenses/{expense_id}")
    unknown = bob.get("/api/expenses/9999")

    assert foreign.status_code == unknown.status_code == 404
    assert foreign.json() == unknown.json()


def test_dashboard_is_per_user(alice: TestClient, bob: TestClient, clock) -> None:
    create(alice, amount="10.00", category="Food", expense_date="2026-01-05")
    create(bob, amount="500.00", category="Bills", expense_date="2026-01-06")
    create(bob, amount="1.00", category="Food", expense_date="2026-01-07")

    mine = alice.get("/api/dashboard/summary").json()
    theirs = bob.get("/api/dashboard/summary").json()

    assert mine["total_amount"] == "10.00" and mine["expense_count"] == 1
    assert mine["current_month_amount"] == "10.00"
    assert {c["category"]: c["total"] for c in mine["by_category"]}["Bills"] == "0.00"
    assert len(mine["recent"]) == 1 and mine["recent"][0]["amount"] == "10.00"
    assert theirs["total_amount"] == "501.00" and theirs["expense_count"] == 2
    assert len(theirs["recent"]) == 2


def test_dashboard_empty_for_new_user_when_others_have_data(
    alice: TestClient, bob: TestClient
) -> None:
    create(alice, amount="10.00")

    summary = bob.get("/api/dashboard/summary").json()

    assert summary["total_amount"] == "0.00" and summary["expense_count"] == 0
    assert summary["recent"] == []


def test_categories_require_session_and_are_same_for_every_user(
    alice: TestClient, bob: TestClient, app
) -> None:
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/categories").status_code == 401

    assert alice.get("/api/categories").json() == bob.get("/api/categories").json()
    assert len(alice.get("/api/categories").json()) == 7


def test_logging_in_as_other_user_shows_only_that_users_data(
    alice: TestClient, bob: TestClient, app
) -> None:
    create(alice, amount="3.00")
    with TestClient(app) as again:
        again.post("/api/auth/login", json={"username": "ALICE", "password": "alice-password"})
        assert again.get("/api/expenses").json()["total"] == 1
