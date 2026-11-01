---
name: Backend conventions
description: Python/FastAPI/SQLAlchemy/Pydantic conventions for the expense tracker backend, including auth, money and error handling.
applyTo: 'backend/**'
---
# Backend conventions

Layout: `backend/app/{main,config,db,cli}.py`, `models/`, `schemas/`, `services/`, `api/`, `core/{security,deps,errors,origin}.py`; tests in `backend/tests/{unit,integration}`. Dependencies: `pyproject.toml` (ruff and pytest config) plus pinned `requirements.txt` / `requirements-dev.txt`; venv at `backend/.venv`.

## Code
- Python 3.12, full type hints on all public functions, ruff-clean (`ruff check`, `ruff format`).
- FastAPI routes are thin: validate with Pydantic, call a service, return a schema. Business logic lives in `services/`.
- SQLAlchemy 2.x style (`Mapped[...]`, `select()`); import the `Session` model under an alias (for example `AuthSession`) wherever SQLAlchemy's `Session` is also used; one session per request via a dependency; `PRAGMA foreign_keys=ON`; constraints in the models (CHECK, UNIQUE). No migrations: `Base.metadata.create_all` in `init_db`.
- Pydantic v2 schemas separate input and output models. Strings are trimmed; description max 500.
- Settings via `pydantic-settings` from `.env` (repo root) and environment; no hardcoded secrets; relative sqlite paths resolve against `backend/`.

## Financial precision
- Database: `amount_cents` INTEGER, CHECK > 0. API: decimal strings with at most 2 decimals, range 0.01..999999.99; reject extra decimals with 422, never round silently. Never use `float` for money.

## Categories
- `Category` is a `str` Enum (Food, Transport, Shopping, Bills, Entertainment, Healthcare, Other) mirrored by a DB CHECK constraint.

## Authentication (procedure: `session-auth` skill)
- Server-side sessions: opaque `secrets.token_urlsafe(32)` token in cookie `expense_session` (HttpOnly, SameSite=Strict, Secure per `COOKIE_SECURE`); store only the SHA-256 in `sessions`; absolute TTL `SESSION_TTL_MINUTES`.
- Argon2id via `argon2-cffi`; verify against a dummy hash for unknown users; identical error for bad username and bad password.
- Expense, dashboard and category routers must carry router-level `Depends(require_auth)`. The route-guard test must fail if any route outside the allow-list (`health`, `login`, `logout`, docs) is public.
- Origin check on POST/PUT/DELETE: if `Origin` is present it must be in `ALLOWED_ORIGINS`, else 403 `forbidden_origin`. No CORS middleware.
- Multiple users (CR-002, ADR-011). Open sign-up: `POST /api/auth/register` (public, Origin-checked) creates a user and logs them in; username 3-64 chars, unique case-insensitively (store a normalised lowercase form or `COLLATE NOCASE` unique index), password 8-128 chars; duplicate username -> 409 `username_taken`. No `users.id = 1` constraint; `expenses.user_id` is a NOT NULL FK with an index, and sessions belong to a user (`ON DELETE CASCADE`).
- Data isolation: every expense, dashboard and category query is filtered by the authenticated user's id taken from the session, never from the request. Another user's expense id returns 404 `not_found` (never 403), for read, update and delete; list totals and dashboard figures are per user. Add a user-isolation test for every new expense route.
- `python -m app.cli create-user` stays as a fallback; it never overwrites an existing user's password without `--reset-password`. Schema changes need a fresh database (no migrations); say so in the handoff.

## Errors
- Every error returns `{"error": {"code", "message", "details"?}}` with codes `not_authenticated`, `invalid_credentials`, `validation_error`, `not_found`, `forbidden_origin`, `internal_error`. Register handlers for validation errors, HTTPException and unexpected exceptions; never return tracebacks.

## API contract
- `docs/api-contract.md` is authoritative. Any change to paths, schemas, status codes or error codes must update the contract in the same task and be noted in the handoff. OpenAPI at `/api/docs`.

## Tests (own the `unit/` tests)
- pytest, temporary file SQLite per test, injectable clock for expiry and "current month". Name tests `test_<behavior>_<condition>`. Shared fixtures in `backend/tests/conftest.py`. Black-box integration tests in `tests/integration/` belong to the `testing` agent.
