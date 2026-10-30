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
- **Failing test:** to be added
- **Fix attempts:** 0 / 3
- **Status:** OPEN
- **Verification evidence:** none yet

### DEF-002 - Test credentials are committed constants, not generated at run time

- **Found by / date:** testing agent, A-06 review, 2026-10-30
- **Severity:** minor
- **Owner:** testing (`backend/tests/integration/conftest.py:16-17`) and backend (`backend/tests/conftest.py:38-39`)
- **Requirement / contract reference:** review checklist item 3 ("no real credentials in tests (generated at run time)")
- **Reproduction:** `grep -nE "PASSWORD =|USERNAME =" backend/tests/conftest.py backend/tests/integration/conftest.py`
- **Expected:** passwords generated per run (e.g. `secrets.token_urlsafe`).
- **Actual:** `PASSWORD = "integration-pass-123"`, `TEST_PASSWORD = "correct-horse-battery"` (throwaway values, not real credentials).
- **Failing test:** not applicable
- **Fix attempts:** 0 / 3
- **Status:** OPEN
- **Verification evidence:** none yet
