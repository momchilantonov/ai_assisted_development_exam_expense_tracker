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

## Authentication (procedure: `single-user-auth` skill)
- Server-side sessions: opaque `secrets.token_urlsafe(32)` token in cookie `expense_session` (HttpOnly, SameSite=Strict, Secure per `COOKIE_SECURE`); store only the SHA-256 in `sessions`; absolute TTL `SESSION_TTL_MINUTES`.
- Argon2id via `argon2-cffi`; verify against a dummy hash for unknown users; identical error for bad username and bad password.
- Expense, dashboard and category routers must carry router-level `Depends(require_auth)`. The route-guard test must fail if any route outside the allow-list (`health`, `login`, `logout`, docs) is public.
- Origin check on POST/PUT/DELETE: if `Origin` is present it must be in `ALLOWED_ORIGINS`, else 403 `forbidden_origin`. No CORS middleware.
- Exactly one user (`users.id = 1`). The only sign-up is the first-run sign-up (CR-001, ADR-010): `GET /api/auth/setup-status` and `POST /api/auth/register` work only while no user exists; afterwards register returns 403 `registration_closed`, and a concurrent second registration must also fail (rely on the `id = 1` constraint and handle `IntegrityError`). `python -m app.cli create-user` stays as an idempotent fallback; it never overwrites a password without `--reset-password`.

## Errors
- Every error returns `{"error": {"code", "message", "details"?}}` with codes `not_authenticated`, `invalid_credentials`, `validation_error`, `not_found`, `forbidden_origin`, `internal_error`. Register handlers for validation errors, HTTPException and unexpected exceptions; never return tracebacks.

## API contract
- `docs/api-contract.md` is authoritative. Any change to paths, schemas, status codes or error codes must update the contract in the same task and be noted in the handoff. OpenAPI at `/api/docs`.

## Tests (own the `unit/` tests)
- pytest, temporary file SQLite per test, injectable clock for expiry and "current month". Name tests `test_<behavior>_<condition>`. Shared fixtures in `backend/tests/conftest.py`. Black-box integration tests in `tests/integration/` belong to the `testing` agent.
