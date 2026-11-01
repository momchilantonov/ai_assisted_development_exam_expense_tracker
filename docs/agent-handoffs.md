# Agent handoffs (append-only)

Use the block from `.github/skills/agent-handoff/handoff-template.md`. Newest entries at the bottom.

---

### HANDOFF INF-01..INF-11 - Setup agent (GitHub Copilot Agent Mode) - 2026-10-30

- **Task ID(s):** INF-01..INF-10 COMPLETED; INF-11 IN_PROGRESS (awaiting human HC2)
- **Responsible agent:** Infrastructure Setup Agent
- **State set:** COMPLETED (INF-01..10), none VERIFIED (a different agent/human must verify)
- **Completed work:** `.github/` instructions (1 + 4), skills (6 custom + 4 external, reviewed and relocated), agents (5), prompts (12), hooks (4 files, 6 Node scripts, 33 fixtures), CI workflow; scripts (`check-env.sh`, `check-all.sh`, `check-ownership.sh`, `validate-infra.sh/.mjs`); Makefile, `.gitignore`, `.env.example`, README stub; docs seeds (plan, architecture, contract v1, decisions ADR-001..009, tasks, defects, evidence files).
- **Modified files:** everything listed above (all new; no application code).
- **Important decisions:** Python 3.12 via uv and Node 22.x via nvm installed with user approval; `docs/plan/master-plan.md` is a condensed copy (full plan in the chat transcript); `.github/hooks/INFRA_FROZEN` is NOT yet created (create it after HC2 to write-protect `.github/**`).
- **Test results:** `scripts/validate-infra.sh` -> exit 0 (`docs/evidence/test-runs/infra.txt`); `node .github/hooks/tests/run-cases.mjs` -> 33/33 passed; `make check` -> exit 0 (all targets skipped because no application code exists). CI workflow not run on GitHub (not run).
- **Known issues:** UNVERIFIED in the Local harness: comma-separated `applyTo`, tool aliases in agent front matter, agent-scoped `PreToolUse` hooks, parallel subagents, `chat.useHooks` default (not set in user settings.json).
- **Dependencies:** HC2 (human checks Chat diagnostics, approves local commit) unblocks B-01 and F-01.
- **Next action:** human HC2; then orchestrator runs `/implement-backend` (Stage B) and `/implement-frontend` (Stage E).

### HANDOFF INF-11 (addendum) - Setup agent - 2026-10-30

- **State set:** INF-11 COMPLETED (HC2 approved by the human; nothing is VERIFIED by a second agent yet).
- **Completed work:** `chat.useHooks: true` added to the user VS Code settings (user request); `validate-infra` re-run after VS Code's save-formatter trimmed whitespace in 13 files; `.github/hooks/INFRA_FROZEN` created; one local commit made.
- **Test results:** `scripts/validate-infra.sh` -> exit 0, 33/33 hook cases (docs/evidence/test-runs/infra.txt).
- **Known issues:** GitHub CLI (`gh`) is not installed and no GitHub repository exists yet; nothing has been pushed. Ownership hooks in agent front matter remain UNVERIFIED until a delegated task runs.
- **Next action:** human creates the GitHub repository and pushes; then `/implement-backend` stage B and `/implement-frontend`.

---

### HANDOFF B-01 - backend agent - 2026-10-30

- **Task ID(s):** B-01
- **Responsible agent:** backend
- **State set:** COMPLETED (not VERIFIED)
- **Completed work:** backend scaffold (`backend/app/{main,config,db}.py`, `core/errors.py`, `api/health.py`); `create_app(settings)` factory with lifespan `init_db`; settings from env/`.env` via pydantic-settings; SQLAlchemy 2.x engine (relative sqlite paths resolved against `backend/`, `PRAGMA foreign_keys=ON`), `Base`, `init_db`, `get_db`; error envelope handlers (validation with `input`/`ctx` stripped, HTTP, unhandled -> 500 `internal_error`, no traceback); `GET /api/health`; docs at `/api/docs`; pytest fixtures (temp SQLite per test) and 7 unit tests.
- **Modified files:** `backend/pyproject.toml`, `backend/requirements.txt`, `backend/requirements-dev.txt` (pinned to installed versions), `backend/app/**`, `backend/tests/conftest.py`, `backend/tests/unit/test_health.py`, `backend/tests/unit/test_errors.py`; `docs/api-contract.md` (health status -> implemented); `docs/tasks.md` B-01 row. Makefile and `.env.example`: unchanged.
- **Important decisions:** `AppError` exception class added for later services. HTTPException mapping: 401 `not_authenticated`, 403 `forbidden_origin`, 404 `not_found`, other 4xx (e.g. 405) `validation_error`, 5xx `internal_error`. `allowed_origins` is a comma-separated string with an `allowed_origins_list` property. `app.main` builds a module-level `app` (no DB file created until lifespan starts).
- **Test results:** `make lint-backend` -> exit 0; `make test-backend` -> exit 0, 7 passed, 1 warning (Starlette deprecation: TestClient with `httpx`, suggests `httpx2`); `scripts/check-ownership.sh backend` -> exit 0. mypy not run (not installed).
- **Known issues:** the httpx deprecation warning; `argon2-cffi` not yet in requirements (needed in A-02).
- **Dependencies:** unblocks B-02.
- **Next action:** B-02 models (users, sessions, expenses).

---

### HANDOFF B-02 - backend agent - 2026-10-30

