# AI-Assisted Development Exam - AI-Driven Expense Tracker

Repository: `<GITHUB_URL_TO_BE_ADDED_BY_HUMAN>` (the development log records https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker as provided by the human; the human confirms the final link).

Source of every claim below: files under `docs/evidence/`, `docs/test-report.md`, `docs/defects.md`, `docs/decisions.md`, `docs/agent-handoffs.md` and git history.

## 1. Project overview

The project is a single-user expense tracker. The owner logs in, records expenses (amount, one of seven fixed categories, date, optional description), filters, sorts and pages through them, edits or deletes them, and sees a dashboard with the total, the current-month total, a per-category breakdown drawn as an SVG chart and the most recent expenses. Data persists in SQLite.

Requirements that shaped the design:

- Single user, no public registration; the user is provisioned through a CLI.
- Secure authentication: Argon2id password hash, opaque server-side session in an HttpOnly, SameSite=Strict cookie, Origin check on unsafe methods, logout that deletes the session row (ADR-002).
- Money is exact: integer cents in the database, decimal strings in the API, never floats (ADR-003).
- The application was written by AI agents only; the human gave approvals at checkpoints (HC1 plan, HC2 infrastructure, HC3 auth review, HC4 E2E pass).
- Out of scope by plan: Redis, Celery, cloud databases, microservices, payments, multi-user roles, external auth, Alembic, MCP.

Stack: FastAPI, Pydantic v2, SQLAlchemy 2.x, SQLite, pytest; React, TypeScript (strict), Vite, Vitest, React Testing Library, MSW; Playwright. Architecture and diagram: `docs/architecture.md`; endpoints: `docs/api-contract.md`.

Workflow: one planning step in Copilot Plan Mode, one infrastructure step in Copilot Agent Mode (instructions, 10 skills, 5 custom agents, 12 prompt files, hooks, CI), then custom agents (`backend`, `frontend`, `testing`, `orchestrator`, `documentation`) with write-ownership rules, a task board (`docs/tasks.md`) and append-only handoffs (`docs/agent-handoffs.md`). An agent that implemented a task could not mark it VERIFIED; another agent re-ran the checks.

## 2. Modules

### Module 1 - Authentication and security

- **Approach:** compare session cookie and JWT in Plan Mode; session cookie chosen because logout can truly invalidate it (ADR-002). Token hashed with SHA-256 before storage; identical 401 for unknown user and wrong password using a dummy-hash verification; injectable clock for expiry tests.
- **Workflow:** backend agent built the CLI, hashing and session services, routes, `require_auth` and the Origin check (A-01..A-04); the testing agent wrote 55 black-box HTTP tests (A-05) and reviewed a 15-item checklist (A-06).
- **Testing:** 12 PASS, 1 FAIL (minor), 2 NOT RUN (frontend) at review time (`docs/test-report.md`); the minor defects DEF-001 (`.env` credentials ignored by the CLI) and DEF-002 (committed test passwords) were fixed and verified. A route-guard test enumerates OpenAPI paths and requires auth for all but the allow-list. The browser-side checks were later covered by E2E steps 3-6, 15-16.
- **AI tool and why:** GitHub Copilot backend agent (model recorded as Claude Sonnet 5.5 by the session) for implementation; a separate Copilot testing agent for the independent review, to avoid self-review.
- **Key prompts:** no verbatim prompt for this task was recorded (agents were delegated tasks A-01..A-06 by the orchestrator; see `docs/agent-handoffs.md`). Gap.
- **Limits:** no login rate limiting, no real-TLS test of the Secure cookie, no mutation check of the tests.

### Module 2 - Backend API

- **Approach:** app factory taking `Settings` so tests inject a temp database; one JSON error envelope for all errors; validation errors drop echoed input; contract-first (`docs/api-contract.md`) shared with the frontend.
- **Workflow:** B-01 scaffold and health; X-01..X-05 expense schemas, service, CRUD routes, filters, sorting, pagination, dashboard summary and categories, contract update.
- **Testing:** unit tests (159 passed at X-05) and 100+ black-box tests; final backend count 291 passed (`docs/evidence/test-runs/check-20261101T005613Z.txt`). DEF-003 (amounts with surrounding spaces accepted) was found by an integration test, fixed and the strict-xfail marker removed.
- **AI tool and why:** Copilot backend agent; instructions and the `fastapi` and `fastapi-feature-development` skills constrained the order model, schema, service, route, tests and contract.
- **Key prompts:** none recorded verbatim. Gap.

### Module 3 - Database and persistence

- **Approach:** SQLAlchemy 2.x models with constraints enforced in the database: `amount_cents > 0`, category CHECK, `users.id = 1`, unique username, session foreign key; `create_all` instead of migrations (ADR-005).
- **Workflow:** B-02 models and tests asserting `IntegrityError` on a temporary SQLite file.
- **Testing:** 24 backend tests at B-02; persistence across a backend restart checked over HTTP in I-01 (`docs/evidence/test-runs/i01-persistence.txt`) and in E2E `persistence.spec.ts` (PASS).
- **AI tool and why:** Copilot backend agent. First run hit ruff UP042 (use `StrEnum`) and a session/user flush-order error in a test; both fixed (development log, B-02).
- **Key prompts:** none recorded verbatim. Gap.

### Module 4 - Frontend

