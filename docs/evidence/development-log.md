# Development log (append-only)

Template: `.github/skills/ai-dev-evidence/log-entry-template.md`. Only record what actually happened.

## 2026-10-30 - Planning (Phase 1)

- **Module:** Planning
- **Agent / AI tool (model):** GitHub Copilot Plan Mode in VS Code (model: not recorded)
- **Technical objective:** Produce an actionable plan for an autonomous multi-agent development environment for the Expense Tracker.
- **Reasoning / approach:** Read `project_assignment.md` and `plan.prompt.md`; fetched current VS Code and GitHub docs for custom agents, skills, prompt files, hooks and MCP, and skills.sh pages for candidate skills; compared session-cookie and JWT authentication; asked the user three clarification questions (Local harness, MCP, skill install location).
- **Key prompt:** see `docs/evidence/prompts.md` (2026-10-30 Planning).
- **Files created/changed:** none during planning (Plan mode is read-only); the plan was later stored as `docs/plan/master-plan.md`.
- **Testing:** n/a.
- **Challenge:** CHAL-01 - the plan assumed Python >= 3.12 and Node >= 22.20, but they could not be checked in Plan mode. Resolved in Phase 2 preflight (below).

## 2026-10-30 - Infrastructure setup (Phase 2)

- **Module:** Infrastructure
- **Agent / AI tool (model):** GitHub Copilot Agent Mode (Local harness) acting as the Infrastructure Setup Agent (model: not recorded)
- **Technical objective:** Create the AI development infrastructure under `.github/` (instructions, skills, agents, prompts, hooks, CI) plus docs seeds, Makefile and scripts, without any application code.
- **Reasoning / approach:** Followed tasks INF-01..INF-11 of the approved plan in order.
- **Preflight (INF-01), actual results:** git repo on `main` with no commits; system Python 3.10.12 (below 3.12), Node 22.13.1 (below 22.20), npm 10.9.2, GNU Make 4.3, `uv` and `jq` present. The user approved installing Python 3.12 through `uv python install 3.12` (result: Python 3.12.12) and `nvm install 22` (result: Node v22.23.4, npm 10.9.9).
- **CHAL-01 resolution:** toolchain upgrade above; `scripts/check-env.sh` now verifies it.
- **External skills (INF-05):** installed with `npx skills add <url> --skill <name> -a github-copilot --copy -y` (telemetry disabled) into `.agents/skills/`; reviewed: only markdown files plus one `metadata.json`, no executable scripts, no prompt-injection phrases found by grep; moved to `.github/skills/`; `.agents/` removed; `skills-lock.json` kept.
- **Hooks (INF-08):** Node scripts tested with 33 fixture events (see `docs/evidence/test-runs/infra.txt`).
- **Not verified:** whether Local accepts comma-separated `applyTo`, the tool aliases in agent front matter, and whether agent-scoped `PreToolUse` hooks fire; to be observed in Chat diagnostics and the first delegated task.
- **Note on `docs/plan/master-plan.md`:** it is a condensed copy of the approved plan, not a verbatim copy; the full text is in the Phase 1 chat transcript.

## 2026-10-30 - HC2 and first commit (Phase 2 close)

