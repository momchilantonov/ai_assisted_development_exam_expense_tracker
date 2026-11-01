# Decisions (ADR log, append-only)

## ADR-001 - Modules and architecture (2026-10-30)
Five modules: Authentication, Backend API, Database and persistence, Frontend, Testing and integration. SPA + REST API + SQLite. Same-origin in development via Vite proxy of `/api` to `127.0.0.1:8000`. Alternatives: server-rendered pages (rejected: stack requires React). Consequence: no CORS needed.

## ADR-002 - Authentication: server-side session cookie (2026-10-30)
Chosen over JWT. Opaque token from `secrets.token_urlsafe(32)`, only its SHA-256 stored in `sessions`; cookie `expense_session` HttpOnly, SameSite=Strict, Path=/, Secure via `COOKIE_SECURE`; absolute TTL 480 minutes; Argon2id hashing; Origin allow-list check on POST/PUT/DELETE; no CORS; logout deletes the row (true server-side invalidation); router-level `require_auth` plus a route-guard test. Provisioning through `python -m app.cli create-user` (idempotent, `--reset-password` explicit), single user enforced by `users.id = 1` CHECK. JWT rejected: logout is client-side only unless state is added, storage trade-offs, more moving parts.

## ADR-003 - Money (2026-10-30)
Integer cents in the database (`amount_cents`, CHECK > 0); decimal strings in the API; more than 2 decimals rejected (422), no silent rounding; range 0.01..999999.99; single implicit currency with configurable display symbol; sums via SQL SUM over integers; frontend never uses float arithmetic.

## ADR-004 - Categories (2026-10-30)
Fixed `str` Enum (Food, Transport, Shopping, Bills, Entertainment, Healthcare, Other) + DB CHECK constraint; `GET /api/categories` exposes the list. No table, no custom categories.

## ADR-005 - No migrations (2026-10-30)
`Base.metadata.create_all` at startup; Alembic excluded for a small single-user project.

## ADR-006 - Skills location and installation (2026-10-30)
Custom and external skills live in `.github/skills/` (user decision: all MAD tools in `.github`). External skills installed with `npx skills add ... -a github-copilot --copy -y` (which writes to `.agents/skills/`), reviewed, then moved to `.github/skills/`; `.agents/` removed. `skills-lock.json` kept for provenance. Installed: fastapi (fastapi/fastapi), vercel-react-best-practices (vercel-labs/agent-skills), playwright-best-practices (currents-dev), verification-before-completion (obra/superpowers). Rejected: webapp-testing and playwright-cli (Socket/Snyk WARN).

## ADR-007 - No MCP servers (2026-10-30)
No verified `.github/` location for MCP configuration; native tools, the Playwright runner and screenshots from the test suite suffice. Revisit only with a concrete need.

## ADR-008 - Toolchain (2026-10-30)
Python 3.12 via `uv` (system Python is 3.10.12); venv at `backend/.venv`; Node 22.x via nvm (>= 22.20, needed by the skills CLI); npm with lockfiles; entry points via `make`. Frontend dev port 5173, backend 8000.

## ADR-009 - Hooks and ownership enforcement (2026-10-30)
Hooks under `.github/hooks` (Node scripts, Local-harness PascalCase format): safety guard, python formatter, Stop quality gate, session context, prompt logger. Ownership is enforced three ways: agent instructions, agent-scoped `PreToolUse` hooks (UNVERIFIED in Local until observed), and `scripts/check-ownership.sh` at every handoff. `.github/hooks/INFRA_FROZEN` makes `.github/**` write-protected after Phase 2.

## ADR-010 - First-run sign-up (CR-001, 2026-11-01)
Change request from the human: create the account through the web UI instead of the terminal. Context: the original requirement allows exactly one user and no public registration, and expenses are not per-user. Decision: a first-run sign-up only. `GET /api/auth/setup-status` (public) returns `{setup_required: bool}`; `POST /api/auth/register` (public, Origin-checked) creates the single user and logs in only while no user exists, afterwards 403 `registration_closed`; the `users.id = 1` constraint settles concurrent attempts; username 3-64 and password 8-128 characters. The frontend shows `/signup` only while `setup_required` is true. `python -m app.cli create-user` remains as a fallback. Alternatives rejected: open multi-user sign-up (violates the single-user requirement, needs per-user data isolation). Supersedes the "no registration endpoint" rule in ADR-002; ADR-002's other decisions stand.
