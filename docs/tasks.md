# Task board

Current phase: 2 complete (HC2 passed 2026-10-30). Current stage: none; Stage B (backend) and Stage E (frontend) may start.

States: `TODO` -> `IN_PROGRESS` -> `BLOCKED` | `COMPLETED` -> `VERIFIED`. `COMPLETED` = owner finished with evidence; `VERIFIED` = an agent that did not implement the task re-ran the check and saved the output. Update only your own rows; append evidence links. Human checkpoints: HC1 plan (done), HC2 infra, HC3 auth review, HC4 E2E pass, HC5 report review, HC6 publish.

## Phase 2 - infrastructure (Setup agent, built-in Agent Mode)

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| INF-01 | Preflight: versions, git state, settings | Setup | HC1 | COMPLETED | docs/evidence/development-log.md (python 3.12.12 via uv, node 22.23.4 via nvm) |
| INF-02 | Master plan, skeleton, .gitignore, .env.example, Makefile, README stub | Setup | INF-01 | COMPLETED | validate-infra: structure checks |
| INF-03 | Instructions (global + 4 path files) | Setup | INF-02 | COMPLETED | validate-infra: instruction checks |
| INF-04 | 6 custom skills | Setup | INF-02 | COMPLETED | validate-infra: skill checks |
| INF-05 | Install, audit and relocate 4 external skills | Setup | INF-04 | COMPLETED | skills-lock.json; review notes in development-log.md |
| INF-06 | 5 custom agents | Setup | INF-03, INF-05 | COMPLETED | validate-infra: agent checks (Chat diagnostics pending, human) |
| INF-07 | 12 prompt files | Setup | INF-06 | COMPLETED | validate-infra: prompt checks |
| INF-08 | Hooks, scripts, fixtures | Setup | INF-02 | COMPLETED | 33/33 hook fixture cases pass (docs/evidence/test-runs/infra.txt) |
| INF-09 | Seed docs (tasks, decisions, architecture, contract v1, handoffs, evidence) | Setup | INF-02 | COMPLETED | validate-infra: docs checks |
| INF-10 | CI workflow and scripts | Setup | INF-02 | COMPLETED | .github/workflows/ci.yml, scripts/*; YAML not executed on GitHub (not run) |
| INF-11 | Run validate-infra; human checks Chat diagnostics; optional local commit (HC2) | Setup + human | INF-01..10 | COMPLETED | validate-infra exit 0 after formatter edits (docs/evidence/test-runs/infra.txt); user approved HC2 and the local commit; `chat.useHooks` enabled; Chat diagnostics UI not opened by an agent (loaded agents/skills/instructions confirmed from VS Code's customization listing) |

## Phase 3 - application

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| B-01 | Backend scaffold, config, init_db, health, error envelope, pytest fixtures | backend | INF-11 | VERIFIED | Orchestrator re-ran lint/test/ownership: all exit 0 (7 passed). Owner evidence: `make lint-backend` exit 0; `make test-backend` exit 0 (7 passed); `scripts/check-ownership.sh backend` exit 0; handoff B-01 in docs/agent-handoffs.md |
| B-02 | Models users/sessions/expenses with constraints | backend | B-01 | VERIFIED | Orchestrator re-ran lint/test/ownership: all exit 0 (24 passed). Owner evidence: `make lint-backend` exit 0; `make test-backend` exit 0 (24 passed); `scripts/check-ownership.sh backend` exit 0; handoff B-02 in docs/agent-handoffs.md |
| A-01 | Provisioning CLI (create-user) | backend | B-02 | COMPLETED | `python -m app.cli create-user` (env/prompt, idempotent, `--reset-password`); tests in backend/tests/unit/test_auth.py |
| A-02 | Hashing and session services | backend | B-02 | COMPLETED | core/security.py (Argon2id, SHA-256 token) and services/auth.py; unit tests |
| A-03 | Auth routes, require_auth, Origin middleware | backend | A-01, A-02 | COMPLETED | api/auth.py, core/deps.py, core/origin.py; unit tests |
| A-04 | Route guard test and auth unit tests | backend | A-03 | COMPLETED | route guard test (via OpenAPI paths) + 20 auth tests; `make lint-backend` exit 0; `make test-backend` exit 0 (47 passed); `scripts/check-ownership.sh backend` exit 0; handoff A-01..A-04 |
| A-05 | Black-box auth integration tests | testing | A-03 | TODO | |
| A-06 | Auth security review (HC3) | testing | A-05 | TODO | |
| X-01 | Expense schemas and money handling | backend | A-06 | TODO | |
| X-02 | Expense service and CRUD routes | backend | X-01 | TODO | |
| X-03 | Filters, sorting, pagination | backend | X-02 | TODO | |
| X-04 | Dashboard service/route and categories | backend | X-02 | TODO | |
| X-05 | Publish contract updates | backend | X-04 | TODO | |
| X-06 | Expense and dashboard integration tests | testing | X-05 | TODO | |
| F-01 | Frontend scaffold (Vite react-ts strict, ESLint, Vitest, RTL, MSW, proxy) | frontend | INF-11 | TODO | |
| F-02 | API client, AuthContext, ProtectedRoute, login page | frontend | F-01 | TODO | |
| F-03 | Layout, navigation, logout, global 401 handling | frontend | F-02 | TODO | |
| F-04 | Expense list, filters, sort, pagination | frontend | F-03 | TODO | |
| F-05 | Create/edit forms, validation, delete confirmation, toasts | frontend | F-04 | TODO | |
| F-06 | Dashboard page and SVG chart | frontend | F-03 | TODO | |
| I-01 | Integration run and checklist | orchestrator | X-06, F-06 | TODO | |

## Phase 4 - testing

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| T-01 | E2E scaffold (runtime credentials, temp DB, server helper) | testing | I-01 | TODO | |
| T-02 | 16-step E2E workflow | testing | T-01 | TODO | |
| T-03 | Persistence scenario (backend restart) | testing | T-01 | TODO | |
| T-04 | Frontend integration tests | testing | F-06 | TODO | |
| T-05 | Screenshot capture (>= 2 real PNGs) | testing | T-02 | TODO | |
| T-06 | Full validation and test report (HC4) | orchestrator + testing | T-02..T-05 | TODO | |
| D-nn | Defect fixes (tracked in docs/defects.md) | owners | T-06 | TODO | |

## Phase 5 - documentation

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| DOC-01 | Compile and verify evidence | documentation | HC4 | TODO | |
| DOC-02 | Finalise architecture.md and README | documentation | DOC-01 | TODO | |
| DOC-03 | Draft final report | documentation | DOC-01 | TODO | |
| DOC-04 | Assignment compliance matrix | documentation | DOC-03 | TODO | |
| DOC-05 | Final audit (HC5) | orchestrator | DOC-04 | TODO | |
| DOC-06 | Human publishes: GitHub push, Drive upload and sharing (HC6) | human | DOC-05 | TODO | |