- **Task ID(s):** B-02
- **Responsible agent:** backend
- **State set:** COMPLETED (not VERIFIED)
- **Completed work:** SQLAlchemy 2.x models `User` (CHECK id = 1, unique username, `password_hash`), `Session` (`token_hash` PK holding a SHA-256 hex digest, FK `user_id` with cascade, `expires_at`), `Expense` (`amount_cents` CHECK > 0, `category` CHECK in the 7 contract values, optional description, indexed `expense_date`, timestamps) and `Category` StrEnum; `init_db` imports the models before `create_all`; 17 new unit tests with temp SQLite DBs.
- **Modified files:** `backend/app/models/{__init__,user,session,expense}.py`, `backend/app/db.py`, `backend/tests/unit/test_models.py`; `docs/tasks.md` B-02 row. `docs/api-contract.md`, Makefile, `.env.example`: unchanged.
- **Important decisions:** timestamps are naive UTC datetimes (SQLite drops tzinfo); services must treat them as UTC. `Expense.category` is stored as a string validated by CHECK; the enum lives in `app.models.expense`.
- **Test results:** `make lint-backend` -> exit 0; `make test-backend` -> exit 0, 24 passed, 1 warning (httpx deprecation); `scripts/check-ownership.sh backend` -> exit 0. First run failed (ruff UP042, and a test inserting session before user in one commit); both fixed and re-run.
- **Known issues:** none new.
- **Dependencies:** unblocks A-01, A-02.
- **Next action:** A-01 / A-02.

---

### HANDOFF A-01..A-04 - backend agent - 2026-10-30

- **Task ID(s):** A-01, A-02, A-03, A-04
- **Responsible agent:** backend
- **State set:** COMPLETED (not VERIFIED)
- **Completed work:** `core/security.py` (Argon2id hash/verify with dummy-hash path, rehash check, `secrets.token_urlsafe(32)` token, SHA-256 token hash); `services/auth.py` (provision, authenticate, create/get/delete session, expired purge at login); `core/deps.py` (`require_auth`, injectable clock via `app.state.clock`); `core/origin.py` (Origin check middleware on POST/PUT/DELETE/PATCH, no CORS); `api/auth.py` (login, logout, me); `schemas/auth.py`; `cli.py` (`create-user`, `--reset-password`); tests in `backend/tests/unit/test_auth.py` and fixtures in `backend/tests/conftest.py`.
- **Modified files:** `backend/app/{main,cli}.py`, `backend/app/{core,services,schemas,api}/...`, `backend/requirements.txt` (+`argon2-cffi==25.1.0`), `backend/tests/conftest.py`, `backend/tests/unit/test_auth.py`; `docs/api-contract.md` (auth rows -> implemented); `docs/tasks.md`. Makefile and `.env.example`: unchanged.
- **Important decisions:** no design change. Reset-password also deletes all existing sessions. The CLI reads `INITIAL_USERNAME`/`INITIAL_PASSWORD` from the process environment only (not `.env`), otherwise prompts via `getpass`; non-interactive without both exits 2. `expires_at` is serialised as ISO-8601 UTC with `Z`. The route guard test enumerates OpenAPI paths (this FastAPI version wraps included routers, so `app.routes` is not flat); routes hidden from OpenAPI would be missed. Expense/dashboard/category routers must add router-level `Depends(require_auth)` when created (X tasks).
- **Test results:** `make lint-backend` -> exit 0; `make test-backend` -> exit 0, 47 passed, 1 warning (httpx deprecation); `scripts/check-ownership.sh backend` -> exit 0. First test run had 1 failure (route guard test iterating `app.routes`), fixed and re-run. CLI was tested through `main()` in unit tests; not run manually against a real terminal prompt.
- **Known issues:** `.env.example` documents `INITIAL_*` but the CLI does not read `.env` for them; `make seed-user` therefore needs them exported or a prompt. No rate limiting on login (out of contract).
- **Dependencies:** unblocks A-05 (testing agent).
- **Next action:** A-05 black-box auth integration tests, then A-06 (HC3).

---

### HANDOFF A-05 - testing agent - 2026-10-30

- **Task ID(s):** A-05
- **Responsible agent:** testing
- **State set:** COMPLETED. A-01..A-04 are not set to VERIFIED: A-06 (security review) is still open, and this run only exercised their behaviour through HTTP, not their internals.
- **Completed work:** 55 black-box tests in `backend/tests/integration/test_auth_http.py` with fixtures in `backend/tests/integration/conftest.py`. Each test has its own temp SQLite file; the user is provisioned through the real CLI (`python -m app.cli create-user`) with throwaway credentials. Covered: login success and cookie flags (HttpOnly, SameSite=Strict, Path, Max-Age, Secure when configured), opaque unique token, identical 401 for wrong user and wrong password, 422 validation (missing, empty, null, wrong types, non-JSON), 401 for no/empty/garbage/tampered/truncated cookie, `/me`, OpenAPI route guard, logout (204, cookie cleared, old cookie rejected, idempotent, other sessions unaffected), expiry (before/after TTL, absolute not sliding, configured TTL), Origin check (forged, exact match, GET unchecked, checked before credentials), hash-only password and hashed session token in the DB, no secrets in responses or CLI output, repeated provisioning and `--reset-password`.
- **Modified files:** `backend/tests/integration/{__init__,conftest,test_auth_http}.py`; `docs/tasks.md`; `docs/agent-handoffs.md`; `docs/evidence/development-log.md`; `docs/evidence/test-runs/check-20261030T161629Z.txt`.
- **Important decisions:** expiry uses the documented clock injection point `app.state.clock` (same as the unit tests), since waiting 8 hours is not possible. DB assertions use plain `sqlite3` reads (table/column names `users.password_hash`, `sessions`), which couples two tests to the schema. Added `__init__.py` so the integration `conftest.py` does not clash with `backend/tests/conftest.py`.
- **Test results:** `scripts/check-all.sh` -> exit 0, 102 passed (47 existing + 55 new), 1 httpx deprecation warning, saved to `docs/evidence/test-runs/check-20261030T161629Z.txt`; `make lint-backend` exit 0; `scripts/check-ownership.sh testing` -> exit 0. All tests passed on the first run; no failing-then-fixed cycle, so these tests have not been shown to fail against a broken implementation (no mutation check run). Frontend, typecheck (mypy not installed) and E2E: not run.
- **Known issues:** no defects found; `docs/defects.md` unchanged. Not covered: login rate limiting (not in contract), Secure cookie over real TLS, concurrency, expense/dashboard routes (do not exist yet; the OpenAPI guard test will cover them when added). Suite takes about 60 s because of Argon2 hashing and CLI subprocesses.
- **Dependencies:** unblocks A-06.
- **Next action:** A-06 auth security review (HC3).