- **Module:** Infrastructure
- **Agent / AI tool (model):** GitHub Copilot Agent Mode (Local harness), model: not recorded
- **What happened:** The user answered the HC2 questions: enable `chat.useHooks` (done in user settings.json), check Copilot diagnostics (the agent cannot open the diagnostics view; it confirmed from VS Code's customization listing that 5 agents, 4 path instruction files and 10 skills are loaded; prompts and hooks are not in that listing and are not verified in the UI), approve a local commit, and asked whether the agent can create the GitHub repository.
- **CHAL-02:** VS Code's user settings (`files.trimTrailingWhitespace`, `files.insertFinalNewline`, `files.trimFinalNewlines`) reformatted 13 infrastructure files after they were created. Resolved by re-running `scripts/validate-infra.sh` (exit 0, 33/33 hook cases) to confirm nothing broke.
- **CHAL-03:** `gh` (GitHub CLI) is not installed and installing it needs sudo, so the agent cannot create the GitHub repository; the human creates it and pushes (the safety hook also blocks agent `git push` by design).
- **CHAL-04:** the first `git push` over HTTPS failed ("No credential store has been selected", then "Password authentication is not supported"). Resolved by switching `origin` to the SSH alias from `~/.ssh/config` (`git@GitHub:...`); `ssh -T GitHub` authenticated. The human ran the push; `git ls-remote origin` then showed `refs/heads/main` at commit 215fb2e, equal to the local HEAD.
- **Repository (provided by the human):** https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker

## 2026-10-30 - B-01 backend scaffold (Phase 3, Stage B)

- **Module:** Backend
- **Agent / AI tool (model):** GitHub Copilot backend agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Scaffold FastAPI app, config, SQLAlchemy engine/init_db, health route, error envelope and isolated pytest fixtures.
- **Reasoning / approach:** app factory taking `Settings` so tests inject a temp SQLite file; error handlers strip validation input to avoid echoing secrets; versions pinned to those `uv` resolved at setup.
- **Files created/changed:** see handoff B-01 in `docs/agent-handoffs.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (7 passed, 1 deprecation warning); `scripts/check-ownership.sh backend` exit 0.
- **Challenge:** none blocking; Starlette warns that TestClient with `httpx` is deprecated (left as is).

## 2026-10-30 - B-02 database models (Phase 3, Stage B)

- **Module:** Database and persistence
- **Agent / AI tool (model):** GitHub Copilot backend agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Models for users, sessions and expenses with DB-level constraints, created through `init_db`.
- **Reasoning / approach:** constraints in the schema (CHECK amount > 0, category enum, single-user id, unique username, session FK) so they hold regardless of service code; tests assert `IntegrityError` on a temp SQLite file.
- **Files created/changed:** see handoff B-02 in `docs/agent-handoffs.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (24 passed); `scripts/check-ownership.sh backend` exit 0.
- **Challenge:** first run failed: ruff UP042 (use `StrEnum`) and a test that committed a session in the same flush as its user, which SQLAlchemy ordered wrongly without a relationship; fixed by committing the user first.

## 2026-10-30 - A-01..A-04 authentication (Phase 3, Stage C)

- **Module:** Authentication and security
- **Agent / AI tool (model):** GitHub Copilot backend agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Provisioning CLI, Argon2id hashing, hashed server-side sessions, login/logout/me, `require_auth`, Origin check, route guard test.
- **Reasoning / approach:** follow ADR-002 unchanged; only SHA-256 of the token is stored; identical 401 for unknown user and wrong password via dummy-hash verification; injectable clock for expiry tests.
- **Files created/changed:** see handoff A-01..A-04 in `docs/agent-handoffs.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (47 passed); `scripts/check-ownership.sh backend` exit 0.
- **Challenge:** the route guard test first iterated `app.routes`, which in this FastAPI version contains opaque included-router objects; switched to enumerating OpenAPI paths.

## 2026-10-30 - A-05 black-box auth integration tests (Phase 4)

- **Module:** Testing / authentication
- **Agent / AI tool (model):** GitHub Copilot testing agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** HTTP-only integration tests for login, cookie flags, wrong credentials, validation, protected routes, logout, expiry, Origin check and secret leakage.
- **Reasoning / approach:** scenarios derived from `docs/api-contract.md` and the testing instructions; user provisioned via the real CLI; temp SQLite per test; injected clock for expiry.
- **Files created/changed:** see handoff A-05 in `docs/agent-handoffs.md`.
- **Testing:** `scripts/check-all.sh` exit 0, 102 passed (55 new), output in `docs/evidence/test-runs/check-20261030T161629Z.txt`; `scripts/check-ownership.sh testing` exit 0.
- **Challenge:** no defects found; first run was green, so the tests were not shown to fail against a broken implementation.

## 2026-10-30 - A-06 authentication security review (Phase 4, HC3 input)

- **Module:** Testing / authentication review
- **Agent / AI tool (model):** GitHub Copilot testing agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** go through the 15-item auth review checklist with evidence.
- **Reasoning / approach:** read ADR-002, contract, `backend/app/**` and tests; mapped each item to code references and test names; re-ran lint and tests.
- **Files created/changed:** `docs/test-report.md`, `docs/defects.md`, `docs/tasks.md`, handoff A-06.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (102 passed); `scripts/check-all.sh` exit 0, output in `docs/evidence/test-runs/check-20261030T161944Z.txt`; `scripts/check-ownership.sh testing` exit 0.
- **Challenge:** frontend items could not be reviewed (no frontend); two minor defects filed (DEF-001, DEF-002).

## 2026-10-30 - Fix DEF-001 and backend half of DEF-002

- **Module:** Backend / provisioning CLI and test fixtures
- **Agent / AI tool (model):** GitHub Copilot backend agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** make `create-user` read INITIAL_* from the repo-root `.env` (process env wins) and generate the unit-test password per run.
- **Reasoning / approach:** `dotenv_values` fallback in the CLI; per-run `secrets.token_urlsafe` password in `backend/tests/conftest.py`.
- **Files created/changed:** `backend/app/cli.py`, `backend/tests/conftest.py`, `backend/tests/unit/test_auth.py`, handoff DEF-001/DEF-002.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (103 passed); `scripts/check-ownership.sh backend` exit 0.
- **Challenge:** `conftest` is imported under two module names, so a plain `secrets` constant differed between fixtures and tests (3 failures, 401 on login); fixed by sharing the value through an environment variable. A pre-existing broken route-guard test (`_IncludedRouter` has no `path`) was reverted to the HEAD version.

## 2026-10-30 - DEF-001 / DEF-002 verification (testing)

- **Module:** Testing / auth defects
- **Agent / AI tool (model):** GitHub Copilot testing agent
- **Technical objective:** finish DEF-002 testing half and independently verify DEF-001.
- **Files created/changed:** `backend/tests/integration/conftest.py`, `backend/tests/integration/test_auth_http.py`, `docs/defects.md`, handoff.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (104 passed); `scripts/check-all.sh` exit 0, `docs/evidence/test-runs/check-20261030T163842Z.txt`; `scripts/check-ownership.sh testing` exit 1 (backend-owned uncommitted files only).
- **Challenge:** `ENV_FILE` is fixed to the repo root, so the black-box test copies `app/` to a temp layout instead of touching the real `.env`.

## 2026-10-30 - Stage D expense backend (X-01..X-05)

- **Module:** Backend / expenses, dashboard, categories
- **Agent / AI tool (model):** GitHub Copilot backend agent (model: Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** expense CRUD with integer-cent money, filters/sort/pagination, dashboard summary, categories, contract update.
- **Files created/changed:** `backend/app/schemas/expense.py`, `backend/app/services/expenses.py`, `backend/app/api/expenses.py`, `backend/app/main.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0.
- **Challenge:** first lint run failed on line length (E501) and two summary tests got 401 because the fake clock jump expired the test session (TTL is clock-based); fixed by logging in again after moving the clock.

## 2026-10-30 - X-06 expense/dashboard integration tests

- **Module:** Testing / backend integration
- **Agent / AI tool (model):** GitHub Copilot testing agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** black-box HTTP tests for expenses, filters, categories, dashboard, auth guard.
- **Files created/changed:** `backend/tests/integration/test_expenses_http.py`, `docs/defects.md` (DEF-003), `docs/test-report.md`, `docs/tasks.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (283 passed, 2 xfailed); `scripts/check-all.sh` exit 0, `docs/evidence/test-runs/check-20261030T165536Z.txt`; `scripts/check-ownership.sh testing` exit 0.
- **Challenge:** padded amount strings were accepted against the contract (DEF-003); one of my own expected sums was wrong and was corrected.

## 2026-10-30 - DEF-003 padded amount strings

- **Module:** Backend / validation
- **Agent / AI tool (model):** GitHub Copilot backend agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** reject amount strings with leading/trailing whitespace with 422 per the contract.
- **Files created/changed:** `backend/app/schemas/expense.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 2 (2 failed, 289 passed; failures are the two expected strict-xfail XPASS in integration); `scripts/check-ownership.sh backend` exit 1 (only pre-existing testing-agent changes listed).
- **Challenge:** the explicit `.strip()` in the before-validator, not `str_strip_whitespace`, caused the acceptance.

## 2026-10-30 - DEF-003 regression verification

- **Module:** Testing / backend integration
- **Agent / AI tool (model):** GitHub Copilot testing agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** remove xfail markers after the backend fix and re-verify X-01.
- **Files created/changed:** `backend/tests/integration/test_expenses_http.py`, `docs/defects.md`, `docs/tasks.md`.
- **Testing:** `make lint-backend` exit 0; `make test-backend` exit 0 (291 passed); `scripts/check-all.sh` exit 0, `docs/evidence/test-runs/check-20261030T170746Z.txt`; `scripts/check-ownership.sh testing` exit 1 (only uncommitted backend-agent files listed).
- **Challenge:** ownership check cannot go green until backend changes are committed.

## 2026-10-30 - F-01/F-02 frontend scaffold and authentication

- **Module:** Frontend / scaffold and auth
- **Agent / AI tool (model):** GitHub Copilot frontend agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Vite react-ts strict scaffold with ESLint, Vitest, RTL, MSW and proxy; typed API client, AuthContext, ProtectedRoute and accessible login page with tests.
- **Files created/changed:** `frontend/**` (config, `src/api`, `src/auth`, `src/components`, `src/pages`, `src/test`), `docs/tasks.md`.
- **Testing:** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (20 passed); `scripts/check-ownership.sh frontend` exit 0. Not run: browser, E2E.
- **Challenge:** Node's `fetch` rejects relative URLs under jsdom, so `src/test/setup.ts` resolves `/api/...` against the jsdom location; `npm audit` flags dev-only vitest dependencies (left unchanged).

## 2026-10-30 - F-03/F-04 layout, logout, 401 handling and expense list

- **Module:** Frontend / layout and expense list
- **Agent / AI tool (model):** GitHub Copilot frontend agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Layout with navigation and logout; 401 redirect through the existing client hook; expense list with category/date filters, sort and pagination using decimal-string money; MSW list handler following the contract.
- **Files created/changed:** `frontend/src/{components/Layout,pages/ExpensesPage,api/expenses,lib/money}.ts(x)`, `frontend/src/api/types.ts`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/test/handlers.ts`, colocated tests, `docs/tasks.md` (F-03, F-04 rows).
- **Testing:** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (6 files, 33 passed); `scripts/check-ownership.sh frontend` exit 0. Not run: browser, E2E, 360 px visual check.
- **Challenge:** the app-level "Loading…" status of `ProtectedRoute` matched the first test query; the test now waits for the page's own loading text.

## 2026-10-30 - F-05/F-06 expense forms, delete confirmation, toasts and dashboard

- **Module:** Frontend / forms, dialogs, dashboard
- **Agent / AI tool (model):** GitHub Copilot frontend agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Create/edit expense forms with client validation mirroring the contract, accessible delete confirmation and toasts, New/Edit/Delete controls on the list, and a dashboard with a plain SVG category chart; MSW handlers per contract.
- **Files created/changed:** `frontend/src/pages/{ExpenseFormPage,DashboardPage,ExpensesPage}.tsx`, `frontend/src/components/{ConfirmDialog,ToastProvider,Layout}.tsx` (+ `toastContext.ts`, `useToast.ts`), `frontend/src/{lib/money.ts,api/*,App.tsx,index.css,test/handlers.ts}`, colocated tests, `docs/tasks.md` (F-05, F-06 rows).
- **Testing:** `make lint-frontend` exit 0; `make typecheck-frontend` exit 0; `make test-frontend` exit 0 (8 files, 55 passed); `scripts/check-ownership.sh frontend` exit 0. Not run: browser, E2E, 360 px visual check.
- **Challenge:** the first test run had 14 failures: form tests asserted before the form finished loading (the heading renders during loading) and old tests expected the placeholder home heading; tests now wait for the Amount field and the new "Dashboard" heading.

## 2026-11-01 - I-01 integration run evidence recording (I-01)

- **Module:** Testing and integration
- **Agent / AI tool (model):** GitHub Copilot testing agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Record the orchestrator's real HTTP checks (Vite proxy -> FastAPI) as an integration checklist.
- **Implementation steps:** grepped the raw outputs for secrets (only field names matched), copied them to test-runs, wrote the checklist table in `docs/test-report.md`; no servers were run by this agent.
- **Key prompt:** none
- **Files created/changed:** `docs/evidence/test-runs/i01-http-checks.txt`, `docs/evidence/test-runs/i01-persistence.txt`, `docs/test-report.md`, `docs/evidence/development-log.md`.
- **Testing strategy and actual results:** orchestrator-run `scripts/check-all.sh` exit 0 (backend 291 passed, frontend 55 passed, `docs/evidence/test-runs/check-20261101T001953Z.txt`); live HTTP checks all as expected. Browser-level checks: not run.
- **Challenge (CHAL-nn):** none; the persistence output summary line is truncated and create status codes were not captured, noted in the report.
- **Solution applied:** n/a

## 2026-11-01 - E2E scaffold, workflow, persistence, flow tests, screenshots, review (T-01..T-05)

- **Module:** Testing layer
- **Agent / AI tool (model):** GitHub Copilot testing agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** Real-browser coverage of the 16-step workflow and a backend-restart persistence scenario, frontend flow tests, real screenshots, and a read-only architecture review.
- **Implementation steps:** created `e2e/` (Playwright, global setup starting uvicorn and Vite against a temp SQLite file, run-time generated password), three specs, `frontend/tests/flows.test.tsx` (MSW), ran `scripts/check-all.sh --e2e` three times, inspected the screenshots, wrote the report and defects.
- **Key prompt:** none recorded verbatim (task assignment for T-01..T-05 plus review).
- **Files created/changed:** `e2e/**`, `frontend/tests/flows.test.tsx`, `backend/tests/integration/test_auth_http.py` (one test made hermetic), `docs/evidence/screenshots/*.png`, `docs/evidence/test-runs/check-20261101T004130Z.txt`, `...T004540Z.txt`, `...T005014Z.txt`, `docs/test-report.md`, `docs/defects.md`, `docs/tasks.md`, `docs/agent-handoffs.md`.
- **Testing strategy and actual results:** final `scripts/check-all.sh --e2e` exit 0: backend 291 passed, frontend 62 passed, E2E 3 passed. Earlier runs exit 2 (see challenges).
- **Challenge (CHAL-nn):** (1) first run failed: an integration test depended on the developer's root `.env` (DEF-005); (2) second run failed on a race in my new frontend flow test; (3) first screenshots had a toast covering the table.
- **Solution applied:** (1) run that CLI test in a scratch repo layout; (2) wait for the list heading and use cell roles; (3) wait for the toast to disappear before capturing.

## 2026-11-01 - Documentation (DOC-01..DOC-04)

- **Module:** Documentation
- **Agent / AI tool (model):** GitHub Copilot documentation agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** inventory evidence, finalise architecture and README, write the final report and the assignment compliance matrix.
- **Key prompt:** `.github/prompts/generate-exam-documentation.prompt.md` ("Execute DOC-01..DOC-04.").
- **Files created/changed:** `README.md`, `docs/architecture.md`, `docs/report/final-report.md`, `docs/assignment-evidence.md`.
- **Testing:** `make check-env` exit 2 (Node 22.13.1 below 22.20 in this shell, nvm not active); no other command re-run (counts quoted from `docs/evidence/test-runs/check-20261101T005613Z.txt`, exit 0).
- **Challenge:** key prompts for the build modules were never recorded verbatim; listed as a gap, not invented.

## 2026-11-01 - CR2-B multi-user backend

- **Module:** Backend API / Authentication
- **Agent / AI tool (model):** GitHub Copilot backend agent (Claude Sonnet 5.5 as stated by the session)
- **Technical objective:** open sign-up (`POST /api/auth/register`), case-insensitive unique usernames, per-user scoping of expenses and dashboard (ADR-011).
- **Key prompt:** "Task CR2-B (change request CR-002, ADR-011 ...) Implement multi-user with open sign-up and per-user data, nothing else" (full text in `docs/evidence/prompt-log.jsonl`).
- **Files created/changed:** see handoff CR2-B.
- **Testing:** `make lint-backend` exit 0; `pytest tests/unit` 140 passed; `make test-backend` 321 passed, 1 failed (integration route-guard allow-list lacks register).
- **Challenge:** a functional unique index on `lower(username)` must be declared after the class (column reference, not a string).

### CR2-F - frontend sign-up (2026-11-01)
- **Technical objective:** `/signup` page, login/sign-up links, auto-login after register, username in header (ADR-011).
- **Key prompt:** "Task CR2-F (change request CR-002, ADR-011 ...) /signup page ... nothing else" (full text in `docs/evidence/prompt-log.jsonl`).
- **Files created/changed:** see handoff CR2-F.
- **Testing:** `make lint` exit 0; `make typecheck` exit 0; `make test-frontend` exit 0, 70 passed.
- **Challenge:** `safeNext` was private to LoginPage; extracted to `lib/redirect.ts` so both pages share it.

### CR2-T - multi-user verification (2026-11-01)
- **Technical objective:** independent black-box tests for sign-up and per-user isolation, two-user E2E, auth review update (ADR-011).
- **Key prompt:** "Task CR2-T (change request CR-002, ADR-011 ...) Verify CR2-B and CR2-F independently" (verbatim text not copied here; see `docs/evidence/prompt-log.jsonl` if logged).
- **Files created/changed:** see handoff CR2-T.
- **Testing:** integration subset exit 0, 123 passed; `scripts/check-all.sh --e2e` exit 2 (backend 389 passed, frontend 70 passed, E2E not started): `docs/evidence/test-runs/check-20261101T021658Z.txt`.
- **Challenge:** E2E uses fixed ports 8000/5173 and refuses to start while the developer's dev servers run; I did not stop them, so E2E and screenshots remain NOT RUN. First full run also failed on `ruff format` of my own new test.

## 2026-11-01 - UI redesign and submission document preparation (before running the agents)

- **Module:** Frontend / Documentation
- **Agent / AI tool (model):** GitHub Copilot Agent Mode (Local harness), model: not recorded
- **What happened:** The human asked for two more tasks: a UI redesign in the style of a Notion expenses template using the `premium-frontend-ui` skill, and a final Google Drive document. Before writing the prompts the agent read the skill's SKILL.md, the template page and the GitDiagram and GitIngest pages. Findings: the skill is aimed at immersive landing pages and does not fit an expense app (ADR-012); the Notion page exposed only its text, not colours or fonts; GitDiagram returned a usable Mermaid architecture diagram for the repository; GitIngest returned no readable content to the fetch tool; LibreOffice is installed, python-docx is not.
- **Files created:** `docs/design/ui-style-guide.md`, `docs/submission/brief.md`, `.github/prompts/refine-ui.prompt.md`, `.github/prompts/create-final-document.prompt.md`; ownership guard extended for the root submission file; tasks UI-01..UI-05 and SUB-01..SUB-03; ADR-012 and ADR-013.
- **Testing:** `scripts/validate-infra.sh` after the change (see `docs/evidence/test-runs/infra.txt`). The two new prompts have not been run yet.

## 2026-11-01 - UI reference screenshot added

- **Module:** Frontend / design
- **What happened:** the human added `docs/design/reference/image.png`. The agent viewed it and rewrote `docs/design/ui-style-guide.md` around what it shows (dark theme, cover banner, two columns, view tabs, table with tag pills, "Total Expenses" card). Hex values are approximated by eye from the screenshot and Notion's dark palette; the redesign agent must compare screenshots side by side. The image is git-ignored because it is a third-party screenshot.
- **Challenge (CHAL-05):** the first style guide was written from the template's page text only and assumed a light theme; the real reference was dark. Resolved by revising the guide before any UI code was changed.
