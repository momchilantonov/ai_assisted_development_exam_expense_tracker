# Prompts (verbatim, secrets redacted)

Curated key prompts for the report. Format per entry: date, module, agent/tool, prompt, outcome. Raw hook log `prompt-log.jsonl` is gitignored; review it before copying anything here.

## 2026-10-30 - Planning - GitHub Copilot Plan Mode

Prompt: the full text of `plan.prompt.md` (MASTER PLANNING PROMPT, repository root) with the additional instruction "Use .github folder for all MAD tools".
Outcome: approved architecture and agent plan, stored (condensed) in `docs/plan/master-plan.md`. User answered three clarification questions: Local harness; no MCP; skills moved from `.agents/skills/` into `.github/skills/`.

## 2026-10-30 - Infrastructure - GitHub Copilot Agent Mode

Prompt: "Start implementation" (user message approving the plan; the setup procedure is section P of the plan, tasks INF-01..INF-11).
Outcome: see `docs/evidence/development-log.md`.

## Key prompts for the submission document (added by SUB-01, 2026-11-01)

Source of every entry below: `docs/evidence/prompt-log.jsonl` (raw hook log of user messages, gitignored; reviewed, the only redaction is `[REDACTED_LONG]` written by the hook itself). Text is verbatim. Prompts for tasks were typed or pasted by the human into the named chat session; who drafted them is not recorded.

### 2026-10-30 - Authentication and security - GitHub Copilot Agent Mode, backend agent

Source: `prompt-log.jsonl` line 18 (2026-10-30T16:11:21.169Z).

```text
Tasks A-01, A-02, A-03, A-04 (Stage C, authentication) for the expense tracker. Read first: .github/copilot-instructions.md, .github/instructions/backend.instructions.md, docs/tasks.md, docs/decisions.md (ADR-002 session cookie; do NOT change design), docs/api-contract.md (authoritative auth endpoints/errors), docs/agent-handoffs.md (B-01, B-02 handoffs), skills .github/skills/single-user-auth/SKILL.md and .github/skills/fastapi-feature-development/SKILL.md.
Deliver: A-01 provisioning CLI create-user (credentials read at runtime from env/prompt, never committed/printed); A-02 Argon2 hashing + server-side session service (hashed token stored, expiry, logout invalidation); A-03 auth routes (login/logout/me per contract), require_auth dependency, Origin/CSRF check middleware, generic error messages, secure cookie flags; A-04 route guard test (every non-public route requires auth) + auth unit tests. Update docs/api-contract.md only if needed; add dependencies to backend requirements files if needed.
Write only within your ownership (backend/** except backend/tests/integration/**, docs/api-contract.md, backend lines of Makefile/.env.example). Acceptance commands: make lint-backend, make test-backend, scripts/check-ownership.sh backend — all must exit 0. Update your rows A-01..A-04 in docs/tasks.md to COMPLETED with evidence, append a handoff block (agent-handoff skill) to docs/agent-handoffs.md and log evidence via ai-dev-evidence skill. Never fabricate results.
```

### 2026-11-01 - Authentication and security (change request) - GitHub Copilot Agent Mode, orchestrator session

Source: `prompt-log.jsonl` line 75 (2026-11-01T01:58:00.415Z).

```text
I think this with single user and sigh up once at start is stupid. We need to make it multi user. Most of the functionality will stay the same.  And also we have error at the opened file
```

### 2026-10-30 - Backend API - GitHub Copilot Agent Mode, backend agent

Source: `prompt-log.jsonl` line 26 (2026-10-30T16:42:00.228Z).

