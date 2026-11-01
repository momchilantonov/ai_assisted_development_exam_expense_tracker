# AI-Assisted Development Exam - AI-Driven Expense Tracker

Repository: https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker (URL confirmed by the human).

Source of every claim below: files under `docs/evidence/`, `docs/test-report.md`, `docs/defects.md`, `docs/decisions.md`, `docs/agent-handoffs.md` and git history.

## 1. Project overview

The project is a multi-user expense tracker with open sign-up. Each user signs up, logs in, records expenses (amount, one of seven fixed categories, date, optional description), filters, sorts and pages through them, edits or deletes them, and sees a dashboard with the total, the current-month total, a per-category breakdown drawn as an SVG chart and the most recent expenses. Every user sees only their own data. Data persists in SQLite.

Requirements that shaped the design:

- Open sign-up with per-user data: every expense query is scoped to the session user, and another user's expense returns 404 (ADR-011).
- Secure authentication: Argon2id password hash, opaque server-side session in an HttpOnly, SameSite=Strict cookie, Origin check on unsafe methods, logout that deletes the session row (ADR-002).
- Money is exact: integer cents in the database, decimal strings in the API, never floats (ADR-003).
- The application was written by AI agents only; the human gave approvals at checkpoints (HC1 plan, HC2 infrastructure, HC3 auth review, HC4 E2E pass), plus one change request (CR-002, multi-user) after manual testing.
- Out of scope by plan: Redis, Celery, cloud databases, microservices, payments, user roles, external auth, Alembic, MCP.

Stack: FastAPI, Pydantic v2, SQLAlchemy 2.x, SQLite, pytest; React, TypeScript (strict), Vite, Vitest, React Testing Library, MSW; Playwright. Architecture and diagram: `docs/architecture.md`; endpoints: `docs/api-contract.md`.

Workflow: one planning step in Copilot Plan Mode, one infrastructure step in Copilot Agent Mode (instructions, 10 skills, 5 custom agents, 12 prompt files, hooks, CI), then custom agents (`backend`, `frontend`, `testing`, `orchestrator`, `documentation`) with write-ownership rules, a task board (`docs/tasks.md`) and append-only handoffs (`docs/agent-handoffs.md`). An agent that implemented a task could not mark it VERIFIED; another agent re-ran the checks.

## 2. Modules

### Module 1 - Authentication and security

- **Approach:** compare session cookie and JWT in Plan Mode; session cookie chosen because logout can truly invalidate it (ADR-002). Token hashed with SHA-256 before storage; identical 401 for unknown user and wrong password using a dummy-hash verification; injectable clock for expiry tests.
- **Workflow:** backend agent built hashing and session services, the register and login routes, `require_auth` and the Origin check (A-01..A-04, later CR2-B); the testing agent wrote black-box HTTP tests for auth, registration and user isolation (A-05, CR2-T) and reviewed a 15-item checklist (A-06).
- **Testing:** 12 PASS, 1 FAIL (minor), 2 NOT RUN (frontend) at review time (`docs/test-report.md`); the minor defects DEF-001 (`.env` credentials ignored by the CLI) and DEF-002 (committed test passwords) were fixed and verified. A route-guard test enumerates OpenAPI paths and requires auth for all but the allow-list. The browser-side checks were later covered by E2E steps 3-6, 15-16.
- **AI tool and why:** GitHub Copilot backend agent (model recorded as Claude Sonnet 5.5 by the session) for implementation; a separate Copilot testing agent for the independent review, to avoid self-review.
- **Key prompts:** no verbatim prompt for this task was recorded (agents were delegated tasks A-01..A-06 by the orchestrator; see `docs/agent-handoffs.md`). Gap.
- **Limits:** no login rate limiting, no real-TLS test of the Secure cookie, no mutation check of the tests.

### Module 2 - Backend API