- **Approach:** SPA with protected routes, auth state from `/api/auth/me`, a typed API client with a global 401 hook, forms that mirror contract validation, accessible delete dialog and toasts, no chart or state libraries; development uses a Vite proxy so no CORS is needed (ADR-001).
- **Workflow:** F-01/F-02 scaffold, client, AuthContext, login; F-03/F-04 layout, logout, list, filters, sort, pagination; F-05/F-06 forms, confirmation, toasts and dashboard with an SVG chart.
- **Testing:** 55 component tests with MSW at F-06; 62 including `frontend/tests/flows.test.tsx`. The first F-05/F-06 run had 14 failing tests because of async loading assumptions; tests were changed to wait for the form fields. DEF-004 (tests not type-checked) fixed and verified.
- **AI tool and why:** Copilot frontend agent, guided by the React feature skill and frontend instructions.
- **Key prompts:** none recorded verbatim. Gap. Not run: 360 px layout check.

### Module 5 - Testing and integration

- **Approach:** three layers: pytest (unit plus black-box HTTP, temp DB per test), Vitest/RTL/MSW (component and flow), Playwright (real browser, real backend, temp DB, run-time generated password, ports 8000/5173).
- **Workflow:** orchestrator ran live HTTP checks through the proxy (I-01, 22 PASS with 4 browser checks NOT RUN at the time); testing agent added a 16-step E2E workflow, a persistence scenario with backend restart, flow tests and screenshots (T-01..T-05); `make validate` for HC4.
- **Testing result:** `make validate` exit 0: lint OK, typecheck OK (mypy not installed), backend 291 passed, frontend 62 passed, E2E 3 passed, in `docs/evidence/test-runs/check-20261101T005613Z.txt`. Five defects were filed, all VERIFIED (`docs/defects.md`).
- **AI tool and why:** Copilot testing agent, separate from the implementing agents. Limit: tests were not shown to fail against deliberately broken code except where defects were found; Chromium only.
- **Key prompts:** none recorded verbatim. Gap.

## 3. Key prompts (verbatim, from `docs/evidence/prompts.md` and the prompt file used for this step)

1. Planning (Copilot Plan Mode): the full text of `plan.prompt.md`, started with the role statement "You are a **Principal AI Systems Architect, Senior Software Engineer, and Autonomous Multi-Agent Development Orchestrator** operating inside GitHub Copilot Plan Mode.", plus the extra instruction "Use .github folder for all MAD tools". Outcome: the approved plan in `docs/plan/master-plan.md` (condensed copy).
2. Infrastructure (Copilot Agent Mode): "Start implementation". Outcome: tasks INF-01..INF-11 (`docs/evidence/development-log.md`).
3. Documentation (this step, prompt file `.github/prompts/generate-exam-documentation.prompt.md`): "Execute DOC-01..DOC-04." followed by the five numbered instructions in that file (inventory evidence, finalise architecture and README, write this report, write the compliance matrix, hand off).

## 4. Challenges and tool comparison

Challenges (from the development log; CHAL entries 01-04 are tagged, others are untagged log entries):

- CHAL-01: the plan assumed Python 3.12 and Node 22.20, but the machine had Python 3.10.12 and Node 22.13.1. Resolved with `uv python install 3.12` and `nvm install 22`; `scripts/check-env.sh` now verifies it. The documentation agent's `make check-env` still failed in a shell where Node was 22.13.1 (nvm not active), showing the check works.
- CHAL-02: VS Code save settings reformatted 13 infrastructure files; `validate-infra` was re-run (exit 0, 33/33 hook cases).
- CHAL-03/CHAL-04: the agent could not create or push to GitHub (no `gh`, HTTPS password auth rejected); the human switched the remote to SSH and pushed.
- Test and tooling issues, each recorded with its fix: `conftest` imported under two module names (3 failures), route guard test via `app.routes` replaced by OpenAPI paths, DEF-005 (a test depended on the developer's `.env`), a race in a new flow test, a toast covering the table in the first screenshots.
- A recurring limit: the ownership guard blocked some cross-agent edits (for example the frontend agent could not edit `docs/defects.md`), so fixes needed handoffs between agents.

Tool comparison (honest): only GitHub Copilot in VS Code was used (Plan Mode, Agent Mode, five custom agents; model recorded as Claude Sonnet 5.5 for the implementation and testing sessions, not recorded for planning and infrastructure). Claude Code, Augment Code and Cursor were not used, so no comparison between tools can be made. What helped most within Copilot: custom agents with write ownership, skills and a shared task board, which kept the contract between backend and frontend consistent; independent verification by a second agent found DEF-003 and DEF-005 that the implementing agents had not. What was weaker: the infrastructure could not be verified in the Chat diagnostics UI by an agent, and some behaviours (agent-scoped hooks, comma-separated `applyTo`) are recorded as not verified.

## 5. Working system evidence

Real captures from `e2e/tests/screenshots.spec.ts`, taken from the running app with data created through the UI (PNG files verified with `file`; the testing agent inspected them; human review for sensitive data is still pending):

- `docs/evidence/screenshots/login.png` (1100x800) - login page
- `docs/evidence/screenshots/expenses.png` (1100x800) - expense list with filters
- `docs/evidence/screenshots/dashboard.png` (1100x1151) - dashboard with totals and chart

Test output: `docs/evidence/test-runs/check-20261101T005613Z.txt` (exit 0; backend 291, frontend 62, E2E 3 passed). The files are named `login`, `expenses`, `dashboard`, not `NN-description.png` as the documentation instructions suggest; the Playwright spec produces these names.

## 6. Possible improvements

- Login rate limiting and lockout; test the Secure cookie over TLS.
- Run mypy in CI (not installed now); add Firefox/WebKit and 360 px E2E checks.
- Mutation checks to show tests fail against broken code.
- Alembic migrations if the schema evolves; CSV export; budgets.
- Record every key prompt verbatim at the time (several modules have no recorded prompt).

## 7. Submission

Google Drive publication and sharing ("anyone with the link can view") are done by the human; this report does not claim it happened.
