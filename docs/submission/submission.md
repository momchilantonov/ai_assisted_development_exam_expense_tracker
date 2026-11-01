# AI-Assisted Development Exam - AI-Driven Expense Tracker

Student document for the exam described in `project_assignment.md`. Repository: [github.com/momchilantonov/ai_assisted_development_exam_expense_tracker](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker). Everything in this document is backed by files in the repository; links point to them.

## 1. Project idea and system requirements

**Idea.** A small multi-user expense tracker. A person signs up, logs in and records what they spend: amount, one of seven fixed categories (Food, Transport, Shopping, Bills, Entertainment, Healthcare, Other), date and an optional description. They can filter by category and date range, sort, page through the list, edit or delete expenses and open a dashboard with the total, the current-month total, a per-category chart and the latest expenses. Every user sees only their own data. The project was built entirely by AI agents in GitHub Copilot; the human wrote requirements, approved checkpoints and reviewed results.

**Functional requirements.**
- Open sign-up, login, logout; session kept in an HttpOnly cookie; every expense endpoint requires authentication on the server.
- Create, read, update, delete expenses with validation (amount greater than 0, fixed categories, valid date).
- Filters, sorting, pagination, dashboard summary; data persists in SQLite across restarts.
- Per-user isolation: another user's expense returns 404.

**Constraints and stack.** Money is exact (integer cents in the database, decimal strings in the API, no floats). Out of scope by plan: Redis, Celery, cloud databases, payments, roles, e-mail flows, Alembic. Backend: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, SQLite, pytest. Frontend: React, TypeScript (strict), Vite, Vitest, React Testing Library, MSW. End-to-end: Playwright. Details: [docs/architecture.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/architecture.md), [docs/api-contract.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/api-contract.md), [docs/decisions.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/decisions.md).

## 2. System Architecture - Modules

The work was first planned in Copilot Plan Mode (one prompt, `plan.prompt.md`; result condensed in `docs/plan/master-plan.md`). The AI split the system into five modules and five custom agents (backend, frontend, testing, orchestrator, documentation) with write-ownership rules, a task board (`docs/tasks.md`) and append-only handoffs (`docs/agent-handoffs.md`). An agent that implemented a task could not mark it VERIFIED; a different agent re-ran the checks.

| Module | Main code | Responsible agent |
|---|---|---|
| Authentication | `backend/app/api/auth.py`, `backend/app/services/auth.py`, `backend/app/core/` | backend |
| Backend API | `backend/app/api/`, `backend/app/services/expenses.py`, `backend/app/schemas/` | backend |
| Database and persistence | `backend/app/models/`, `backend/app/db.py` | backend |
| Frontend | `frontend/src/` | frontend |
| Testing and integration | `backend/tests/`, `frontend/tests/`, `e2e/` | testing |

![Architecture diagram (GitDiagram, AI-generated from the repository, rendered from its Mermaid source on 2026-11-01, direction changed to left-to-right to fit the page). It predates the sign-up page and shows only the login screen; the real code also has a sign-up page and a register route.](docs/submission/images/architecture-gitdiagram.png){width=17}

