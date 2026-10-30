from datetime import datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import get_db
from app.models.user import utcnow
from app.services.auth import CurrentUser, get_current_user

COOKIE_NAME = "expense_session"


def get_now(request: Request) -> datetime:
    clock = getattr(request.app.state, "clock", utcnow)
    return clock()


def require_auth(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    now: Annotated[datetime, Depends(get_now)],
) -> CurrentUser:
    token = request.cookies.get(COOKIE_NAME)
    user = get_current_user(db, token, now) if token else None
    if user is None:
        raise AppError(401, "not_authenticated", "Authentication required.")
    return user