- **Approach:** app factory taking `Settings` so tests inject a temp database; one JSON error envelope for all errors; validation errors drop echoed input; contract-first (`docs/api-contract.md`) shared with the frontend.
- **Workflow:** B-01 scaffold and health; X-01..X-05 expense schemas, service, CRUD routes, filters, sorting, pagination, dashboard summary and categories, contract update.
- **Testing:** unit tests (159 passed at X-05) and 100+ black-box tests; final backend count 389 passed (`docs/evidence/test-runs/check-20261101T103505Z.txt`). DEF-003 (amounts with surrounding spaces accepted) was found by an integration test, fixed and the strict-xfail marker removed.
- **AI tool and why:** Copilot backend agent; instructions and the `fastapi` and `fastapi-feature-development` skills constrained the order model, schema, service, route, tests and contract.
- **Key prompts:** none recorded verbatim. Gap.

### Module 3 - Database and persistence

- **Approach:** SQLAlchemy 2.x models with constraints enforced in the database: `amount_cents > 0`, category CHECK, case-insensitive unique username, `expenses.user_id` NOT NULL foreign key, session foreign key; `create_all` instead of migrations (ADR-005).
- **Workflow:** B-02 models and tests asserting `IntegrityError` on a temporary SQLite file.
- **Testing:** 24 backend tests at B-02; persistence across a backend restart checked over HTTP in I-01 (`docs/evidence/test-runs/i01-persistence.txt`) and in E2E `persistence.spec.ts` (PASS).
- **AI tool and why:** Copilot backend agent. First run hit ruff UP042 (use `StrEnum`) and a session/user flush-order error in a test; both fixed (development log, B-02).
- **Key prompts:** none recorded verbatim. Gap.

### Module 4 - Frontend

- **Approach:** SPA with protected routes, auth state from `/api/auth/me`, a typed API client with a global 401 hook, forms that mirror contract validation, accessible delete dialog and toasts, no chart or state libraries; development uses a Vite proxy so no CORS is needed (ADR-001).
- **Workflow:** F-01/F-02 scaffold, client, AuthContext, login; F-03/F-04 layout, logout, list, filters, sort, pagination; F-05/F-06 forms, confirmation, toasts and dashboard with an SVG chart; CR2-F sign-up page.
- **Testing:** 55 component tests with MSW at F-06; 72 in the latest full run (`docs/evidence/test-runs/check-20261101T145021Z.txt`), including the sign-up page tests and `frontend/tests/flows.test.tsx`. The first F-05/F-06 run had 14 failing tests because of async loading assumptions; tests were changed to wait for the form fields. DEF-004 (tests not type-checked) fixed and verified.
- **UI refinement (UI-01..UI-05):** after the first version the human asked for a Notion-style dark UI based on a reference screenshot (`docs/design/ui-style-guide.md`). The frontend agent restyled all pages in plain CSS: design tokens, dark theme, sticky top bar, photo cover banner with an icon chip, colour-coded category tags with icons, All / This month / Past month tabs, fixed-layout tables with a 90-character description limit, a "Total: N expenses" footer, a "Page X of Y" paginator (only with more than one page, 10 per page) and a 360 px layout. Eighteen small review rounds by the human followed; behaviour and API did not change. Deviations from the reference (no right-hand total panel, no Past year tab, no light theme, no toolbar icons) are listed in the style guide, section 8. The banner image is user-supplied and AI-generated; its licence is for the human to record.
- **AI tool and why:** Copilot frontend agent, guided by the React feature skill and frontend instructions.
- **Key prompts:** none recorded verbatim. Gap.

### Module 5 - Testing and integration

