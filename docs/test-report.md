# Test report (testing agent)

## Authentication security review (A-06, HC3 input) - 2026-10-30

Scope: `backend/app/**`, `backend/tests/**`, `.env.example`, `.gitignore`, ADR-002, `docs/api-contract.md`. Checklist: `.github/skills/single-user-auth/review-checklist.md`. Read-only review; no production code changed. Frontend does not exist yet.

### Commands run (fresh)

| Command | Exit | Result |
|---|---|---|
| `make lint-backend` | 0 | ruff: "All checks passed!", 29 files already formatted |
| `make test-backend` | 0 | 102 passed, 1 warning (Starlette `httpx` deprecation), 62.59 s |
| `scripts/check-all.sh` | 0 | 102 passed, 1 warning, frontend skipped ("frontend not present"); saved to `docs/evidence/test-runs/check-20261030T161944Z.txt` |
| `scripts/check-ownership.sh testing` | 0 | "ownership OK for testing" |

mypy and E2E: not run.

### Checklist

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | No registration endpoint; one user only | PASS | Only `/api/health`, `/api/auth/{login,logout,me}` are mounted ([main.py](../backend/app/main.py)); `User` has `CheckConstraint("id = 1")` ([user.py](../backend/app/models/user.py)); `provision_user` uses `db.get(User, 1)`; tests `test_every_non_public_route_in_openapi_requires_auth`, `test_provisioning_twice_does_not_overwrite_user`, unit `test_models.py` |
| 2 | No plaintext password in DB/logs/responses; Argon2id hash | PASS | `core/security.py` uses `argon2.PasswordHasher` (Argon2id); `logger` only used for unhandled errors, no `print` of secrets (CLI prints fixed messages); validation handler drops `input`/`ctx`; tests `test_password_is_stored_only_as_hash`, `test_no_response_leaks_hash_or_password`, `test_validation_error_does_not_echo_the_password`, `test_provisioning_output_does_not_print_the_password` |
| 3 | `.env` untracked; `.env.example` placeholders; no real credentials in tests (generated at run time) | FAIL (minor) | `git ls-files` lists only `.env.example`; `.gitignore` has `.env`, `.env.*`, `!.env.example`; `INITIAL_*` empty. Test credentials are hardcoded throwaway constants (`backend/tests/integration/conftest.py:16-17`, `backend/tests/conftest.py:38-39`), not generated at run time -> DEF-002 |
| 4 | Provisioning repeatable, no overwrite without `--reset-password` | PASS | `provision_user` returns `exists` without changes; reset also deletes all sessions; tests `test_provisioning_twice_does_not_overwrite_user`, `test_reset_password_replaces_the_credentials`, unit `test_reset_password_invalidates_existing_sessions`, `test_cli_fails_without_credentials_when_non_interactive`. Doc mismatch: DEF-001 |
| 5 | Login success / unknown user / wrong password identical 401 / empty 422 | PASS | `authenticate` verifies against a dummy hash for unknown users; tests `test_login_succeeds_with_valid_credentials`, `test_wrong_username_and_wrong_password_give_identical_response`, `test_login_rejects_invalid_payload_with_validation_error` |
| 6 | Cookie flags | PASS | `api/auth.py` `set_cookie(httponly=True, samesite="strict", path="/", max_age=ttl*60, secure=settings.cookie_secure)`; tests `test_login_cookie_has_httponly_samesite_strict_and_root_path`, `test_login_cookie_is_secure_when_configured`, `test_session_ttl_follows_configuration` |
| 7 | Opaque token; only SHA-256 stored | PASS | `secrets.token_urlsafe(32)`; `hash_token` = SHA-256 hex; `Session.token_hash` PK; tests `test_login_cookie_value_is_opaque_and_unique_per_login`, `test_session_token_is_not_stored_in_plaintext` |
| 8 | Missing/malformed/tampered/expired cookie -> 401 `not_authenticated` | PASS | `require_auth` raises 401 on any miss, expiry check `expires_at <= now`; tests `test_me_without_cookie_returns_401`, `..._garbage_...`, `..._empty_...`, `..._tampered_...`, `..._truncated_...`, `test_session_is_rejected_after_default_ttl` |
| 9 | Logout deletes session row; old cookie -> 401 | PASS | `delete_session`; tests `test_logout_invalidates_session_server_side_for_old_cookie`, `test_logout_removes_session_row`, `test_logout_only_ends_the_presented_session` |
| 10 | Route guard over all routes except allow-list | PASS | `test_every_non_public_route_in_openapi_requires_auth` (integration) and unit `test_every_non_public_route_requires_authentication` enumerate OpenAPI paths (checklist says `app.routes`; the backend handoff documents why OpenAPI is used). Currently only auth/health routes exist; guard must be re-run when expense routes land (X-06) |
| 11 | Forged Origin on unsafe methods -> 403 `forbidden_origin`; no CORS | PASS | `core/origin.py` (POST/PUT/DELETE/PATCH, exact match); `grep -i cors backend/app` finds no CORS middleware; tests `test_login_with_forged_origin_is_forbidden`, `test_logout_with_forged_origin_is_forbidden_and_keeps_session`, `test_origin_must_match_exactly`, `test_forged_origin_is_rejected_before_credential_check`. Observation: a request without `Origin` is allowed by design (non-browser clients); CSRF in browsers is covered by SameSite=Strict plus the Origin check |
| 12 | Error envelope, no stack traces/internals | PASS | `core/errors.py` handlers for `AppError`, validation, HTTP and unhandled exceptions return `{"error": {...}}`; test `test_me_error_does_not_leak_internals`. Not run: a forced 500 through HTTP (the unhandled handler has no integration test) |
| 13 | Frontend: no token in `localStorage`/`sessionStorage`; 401 -> `/login` | NOT RUN | `frontend/` does not exist yet; backend side: cookie is HttpOnly (`test_session_cookie_is_not_readable_via_response_body`) |
| 14 | Auth persists across reload via `/me` | NOT RUN (frontend) | Backend half PASS: `test_me_returns_username_and_expiry_when_logged_in`; reload behaviour needs frontend/E2E |
| 15 | Expiry tested with injected clock | PASS | `app.state.clock` in `get_now`; tests `test_session_is_valid_just_before_expiry`, `test_session_expiry_is_absolute_not_sliding`, `test_expired_session_can_be_replaced_by_new_login`, unit `test_session_expires_after_ttl`, `test_expired_sessions_are_purged_at_login` |

