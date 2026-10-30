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
