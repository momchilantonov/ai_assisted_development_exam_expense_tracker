---
name: single-user-auth
description: Use when implementing, testing or reviewing authentication for the expense tracker (session cookie, now multi-user with per-user data, CR-002) - sign-up, Argon2 hashing, server-side session cookie, Origin/CSRF check, protected routes, user isolation, logout, expiry and security tests.
---
# Authentication (session cookie design; multi-user since CR-002)

Design is fixed in `docs/decisions.md` (ADR for authentication). Do not switch to JWT.

## Implementation steps (backend agent)
1. **Models:** `users` (autoincrement `id`, case-insensitively unique `username`, `password_hash`, `created_at`), `sessions` (`token_hash` PK = SHA-256 hex, `user_id` FK, `created_at`, `expires_at`), `expenses.user_id` NOT NULL FK.
2. **Hashing (`core/security.py`):** `argon2-cffi` `PasswordHasher` (Argon2id); `verify_password` never raises on mismatch; unknown-user path verifies against a dummy hash; rehash on login when `check_needs_rehash`.
3. **Sessions:** create token with `secrets.token_urlsafe(32)`, store only SHA-256; TTL from `SESSION_TTL_MINUTES` (absolute); injectable clock; purge expired rows at login; delete the row on logout.
4. **Routes:** `POST /api/auth/login` (Set-Cookie `expense_session`: HttpOnly, SameSite=Strict, Path=/, Max-Age=TTL, Secure per `COOKIE_SECURE`), `POST /api/auth/logout` (204, idempotent, clears cookie), `GET /api/auth/me`. Same 401 `invalid_credentials` for unknown user and wrong password. 422 for empty fields.
5. **Dependency:** `require_auth` reads the cookie, hashes it, loads a non-expired session or raises 401 `not_authenticated`. Attach at router level for `expenses`, `dashboard`, `categories`.
6. **Origin check:** middleware on POST/PUT/DELETE; if `Origin` header present and not in `ALLOWED_ORIGINS` -> 403 `forbidden_origin`. No CORS middleware.
7. **Fallback provisioning:** `python -m app.cli create-user` reads `INITIAL_USERNAME`/`INITIAL_PASSWORD` or prompts with `getpass`; non-interactive without password -> exit non-zero; existing user -> no-op unless `--reset-password`; never print the password.
8. **Sign-up (CR-002, ADR-011):** `POST /api/auth/register` `{username, password}` (public, Origin-checked): username 3-64 chars, case-insensitively unique (409 `username_taken`), password 8-128 chars; creates the user, starts a session with the same cookie as login, returns 201. Add it to the route-guard allow-list. Remove `GET /api/auth/setup-status` and the `registration_closed` rule from CR-001 (superseded).
9. **Data isolation:** all expense, dashboard and category queries are scoped by the session user; another user's expense id -> 404.
10. **Tests (unit):** hash round-trip and no plaintext in DB, token hashing, expiry with injected clock, provisioning idempotency, route guard test enumerating every route (anonymous -> 401 except allow-list `health`, `login`, `logout`, docs).

## Testing/review steps (testing agent)
Use [review-checklist.md](./review-checklist.md). Integration tests are black-box over HTTP.

## Logout semantics
Server-side invalidation: after logout the old cookie value must yield 401. Say exactly that in docs; never describe client-side deletion as invalidation.