Totals: 12 PASS, 1 FAIL (minor), 2 NOT RUN (frontend items 13 and 14).

### Findings

- DEF-001 (minor, backend): `.env.example` documents `INITIAL_USERNAME`/`INITIAL_PASSWORD` but the CLI reads only the process environment; `make seed-user` does not pick them up from `.env`.
- DEF-002 (minor, testing/backend): test credentials are committed constants instead of run-time generated.
- No critical or major findings. No rate limiting on login (out of contract, noted, not a defect).

### Limits of this review

- The 55 integration tests passed on first run and were not shown to fail against a broken implementation (no mutation check was run).
- Secure cookie over real TLS, concurrency and login brute-force protection were not tested.
- Frontend and E2E checks remain open until those tasks exist.

## X-06 Expense, category and dashboard integration tests (2026-10-30)

File: `backend/tests/integration/test_expenses_http.py` (black-box over HTTP, temp SQLite DB per test, run-time generated password, injected clock 2026-03-01).

Covered: 401 for all 7 expense/category/dashboard operations (anonymous and tampered cookie), reuse after logout, expired session, forged Origin 403; CRUD happy paths and shapes; 404 and bad ids; amount/category/date/description validation; money exactness; filters, sorting, pagination bounds; dashboard totals, by-category, current month, recent, empty state; persistence across app restart; no leakage of internals in errors. The existing route-guard test also passes with the new routes (auth review item 10).

