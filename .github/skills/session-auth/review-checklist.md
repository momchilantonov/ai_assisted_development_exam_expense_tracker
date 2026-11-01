# Authentication review checklist

Mark each item PASS / FAIL / NOT RUN with evidence (command, test name, or file reference).

- [ ] Sign-up is open and validated: username 3-64 chars, case-insensitively unique (409 `username_taken`), password 8-128 chars, Argon2id hash only; no `users.id = 1` rule remains.
- [ ] User isolation: every expense, dashboard and category query is scoped by the session user; another user's expense id returns 404 on read, update and delete; list and dashboard figures are per user; tests exist for each route.
- [ ] No plaintext password in repo, DB, logs or responses; DB holds an Argon2id hash only.
- [ ] `.env` not tracked; `.env.example` has placeholders only; no real credentials in tests (generated at run time).
- [ ] Provisioning is repeatable and never overwrites an existing password without `--reset-password`.
- [ ] Login: success, unknown user, wrong password (same 401 body/message), empty credentials (422).
- [ ] Cookie flags: HttpOnly, SameSite=Strict, Path=/, Max-Age, Secure when `COOKIE_SECURE=true`.
- [ ] Session token is opaque; only its SHA-256 is stored.
- [ ] Missing, malformed, tampered and expired cookies -> 401 `not_authenticated`.
- [ ] Logout deletes the session row; old cookie then -> 401; `/me` after logout -> 401.
- [ ] Every route outside the allow-list returns 401 anonymously (route guard test exists and enumerates `app.routes`).
- [ ] Forged `Origin` on POST/PUT/DELETE -> 403 `forbidden_origin`; no CORS middleware present.
- [ ] Error responses use the envelope and never include stack traces or internal details.
- [ ] Frontend stores no token/credentials in `localStorage`/`sessionStorage`; 401 redirects to `/login`.
- [ ] Authentication persists across page reload until expiry (via `/me`).
- [ ] Expiry covered by a test with an injected clock.
