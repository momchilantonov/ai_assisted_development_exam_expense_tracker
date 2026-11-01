# Task board

Current phase: 3 (application). HC2 and HC3 passed 2026-10-30; HC4 approved 2026-11-01. Current stage: F complete (T-01..T-05 VERIFIED, T-06 COMPLETED); next: documentation (Phase 5).

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
| A-01 | Provisioning CLI (create-user) | backend | B-02 | VERIFIED | `python -m app.cli create-user` (env/prompt, idempotent, `--reset-password`); tests in backend/tests/unit/test_auth.py. Verified by testing agent in A-06 review (docs/test-report.md, docs/evidence/test-runs/check-20261030T161944Z.txt); minor DEF-001 open |
| A-02 | Hashing and session services | backend | B-02 | VERIFIED | core/security.py (Argon2id, SHA-256 token) and services/auth.py; unit tests. Verified by testing agent in A-06 review (check-20261030T161944Z.txt) |
| A-03 | Auth routes, require_auth, Origin middleware | backend | A-01, A-02 | VERIFIED | api/auth.py, core/deps.py, core/origin.py; unit tests. Verified by testing agent in A-06 review (check-20261030T161944Z.txt) |
| A-04 | Route guard test and auth unit tests | backend | A-03 | VERIFIED | Verified by testing agent in A-06 review (check-20261030T161944Z.txt, 102 passed). route guard test (via OpenAPI paths) + 20 auth tests; `make lint-backend` exit 0; `make test-backend` exit 0 (47 passed); `scripts/check-ownership.sh backend` exit 0; handoff A-01..A-04 |
| A-05 | Black-box auth integration tests | testing | A-03 | VERIFIED | 55 tests in backend/tests/integration/test_auth_http.py; `scripts/check-all.sh` exit 0 (102 passed), saved docs/evidence/test-runs/check-20261030T161629Z.txt; `scripts/check-ownership.sh testing` exit 0; no defects; orchestrator re-ran scripts/check-all.sh exit 0, 102 passed (docs/evidence/test-runs/check-20261030T162205Z.txt) |
| A-06 | Auth security review (HC3) | testing | A-05 | VERIFIED | review in docs/test-report.md (12 PASS, 1 FAIL minor, 2 NOT RUN frontend; DEF-001, DEF-002 minor); `make lint-backend` exit 0; `make test-backend` exit 0 (102 passed); `scripts/check-all.sh` exit 0, docs/evidence/test-runs/check-20261030T161944Z.txt; `scripts/check-ownership.sh testing` exit 0; orchestrator re-ran check-all exit 0 after DEF-001/002 fixes; HC3 approved 2026-10-30 |
| X-01 | Expense schemas and money handling | backend | A-06 | VERIFIED | `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0; tests in backend/tests/unit/test_expenses.py; handoff X-01..X-05; verified by testing agent after DEF-003 fix: `make test-backend` exit 0 (291 passed), `scripts/check-all.sh` exit 0, docs/evidence/test-runs/check-20261030T170746Z.txt |
| X-02 | Expense service and CRUD routes | backend | X-01 | VERIFIED | `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0; tests in backend/tests/unit/test_expenses.py; handoff X-01..X-05; verified by testing agent: backend/tests/integration/test_expenses_http.py, 283 passed 2 xfailed, check-20261030T165536Z.txt |
| X-03 | Filters, sorting, pagination | backend | X-02 | VERIFIED | `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0; tests in backend/tests/unit/test_expenses.py; handoff X-01..X-05; verified by testing agent: backend/tests/integration/test_expenses_http.py, 283 passed 2 xfailed, check-20261030T165536Z.txt |
| X-04 | Dashboard service/route and categories | backend | X-02 | VERIFIED | `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0; tests in backend/tests/unit/test_expenses.py; handoff X-01..X-05; verified by testing agent: backend/tests/integration/test_expenses_http.py, 283 passed 2 xfailed, check-20261030T165536Z.txt |
| X-05 | Publish contract updates | backend | X-04 | VERIFIED | `make lint-backend` exit 0; `make test-backend` exit 0 (159 passed); `scripts/check-ownership.sh backend` exit 0; tests in backend/tests/unit/test_expenses.py; handoff X-01..X-05; verified by testing agent: backend/tests/integration/test_expenses_http.py, 283 passed 2 xfailed, check-20261030T165536Z.txt |
| X-06 | Expense and dashboard integration tests | testing | X-05 | VERIFIED | Orchestrator re-ran scripts/check-all.sh exit 0 (backend 291 passed, frontend 55 passed), docs/evidence/test-runs/check-20261101T001953Z.txt; DEF-003 VERIFIED |
| F-01 | Frontend scaffold (Vite react-ts strict, ESLint, Vitest, RTL, MSW, proxy) | frontend | INF-11 | VERIFIED | Orchestrator re-ran lint/typecheck/test (20 passed)/ownership: all exit 0; owner evidence in docs/agent-handoffs.md |
| F-02 | API client, AuthContext, ProtectedRoute, login page | frontend | F-01 | VERIFIED | Orchestrator re-ran lint/typecheck/test (20 passed)/ownership: all exit 0; owner evidence in docs/agent-handoffs.md |
| F-03 | Layout, navigation, logout, global 401 handling | frontend | F-02 | VERIFIED | Orchestrator re-ran lint/typecheck/test (33 passed)/ownership: all exit 0; handoff F-03/F-04 |
| F-04 | Expense list, filters, sort, pagination | frontend | F-03 | VERIFIED | Orchestrator re-ran lint/typecheck/test (33 passed)/ownership: all exit 0; handoff F-03/F-04 |
| F-05 | Create/edit forms, validation, delete confirmation, toasts | frontend | F-04 | VERIFIED | Orchestrator re-ran lint/typecheck/test (55 passed)/ownership: all exit 0; owner: handoff F-05/F-06 |
| F-06 | Dashboard page and SVG chart | frontend | F-03 | VERIFIED | Orchestrator re-ran lint/typecheck/test (55 passed)/ownership: all exit 0; owner: handoff F-05/F-06 |
| I-01 | Integration run and checklist | orchestrator | X-06, F-06 | COMPLETED | Real HTTP checks via Vite proxy, 22 PASS: docs/evidence/test-runs/i01-http-checks.txt, i01-persistence.txt; checklist in docs/test-report.md; browser UI checks NOT RUN (covered by T-01..T-03); no defects found |

