# Architecture

Status: design from the approved plan (`docs/plan/master-plan.md`). Finalised by the documentation agent in Phase 5 after implementation.

```mermaid
flowchart TD
  U[User browser] --> FE[React + Vite SPA]
  FE -->|/api via Vite proxy, same-origin, cookie| API[FastAPI]
  subgraph Backend
    API --> MW[Origin check + error envelope]
    MW --> AUTH[auth routes + require_auth]
    MW --> EXP[expense / dashboard / categories routes]
    AUTH --> SVC_A[auth + session services]
    EXP --> SVC_E[expense + dashboard services]
  end
  SVC_A --> ORM[SQLAlchemy 2.x]
  SVC_E --> ORM
  ORM --> DB[(SQLite)]
  CLI[app.cli create-user] --> ORM
```

## Modules

1. Authentication: single user, session cookie, Argon2id, provisioning CLI (ADR-002).
2. Backend API: FastAPI routes, services, error envelope, contract in `docs/api-contract.md`.
3. Database and persistence: SQLite, SQLAlchemy 2.x models, constraints, `create_all` (ADR-003..005).
4. Frontend: React + TypeScript (strict) + Vite, protected routes, dashboard, expense list and forms.
5. Testing and integration: pytest, Vitest + RTL + MSW, Playwright E2E.

## AI development system

Agents (`.github/agents/`): `orchestrator`, `backend`, `frontend`, `testing`, `documentation`. State lives in `docs/tasks.md` and `docs/agent-handoffs.md`; ownership in `.github/copilot-instructions.md`; skills in `.github/skills/`; prompts in `.github/prompts/`; hooks in `.github/hooks/`.

## Data model

- `users(id CHECK=1, username UNIQUE, password_hash, created_at)`
- `sessions(token_hash PK, user_id FK, created_at, expires_at)`
- `expenses(id, amount_cents CHECK>0, category CHECK in enum, description, expense_date indexed, created_at, updated_at)`

## Configuration

`.env` (gitignored) from `.env.example`: `DATABASE_URL`, `SESSION_TTL_MINUTES`, `COOKIE_SECURE`, `ALLOWED_ORIGINS`, `APP_TIMEZONE`, `INITIAL_USERNAME`, `INITIAL_PASSWORD`.

## Ports and commands

Backend 8000, frontend 5173. `make help` lists targets (`setup`, `seed-user`, `dev-backend`, `dev-frontend`, `lint`, `typecheck`, `test-backend`, `test-frontend`, `test-e2e`, `check`, `validate`, `validate-infra`).
