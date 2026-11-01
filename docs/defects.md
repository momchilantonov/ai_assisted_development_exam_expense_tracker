# Defects (testing agent)

Template: `.github/skills/automated-testing/defect-report-template.md`. IDs `DEF-nnn`.

---

### DEF-001 - `.env` INITIAL_* values ignored by provisioning CLI

- **Found by / date:** testing agent, A-06 review, 2026-10-30
- **Severity:** minor
- **Owner:** backend
- **Requirement / contract reference:** `.env.example` comment "Used only by `python -m app.cli create-user` (make seed-user)"; single-user-auth skill step 7
- **Reproduction:** put `INITIAL_USERNAME`/`INITIAL_PASSWORD` in the repo-root `.env`, unset them in the shell, run `make seed-user` non-interactively. Derived from code: `backend/app/cli.py` `_read_credentials` uses `os.environ` only; `Settings` has no such fields. Not executed as a command in this review.
- **Expected:** values from `.env` are used, or `.env.example` states they must be exported.
- **Actual:** per code, CLI exits 2 with "Username and password required" (already noted in handoff A-01..A-04).
- **Failing test:** `backend/tests/integration/test_auth_http.py::test_provisioning_reads_initial_credentials_from_dotenv_file` (black-box; copies `app/` into a temp repo layout with a temp `.env`); plus backend unit test `test_cli_reads_credentials_from_env_file_and_process_env_wins`
- **Fix attempts:** 1 / 3 (backend)
- **Status:** VERIFIED
- **Verification evidence:** manual scratch run (temp dir, generated throwaway password, real `.env` untouched, no INITIAL_* in shell): CLI from `git HEAD` exit 2 "Username and password required"; fixed CLI exit 0 "User created.". Suite: `docs/evidence/test-runs/check-20261030T163842Z.txt` (104 passed, exit 0). The new integration test was not run against the old CLI as a pytest run; the manual run covers before/after.

### DEF-002 - Test credentials are committed constants, not generated at run time

- **Found by / date:** testing agent, A-06 review, 2026-10-30
- **Severity:** minor
- **Owner:** testing (`backend/tests/integration/conftest.py:16-17`) and backend (`backend/tests/conftest.py:38-39`)
- **Requirement / contract reference:** review checklist item 3 ("no real credentials in tests (generated at run time)")
- **Reproduction:** `grep -nE "PASSWORD =|USERNAME =" backend/tests/conftest.py backend/tests/integration/conftest.py`
- **Expected:** passwords generated per run (e.g. `secrets.token_urlsafe`).
- **Actual:** `PASSWORD = "integration-pass-123"`, `TEST_PASSWORD = "correct-horse-battery"` (throwaway values, not real credentials).
- **Failing test:** not applicable
- **Fix attempts:** 1 / 3 (backend half by backend, testing half by testing)
- **Status:** VERIFIED
- **Verification evidence:** `grep` shows `PASSWORD`, `OTHER_PASSWORD` (integration) and `TEST_PASSWORD` (unit) use `secrets.token_urlsafe(16)`; no fixed password literals remain in `backend/tests/integration/*.py`. Suite: `docs/evidence/test-runs/check-20261030T163842Z.txt` (104 passed, exit 0). Usernames remain fixed constants (not secrets).

### DEF-003 - Amount strings with surrounding spaces are accepted

- **Found by / date:** testing agent, X-06, 2026-10-30
- **Severity:** minor
- **Owner:** backend (`backend/app/schemas/expense.py`)
- **Requirement / contract reference:** `docs/api-contract.md` header: request `amount` strings must match `\d{1,8}(\.\d{1,2})?` (no spaces)
- **Reproduction:** `POST /api/expenses` with `{"amount": " 5", "category": "Food", "expense_date": "2026-03-01"}` while logged in.
- **Expected:** 422 `validation_error`.
- **Actual:** 201 with amount `"5.00"` (observed in a `make test-backend` run on 2026-10-30).
- **Failing test:** `backend/tests/integration/test_expenses_http.py::test_amount_string_with_surrounding_spaces_is_rejected_with_422` (failed before the fix as strict-xfail XPASS; xfail marker now removed, runs as a normal test)
- **Fix attempts:** 1 / 3
- **Status:** VERIFIED
- **Verification evidence:** after the backend fix and marker removal: `make lint-backend` exit 0; `make test-backend` exit 0 (291 passed, 0 xfailed); `scripts/check-all.sh` exit 0 (291 passed), `docs/evidence/test-runs/check-20261030T170746Z.txt`. `scripts/check-ownership.sh testing` exit 1, listing only uncommitted backend-owned files (`backend/app/schemas/expense.py`, `backend/tests/unit/test_expenses.py`, `docs/api-contract.md`) changed by the backend agent for this fix.

