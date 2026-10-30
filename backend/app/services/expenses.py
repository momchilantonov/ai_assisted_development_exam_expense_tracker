from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Category, Expense
from app.schemas.expense import (
    CategorySummary,
    ExpenseInput,
    ExpenseList,
    ExpenseOut,
    Summary,
    format_cents,
)

Sort = Literal["date_desc", "date_asc"]


def to_out(expense: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=expense.id,
        amount=format_cents(expense.amount_cents),
        category=Category(expense.category),
        description=expense.description,
        expense_date=expense.expense_date,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )


def create_expense(db: Session, data: ExpenseInput) -> Expense:
    expense = Expense(
        amount_cents=data.amount_cents,
        category=data.category.value,
        description=data.description,
        expense_date=data.expense_date,
    )
    db.add(expense)
    db.commit()
    return expense


def get_expense(db: Session, expense_id: int) -> Expense | None:
    return db.get(Expense, expense_id)


def update_expense(db: Session, expense: Expense, data: ExpenseInput) -> Expense:
    expense.amount_cents = data.amount_cents
    expense.category = data.category.value
    expense.description = data.description
    expense.expense_date = data.expense_date
    db.commit()
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def list_expenses(
    db: Session,
    *,
    category: Category | None,
    date_from: date | None,
    date_to: date | None,
    sort: Sort,
    limit: int,
    offset: int,
) -> ExpenseList:
    conditions = []
    if category is not None:
        conditions.append(Expense.category == category.value)
    if date_from is not None:
        conditions.append(Expense.expense_date >= date_from)
    if date_to is not None:
        conditions.append(Expense.expense_date <= date_to)

    total = db.scalar(select(func.count()).select_from(Expense).where(*conditions)) or 0
    order = (
        (Expense.expense_date.asc(), Expense.id.asc())
        if sort == "date_asc"
        else (Expense.expense_date.desc(), Expense.id.desc())
    )
    rows = db.scalars(
        select(Expense).where(*conditions).order_by(*order).limit(limit).offset(offset)
    ).all()
    return ExpenseList(items=[to_out(r) for r in rows], total=total, limit=limit, offset=offset)


def build_summary(db: Session, now: datetime, timezone_name: str) -> Summary:
    # `now` is naive UTC (see models.user.utcnow); convert to the configured zone.
    zone = ZoneInfo(timezone_name)
    local_today = now.replace(tzinfo=ZoneInfo("UTC")).astimezone(zone).date()
    month_start = local_today.replace(day=1)
    next_month = (
        month_start.replace(year=month_start.year + 1, month=1)
        if month_start.month == 12
        else month_start.replace(month=month_start.month + 1)
    )

    total_cents, count = db.execute(
        select(func.coalesce(func.sum(Expense.amount_cents), 0), func.count(Expense.id))
    ).one()
    month_cents = db.scalar(
        select(func.coalesce(func.sum(Expense.amount_cents), 0)).where(
            Expense.expense_date >= month_start, Expense.expense_date < next_month
        )
    )
    per_category_rows = db.execute(
        select(Expense.category, func.sum(Expense.amount_cents), func.count(Expense.id)).group_by(
            Expense.category
        )
    )
    per_category = {cat: (cents, n) for cat, cents, n in per_category_rows}
    recent = db.scalars(
        select(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(5)
    ).all()

    return Summary(
        total_amount=format_cents(total_cents),
        current_month_amount=format_cents(month_cents or 0),
        expense_count=count,
        by_category=[
            CategorySummary(
                category=c,
                total=format_cents(per_category.get(c.value, (0, 0))[0]),
                count=per_category.get(c.value, (0, 0))[1],
            )
            for c in Category
        ],
        recent=[to_out(r) for r in recent],
    )