---

### HANDOFF A-06 - testing agent - 2026-10-30

- **Task ID(s):** A-06 (also verification of A-01..A-04)
- **Responsible agent:** testing
- **State set:** A-06 COMPLETED; A-01..A-04 VERIFIED (implemented by backend; review found no critical/major issue and checks re-ran green). A-05 left COMPLETED (written by testing).
- **Completed work:** read-only review of the authentication code and tests against `.github/skills/single-user-auth/review-checklist.md`; result in `docs/test-report.md` (12 PASS, 1 FAIL minor, 2 NOT RUN because no frontend exists yet).
- **Modified files:** `docs/test-report.md` (new), `docs/defects.md`, `docs/tasks.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`, `docs/evidence/test-runs/check-20261030T161944Z.txt`.
- **Important decisions:** FAIL on checklist item 3 is minor (throwaway test constants, no real secrets). Frontend items 13 and 14 stay NOT RUN until frontend/E2E exist.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (102 passed, 1 httpx deprecation warning); `scripts/check-all.sh` exit 0 (102 passed; frontend skipped), saved to `docs/evidence/test-runs/check-20261030T161944Z.txt`; `scripts/check-ownership.sh testing` exit 0. mypy and E2E not run.
- **Known issues:** DEF-001 (backend, minor: CLI ignores `.env` INITIAL_*), DEF-002 (testing/backend, minor: hardcoded test credentials). No login rate limiting (out of contract). Unhandled-500 envelope has no HTTP-level test. Route guard must be re-run when expense routes exist.
- **Dependencies:** unblocks HC3 decision and X-01.
- **Next action:** human HC3 approval; backend X-01.

---

### HANDOFF DEF-001 / DEF-002 (backend half) - backend agent - 2026-10-30