## Change request CR-002 - multi-user (ADR-011)

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| CR2-B | Backend: register endpoint, per-user scoping, contract, unit tests | backend | ADR-011 | VERIFIED | testing agent: integration 123 passed (registration, isolation), check-all backend 389 passed: docs/evidence/test-runs/check-20261101T021658Z.txt |
| CR2-F | Frontend: /signup page, links, username in header, component tests | frontend | CR2-B | VERIFIED | handoff CR2-F; orchestrator re-ran `scripts/check-all.sh --e2e` exit 0 (frontend 70 passed, E2E 4 passed incl. multi-user.spec.ts): docs/evidence/test-runs/check-20261101T103505Z.txt |
| CR2-T | Integration tests, two-user E2E, security review, evidence, screenshots | testing | CR2-F | VERIFIED | handoff CR2-T; orchestrator re-ran `scripts/check-all.sh --e2e` exit 0 (backend 389 passed in 302 s, frontend 70, E2E 4 passed), screenshots incl. signup.png regenerated: docs/evidence/test-runs/check-20261101T103505Z.txt |

## Phase 4 - testing

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| T-01 | E2E scaffold (runtime credentials, temp DB, server helper) | testing | I-01 | VERIFIED | e2e/ (support/servers.ts); orchestrator re-ran `make validate` exit 0: docs/evidence/test-runs/check-20261101T005613Z.txt (backend 291, frontend 62, E2E 3 passed) |
| T-02 | 16-step E2E workflow | testing | T-01 | VERIFIED | workflow.spec.ts passed in orchestrator re-run check-20261101T005613Z.txt; results in docs/test-report.md |
| T-03 | Persistence scenario (backend restart) | testing | T-01 | VERIFIED | persistence.spec.ts passed in orchestrator re-run check-20261101T005613Z.txt |
| T-04 | Frontend integration tests | testing | F-06 | VERIFIED | frontend/tests/flows.test.tsx 7 passed; full frontend 62 passed in orchestrator re-run check-20261101T005613Z.txt; DEF-004 fixed and VERIFIED |
| T-05 | Screenshot capture (>= 2 real PNGs) | testing | T-02 | VERIFIED | docs/evidence/screenshots/{login,expenses,dashboard}.png (PNG verified with `file`) |
| T-06 | Full validation and test report (HC4) | orchestrator + testing | T-02..T-05 | VERIFIED | `make validate` exit 0 (docs/evidence/test-runs/check-20261101T005613Z.txt); DEF-004 VERIFIED (def-004-verify.txt); HC4 approved by human 2026-11-01 |
| D-nn | Defect fixes (tracked in docs/defects.md) | owners | T-06 | COMPLETED | No open defects at HC4 (DEF-004, DEF-005 VERIFIED) |