Resources: [GitDiagram page](https://gitdiagram.com/momchilantonov/ai_assisted_development_exam_expense_tracker) (source of the diagram; Mermaid source saved in `docs/submission/images/architecture-gitdiagram.mmd`). [GitIngest page](https://gitingest.com/momchilantonov/ai_assisted_development_exam_expense_tracker): when fetched during the build the page returned only the empty form, no readable digest, so no digest numbers are given.

## 3. Development Process per Module

AI tool for all modules: GitHub Copilot in VS Code (Agent Mode with custom agents, skills, instructions, prompt files and hooks). The model is recorded as Claude Sonnet 5.5 for the implementation and testing sessions; it is not recorded for planning and infrastructure. Quoted prompts are verbatim excerpts; full text and sources are in [docs/evidence/prompts.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/evidence/prompts.md).

### 3.1 Authentication

- **Approach and reasoning:** session cookie compared with JWT in Plan Mode; the cookie won because logout can really invalidate it (ADR-002). Argon2id hashes, SHA-256-hashed session token in the database, one identical 401 for unknown user and wrong password, Origin check on unsafe methods.
- **Workflow:** the backend agent built the hashing and session services, login, logout, `me` and later register routes and the `require_auth` dependency (A-01..A-04, CR2-B). The testing agent then wrote black-box tests and a 15-item security review (A-05, A-06).
- **Testing:** unit tests plus HTTP tests; a route-guard test lists all OpenAPI paths and requires auth for all but a short allow-list. The review found two minor defects (DEF-001, DEF-002), fixed and verified.
- **AI tool and why:** Copilot backend agent for code; a separate testing agent for the review to avoid self-review.
- **Key prompts:**
  - "A-02 Argon2 hashing + server-side session service (hashed token stored, expiry, logout invalidation); A-03 auth routes (login/logout/me per contract), require_auth dependency, Origin/CSRF check middleware, generic error messages, secure cookie flags" (task prompt, 2026-10-30).
  - "I think this with single user and sigh up once at start is stupid. We need to make it multi user. Most of the functionality will stay the same." (human, 2026-11-01, led to CR-002).

Code: [auth routes](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/backend/app/api/auth.py), [auth service](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/backend/app/services/auth.py).

### 3.2 Backend API

- **Approach and reasoning:** contract first (`docs/api-contract.md`, shared with the frontend); an app factory that takes settings so tests can inject a temporary database; one JSON error envelope; validation errors never echo input.
- **Workflow:** B-01 scaffold and health; X-01..X-05 schemas with money handling, expense service, CRUD routes, filters, sorting, pagination, dashboard and categories; every query scoped to the session user.
- **Testing:** unit tests next to black-box HTTP tests that cover 401s, validation, 404, money exactness, filters, pagination and dashboard totals. The integration tests found DEF-003 (amounts with surrounding spaces were accepted); the backend agent fixed it and the markers were removed.
- **AI tool and why:** Copilot backend agent; the `fastapi` and `fastapi-feature-development` skills forced the order model, schema, service, route, tests, contract.
- **Key prompts:**
  - "All expense/dashboard/category routers MUST use router-level Depends(require_auth); keep the route guard test passing." (X-01..X-05, 2026-10-30).
  - "Fix DEF-003 in docs/defects.md: amount strings with leading/trailing whitespace must return 422 validation_error per docs/api-contract.md" (2026-10-30).

Code: [backend/app/api](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/backend/app/api).

### 3.3 Database and persistence

- **Approach and reasoning:** SQLAlchemy 2 models with the rules enforced by the database itself: `amount_cents > 0`, category CHECK, case-insensitive unique username, non-null `expenses.user_id` foreign key. `create_all` instead of migrations (ADR-005) keeps the project small.
- **Workflow:** B-02 created the user, session and expense models and tests; CR2-B removed the original single-user constraint and added the per-user foreign key.
- **Testing:** tests assert `IntegrityError` for each constraint on a temporary SQLite file; persistence across a backend restart was checked over HTTP (`docs/evidence/test-runs/i01-persistence.txt`) and by the Playwright persistence scenario. The first run hit a ruff rule (use `StrEnum`) and a flush-order error in a test; both were fixed.
- **AI tool and why:** Copilot backend agent, constrained by the backend instructions.
- **Key prompts:**
  - "SQLAlchemy 2.x models for users (single user, password hash column), sessions (server-side, hashed token, expiry), expenses (integer cents amount > 0, fixed category set per contract, date, description, timestamps, DB CHECK constraints)" (B-02, 2026-10-30).
  - "Models: remove the users.id = 1 CHECK constraint; users get autoincrement id and a case-insensitively unique username ... expenses.user_id NOT NULL FK to users.id with an index." (CR2-B, 2026-11-01).

Code: [backend/app/models](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/backend/app/models).

### 3.4 Frontend

- **Approach and reasoning:** single-page app with protected routes, auth state from `/api/auth/me`, a typed API client with one global 401 handler, forms that mirror the contract validation, an accessible delete dialog and toasts, a plain SVG chart (no chart or state library), Vite dev proxy so no CORS is needed.
- **Workflow:** F-01/F-02 scaffold, client, auth context, login; F-03/F-04 layout, list, filters, sorting, pagination; F-05/F-06 forms, delete confirmation, toasts, dashboard; CR2-F sign-up page. After manual review the human asked for a dark, Notion-style UI based on a reference screenshot (UI-01..UI-05): design tokens, sticky top bar, cover banner, colour-coded category tags, All / This month / Past month tabs and a 360 px mobile layout, followed by many small review rounds. Behaviour and API did not change.
- **Testing:** 72 component and flow tests with MSW in the latest run; DEF-004 (tests were not type-checked) was found by the testing agent and fixed. The first F-05/F-06 run had 14 failing tests caused by async loading assumptions; the tests were corrected.
- **AI tool and why:** Copilot frontend agent with the React feature skill and frontend instructions.
- **Key prompts:**
  - "F-05: create/edit forms with client validation mirroring the contract (amount as decimal string, never floats; category from the fixed list; date), delete confirmation, success/error toasts, accessible labels/errors" (2026-10-30).
  - "You can check the image docs/design/reference/image.png for the style, fonts, and etc. for the ui re-design" (human, 2026-11-01).

Code: [frontend/src](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/frontend/src).

### 3.5 Testing and integration

- **Approach and reasoning:** three layers: pytest (unit plus black-box HTTP, temporary database per test), Vitest with React Testing Library and MSW, and Playwright against the real backend and a temporary database with run-time generated passwords. Tests were written by an agent other than the implementer.
- **Workflow:** I-01 live HTTP checks; T-01..T-05 E2E scaffold, the 16-step workflow, the persistence scenario with backend restart, flow tests and screenshots; CR2-T added registration, isolation and a two-user browser scenario; UI-04 added a 360 px no-scroll check.
- **Testing result:** `scripts/check-all.sh --e2e` exit 0: ruff clean, backend 389 passed, frontend 72 passed, E2E 5 passed ([check-20261101T150120Z.txt](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/evidence/test-runs/check-20261101T150120Z.txt)). Six defects (DEF-001..DEF-006) were filed in `docs/defects.md`. Limits: Chromium only, no mutation testing, no login rate limit test.
- **AI tool and why:** Copilot testing agent in a separate session so that implementers did not grade their own work.
- **Key prompts:**
  - "Cover: 401 without auth on every expense/dashboard/category route; CRUD happy paths; validation errors ...; money exactness (no float drift, cents); filters ...; dashboard totals ...; isolated temp DB, runtime-generated credentials." (X-06, 2026-10-30).
  - "E2E scenario in e2e/tests with two users in separate browser contexts via the real /signup UI (each sees only own data, username in header, duplicate username error shown)." (CR2-T, 2026-11-01).

Code and reports: [backend/tests](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/backend/tests), [frontend/tests](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/frontend/tests), [e2e](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/e2e), [docs/test-report.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/test-report.md).

## 4. Challenges and Tool Comparison

**Biggest challenges.**
- Requirement change. The planning prompt asked for a single-user app with a CLI-created account. After manual testing the human found this unreasonable and asked for multi-user with open sign-up (CR-002, ADR-011); an interim first-run sign-up idea (CR-001) was dropped before being implemented. The agents added registration, per-user scoping of every query, a sign-up page and isolation tests (backend, frontend, two-user E2E); the old design was kept in history and removed from the final documents.
- Environment: the plan assumed Python 3.12 and Node 22.20 but the machine had Python 3.10 and Node 22.13; fixed with `uv` and `nvm`, and `scripts/check-env.sh` now checks it.
- Agents could not push to GitHub or edit files outside their ownership, so defect fixes needed handoffs between agents (for example DEF-006, the 360 px clipping, was seen only by looking at a screenshot because the test checked page scroll only).
- UI refinement needed many review rounds; a tag icon broke an E2E text reader and the dev servers of the human blocked E2E ports twice.

**Tool comparison.** Only GitHub Copilot in VS Code was used, so there is no comparison with other products. Inside Copilot, custom agents with write ownership, skills and a shared task board helped most: the contract stayed consistent between backend and frontend, and independent verification found defects (DEF-003, DEF-005) that the implementing agents had missed. Plan Mode was good for decisions (session cookie versus JWT); Agent Mode was good for bounded tasks. Weaker points: prompts for several modules were not recorded at the time, and some hook behaviours could not be verified from inside the chat.

**With more time.** Login rate limiting and lockout; test the Secure cookie over TLS; mutation checks; more browsers in E2E and an in-table clipping check at 360 px; run mypy in CI; Alembic migrations if the schema changes; CSV export and budgets.

## 5. Working System Evidence

Screenshots of the running application (final dark UI, user `manto1` was created through the sign-up page, data entered through the UI), taken from the E2E run. Test output with exit codes is in [docs/evidence/test-runs](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/docs/evidence/test-runs); the E2E screenshots are in [docs/evidence/screenshots](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/docs/evidence/screenshots); all evidence is under [docs/evidence](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/docs/evidence).

| ![Figure 1. Expenses page: tabs, filters, colour-coded category tags, Edit and Delete. File docs/submission/images/expenses-list.png (from docs/design/reference/final_documen/Expenses_1.png).](docs/submission/images/expenses-list.png){width=8.2} | ![Figure 2. Dashboard: summary cards and spending by category. File docs/submission/images/dashboard.png (from Dashboard_1.png).](docs/submission/images/dashboard.png){width=8.2} |
|---|---|
| ![Figure 3. New expense form. File docs/submission/images/new-expense.png (from New_Expense.png).](docs/submission/images/new-expense.png){width=8.2} | ![Figure 4. Delete confirmation dialog. File docs/submission/images/delete-confirm.png (from Delete_Expense.png).](docs/submission/images/delete-confirm.png){width=8.2} |

Latest full check: `scripts/check-all.sh --e2e` finished with exit 0 on 2026-11-01 (ruff clean; backend 389 passed; frontend 72 passed; Playwright 5 passed), saved in `docs/evidence/test-runs/check-20261101T150120Z.txt`.

## 6. Repository

Source code: https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker

- Architecture: [docs/architecture.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/architecture.md); API contract: [docs/api-contract.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/api-contract.md); decisions: [docs/decisions.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/decisions.md).
- AI workflow setup (agents, skills, hooks, prompt files): [.github](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/.github); prompt files: [.github/prompts](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/tree/main/.github/prompts).
- Development log and challenges: [docs/evidence/development-log.md](https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker/blob/main/docs/evidence/development-log.md).

## 7. Submission format

This document is a .docx intended for Google Drive. The human uploads it and sets sharing to "Anyone with the link can view"; this was not done by the agent.