- **Task ID(s):** defect fixes DEF-001, DEF-002 (backend half); no task row changed.
- **Responsible agent:** backend
- **State set:** FIXED, awaiting verification by testing (attempt 1 of 3). `docs/defects.md` is owned by testing, so it was not edited; testing should set DEF-001 to FIXED (attempt 1) and re-verify.
- **Completed work:** DEF-001: `backend/app/cli.py` `_read_credentials` now reads `INITIAL_USERNAME`/`INITIAL_PASSWORD` from the process environment first, then from the repo-root `.env` (`ENV_FILE`, via `dotenv_values`); nothing is printed. DEF-002 (backend): `backend/tests/conftest.py` `TEST_PASSWORD` is generated per run with `secrets.token_urlsafe(16)` (shared through env var `_TEST_RUN_PASSWORD` because `conftest` is imported as both `conftest` and `tests.conftest`, which otherwise yields two different values). New test `test_cli_reads_credentials_from_env_file_and_process_env_wins`; existing CLI tests isolate `ENV_FILE`.
- **Modified files:** `backend/app/cli.py`, `backend/tests/conftest.py`, `backend/tests/unit/test_auth.py`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`.
- **Important decisions:** used `python-dotenv` (already a pydantic-settings dependency) instead of adding Settings fields. The working-tree version of `test_every_non_public_route_requires_authentication` (not from this task) failed with `'_IncludedRouter' object has no attribute 'path'`; reverted it to the OpenAPI-based version from HEAD so the suite is green. `ruff format` also reflowed a few lines in `test_auth.py`.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (103 passed, 1 httpx deprecation warning); `scripts/check-ownership.sh backend` exit 0. Not run: mypy, frontend, E2E, a manual `make seed-user` with a real `.env`.
- **Known issues:** DEF-002 testing half remains: `backend/tests/integration/conftest.py:16-17` still has constants. `.env.example` unchanged (comment is now accurate).
- **Dependencies:** none.
- **Next action:** testing agent fixes the integration constants, verifies DEF-001 and DEF-002 and updates `docs/defects.md`.

---

### HANDOFF DEF-001 / DEF-002 verification - testing agent - 2026-10-30

- **Task ID(s):** DEF-001, DEF-002 (no task row changed; A-06 stays COMPLETED)
- **Responsible agent:** testing
- **State set:** DEF-001 VERIFIED, DEF-002 VERIFIED in `docs/defects.md`.
- **Completed work:** DEF-002 testing half: `backend/tests/integration/conftest.py` `PASSWORD`/`OTHER_PASSWORD` now `secrets.token_urlsafe(16)`; hardcoded passwords in `test_auth_http.py` replaced. DEF-001: new black-box test `test_provisioning_reads_initial_credentials_from_dotenv_file` (scratch repo layout with temp `.env`, no INITIAL_* in environment). Manual scratch run: HEAD `cli.py` exit 2, fixed `cli.py` exit 0.
- **Modified files:** `backend/tests/integration/conftest.py`, `backend/tests/integration/test_auth_http.py`, `docs/defects.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`, `docs/evidence/test-runs/check-20261030T163842Z.txt`.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (104 passed, 1 httpx warning); `scripts/check-all.sh` exit 0 (104 passed, saved to `check-20261030T163842Z.txt`); `scripts/check-ownership.sh testing` exit 1 only because of uncommitted backend-owned changes (`backend/app/cli.py`, `backend/tests/conftest.py`, `backend/tests/unit/test_auth.py`); none of my files are flagged. Should pass once the backend changes are committed.
- **Known issues:** new integration test not run against the old CLI under pytest (manual before/after run only).
- **Next action:** commit backend and testing changes, re-run ownership check; HC3.

---

### HANDOFF X-01..X-05 - backend agent - 2026-10-30

- **Task ID(s):** X-01, X-02, X-03, X-04, X-05
- **Responsible agent:** backend
- **State set:** COMPLETED (not VERIFIED; needs a non-implementing agent, X-06 integration tests).
- **Completed work:** `schemas/expense.py` (money parsing to integer cents, decimal-string output, no floats); `services/expenses.py` (CRUD, filters, sorting, pagination, summary with `APP_TIMEZONE` month); `api/expenses.py` with three routers (`/categories`, `/expenses`, `/dashboard`), each with router-level `Depends(require_auth)`; registered in `main.py`.
- **Endpoints (all authenticated):** GET `/api/categories`; POST/GET `/api/expenses`; GET/PUT/DELETE `/api/expenses/{id}`; GET `/api/dashboard/summary`.
- **Modified files:** `backend/app/schemas/expense.py`, `backend/app/services/expenses.py`, `backend/app/api/expenses.py`, `backend/app/main.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`, `docs/tasks.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`.
- **Contract deviations (documented in api-contract.md, shapes unchanged):** whitespace-only description is stored as null; amount strings must match `\d{1,8}(\.\d{1,2})?`; `expense_date` must be a `YYYY-MM-DD` string (no timestamps); path id < 1 or non-integer -> 422 `validation_error`; JSON number amounts are parsed via `Decimal(str(n))` and rejected above 2 decimals.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed, 1 httpx deprecation warning); `scripts/check-ownership.sh backend` exit 0. Not run: mypy, frontend, E2E.
- **Known issues:** none known. The existing route-guard test passes with the new routes (7 expense/dashboard/category operations checked as 401 unauthenticated).
- **Next action:** testing agent X-06 (integration tests), then verify X-01..X-05.

---

### HANDOFF X-06 - testing agent - 2026-10-30

- **Task ID(s):** X-06 (verification of X-01..X-05)
- **State set:** X-06 COMPLETED; X-02..X-05 VERIFIED; X-01 stays COMPLETED (DEF-003 open).
- **Modified files:** `backend/tests/integration/test_expenses_http.py`, `docs/defects.md`, `docs/test-report.md`, `docs/tasks.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`, `docs/evidence/test-runs/check-20261030T165536Z.txt`.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (283 passed, 2 xfailed); `scripts/check-all.sh` exit 0 (saved output above); `scripts/check-ownership.sh testing` exit 0. Not run: frontend, E2E, mypy.
- **Known issues:** DEF-003 (minor, backend): amount strings with leading/trailing spaces accepted; xfail test will XPASS-fail (strict) once fixed, then remove the marker. 
- **Next action:** backend fixes DEF-003; frontend F-tasks; then I-01.

---

### HANDOFF DEF-003 - backend agent - 2026-10-30

- **Task ID(s):** DEF-003 fix (X-01 follow-up)
- **State:** fix implemented, not self-verified; X-01 stays COMPLETED until testing re-verifies.
- **Modified files:** `backend/app/schemas/expense.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`.
- **Cause:** `parse_amount_to_cents` (a `mode="before"` validator) called `value.strip()` before matching, so padding was silently accepted. Now the raw string is matched with `fullmatch` (also rejects a trailing newline, which `$` allowed).
- **Contract:** clarified header wording only: no spaces, including leading/trailing. Behaviour matches the original contract.
- **Tests added:** `test_parse_amount_rejects_padded_string` (5 cases), `test_expense_input_rejects_padded_amount_string`.
- **Test results:** `make lint-backend` exit 0. `make test-backend` exit 2: 2 failed, 289 passed; the only failures are the two strict-xfail XPASS tests `tests/integration/test_expenses_http.py::test_amount_string_with_surrounding_spaces_is_rejected_with_422[ 5]` and `[5 ]` (expected). `scripts/check-ownership.sh backend` exit 1: it reports pre-existing uncommitted testing-agent files (`docs/defects.md`, `docs/test-report.md`, `backend/tests/integration/test_expenses_http.py`, `docs/evidence/test-runs/check-20261030T165536Z.txt`), none changed by me. Not run: frontend, E2E, mypy.
- **Known issues:** none for backend.
- **Next action:** testing agent removes the two `xfail` markers, sets DEF-003 to VERIFIED, re-verifies X-01.

---

### HANDOFF DEF-003 verification - testing agent - 2026-10-30

- **Task ID(s):** DEF-003, X-01 re-verification
- **State set:** DEF-003 VERIFIED; X-01 VERIFIED.
- **Modified files:** `backend/tests/integration/test_expenses_http.py` (removed the `xfail(strict=True)` marker), `docs/defects.md`, `docs/tasks.md`, `docs/agent-handoffs.md`, `docs/evidence/development-log.md`, `docs/evidence/test-runs/check-20261030T170746Z.txt`.
- **Test results:** `make lint-backend` exit 0; `make test-backend` exit 0 (291 passed); `scripts/check-all.sh` exit 0 (291 passed, frontend not present), saved to `docs/evidence/test-runs/check-20261030T170746Z.txt`. `scripts/check-ownership.sh testing` exit 1: lists only backend-agent files (`backend/app/schemas/expense.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`) that are uncommitted; none changed by me.
- **Known issues:** ownership check stays red until the backend changes are committed. Not run: frontend, E2E, mypy.
- **Next action:** human commits backend changes; frontend F-tasks; then I-01.

---

### HANDOFF F-01, F-02 - frontend agent - 2026-10-30

- **Task ID(s):** F-01, F-02
- **Responsible agent:** frontend
- **State set:** COMPLETED (not VERIFIED; needs a non-implementing agent).
- **Completed work:** F-01: `frontend/` Vite + React 19 + TypeScript strict scaffold (hand-written, `tsc -b` with app/node tsconfigs), ESLint flat config (typescript-eslint, react-hooks, no-explicit-any), Vitest + RTL + jest-dom + jsdom, MSW (`src/test/handlers.ts` follows the contract: health, auth login/logout/me, categories), Vite proxy `/api` -> `http://127.0.0.1:8000` on port 5173, `package-lock.json` committed-ready. F-02: `src/api/client.ts` (fetch, `credentials: 'include'`, normalised `ApiError`, `network_error` code, no logging, 401 hook skipped for login/logout/me), `src/api/auth.ts`, `src/auth/` (`AuthProvider`, `useAuth`; in-memory state only, `GET /api/auth/me` on boot), `ProtectedRoute` (redirect to `/login?next=<path>`), `LoginPage` (labels, field errors with `aria-describedby`/`aria-invalid`, `role="alert"` server error, pending state, same-origin-only `next`).
- **Modified files:** `frontend/**` (new, no files under `frontend/tests/`), `docs/tasks.md` (F-01, F-02 rows), `docs/agent-handoffs.md`, `docs/evidence/development-log.md`. Makefile and `.env.example` unchanged.
- **Test results (Node v22.23.4):** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (3 files, 20 tests passed); `scripts/check-ownership.sh frontend` exit 0. Not run: dev server in a browser, 360 px check, E2E, backend suite.
- **Known issues:** `npm audit` reports 3 vulnerabilities (1 moderate, 2 critical) in dev-only test tooling (`@vitest/mocker`, `tinypool` via vitest); not fixed (would need a vitest major upgrade, `npm audit fix --force`). Home page is a placeholder until F-04. Global 401 hook exists in the client and `AuthProvider` resets state on it; redirect UX and navigation/logout button are F-03.
- **Contract gaps / proposals for backend:** (1) Contract header says request amounts match `\d{1,8}(\.\d{1,2})?` while frontend rules say `\d{1,6}`; harmless (the frontend is stricter) but worth aligning. (2) Login 422 `validation_error` message/details shape is not specified; the frontend validates empties client-side and shows `error.message` for any failure. (3) Not specified whether a login while already authenticated replaces the session; the frontend avoids this by redirecting authenticated users away from `/login`.
- **Next action:** F-03 (layout, logout button, global 401 redirect); an independent agent verifies F-01/F-02.