```text
Tasks X-01..X-05 (Stage D expense backend). Read: .github/copilot-instructions.md, .github/instructions/backend.instructions.md, docs/tasks.md, docs/decisions.md (ADR-003 money, ADR-004 categories, ADR-005 no migrations), docs/api-contract.md (authoritative), docs/architecture.md, docs/agent-handoffs.md (latest), skills .github/skills/fastapi-feature-development/SKILL.md and .github/skills/fastapi/SKILL.md. Order: [REDACTED_LONG].
X-01 expense Pydantic schemas + money handling (decimal strings in API, integer cents in DB, no floats, validation). X-02 expense service + CRUD routes. X-03 filters, sorting, pagination per contract. X-04 dashboard service/route and categories endpoint. X-05 publish contract updates in docs/api-contract.md (mark implemented, keep frontend-facing shapes exact). All expense/dashboard/category routers MUST use router-level Depends(require_auth); keep the route guard test passing. Unit tests under backend/tests/unit/** (not integration). Write only within your ownership. Acceptance: make lint-backend, make test-backend, scripts/check-ownership.sh backend all exit 0 (commit nothing; the orchestrator commits). Set rows X-01..X-05 to COMPLETED with evidence in docs/tasks.md, append handoff block (with any contract deviations and endpoint list) to docs/agent-handoffs.md, log evidence. Never fabricate.
```

### 2026-10-30 - Backend API (defect fix) - GitHub Copilot Agent Mode, backend agent

Source: `prompt-log.jsonl` line 28 (2026-10-30T16:59:50.143Z).

```text
Fix DEF-003 in docs/defects.md: amount strings with leading/trailing whitespace must return 422 validation_error per docs/api-contract.md (see backend/app/schemas/expense.py; pydantic str strip likely enabled). Read .github/instructions/backend.instructions.md first. Add a unit test in backend/tests/unit/. Do not edit backend/tests/integration/** (two xfail(strict=True) tests there will then XPASS-fail; that is expected and the testing agent will remove the markers). Run make lint-backend, make test-backend (expect only those strict-xfail failures in integration; report exactly), scripts/check-ownership.sh backend. Append handoff, log evidence. Never fabricate.
```

### 2026-10-30 - Database and persistence - GitHub Copilot Agent Mode, backend agent

Source: `prompt-log.jsonl` line 8 (2026-10-30T15:46:48.978Z).

```text
Implement task B-02 ONLY (B-01 is VERIFIED and committed). Models users/sessions/expenses with constraints.
Read first: .github/copilot-instructions.md, .github/instructions/backend.instructions.md, .github/instructions/testing.instructions.md, skills .github/skills/fastapi-feature-development/SKILL.md and .github/skills/agent-handoff/SKILL.md, .github/skills/ai-dev-evidence/SKILL.md, .[REDACTED_LONG].md; docs/architecture.md, docs/api-contract.md, docs/decisions.md, docs/tasks.md, latest docs/agent-handoffs.md entry (B-01), existing backend/app code.
Scope: SQLAlchemy 2.x models for users (single user, password hash column), sessions (server-side, hashed token, expiry), expenses (integer cents amount > 0, fixed category set per contract, date, description, timestamps, DB CHECK constraints), created through init_db. Unit tests in backend/tests (not tests/integration) covering constraints (positive amount, valid category, unique username, session FK) with isolated temp DBs. No services, routes, hashing or CLI (A-tasks).
Acceptance: `make lint-backend`, `make test-backend` pass (report exit codes); `scripts/check-ownership.sh backend` passes.
Finish with a handoff block appended to docs/agent-handoffs.md, evidence in docs/evidence/development-log.md, and only your B-02 row in docs/tasks.md set to COMPLETED with evidence. Do not commit.
```

### 2026-11-01 - Database and persistence / multi-user (CR-002) - GitHub Copilot Agent Mode, backend agent

Source: `prompt-log.jsonl` line 78 (2026-11-01T02:03:06.360Z).