Results (real runs): `make lint-backend` exit 0; `make test-backend` exit 0, 283 passed, 2 xfailed; `scripts/check-all.sh` exit 0, saved as `docs/evidence/test-runs/check-20261030T165536Z.txt`; `scripts/check-ownership.sh testing` exit 0. Frontend and E2E: not run (not present).

Failures: first run had 3 failures: two real (DEF-003, padded amount strings `" 5"`/`"5 "` accepted with 201; now an `xfail(strict=True)` test) and one wrong expected value in my own test (sum arithmetic), corrected.

Limits: no mutation check was run; the suite takes about 3.5 minutes (observed); concurrency not tested.

## I-01 integration checklist (2026-11-01)

Real HTTP checks were run by the orchestrator against the live app through the Vite proxy (`http://localhost:5173` -> FastAPI) with a throwaway user. Raw output (wrapped at 80 columns, no password or cookie values; verified by grep): `docs/evidence/test-runs/i01-http-checks.txt`, `docs/evidence/test-runs/i01-persistence.txt` (shell prompt line removed; the summary line is truncated in the source output). The testing agent did not run servers and did not re-run these checks; it only recorded and reviewed the output. Status codes of the create calls were not captured in the output (only response bodies). Fresh `scripts/check-all.sh` exit 0: `docs/evidence/test-runs/check-20261101T001953Z.txt` (backend 291 passed, frontend 55 passed).

Known data: Food 10.50 (edited to 11.00) and 20.00, Bills 100.25, Transport 5.05 (deleted). Expected total 131.25, Food 31.00 x2, Bills 100.25 x1, current month 0.00 (data dated Feb/Mar 2026, run date Nov 2026).

| Check | Command / method | Expected | Actual | Result |
|---|---|---|---|---|
| Login ok | POST login via proxy, then `GET me` | 200, session cookie, username returned | login `[200]`; `me` `[200]` `{"username":"owner",...}` | PASS |
| Invalid login: wrong password | POST login | 401 `invalid_credentials` | 401 `invalid_credentials` | PASS |
| Invalid login: unknown user | POST login | 401, same message as wrong password | 401, identical body | PASS |
| Invalid login: empty fields | POST login with empty strings | 422 `validation_error` | 422 `validation_error` (username, password too short) | PASS |
| Bad Origin | POST login and POST create with disallowed Origin | 403 `forbidden_origin` | 403 `forbidden_origin` (both) | PASS |
| Protected endpoints anonymous | `GET me`, `GET` expense list without cookie | 401 `not_authenticated` | 401 `not_authenticated` (both) | PASS |
| Categories | `GET` categories | 200, 7 fixed categories | 200, Food, Transport, Shopping, Bills, Entertainment, Healthcare, Other | PASS |
| Create | POST 4 expenses | bodies with ids 1-4, decimal-string amounts | ids 1-4 with `"10.50"`, `"20.00"`, `"100.25"`, `"5.05"`; status codes not captured | PASS (bodies only) |
| Validation 422 | POST bad amount, category, date | 422 with details | 422 `validation_error`, three detail entries | PASS |
| List, default sort | `GET` list | 4 items, newest date first | total 4, order 4, 2, 1, 3 | PASS |
| Category filter | list `category=Food` | only Food | total 2 (ids 2, 1) | PASS |
| Date-range filter | list `date_from=2026-03-01&date_to=2026-03-15` | ids 1 and 2, inclusive | total 2 (ids 2, 1) | PASS |
| Sort ascending | list ascending by date | oldest first | order 3, 1, 2, 4 | PASS |
| Invalid range | `date_from` after `date_to` | 422 | 422 `validation_error`, "date_from must not be after date_to." | PASS |
| Edit | PUT/PATCH expense 1 (11.00, "a2") | 200, updated values, `updated_at` changed | 200, `"11.00"`, `a2`, `updated_at` later than `created_at` | PASS |
| Get | `GET` expense 1 | edited values | 200, edited values | PASS |
| Not found | `GET` unknown id | 404 `not_found` | 404 `not_found` | PASS |
| Delete | DELETE expense 4, then `GET` it | 204, then 404 | 204, then 404 | PASS |
| Dashboard figures | `GET` summary | total 131.25, count 3, Food 31.00 x2, Bills 100.25 x1, current month 0.00 | `total_amount` `"131.25"`, `current_month_amount` `"0.00"`, count 3, Food `"31.00"` x2, Bills `"100.25"` x1, Transport 0.00 x0, recent ids 2, 1, 3 | PASS |
| Logout, old cookie | POST logout, then `GET me` with old cookie | 204, then 401 | 204, then 401 `not_authenticated` | PASS |
| Persistence after restart | kill backend, restart, via proxy | proxy error while down, login ok, 3 expenses, same summary | proxy 500 while down; login 200; total 3, ids 2, 1, 3; summary starts `total_amount` `"131.25"`, `current_month_amount` `"0.00"` (output truncated after that); old cookie 401 | PASS (summary only partly captured) |
| Protected-route redirect in real browser | not run | redirect to login | not run | NOT RUN |
| UI error handling in real browser | not run | inline/toast errors | not run | NOT RUN |
| UI create/edit/delete in real browser | not run | forms, confirm dialog, list update | not run | NOT RUN |
| UI filters and sort in real browser | not run | list updates | not run | NOT RUN |