---

### HANDOFF F-03, F-04 - frontend agent - 2026-10-30

- **Task ID(s):** F-03, F-04
- **Responsible agent:** frontend
- **State set:** COMPLETED (not VERIFIED; needs a non-implementing agent).
- **Completed work:** F-03: `Layout` (header, `Main` nav with Dashboard/Expenses, signed-in username, "Log out" button; logout clears auth state even if the request fails and `ProtectedRoute` redirects to `/login`), global 401 handling via the existing client hook (clears auth state, `ProtectedRoute` redirects to `/login?next=...`). F-04: `ExpensesPage` at `/expenses` with category (from `GET /api/categories`), From/To date, sort (`date_desc`/`date_asc`), clear filters, pagination (page size 20, Previous/Next, "x-y of total"), loading status, empty (with/without filters), error with Retry, inverted date range blocked client-side with an alert; amounts shown through `lib/money.ts` `formatMoney` (string/BigInt, no floats). MSW `GET /api/expenses` follows the contract (filters, sort with id tiebreak, limit/offset, 422 on invalid values).
- **Modified files:** `frontend/src/{App.tsx,index.css,api/types.ts,api/expenses.ts,components/Layout.tsx,pages/ExpensesPage.tsx,lib/money.ts,test/handlers.ts}`, tests `Layout.test.tsx`, `ExpensesPage.test.tsx`, `money.test.ts`; `docs/tasks.md` (F-03, F-04 rows), `docs/agent-handoffs.md`, `docs/evidence/development-log.md`.
- **Test results (Node 22):** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (6 files, 33 tests passed); `scripts/check-ownership.sh frontend` exit 0. Not run: browser, E2E, 360 px visual check.
- **Known issues / contract notes (proposals for backend):** (1) After a deliberate logout, `ProtectedRoute` redirects to `/login?next=<current path>`, so the next login returns to that page; frontend-only cosmetic issue, left as is. (2) The list endpoint has no free-text search or amount filter; none was added. (3) Contract gives no currency; amounts are shown without a symbol. (4) The list has no way to sort by amount or category (only `date_desc`/`date_asc`); proposal: add `amount_*` sorts if wanted. (5) Edit/delete/"New expense" controls are not present; they belong to F-05.
- **Next action:** F-05 (forms, delete, toasts) and F-06 (dashboard); testing agent verifies F-01..F-04.

---

### HANDOFF F-05, F-06 - frontend agent - 2026-10-30