```text
Task CR2-B (change request CR-002, ADR-011 in docs/decisions.md; ignore ADR-010/CR-001, never implemented). Read first: .github/copilot-instructions.md, .github/instructions/backend.instructions.md, docs/api-contract.md, docs/decisions.md (ADR-002, ADR-005, ADR-011), docs/tasks.md, latest handoffs in docs/agent-handoffs.md, skills fastapi-feature-development and single-user-auth.

Implement multi-user with open sign-up and per-user data, nothing else:
- Models: remove the users.id = 1 CHECK constraint; users get autoincrement id and a case-insensitively unique username (e.g. unique index on lower(username) or a normalized column). expenses.user_id NOT NULL FK to users.id with an index.
- POST /api/auth/register (public, Origin-checked): {username 3-64, password 8-128}; creates user (Argon2id), starts a session with the same cookie as login, returns 201 with same user body shape as login. Duplicate username in any letter case -> 409 error code username_taken (use the existing error envelope; handle race via IntegrityError). Validation -> 422.
- Scope every expense, dashboard and category query by the session user's id; another user's expense id -> 404 not_found on read, update and delete; list totals and dashboard figures per user.
- Update the route-guard allow-list (public paths) test/config, docs/api-contract.md (new endpoint, 409 code, per-user behaviour), keep `python -m app.cli create-user` working (adapt to multi-user: create if username absent, no id=1 assumption).
- Unit tests, including user isolation for every expense route (list, get, create ownership, update, delete, dashboard, categories) and registration cases.
- Fresh database expected, no migrations; state this in the handoff. Do NOT touch README, report or other docs beyond docs/api-contract.md, your handoff and evidence log.

Allowed writes: backend/** except backend/tests/integration/**, docs/api-contract.md, append to docs/agent-handoffs.md, docs/evidence/development-log.md, your own row (CR2-B) in docs/tasks.md. Note existing integration tests in backend/tests/integration may break (single-user assumptions); do not edit them, list the failures in the handoff for the testing agent.
Run: make lint-backend, make test-backend (unit tests must pass), scripts/check-ownership.sh backend. Finish with a handoff block (agent-handoff skill) with real command outputs and exit codes.
```

### 2026-10-30 - Frontend - GitHub Copilot Agent Mode, frontend agent

Source: `prompt-log.jsonl` line 36 (2026-10-30T17:25:11.438Z).

```text
Implement tasks F-05 and F-06 (Stage E, last frontend tasks) from docs/tasks.md. F-01..F-04 are VERIFIED and committed in frontend/.
Read first: .github/copilot-instructions.md, .github/instructions/frontend.instructions.md, .github/instructions/testing.instructions.md, docs/api-contract.md (authoritative: expense create/update/delete, validation rules, dashboard endpoint, categories), latest docs/agent-handoffs.md entries (F-03/F-04, contract gaps), skill .github/skills/react-feature-development/SKILL.md. Ignore user-level kate-*/kbc-* skills.
F-05: create/edit forms with client validation mirroring the contract (amount as decimal string, never floats; category from the fixed list; date), delete confirmation, success/error toasts, accessible labels/errors, New/Edit/Delete controls on the list; MSW handlers per contract; component tests.
F-06: Dashboard page (summary stats per contract) with a plain SVG chart (no chart library), loading/empty/error states, accessible (text alternative); tests.
Do not invent behaviour; record contract gaps in your handoff as proposals for backend.
Write only frontend/** except frontend/tests/**. Do not edit others' rows in docs/tasks.md.
Acceptance (Node 22 via nvm): `make lint-frontend`, `make typecheck-frontend`, `make test-frontend` exit 0; `scripts/check-ownership.sh frontend` exit 0. Append a handoff block to docs/agent-handoffs.md with exact commands/exit codes and log evidence in docs/evidence/development-log.md. Never fabricate results.
```

### 2026-11-01 - Frontend (UI redesign) - GitHub Copilot Agent Mode, orchestrator session

Source: `prompt-log.jsonl` line 98 (2026-11-01T12:24:29.586Z).

```text
You can check the image docs/design/reference/image.png for the style, fonts, and etc. for the ui re-design
```

### 2026-10-30 - Testing and integration - GitHub Copilot Agent Mode, testing agent

