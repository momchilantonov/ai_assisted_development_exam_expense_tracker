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