- **Approach:** three layers: pytest (unit plus black-box HTTP, temp DB per test), Vitest/RTL/MSW (component and flow), Playwright (real browser, real backend, temp DB, run-time generated password, ports 8000/5173).
- **Workflow:** orchestrator ran live HTTP checks through the proxy (I-01, 22 PASS with 4 browser checks NOT RUN at the time); testing agent added a 16-step E2E workflow, a persistence scenario with backend restart, a two-user isolation scenario in separate browser contexts, flow tests and screenshots (T-01..T-05, CR2-T); `make validate` for HC4.
- **Testing result:** `scripts/check-all.sh --e2e` exit 0: ruff clean, backend 389 passed, frontend 72 passed, E2E 5 passed (including the 360 px no-scroll spec), in `docs/evidence/test-runs/check-20261101T145021Z.txt`. A CSS-only 360 px fix followed that run; the frontend agent re-ran lint, typecheck, frontend tests (72 passed) and the mobile and screenshot specs (2 passed), and a final full check is pending. Five defects were filed and VERIFIED; DEF-006 (360 px clipping) is recorded in `docs/defects.md`, whose status is for the testing agent to update.
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
- UI refinement issues: the tag icon text broke the E2E dashboard reader (`innerText` returned an emoji before "Healthcare"; fixed by drawing the icon in CSS); the 360 px clipping of the Actions column was found only by looking at the screenshot because the spec checks page scroll only (DEF-006); the Amount/Actions gap took several attempts because padding on the last auto-layout column only moves the column boundary, fixed widths solved it; a frontend test expected 249 instead of 250 characters (a hook-run test failure; the expectation was wrong, not the code); the E2E run was blocked twice by the human's dev servers on ports 8000 and 5173.
- Iteration example, not a failure: the planning prompt asked for a single-user application, so the first design (and ADR-002) was single-user with a CLI-provisioned account. After manual testing the human changed the requirement to multi-user with open sign-up and per-user data (CR-002, ADR-011). An interim first-run sign-up change (CR-001, ADR-010) was superseded before it was implemented. The agents added registration, per-user scoping of every query, a sign-up page and isolation tests (backend, frontend, two-user E2E), and the final checks pass (`docs/evidence/test-runs/check-20261101T103505Z.txt`). Earlier history is kept unchanged in the development log and decisions.
- A recurring limit: the ownership guard blocked some cross-agent edits (for example the frontend agent could not edit `docs/defects.md`), so fixes needed handoffs between agents.

Tool comparison (honest): only GitHub Copilot in VS Code was used (Plan Mode, Agent Mode, five custom agents; model recorded as Claude Sonnet 5.5 for the implementation and testing sessions, not recorded for planning and infrastructure). Claude Code, Augment Code and Cursor were not used, so no comparison between tools can be made. What helped most within Copilot: custom agents with write ownership, skills and a shared task board, which kept the contract between backend and frontend consistent; independent verification by a second agent found DEF-003 and DEF-005 that the implementing agents had not. What was weaker: the infrastructure could not be verified in the Chat diagnostics UI by an agent, and some behaviours (agent-scoped hooks, comma-separated `applyTo`) are recorded as not verified.

## 5. Working system evidence

Real captures from `e2e/tests/screenshots.spec.ts` and `e2e/tests/mobile.spec.ts` of the restyled UI, taken from the running app with data created through the UI (PNG files viewed by the documentation agent; human review for sensitive data is still pending). They show rows left by other specs because the specs share one temporary database.

- `docs/evidence/screenshots/login.png` (1100x800) - dark sign-in card
- `docs/evidence/screenshots/signup.png` - sign-up card with confirm password
- `docs/evidence/screenshots/expenses.png` (1100 px wide) - sticky top bar, photo banner with icon chip, callout, "New expense", All / This month / Past month tabs, filters, table with tag pills, Edit/Delete, "Total: 7 expenses"
- `docs/evidence/screenshots/dashboard.png` - banner, three summary cards, category bars in tag colours, category table, recent expenses
- `docs/evidence/screenshots/expenses-mobile.png` (360 px wide) - banner hidden, filters in two columns, table with Date, Category, truncated Description, Amount and stacked Edit/Delete visible

Test output: `docs/evidence/test-runs/check-20261101T145021Z.txt` (exit 0; backend 389, frontend 72, E2E 5 passed). The files are named `login`, `signup`, `expenses`, `dashboard`, `expenses-mobile`, not `NN-description.png` as the documentation instructions suggest; the Playwright specs produce these names.

## 6. Possible improvements

- Login rate limiting and lockout; test the Secure cookie over TLS.
- Run mypy in CI (not installed now); add Firefox/WebKit and an in-table clipping check at 360 px (only page scroll is tested).
- Mutation checks to show tests fail against broken code.
- Alembic migrations if the schema evolves; CSV export; budgets.
- Record every key prompt verbatim at the time (several modules have no recorded prompt).

## 7. Submission

Google Drive publication and sharing ("anyone with the link can view") are done by the human; this report does not claim it happened.
