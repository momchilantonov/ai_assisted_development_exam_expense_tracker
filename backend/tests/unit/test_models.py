from collections.abc import Iterator
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import Engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.db import create_db_engine, create_session_factory, init_db
from app.models import Category, Expense, Session, User


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    eng = create_db_engine(f"sqlite:///{tmp_path / 'models.db'}")
    init_db(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[DbSession]:
    with create_session_factory(engine)() as session:
        yield session


def _expense(**overrides: object) -> Expense:
    values: dict[str, object] = {
        "amount_cents": 1234,
        "category": Category.FOOD.value,
        "expense_date": date(2026, 1, 15),
    }
    values.update(overrides)
    return Expense(**values)


def _user(**overrides: object) -> User:
    values: dict[str, object] = {"username": "owner", "password_hash": "hash"}
    values.update(overrides)
    return User(**values)


def test_init_db_creates_tables(engine: Engine) -> None:
    assert set(inspect(engine).get_table_names()) == {"users", "sessions", "expenses"}


def test_expense_persists_with_defaults(db: DbSession) -> None:
    db.add(_expense())
    db.commit()
    saved = db.query(Expense).one()
    assert saved.amount_cents == 1234
    assert saved.description is None
    assert saved.created_at is not None
    assert saved.updated_at is not None


@pytest.mark.parametrize("amount", [0, -1])
def test_expense_rejected_when_amount_not_positive(db: DbSession, amount: int) -> None:
    db.add(_expense(amount_cents=amount))
    with pytest.raises(IntegrityError):
        db.commit()


def test_expense_rejected_when_category_invalid(db: DbSession) -> None:
    db.add(_expense(category="Gambling"))
    with pytest.raises(IntegrityError):
        db.commit()


@pytest.mark.parametrize("category", [c.value for c in Category])
def test_expense_accepts_every_contract_category(db: DbSession, category: str) -> None:
    db.add(_expense(category=category))
    db.commit()


def test_user_rejected_when_username_duplicate(db: DbSession) -> None:
    db.add(_user())
    db.commit()
    db.add(_user(id=1))
    with pytest.raises(IntegrityError):
        db.commit()


def test_user_rejected_when_id_not_one(db: DbSession) -> None:
    db.add(_user(id=2))
    with pytest.raises(IntegrityError):
        db.commit()


def test_session_rejected_when_user_missing(db: DbSession) -> None:
    db.add(Session(token_hash="a" * 64, user_id=1, expires_at=datetime(2030, 1, 1)))
    with pytest.raises(IntegrityError):
        db.commit()


def test_session_persists_for_existing_user(db: DbSession) -> None:
    db.add(_user())
    db.commit()
    expires = datetime(2030, 1, 1) + timedelta(minutes=5)
    db.add(Session(token_hash="b" * 64, user_id=1, expires_at=expires))
    db.commit()
    saved = db.get(Session, "b" * 64)
    assert saved is not None
    assert saved.expires_at == expires


def test_session_token_hash_unique(db: DbSession) -> None:
    db.add(_user())
    db.commit()
    db.add(Session(token_hash="c" * 64, user_id=1, expires_at=datetime(2030, 1, 1)))
    db.commit()
    db.add(Session(token_hash="c" * 64, user_id=1, expires_at=datetime(2030, 1, 1)))
    with pytest.raises(IntegrityError):
        db.commit()