Browser-level checks are NOT RUN in a real browser. The only evidence is the Vitest and React Testing Library component tests with MSW (jsdom, `make test-frontend`, 55 passed in `check-20261101T001953Z.txt`), which do not exercise a real browser, the proxy or the real backend. Real browser coverage is planned in Playwright tasks T-01 to T-03 (not started).

Limits: single run, one throwaway user; no concurrency, expiry or 360 px checks; the `Set-Cookie` attributes were not inspected in this run.

## T-01..T-05 E2E, frontend flow tests, screenshots and architecture review (2026-11-01)

### Commands run (fresh)

| Command | Exit | Result | Evidence |
|---|---|---|---|
| `scripts/check-all.sh --e2e` (first run) | 2 | backend 1 failed, 290 passed: `test_provisioning_without_credentials_fails_and_creates_no_user` (DEF-005) | `docs/evidence/test-runs/check-20261101T004130Z.txt` |
| `scripts/check-all.sh --e2e` (second run) | 2 | backend 291 passed; frontend 61 passed, 1 failed (flaky new flow test, my own test, fixed) | `docs/evidence/test-runs/check-20261101T004540Z.txt` |
| `scripts/check-all.sh --e2e` (final) | 0 | lint, typecheck OK (mypy not installed, skipped); backend 291 passed; frontend 9 files, 62 passed (55 colocated + 7 in `frontend/tests/flows.test.tsx`); E2E 3 passed (Chromium) | `docs/evidence/test-runs/check-20261101T005014Z.txt` |
| `scripts/check-ownership.sh testing` | see handoff | | |

Not run: mypy, 360 px layout, Firefox/WebKit (Chromium only).

### T-01 scaffold
`e2e/` has `package.json` (`npm test` -> `playwright test`, used by `make test-e2e`), `playwright.config.ts` (1 worker, Chromium, global setup/teardown) and `support/servers.ts`. Each run creates `e2e/.tmp/run-*/e2e.db`, provisions the user through `python -m app.cli create-user` with a password generated by `crypto.randomBytes` at run time (kept in process env only, never written to disk or printed), starts uvicorn on 127.0.0.1:8000 and Vite on 127.0.0.1:5173 (fixed because the Vite proxy targets port 8000), waits for health, and removes the temp dir and kills both servers afterwards. After the final run no process listens on 8000/5173 and `e2e/.tmp` is empty. The run refuses to start if either port is already in use.