## Phase 5 - documentation

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| DOC-01 | Compile and verify evidence | documentation | HC4 | COMPLETED | docs/agent-handoffs.md (handoff DOC-01..DOC-04); files in docs/ and README.md |
| DOC-02 | Finalise architecture.md and README | documentation | DOC-01 | COMPLETED | docs/agent-handoffs.md (handoff DOC-01..DOC-04); files in docs/ and README.md |
| DOC-03 | Draft final report | documentation | DOC-01 | COMPLETED | docs/agent-handoffs.md (handoff DOC-01..DOC-04); files in docs/ and README.md |
| DOC-04 | Assignment compliance matrix | documentation | DOC-03 | COMPLETED | docs/agent-handoffs.md (handoff DOC-01..DOC-04); files in docs/ and README.md |
| DOC-05 | Final audit (HC5) | orchestrator | DOC-04 | COMPLETED | `make validate` exit 0, check-20261101T012350Z.txt; handoff DOC-05; tree not clean (regenerated screenshots, new test-run files) |
| DOC-06 | Human publishes: GitHub push, Drive upload and sharing (HC6) | human | DOC-05 | TODO | |

## Extra work requested after the final audit (ADR-012, ADR-013)

| ID | Task | Agent | Depends | State | Evidence |
|---|---|---|---|---|---|
| UI-01 | Design tokens, base styles and page shell per docs/design/ui-style-guide.md | frontend | CR2-T | VERIFIED | Orchestrator re-ran `scripts/check-all.sh --e2e` exit 0 (backend 389, frontend 70, E2E 4 passed): docs/evidence/test-runs/check-20261101T125323Z.txt; earlier run check-20261101T124618Z.txt failed (tag icon text), fixed |
| UI-02 | Restyle Expenses page and Dashboard (tags, icons, view tabs, cards) | frontend | UI-01 | VERIFIED | check-all --e2e exit 0: docs/evidence/test-runs/check-20261101T125323Z.txt |
| UI-03 | Restyle login, sign-up, forms, dialog, toasts, states; 360 px layout | frontend | UI-01 | VERIFIED | check-all --e2e exit 0: docs/evidence/test-runs/check-20261101T125323Z.txt |
| UI-04 | Regenerate screenshots (incl. expenses-mobile.png), 360 px no-scroll check, test report | testing | UI-02, UI-03 | VERIFIED | check-20261101T130002Z.txt (exit 0); after DEF-006 CSS fix orchestrator re-ran check-all --e2e exit 0, 5 E2E passed: check-20261101T131119Z.txt; expenses-mobile.png viewed (amount and actions visible). DEF-006 in docs/defects.md still says OPEN; testing agent to close |
| UI-05 | Update all documentation after human UI approval | documentation | UI-04 | COMPLETED | Docs updated (README, architecture, style guide section 8, assignment-evidence, final report, dev log); counts from check-20261101T145021Z.txt; no checks run by me. Orchestrator final `scripts/check-all.sh --e2e` exit 0 (backend 389, frontend 72, E2E 5 passed): docs/evidence/test-runs/check-20261101T150120Z.txt; doc content not independently reviewed, so left COMPLETED |
| SUB-01 | Collect evidence, key prompts and images (screenshots, GitDiagram, GitIngest resource) | documentation | UI-05 | COMPLETED | images, 10 prompts appended to docs/evidence/prompts.md; GitIngest not readable (stated) |
| SUB-02 | Write submission.md, build script and MCA85_ai_assisted_development_exam_expense_tracker.docx in the repository root | documentation | SUB-01 | COMPLETED | docx built in repo root with docs/submission/build_docx.py, exit 0 |
| SUB-03 | Verify (page count, headings, images, links) and hand off; human uploads to Google Drive | documentation + human | SUB-02 | COMPLETED | LibreOffice PDF 6 pages; 13 headings, 5 images, 23 links, no missing paths; human uploads to Google Drive |
