# Authentication review checklist

Mark each item PASS / FAIL / NOT RUN with evidence (command, test name, or file reference).

- [ ] No general registration: the only sign-up is the first-run `POST /api/auth/register`, which returns 403 `registration_closed` once a user exists (also under concurrent requests); exactly one user can exist (`users.id = 1` CHECK).
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
