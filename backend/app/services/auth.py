from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    generate_token,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)
from app.models.session import Session as AuthSession
from app.models.user import User

Clock = Callable[[], datetime]


@dataclass(frozen=True)
class CurrentUser:
    id: int
    username: str
    expires_at: datetime


def _find_user(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.username) == username.lower()))


def register_user(db: Session, username: str, password: str) -> User | None:
    """Create a user; returns None when the username is taken (any letter case)."""
    if _find_user(db, username) is not None:
        return None
    user = User(username=username, password_hash=hash_password(password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    return user


def provision_user(
    db: Session, username: str, password: str, *, reset_password: bool = False
) -> str:
    """Create the user if absent. Returns 'created', 'reset' or 'exists'."""
    user = _find_user(db, username)
    if user is None:
        if register_user(db, username, password) is None:
            return "exists"
        return "created"
    if not reset_password:
        return "exists"
    user.password_hash = hash_password(password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    return "reset"


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = _find_user(db, username)
    if not verify_password(user.password_hash if user else None, password) or user is None:
        return None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
    return user


def create_session(
    db: Session, user: User, ttl_minutes: int, now: datetime
) -> tuple[str, datetime]:
    """Purge expired rows, store a new session and return (raw token, expires_at)."""
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    token = generate_token()
    expires_at = now + timedelta(minutes=ttl_minutes)
    db.add(
        AuthSession(
            token_hash=hash_token(token),
            user_id=user.id,
            created_at=now,
            expires_at=expires_at,
        )
    )
    db.commit()
    return token, expires_at


def get_current_user(db: Session, token: str, now: datetime) -> CurrentUser | None:
    row = db.get(AuthSession, hash_token(token))
    if row is None or row.expires_at <= now:
        return None
    user = db.get(User, row.user_id)
    if user is None:
        return None
    return CurrentUser(id=user.id, username=user.username, expires_at=row.expires_at)


def delete_session(db: Session, token: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    db.commit()