Source: `prompt-log.jsonl` line 27 (2026-10-30T16:47:02.993Z).

```text
Task X-06: black-box integration tests for expenses, filters/sorting/pagination, categories and dashboard, plus verification of X-01..X-05. Read: .github/copilot-instructions.md, .github/instructions/testing.instructions.md, .github/skills/automated-testing/SKILL.md, docs/api-contract.md (authoritative), docs/decisions.md ADR-003/004, docs/agent-handoffs.md (latest backend handoff), existing backend/tests/integration/conftest.py. Write only under backend/tests/integration/**. Cover: 401 without auth on every expense/dashboard/category route; CRUD happy paths; validation errors (amount formats, negative/zero, date, category, description length, bad id); 404; money exactness (no float drift, cents); filters by category and date range, sorting, pagination bounds; dashboard totals/by-category/by-month against known data; empty state; data persistence; no leakage of internals in errors; isolated temp DB, runtime-generated credentials. Do not edit production code; file defects in docs/defects.md. Run make lint-backend, make test-backend, scripts/check-all.sh (saved output), scripts/check-ownership.sh testing. Update X-06 row to COMPLETED with evidence; if you re-ran X-01..X-05 checks and they are sound with saved output, mark X-01..X-05 VERIFIED. Append handoff to docs/agent-handoffs.md, log evidence, update docs/test-report.md section. Never fabricate; report any failures exactly.
```

### 2026-11-01 - Testing and integration (CR-002) - GitHub Copilot Agent Mode, testing agent

Source: `prompt-log.jsonl` line 80 (2026-11-01T02:12:18.049Z).

```text
Task CR2-T (change request CR-002, ADR-011 in docs/decisions.md). Verify CR2-B and CR2-F independently (you did not implement them). Read first: .github/copilot-instructions.md, .github/instructions/testing.instructions.md, skills automated-testing and single-user-auth, docs/api-contract.md, docs/tasks.md, CR2-B and CR2-F handoffs in docs/agent-handoffs.md, existing backend/tests/integration, e2e/, docs/test-report.md.

Do:
1. Fix backend/tests/integration/test_auth_http.py::[REDACTED_LONG] (public set must include /api/auth/register); adapt any other single-user assumptions in integration/e2e/frontend-flow tests and fixtures.
2. Black-box integration tests (backend/tests/integration): registration (success 201, duplicate username in a different letter case -> 409 username_taken, validation limits at 2/3/64/65 username and 7/8/128/129 password -> 422, auto-login cookie flags: HttpOnly, SameSite, Path, same cookie name as login, Origin check on register -> rejected for bad Origin), and user isolation (user B cannot read, update, delete or list user A's expenses -> 404 not_found, list excludes them, dashboard totals per user, user B's delete did not affect A).
3. E2E scenario in e2e/tests with two users in separate browser contexts via the real /signup UI (each sees only own data, username in header, duplicate username error shown).
4. Update the auth security review in docs/test-report.md with the new checklist (registration, enumeration/duplicate behaviour, isolation, 404 vs 403, session separation); mark honestly what was NOT RUN. Do not edit other docs (no README/report).
5. Regenerate evidence and screenshots (add a signup screenshot if the screenshot spec supports it). Use scripts/check-all.sh for every verification run (not bare make); fresh DBs only via temp dirs. File any defect in docs/defects.md and report it; do not edit production code.
Allowed writes: backend/tests/integration/**, frontend/tests/**, e2e/**, docs/test-report.md, docs/defects.md, docs/evidence/test-runs/**, docs/evidence/screenshots/**, appends to docs/agent-handoffs.md and docs/evidence/development-log.md, rows CR2-T (and verification note on CR2-B/CR2-F rows: you may mark them VERIFIED with evidence) in docs/tasks.md. frontend/tsconfig.app.json has a pre-existing unrelated change; ignore it.
Finish with a handoff block with exact commands, exit codes and evidence file paths.
```
