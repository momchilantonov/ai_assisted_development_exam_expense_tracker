# AI-Driven Expense Tracker

A single-user expense tracker (FastAPI + SQLite backend, React + TypeScript + Vite frontend) built entirely by specialised GitHub Copilot agents as an AI-assisted development exam project.

Repository: https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker

Features: login with a server-side session cookie, expense create/list/edit/delete with category and date filters, sorting and pagination, and a dashboard with total, current-month total, per-category breakdown (SVG chart) and recent expenses. Money is stored as integer cents and exchanged as decimal strings.

## Prerequisites

- Python 3.12 (`uv python install 3.12`), `uv`
- Node.js 22.20+ with npm (`nvm install 22 && nvm use 22`)
- `make`, `git`
- VS Code with GitHub Copilot (only needed to reproduce the AI workflow)

## Setup and run

```bash
nvm use 22
make check-env       # toolchain versions
make setup           # backend venv + deps, frontend deps, E2E deps + Chromium
cp .env.example .env # then set INITIAL_USERNAME (INITIAL_PASSWORD optional, prompted if empty)
make seed-user       # creates the single user; never overwrites an existing password
make dev-backend     # http://127.0.0.1:8000
make dev-frontend    # http://localhost:5173 (proxies /api to the backend)
```

To replace the password explicitly: `cd backend && .venv/bin/python -m app.cli create-user --reset-password`.

## Checks

| Command | What it does |
|---|---|
| `make lint` | ruff (backend), ESLint (frontend) |
| `make typecheck` | `tsc -b` (frontend); mypy runs only if installed (it is not) |
| `make test-backend` | pytest, unit and black-box integration tests |
| `make test-frontend` | Vitest + React Testing Library + MSW |
| `make test-e2e` | Playwright (Chromium) on a temporary database; ports 8000 and 5173 must be free |
| `make validate` | check + E2E, output saved under `docs/evidence/test-runs/` |

Last full `make validate` (exit 0, `docs/evidence/test-runs/check-20261101T005613Z.txt`): backend 291 passed, frontend 62 passed, E2E 3 passed.

Verification status: `make validate` (lint, typecheck, tests, E2E) was run by the orchestrator and testing agents (see test runs). `make check-env` was run by the documentation agent in a shell with Node 22.13.1 and exited 2 as designed ("below 22.20"); it needs `nvm use 22` first. `make setup`, `make seed-user`, `make dev-backend` and `make dev-frontend` were not re-run by the documentation agent (the servers were started by the orchestrator in I-01 and by the E2E setup).

## Where things are

- `backend/` FastAPI app and tests; `frontend/` React SPA and tests; `e2e/` Playwright specs
- `docs/` architecture, API contract, decisions, tasks, handoffs, test report, defects, evidence, final report
- `.github/` agents, instructions, skills, prompts, hooks, CI; `make help` lists all targets
