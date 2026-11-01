from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request, Response
from sqlalchemy.orm import Session

from app.config import Settings
from app.core.deps import get_now, require_auth
from app.core.errors import AppError
from app.db import get_db
from app.models.expense import Category, Expense
from app.schemas.expense import ExpenseInput, ExpenseList, ExpenseOut, Summary
from app.services import expenses as service
from app.services.auth import CurrentUser

guard = [Depends(require_auth)]
expenses_router = APIRouter(prefix="/expenses", tags=["expenses"], dependencies=guard)
categories_router = APIRouter(prefix="/categories", tags=["categories"], dependencies=guard)
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=guard)

DbDep = Annotated[Session, Depends(get_db)]
ExpenseId = Annotated[int, Path(ge=1)]
UserDep = Annotated[CurrentUser, Depends(require_auth)]


def _load(db: Session, user: CurrentUser, expense_id: int) -> Expense:
    expense = service.get_expense(db, user.id, expense_id)
    if expense is None:
        raise AppError(404, "not_found", "Expense not found.")
    return expense


@categories_router.get("", response_model=list[Category])
def list_categories() -> list[Category]:
    return list(Category)


@expenses_router.post("", status_code=201, response_model=ExpenseOut)
def create_expense(body: ExpenseInput, response: Response, db: DbDep, user: UserDep) -> ExpenseOut:
    expense = service.create_expense(db, user.id, body)
    response.headers["Location"] = f"/api/expenses/{expense.id}"
    return service.to_out(expense)


@expenses_router.get("", response_model=ExpenseList)
def list_expenses(
    db: DbDep,
    user: UserDep,
    category: Category | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Annotated[service.Sort, Query()] = "date_desc",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExpenseList:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise AppError(422, "validation_error", "date_from must not be after date_to.")
    return service.list_expenses(
        db,
        user.id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@expenses_router.get("/{expense_id}", response_model=ExpenseOut)
def read_expense(expense_id: ExpenseId, db: DbDep, user: UserDep) -> ExpenseOut:
    return service.to_out(_load(db, user, expense_id))


@expenses_router.put("/{expense_id}", response_model=ExpenseOut)
def replace_expense(
    expense_id: ExpenseId, body: ExpenseInput, db: DbDep, user: UserDep
) -> ExpenseOut:
    return service.to_out(service.update_expense(db, _load(db, user, expense_id), body))


@expenses_router.delete("/{expense_id}", status_code=204)
def remove_expense(expense_id: ExpenseId, db: DbDep, user: UserDep) -> Response:
    service.delete_expense(db, _load(db, user, expense_id))
    return Response(status_code=204)


@dashboard_router.get("/summary", response_model=Summary)
def summary(
    request: Request,
    db: DbDep,
    user: UserDep,
    now: Annotated[datetime, Depends(get_now)],
) -> Summary:
    settings: Settings = request.app.state.settings
    return service.build_summary(db, user.id, now, settings.app_timezone)
