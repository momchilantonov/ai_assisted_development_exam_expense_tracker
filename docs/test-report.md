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
