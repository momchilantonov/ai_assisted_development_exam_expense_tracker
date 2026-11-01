from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.deps import COOKIE_NAME, get_now, require_auth
from app.core.errors import AppError
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginInput, RegisterInput, SessionInfo
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(
    request: Request, response: Response, db: Session, user: User, now: datetime
) -> SessionInfo:
    settings = request.app.state.settings
    token, expires_at = auth_service.create_session(db, user, settings.session_ttl_minutes, now)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.session_ttl_minutes * 60,
        path="/",
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
    )
    return SessionInfo(username=user.username, expires_at=expires_at)


@router.post("/register", status_code=201, response_model=SessionInfo)
def register(
    body: RegisterInput,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    now: Annotated[datetime, Depends(get_now)],
) -> SessionInfo:
    user = auth_service.register_user(db, body.username, body.password)
    if user is None:
        raise AppError(409, "username_taken", "Username is already taken.")
    return _start_session(request, response, db, user, now)


@router.post("/login", response_model=SessionInfo)
def login(
    body: LoginInput,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    now: Annotated[datetime, Depends(get_now)],
) -> SessionInfo:
    user = auth_service.authenticate(db, body.username, body.password)
    if user is None:
        raise AppError(401, "invalid_credentials", "Invalid username or password.")
    return _start_session(request, response, db, user, now)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    expense_session: Annotated[str | None, Cookie()] = None,
) -> Response:
    if expense_session:
        auth_service.delete_session(db, expense_session)
    response = Response(status_code=204)
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="strict",
        secure=request.app.state.settings.cookie_secure,
    )
    return response


@router.get("/me", response_model=SessionInfo)
def me(current: Annotated[auth_service.CurrentUser, Depends(require_auth)]) -> SessionInfo:
    return SessionInfo(username=current.username, expires_at=current.expires_at)