### T-02 16-step workflow (`e2e/tests/workflow.spec.ts`, one test with 16 `test.step` blocks)

| Step | Check | Result |
|---|---|---|
| 1-2 | open `/`, redirected to login, "Sign in" heading | PASS |
| 3-4 | wrong password: alert "Invalid username or password.", stays on login | PASS |
| 5-6 | valid login, Dashboard heading | PASS |
| 7-8 | create Healthcare 25.00, toast and row appear | PASS |
| 9-10 | edit to 40.50 and new description, row shows 40.50, old description gone | PASS |
| 11 | filter category + date range: row visible; category Bills: row hidden | PASS |
| 12 | dashboard count +1, total and month +40.50, Healthcare row +1 / +40.50 (deltas from a baseline read in step 6) | PASS |
| 13-14 | delete through confirmation dialog, row gone, dashboard back to baseline | PASS |
| 15 | log out, redirected to login | PASS |
| 16 | `/expenses` redirects to login; `GET /api/expenses` 401 with the browser context; 401 with the old cookie value in a fresh request context | PASS |

Result: all 16 steps passed in the final run (3 passed, 18.6 s). The test is order independent (it ran after the other specs) because it uses unique descriptions and baseline deltas.

### T-03 persistence (`e2e/tests/persistence.spec.ts`)
Log in, create a Bills 77.25 expense, stop and restart the uvicorn process on the same SQLite file, reload (the stored session still works: sessions live in the database), then a fresh browser context is redirected to login, logs in again and sees the expense with 77.25. PASS (final run).

### T-04 frontend flow tests (`frontend/tests/flows.test.tsx`, MSW per contract, 7 tests)
Deep link to login and return, wrong password, session expiry (401) redirect, full create/edit/dashboard/delete/logout lifecycle, delete cancel, category + date filters, client-side and server 422 form errors. 5 consecutive runs 7/7 passed after fixing a race in my own first version (first full run had 1 failure, see above). The component tests use jsdom, not a real browser.

### T-05 screenshots
`docs/evidence/screenshots/login.png`, `expenses.png`, `dashboard.png` (real PNGs, 1100 px wide, taken by `e2e/tests/screenshots.spec.ts` from the running app with data created through the UI; the first attempt showed a toast overlapping the table and was re-taken after waiting for it to disappear). Each `make test-e2e` run overwrites them.

### Architecture / complexity review (read-only)

| Area | Result | Evidence / finding |
|---|---|---|
| Contract conformance | PASS for every endpoint exercised by integration (291 backend tests) and E2E; frontend uses the contract's error envelope and field names | no new deviation; frontend amount pattern `\d{1,6}` is stricter than contract `\d{1,8}` but within the documented range |
| Unnecessary complexity | PASS | backend about 900 lines in 25 small modules; frontend largest files about 310 lines; hand-written SVG chart, no chart or state libraries |
| Out-of-scope additions | PASS | grep over `backend/app`, `frontend/src`, `Makefile`, `.env.example`, dependency files found no Redis, Celery, Alembic, OAuth, registration route, roles, Docker or MCP; the only matches for "register" are `register_error_handlers` and SQLAlchemy metadata |
| Secrets in repo | PASS | `git ls-files` shows no `.env`, `.db` or `.sqlite`; the root `.env` and `backend/data/*.db` exist locally but are gitignored; grep for password/token assignments outside tests and docs found only UI labels and a `getpass` call; E2E credentials are generated at run time |
| Test typing gap | PASS, fixed | DEF-004 VERIFIED: `tsconfig.app.json` now includes `tests`; a deliberate type error in `flows.test.tsx` was detected (exit 2) and reverted; `docs/evidence/test-runs/def-004-verify.txt` |
| Test isolation | FAIL, fixed | DEF-005: a root `.env` made one integration test depend on the developer machine |

