import re
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.models.expense import Category

MAX_CENTS = 99_999_999
_AMOUNT_RE = re.compile(r"^\d{1,8}(\.\d{1,2})?$")


def parse_amount_to_cents(value: Any) -> int:
    """Convert a decimal string or JSON number to integer cents; never rounds."""
    if isinstance(value, bool) or not isinstance(value, str | int | float):
        raise ValueError("amount must be a decimal string or number")
    if isinstance(value, str):
        if not _AMOUNT_RE.fullmatch(value):
            raise ValueError("amount must have at most 2 decimals and be 0.01..999999.99")
        number = Decimal(value)
    else:
        try:
            number = Decimal(str(value))
        except InvalidOperation as exc:
            raise ValueError("amount must be a finite number") from exc
        exponent = number.as_tuple().exponent
        if not number.is_finite() or not isinstance(exponent, int) or exponent < -2:
            raise ValueError("amount must have at most 2 decimals")
    cents = int(number * 100)
    if cents < 1 or cents > MAX_CENTS:
        raise ValueError("amount must be between 0.01 and 999999.99")
    return cents


def format_cents(cents: int) -> str:
    return f"{cents // 100}.{cents % 100:02d}"


def _iso_utc(value: datetime) -> str:
    return value.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")


class ExpenseInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    amount_cents: Annotated[int, Field(alias="amount")]
    category: Category
    description: Annotated[str | None, Field(max_length=500)] = None
    expense_date: date

    @field_validator("amount_cents", mode="before")
    @classmethod
    def _amount(cls, value: Any) -> int:
        return parse_amount_to_cents(value)

    @field_validator("description")
    @classmethod
    def _blank_description(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("expense_date", mode="before")
    @classmethod
    def _iso_date_only(cls, value: Any) -> Any:
        if isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value.strip()):
            return value.strip()
        raise ValueError("expense_date must be a valid YYYY-MM-DD date")


class ExpenseOut(BaseModel):
    id: int
    amount: str
    category: Category
    description: str | None
    expense_date: date
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _utc(self, value: datetime) -> str:
        return _iso_utc(value)


class ExpenseList(BaseModel):
    items: list[ExpenseOut]
    total: int
    limit: int
    offset: int


class CategorySummary(BaseModel):
    category: Category
    total: str
    count: int


class Summary(BaseModel):
    total_amount: str
    current_month_amount: str
    expense_count: int
    by_category: list[CategorySummary]
    recent: list[ExpenseOut]
