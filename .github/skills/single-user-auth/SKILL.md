---
name: single-user-auth
description: Use when implementing, testing or reviewing single-user authentication for the expense tracker - secure provisioning, Argon2 hashing, server-side session cookie, Origin/CSRF check, protected routes, logout, expiry and security tests.
---
# Single-user authentication (session cookie design)

Design is fixed in `docs/decisions.md` (ADR for authentication). Do not switch to JWT.

## Implementation steps (backend agent)
1. **Models:** `users` (`id` CHECK = 1, unique `username`, `password_hash`, `created_at`), `sessions` (`token_hash` PK = SHA-256 hex, `user_id` FK, `created_at`, `expires_at`).
2. **Hashing (`core/security.py`):** `argon2-cffi` `PasswordHasher` (Argon2id); `verify_password` never raises on mismatch; unknown-user path verifies against a dummy hash; rehash on login when `check_needs_rehash`.
3. **Sessions:** create token with `secrets.token_urlsafe(32)`, store only SHA-256; TTL from `SESSION_TTL_MINUTES` (absolute); injectable clock; purge expired rows at login; delete the row on logout.
4. **Routes:** `POST /api/auth/login` (Set-Cookie `expense_session`: HttpOnly, SameSite=Strict, Path=/, Max-Age=TTL, Secure per `COOKIE_SECURE`), `POST /api/auth/logout` (204, idempotent, clears cookie), `GET /api/auth/me`. Same 401 `invalid_credentials` for unknown user and wrong password. 422 for empty fields.
5. **Dependency:** `require_auth` reads the cookie, hashes it, loads a non-expired session or raises 401 `not_authenticated`. Attach at router level for `expenses`, `dashboard`, `categories`.
6. **Origin check:** middleware on POST/PUT/DELETE; if `Origin` header present and not in `ALLOWED_ORIGINS` -> 403 `forbidden_origin`. No CORS middleware.
7. **Provisioning:** `python -m app.cli create-user` reads `INITIAL_USERNAME`/`INITIAL_PASSWORD` or prompts with `getpass`; non-interactive without password -> exit non-zero; existing user -> no-op unless `--reset-password`; never print the password.
8. **First-run sign-up (CR-001, ADR-010):** `GET /api/auth/setup-status` -> `{setup_required: bool}` (public); `POST /api/auth/register` `{username, password}` (public, Origin-checked) creates the single user and logs in (same cookie as login) only when no user exists, otherwise 403 `registration_closed`; username 3-64 chars, password 8-128 chars; hash with Argon2id; handle the race through the `id = 1` constraint. Both routes join the route-guard allow-list.
9. **Tests (unit):** hash round-trip and no plaintext in DB, token hashing, expiry with injected clock, provisioning idempotency, route guard test enumerating every route (anonymous -> 401 except allow-list `health`, `login`, `logout`, docs).

## Testing/review steps (testing agent)
Use [review-checklist.md](./review-checklist.md). Integration tests are black-box over HTTP.

## Logout semantics
Server-side invalidation: after logout the old cookie value must yield 401. Say exactly that in docs; never describe client-side deletion as invalidation.