### DEF-004 - Frontend flow tests are not type-checked

- **Found by / date:** testing agent, architecture review, 2026-11-01
- **Severity:** minor
- **Owner:** frontend (`frontend/tsconfig.app.json`)
- **Requirement / contract reference:** `.github/instructions/frontend.instructions.md` (TypeScript strict); Definition of Done (`make typecheck`)
- **Reproduction:** read `frontend/tsconfig.app.json`: `"include": ["src"]`; `frontend/tests/flows.test.tsx` is outside it, so `npm --prefix frontend run typecheck` (`tsc -b`) never checks it. Derived from configuration; not demonstrated with a deliberately wrong type.
- **Expected:** `tests/` is part of a tsconfig project.
- **Actual:** only ESLint and Vitest (no type check) see the file.
- **Failing test:** not applicable
- **Fix attempts:** 1 / 3
- **Status:** VERIFIED
- **Verification evidence:** `frontend/tsconfig.app.json` now has `"include": ["src", "tests"]`; `npm --prefix frontend run typecheck` exit 0; `tsc --listFilesOnly` lists `frontend/tests/flows.test.tsx`; a temporary `const x: number = "x"` appended to it made typecheck fail (exit 2, TS2322) and was reverted (typecheck exit 0 again). `docs/evidence/test-runs/def-004-verify.txt`.

### DEF-005 - Integration test depended on the developer's root `.env`

- **Found by / date:** testing agent, full run, 2026-11-01
- **Severity:** minor
- **Owner:** testing (`backend/tests/integration/test_auth_http.py`)
- **Requirement / contract reference:** testing instructions, Isolation ("nothing touches a real `.env`")
- **Reproduction:** with a root `.env` that sets `INITIAL_USERNAME` and `INITIAL_PASSWORD` (the CLI now reads it since the DEF-001 fix), run `make test-backend`.
- **Expected:** `test_provisioning_without_credentials_fails_and_creates_no_user` passes on any machine.
- **Actual:** `assert 0 != 0` (CLI printed "User created." because the empty env values fell back to `.env`); `1 failed, 290 passed`, `docs/evidence/test-runs/check-20261101T004130Z.txt`.
- **Failing test:** `backend/tests/integration/test_auth_http.py::test_provisioning_without_credentials_fails_and_creates_no_user`
- **Fix attempts:** 1 / 3
- **Status:** VERIFIED
- **Verification evidence:** test now runs the CLI in a scratch repo layout (no `.env`, no INITIAL_* variables); `scripts/check-all.sh --e2e` exit 0 (backend 291 passed), `docs/evidence/test-runs/check-20261101T005014Z.txt`. The test was not run against the old behaviour again after the fix beyond the failing first run above.

### DEF-006 - Amount column clipped in the Expenses table at 360 px

- **Found by / date:** testing agent, UI-04, 2026-11-01
- **Severity:** minor
- **Owner:** frontend (`frontend/src/index.css`, `ExpensesPage.tsx`)
- **Requirement / contract reference:** `docs/design/ui-style-guide.md` (360 px layout); UI-04 no-page-scroll check
- **Reproduction:** log in, open `/expenses` at 360 px width with an expense of 1,120.99 (spec `e2e/tests/mobile.spec.ts`, image `docs/evidence/screenshots/expenses-mobile.png`).
- **Expected:** amount and Actions columns reachable without losing the value.
- **Actual:** the page itself does not scroll (check passes), but the table scrolls inside its container and the Amount column is cut off ("1,120.9", "18.4", "52.0" visible); Edit/Delete are off-screen until the table is scrolled sideways. Observed in the screenshot only; the in-table scroll was not exercised by a test.
- **Failing test:** none (visual finding, the 360 px test checks page scroll only)
- **Fix attempts:** 0 / 3
- **Status:** OPEN