- **Task ID(s):** F-05, F-06
- **Responsible agent:** frontend
- **State set:** COMPLETED (not VERIFIED; needs a non-implementing agent).
- **Completed work:** F-05: `ExpenseFormPage` at `/expenses/new` and `/expenses/:id/edit` (amount as text/decimal string validated by `lib/money.ts` `validateAmount`, category from `GET /api/categories`, date, description <= 500; field-level errors with `aria-invalid`/`aria-describedby`, focus on first invalid field, server 422 details mapped to fields, submit disabled while pending, load error with Retry, invalid/unknown id shows "Expense not found."); `ConfirmDialog` (role dialog, focus on Cancel, Tab trap, Escape, focus restored); `ToastProvider` (aria-live status region, auto-dismiss 5 s, dismiss button) inside `Layout`; list gets "New expense" link plus per-row Edit link and Delete button; after delete the list reloads (or steps back one page). MSW handlers for POST/GET/PUT/DELETE `/api/expenses` and `GET /api/dashboard/summary` per contract. F-06: `DashboardPage` at `/` with total, current month and count, hand-written SVG bar chart (`role="img"` with a text label listing every category total) plus a category table and recent-expenses table; loading, empty (link to add), error with Retry; amounts stay decimal strings (BigInt cents only for bar length).
- **Modified files:** `frontend/src/{App.tsx,index.css,api/{types,expenses}.ts,components/{Layout.tsx,ConfirmDialog.tsx,ToastProvider.tsx,toastContext.ts,useToast.ts},lib/{money.ts,money.test.ts},pages/{ExpensesPage.tsx,ExpenseFormPage.tsx,DashboardPage.tsx},test/handlers.ts}`; tests `pages/ExpenseFormPage.test.tsx`, `pages/DashboardPage.test.tsx`, updated `pages/LoginPage.test.tsx`, `components/ProtectedRoute.test.tsx` (home heading is now "Dashboard"); `docs/tasks.md` (F-05, F-06 rows), `docs/agent-handoffs.md`, `docs/evidence/development-log.md`.
- **Test results (Node 22):** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (8 files, 55 tests passed); `scripts/check-ownership.sh frontend` exit 0. Not run: browser, E2E, 360 px visual check, real backend.
- **Known issues / contract notes (proposals for backend):** (1) Contract header allows request amounts `\d{1,8}(\.\d{1,2})?` while the range is 0.01..999999.99; the frontend uses the stricter `\d{1,6}` pattern. (2) Contract does not say whether the `Location` header after create is used; the frontend ignores it. (3) 422 `details[].loc` shape is assumed to be `["body", "<field>"]` (as FastAPI emits); the contract does not specify it, so unmapped errors show the generic message. (4) No currency in the contract, amounts show without a symbol. (5) Single-expense GET is used for editing; no ETag/concurrency control exists, so concurrent edits are last-write-wins. (6) `npm audit` dev-tooling findings from F-02 remain.
- **Next action:** a non-implementing agent verifies F-01..F-06; then I-01 and T-04.

---

### HANDOFF T-01..T-05 + architecture review - testing agent - 2026-11-01

- **Task ID(s):** T-01, T-02, T-03, T-04, T-05, architecture/complexity review
- **State set:** T-01..T-05 COMPLETED (implemented by testing; not VERIFIED by a second agent). T-06 untouched.
- **Modified files:** `e2e/package.json`, `e2e/package-lock.json`, `e2e/playwright.config.ts`, `e2e/support/{servers,global-setup,helpers}.ts`, `e2e/tests/{workflow,persistence,screenshots}.spec.ts`, `frontend/tests/flows.test.tsx`, `backend/tests/integration/test_auth_http.py` (DEF-005), `docs/evidence/screenshots/{login,expenses,dashboard}.png`, `docs/evidence/test-runs/check-20261101T004130Z.txt`, `check-20261101T004540Z.txt`, `check-20261101T005014Z.txt`, `docs/test-report.md`, `docs/defects.md`, `docs/tasks.md`, `docs/evidence/development-log.md`. No production code changed.
- **Commands run:** `npm install` + `npx playwright install chromium` in `e2e/` exit 0; `make test-e2e` exit 0 (3 passed); `scripts/check-all.sh --e2e` exit 2 (DEF-005, 290 passed 1 failed), exit 2 (flaky own flow test), final exit 0 (backend 291 passed, frontend 62 passed, E2E 3 passed); `scripts/check-ownership.sh testing` exit 0.
- **Results:** 16-step workflow PASS; persistence (backend restart, re-login) PASS; 3 real PNG screenshots; review: contract, complexity, out-of-scope and secrets PASS.
- **Defects:** DEF-004 (minor, owner frontend, OPEN): `tsc -b` does not cover `frontend/tests`. DEF-005 (minor, testing, VERIFIED): test depended on root `.env`.
- **Known issues / limits:** E2E needs ports 8000 and 5173 free (Vite proxy is fixed to 8000) and `make setup-e2e` (Chromium download); Chromium only; mypy and 360 px not run; npm audit not re-run. `make test-e2e` does not source nvm, so it needs Node 22 on PATH.
- **Next action:** frontend agent fixes DEF-004; orchestrator + testing run T-06 (`make validate`, HC4); an independent agent may verify T-01..T-05.

---

### HANDOFF DEF-004 - frontend agent - 2026-11-01

- **Task ID(s):** DEF-004 (defect; no task row changed)
- **Responsible agent:** frontend
- **State set:** DEF-004 FIXED (not VERIFIED; needs a non-implementing agent).
- **Completed work:** `frontend/tsconfig.app.json` `include` changed from `["src"]` to `["src", "tests"]`, so `tsc -b` type-checks `frontend/tests/flows.test.tsx`. No test files edited; no type errors surfaced.
- **Modified files:** `frontend/tsconfig.app.json`, `docs/agent-handoffs.md`. `docs/defects.md` NOT edited (testing-owned; edit blocked by the ownership guard): testing agent should set DEF-004 to FIXED (fix attempts 1/3) with this evidence.
- **Test results (Node 22):** `make typecheck-frontend` exit 0; `tsc -p tsconfig.app.json --listFilesOnly` lists `tests/flows.test.tsx`; `make lint` exit 0; `make test-frontend` exit 0 (9 files, 62 tests passed); `scripts/check-ownership.sh frontend` exit 1, listing only pre-existing uncommitted files of the testing agent (`e2e/**`, `frontend/tests/flows.test.tsx`, `docs/evidence/**`, `docs/test-report.md`, `backend/tests/integration/test_auth_http.py`).
- **Known issues:** not demonstrated with a deliberately wrong type; E2E not run.
- **Next action:** testing agent verifies DEF-004 and sets VERIFIED; orchestrator proceeds with T-06.

### HANDOFF DEF-004 verification - testing agent - 2026-11-01

- **Task ID(s):** DEF-004
- **Responsible agent:** testing (did not implement the fix)
- **State set:** DEF-004 VERIFIED.
- **Completed work:** independent check of the `frontend/tsconfig.app.json` change.
- **Modified files:** `docs/defects.md`, `docs/test-report.md`, `docs/evidence/test-runs/def-004-verify.txt`, `docs/agent-handoffs.md`. No production code changed; the temporary type error in `frontend/tests/flows.test.tsx` was reverted.
- **Test results (Node 22):** `npm --prefix frontend run typecheck` exit 0; `--listFilesOnly` lists `tests/flows.test.tsx`; injected `number = "x"` gave TS2322, exit 2; after revert exit 0.
- **Known issues:** none for DEF-004.
- **Next action:** orchestrator proceeds with T-06.

