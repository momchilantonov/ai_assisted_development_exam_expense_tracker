---
name: Testing conventions
description: Test organisation, isolation, auth fixtures, defect reporting and regression rules for backend, frontend and E2E tests.
applyTo: 'backend/tests/**,frontend/**/*.test.ts,frontend/**/*.test.tsx,frontend/tests/**,e2e/**'
---
# Testing conventions

## Organisation and naming
- Backend: `backend/tests/unit/` (backend agent), `backend/tests/integration/` (testing agent, black-box via HTTP only). Frontend: colocated `*.test.tsx` (frontend agent), `frontend/tests/` flow tests (testing agent). E2E: `e2e/tests/*.spec.ts`.
- Names describe behaviour: `test_<behavior>_<condition>` (Python), `it('<does X> when <Y>')` (TS).
- Design scenarios from requirements and `docs/api-contract.md`, not by reading the implementation.

## Isolation
- Every backend test uses its own temporary SQLite file; nothing touches a real `.env` or `backend/data/`. Clock is injected for expiry and month calculations. Tests must be repeatable and order-independent.
- E2E: temp database under `e2e/.tmp/`, user provisioned through `python -m app.cli create-user` with a password generated at run time (never committed or printed in reports).

## Auth fixtures
- Integration tests log in through `POST /api/auth/login` and reuse the cookie; every expense/dashboard test also has an anonymous counterpart asserting 401.
- Required auth coverage: success, wrong user, wrong password, empty credentials, missing/invalid/expired/tampered cookie, logout then reuse of old cookie, cookie flags, forged Origin 403, hash-only password storage, provisioning and repeated provisioning, route guard over every route.

## Mocking
- Backend: do not mock the database or the service layer in integration tests. Frontend: mock only the network boundary (MSW) according to the contract.

## Execution and evidence
- Run with `make test-backend`, `make test-frontend`, `make test-e2e`, or `scripts/check-all.sh [--e2e]`, which saves output to `docs/evidence/test-runs/`. Report actual exit codes and counts; never report "passes" without a run.
- Failures: write a defect in `docs/defects.md` (`defect-report` template in the `automated-testing` skill) with owner, reproduction, expected, actual. The testing agent never edits production code to make a test pass.
- Regression: every fixed defect gets a test that failed before the fix; after a fix re-run the failing test and the related suite.