Limits: review is by reading and grep, not a full audit; `npm audit` findings noted by the frontend agent in dev tooling were not re-run.

## CR2-T multi-user (CR-002, ADR-011) verification and auth review update (2026-11-01)

The A-06 review above is superseded where it assumed one user (item 1 "No registration endpoint; one user only", items 10 and 13/14 scope). Re-reviewed below against ADR-011 and `docs/api-contract.md`. Tests were written from the contract, black-box over HTTP.

### Commands run (fresh)

| Command | Exit | Result | Evidence |
|---|---|---|---|
| `pytest tests/integration/test_registration_http.py tests/integration/test_isolation_http.py tests/integration/test_auth_http.py` (in `backend/`) | 0 | 123 passed | terminal only |
| `scripts/check-all.sh --e2e` (first) | 2 | `make lint-backend` failed: ruff format on my new test file; nothing else ran | `docs/evidence/test-runs/check-20261101T021648Z.txt` |
| `scripts/check-all.sh --e2e` (second, after `ruff format`) | 2 | lint, typecheck OK; backend 389 passed (303.09 s); frontend 10 files, 70 passed; E2E did not start: `http://127.0.0.1:8000/api/health is already in use` (the user's own `uvicorn --reload` and `vite` dev servers were running, PIDs not stopped by me) | `docs/evidence/test-runs/check-20261101T021658Z.txt` |
| `npx playwright test --list` (in `e2e/`) | 0 | 4 specs parse, incl. new `multi-user.spec.ts` | terminal only |

E2E (all 4 specs including the new two-user scenario), the new `signup.png` screenshot and refreshed screenshots: NOT RUN. The dev servers on ports 8000/5173 must be stopped, then `scripts/check-all.sh --e2e` re-run. mypy not run.

### New tests

- `backend/tests/integration/test_registration_http.py` (success 201 and body shape, auto-login via `/me`, cookie name/flags equal to login incl. Secure when configured, opaque unique token, token and password stored only hashed, expiry, duplicate username incl. other letter case and whitespace -> 409 `username_taken` with no cookie, existing password untouched, username 2/3/64/65 and password 7/8/128/129 limits, missing/wrong-typed fields, forged and inexact Origin -> 403 and no user created).
- `backend/tests/integration/test_isolation_http.py` (user B read/update/delete of A's id -> 404 `not_found`, never 403, identical to a nonexistent id, A's data unchanged; lists, filters and pagination exclude other users; dashboard totals, by-category and recent per user; B's failed delete leaves A's dashboard unchanged; client-supplied `user_id` ignored; sessions separate; logout of B keeps A; anonymous 401).
- `backend/tests/integration/test_auth_http.py`: route-guard allow-list now includes `/api/auth/register`.
- `e2e/tests/multi-user.spec.ts` (two users in separate browser contexts via the real `/signup` UI, own data only, username in header, duplicate username in other case shows "Username is already taken.", logout of one keeps the other, case-insensitive login), `e2e/support/helpers.ts` (`submitSignup`, run-time `randomPassword`), `e2e/tests/screenshots.spec.ts` (adds `signup.png`). Written but not executed.
- No other single-user assumption found in `backend/tests/integration/**`, `frontend/tests/flows.test.tsx` or the other E2E specs (the E2E seed user still comes from `create-user`, which the CLI still supports; the existing specs are unaffected by isolation).

### Checklist (CR-002)

| # | Item | Result | Evidence |
|---|---|---|---|
| R1 | Registration success: 201, `{username, expires_at}`, user can log in later | PASS | `test_register_creates_user_and_returns_201_with_username_and_expiry`, `test_registered_user_can_log_in_again_after_logout` |
| R2 | Auto-login cookie: HttpOnly, SameSite=Strict, Path=/, Max-Age, same name and attribute set as login, Secure when configured | PASS | `test_register_cookie_has_same_name_and_flags_as_login`, `test_register_cookie_is_secure_when_configured` |
| R3 | Origin check on register (forged, inexact, `null` -> 403, no user created, no cookie) | PASS | `test_register_with_forged_origin_is_forbidden_and_creates_nothing`, `test_register_origin_must_match_exactly` |
| R4 | Validation limits 2/3/64/65 and 7/8/128/129, trimming, wrong types, no password echo | PASS | `test_username_length_limits`, `test_password_length_limits`, `test_register_rejects_missing_or_wrong_typed_fields` |
| R5 | Duplicate username case-insensitive -> 409, no cookie, existing account untouched, no internals in error | PASS | `test_duplicate_username_in_different_letter_case_returns_409`, `test_duplicate_attempt_does_not_change_existing_password`, `test_duplicate_error_does_not_leak_internals_or_password` |
| R6 | Enumeration | ACCEPTED RISK (by design) | Sign-up must tell the user that a name is taken (409 `username_taken`), so usernames can be enumerated through register; login stays identical for unknown user and wrong password (`test_wrong_username_and_wrong_password_give_identical_response`). No rate limiting exists (out of scope, not tested) |
| R7 | Passwords Argon2id-hashed, tokens SHA-256 only, no secrets in responses | PASS | `test_registered_password_is_stored_only_as_argon2_hash`, `test_register_session_token_is_not_stored_in_plaintext`, `test_register_response_has_no_secrets` |
| R8 | Isolation: foreign id read/update/delete -> 404 `not_found`, never 403, same body as a nonexistent id; A's data unchanged | PASS | `test_user_b_cannot_*`, `test_foreign_id_gives_the_same_response_as_a_nonexistent_id`, `test_foreign_expense_access_is_never_403` |
| R9 | Lists, filters, pagination and dashboard (total, by category, recent) scoped per user; B's actions do not change A's figures | PASS | `test_list_excludes_other_users_expenses`, `test_filters_and_pagination_never_expose_other_users_rows`, `test_dashboard_totals_are_per_user`, `test_user_b_failed_delete_does_not_change_user_a_dashboard` |
| R10 | User id comes from the session, not the request | PASS (black-box) | `test_client_supplied_user_id_in_body_is_ignored`, `test_user_id_query_parameter_does_not_widen_the_list` |
| R11 | Session separation: each cookie resolves to its own user; logout of B keeps A; old B cookie -> 401 | PASS | `test_each_session_resolves_to_its_own_user`, `test_logging_out_user_b_does_not_end_user_a_session`, `test_user_b_cookie_after_logout_cannot_reach_data` |
| R12 | Route guard over every OpenAPI route with `register` in the allow-list | PASS | `test_every_non_public_route_in_openapi_requires_auth` |
| R13 | `GET /api/auth/setup-status` removed | PASS | `test_setup_status_endpoint_no_longer_exists` (accepts 401 or 404) |
| R14 | Real-browser two-user isolation, header username, duplicate error in UI | NOT RUN | `multi-user.spec.ts` not executed (port conflict); only MSW component tests (`SignupPage.test.tsx`, 70 frontend tests passed) |
| R15 | Schema: DB-level per-user constraints (`lower(username)` unique index, `expenses.user_id` NOT NULL), concurrent registration race | NOT RUN | not tested black-box; concurrency not tested |
| R16 | Fresh-DB requirement (no migrations, ADR-005): old `backend/data/*.db` incompatible | NOT RUN | tests use temp DBs only; the user's existing dev database was not inspected or touched |

Limits: all new tests passed on first execution and were not shown to fail against a broken implementation (no mutation check). `test_client_supplied_user_id_in_body_is_ignored` and `test_user_id_query_parameter_does_not_widen_the_list` accept 422 or success, so they assert only that no cross-user effect occurs. Secure cookie over real TLS and login brute force remain untested. No defects found in this run.