---

### HANDOFF DOC-01..DOC-04 - documentation agent - 2026-11-01

- **Task ID(s):** DOC-01, DOC-02, DOC-03, DOC-04
- **State set:** COMPLETED (not VERIFIED; DOC-05 audit is the orchestrator's).
- **Modified files:** `README.md`, `docs/architecture.md`, `docs/report/final-report.md`, `docs/assignment-evidence.md`, `docs/evidence/development-log.md`, `docs/tasks.md` (own rows).
- **Commands run:** `make check-env` exit 2 (Node 22.13.1 in this shell); `file docs/evidence/screenshots/*.png` (3 PNGs); `scripts/check-ownership.sh documentation` see below.
- **Known issues / gaps:** no verbatim prompts for build modules; page lengths unmeasured; `make setup`/`seed-user`/dev servers not re-run; screenshots not reviewed by a human.
- **Human must do:** review the three screenshots for sensitive data; confirm the repository URL and replace `<GITHUB_URL_TO_BE_ADDED_BY_HUMAN>` in the report; export the report to a Google Drive document and set "anyone with the link can view".
- **Next action:** orchestrator DOC-05 final audit (HC5).

### NOTE HC5 - documentation agent - 2026-11-01

- Human replied "HC5 approved" after the DOC-01..DOC-04 handoff. DOC-05 (orchestrator final audit) and DOC-06 (human publishing) rows are not changed by this agent.
- Still open for the human: screenshot review, repository URL in the report, Google Drive upload and sharing.

---

### HANDOFF DOC-05 - orchestrator final audit - 2026-11-01

- **Task ID(s):** DOC-05
- **State set:** COMPLETED with one FAIL (clean tree) and gaps below.
- **Results:** (1) requirements vs `docs/assignment-evidence.md`: cited files exist; PARTIAL on key prompts for modules 1-5, NOT VERIFIED on page/half-page lengths. (2) `make validate` exit 0, backend 291, frontend 62, E2E 3 passed, `docs/evidence/test-runs/check-20261101T012350Z.txt`; 3 real PNG screenshots exist: PASS. (3) secrets scan: no `.env`, `*.db` or credential files tracked; `.env.example` placeholders only; grep hits only in skill docs/test fixtures: PASS. (4) `git status` NOT clean: the audit runs rewrote `docs/evidence/screenshots/{dashboard,expenses}.png` and added `check-20261101T011956Z.txt`, `check-20261101T012350Z.txt`; `check-ownership.sh` backend/frontend/documentation exit 1 only because of these files, testing exit 0: FAIL until the human reviews and commits them. README commands: `make validate` run; `make setup`/`seed-user`/dev servers not re-run.
- **Human must do (HC5/HC6):** review regenerated screenshots, commit evidence, replace `<GITHUB_URL_TO_BE_ADDED_BY_HUMAN>`, upload report to Google Drive (anyone with link can view), push. Nothing pushed.

---

### HANDOFF DOC-05 follow-up - documentation agent - 2026-11-01

- **Task ID(s):** DOC-05 (follow-up; row state not changed by this agent)
- **Modified files:** `docs/report/final-report.md` (placeholder replaced with the human-confirmed URL), `docs/assignment-evidence.md` (row "Link to GitHub repository" set to DONE; Google Drive stays HUMAN), `docs/agent-handoffs.md`.
- **Notes:** `README.md` already contained the URL, no change. Nothing committed or pushed; whether the repository is published is not verified.

---

### HANDOFF CR2-B - backend agent - 2026-11-01

- **Task ID(s):** CR2-B (state set to IN_REVIEW; not VERIFIED by me)
- **Modified files:** `backend/app/models/{user,expense}.py`, `backend/app/schemas/auth.py`, `backend/app/services/{auth,expenses}.py`, `backend/app/api/{auth,expenses}.py`, `backend/app/cli.py`, `backend/tests/unit/{test_auth,test_models}.py`, new `backend/tests/unit/test_isolation.py`, `docs/api-contract.md`.
- **Decisions:** username keeps typed case; uniqueness via functional unique index `uq_users_username_lower` on `lower(username)`; login also matches case-insensitively. `expenses.user_id` NOT NULL FK (ON DELETE CASCADE) with index. `register_user` pre-checks, then falls back to `IntegrityError` -> 409 `username_taken`. `provision_user` creates if the username is absent; `--reset-password` resets only that user's password and sessions. `GET /api/categories` is a static list (auth only).
- **Contract:** new `POST /api/auth/register` (201, 409 `username_taken`, 422, 403), per-user behaviour, 404 for foreign ids; noted in `docs/api-contract.md`.
- **Fresh database required:** no migrations (ADR-005). Delete the existing `backend/data/*.db` (schema changed: users id/index, expenses.user_id).
- **Results:** `make lint-backend` exit 0 ("All checks passed!", 35 files already formatted). `pytest tests/unit`: 140 passed, exit 0. `make test-backend` (unit + integration): 321 passed, 1 failed, exit 2. `scripts/check-ownership.sh backend` exit 1 only because `frontend/tsconfig.app.json` is modified in the working tree (not by this task; no backend violation reported).
- **Integration failure for the testing agent (not edited):** `tests/integration/test_auth_http.py::test_every_non_public_route_in_openapi_requires_auth` - its public set lacks `/api/auth/register` (got 422 instead of 401). Other single-user assumptions in `backend/tests/integration/**` were not triggered by this run, but should be reviewed for CR2-T.
- **Next action:** CR2-F (frontend `/signup`), then CR2-T.
---
### HANDOFF CR2-F - frontend agent - 2026-11-01
- **Task ID(s):** CR2-F (set to IN_REVIEW; not VERIFIED by me)
- **Modified files:** new `frontend/src/pages/SignupPage.tsx`, `SignupPage.test.tsx`, `frontend/src/lib/redirect.ts` (`safeNext` moved out of LoginPage, shared); changed `frontend/src/{App.tsx,api/auth.ts,auth/authContext.ts,auth/AuthProvider.tsx,pages/LoginPage.tsx,test/handlers.ts}`.
- **Behaviour:** public `/signup` (username 3-64 trimmed, password 8-128, confirm must match; per-field `aria-invalid`/`aria-describedby`, `aria-live` error regions, `role="alert"` form error, disabled button while pending). 409 `username_taken` -> field message on username; 422/other -> form-level alert. Success calls `AuthContext.register` (state from response, no storage) and navigates to `?next` (same `safeNext` as login). Login and sign-up link to each other, preserving `next`. Header already showed the username (`Layout`); now covered by a test through the sign-up flow.
- **MSW:** added `POST /api/auth/register` (201/409/422); `/api/auth/me` returns the registered username. Existing login tests unchanged.
- **Results:** `make lint` exit 0 (backend ruff passed; `eslint .` clean). `make typecheck` exit 0 (`tsc -b`; backend part skipped by the Makefile). `make test-frontend` exit 0: 10 files, 70 tests passed (incl. 8 new sign-up tests and existing `frontend/tests/flows.test.tsx`, 7 passed).
- **Ownership check:** `scripts/check-ownership.sh frontend` exit 1 only because of uncommitted CR2-B backend/docs changes in the working tree; no frontend violation. `frontend/tsconfig.app.json` not touched.
- **Known issues / notes:** none for frontend. Username-in-header is not covered by a Layout.test.tsx change; sign-up test asserts it.
- **Next action:** testing agent (CR2-T) verifies; a two-user E2E should use `/signup`.
---
### HANDOFF CR2-T - testing agent - 2026-11-01
- **Task ID(s):** CR2-T (BLOCKED on E2E execution); CR2-B set to VERIFIED; CR2-F left IN_REVIEW.
- **Modified files:** new `backend/tests/integration/test_registration_http.py`, `test_isolation_http.py`; `backend/tests/integration/test_auth_http.py` (allow-list + `REGISTER` constant); new `e2e/tests/multi-user.spec.ts`; `e2e/support/helpers.ts` (`submitSignup`, `randomPassword`); `e2e/tests/screenshots.spec.ts` (signup.png); `docs/test-report.md` (CR2-T section); `docs/tasks.md`; this file; `docs/evidence/development-log.md`. No production code changed.
- **Commands and results:**
  - `pytest tests/integration/test_registration_http.py tests/integration/test_isolation_http.py tests/integration/test_auth_http.py` (in `backend/`): exit 0, 123 passed.
  - `scripts/check-all.sh --e2e`: exit 2, ruff format failure in my new test (fixed with `ruff format`): `docs/evidence/test-runs/check-20261101T021648Z.txt`.
  - `scripts/check-all.sh --e2e`: exit 2; lint and typecheck OK, backend 389 passed, frontend 70 passed, E2E not started because 127.0.0.1:8000 and :5173 were in use by the user's running `uvicorn --reload` / `vite`: `docs/evidence/test-runs/check-20261101T021658Z.txt`.
  - `npx playwright test --list` (in `e2e/`): exit 0, 4 specs listed.
  - `scripts/check-ownership.sh testing`: exit 1, listing only other agents' uncommitted CR-002 files and `frontend/tsconfig.app.json`; none of my files are listed.
- **Verdicts:** CR2-B VERIFIED (backend black-box registration and isolation tests plus 389 passed). CR2-F stays IN_REVIEW: only MSW component tests are green; real-browser E2E and screenshots NOT RUN.
- **Defects:** none filed (no failing behaviour observed).
- **Blocker / human action:** stop the dev servers on ports 8000 and 5173 (I did not kill your processes), then run `scripts/check-all.sh --e2e`. That regenerates `login.png`, `expenses.png`, `dashboard.png`, new `signup.png` and executes `multi-user.spec.ts`; the new spec has never run and may need adjustment. Then update CR2-F/CR2-T rows.
- **Not run:** E2E, screenshots, mypy, mutation check, concurrency (see `docs/test-report.md`).
- **Next action:** testing agent re-run after the ports are free.

---

### HANDOFF DOC-05 re-audit - orchestrator - 2026-11-01

- **Task ID(s):** DOC-05 (re-run after CR-002; row stays COMPLETED)
- **Results:** (1) `scripts/check-all.sh --e2e` exit 0: ruff clean, backend 389 passed, frontend 70 passed, E2E 4 passed, `docs/evidence/test-runs/check-20261101T111722Z.txt`: PASS. A first run (`check-20261101T111105Z.txt`, exit 2) failed only because dev servers held ports 8000/5173; the human stopped them. (2) 4 real screenshots (`login`, `signup`, `expenses`, `dashboard`): PASS. (3) secrets scan: no `.env`, `*.db` or credential files tracked; `.env.example` placeholders only; grep hits only skill docs and test fixtures: PASS. (4) `check-ownership.sh` backend/frontend/testing/documentation/orchestrator exit 0 before the validation runs; `git status` NOT clean afterwards (regenerated `dashboard.png`, `expenses.png`; new `check-20261101T111105Z.txt`, `check-20261101T111722Z.txt`): FAIL until the human reviews and commits. README `make setup`/`seed-user`/dev servers not re-run.
- **Still open:** key prompts for modules 1-5 not recorded (PARTIAL); page and half-page lengths not measured.
- **Human must do (HC5/HC6):** review regenerated screenshots, commit evidence, upload report to Google Drive (anyone with link can view), push. Nothing pushed.
