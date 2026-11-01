# AI-Driven Expense Tracker - repository instructions

Multi-user expense tracker (each user sees only their own expenses; CR-002, ADR-011) built **entirely by AI agents** for the "AI-Assisted Development" exam (`project_assignment.md`). Stack: FastAPI + Pydantic v2 + SQLAlchemy 2.x + SQLite + pytest (backend); React + TypeScript (strict) + Vite + Vitest + React Testing Library (frontend); Playwright (E2E). Approved plan: [docs/plan/master-plan.md](../docs/plan/master-plan.md). Architecture: [docs/architecture.md](../docs/architecture.md). API contract (authoritative for frontend and backend): [docs/api-contract.md](../docs/api-contract.md).

## Start of every task

1. Read `docs/tasks.md` (state and dependencies) and the latest entries in `docs/agent-handoffs.md`.
2. Work only on the task IDs you were given. Do not redesign decisions in `docs/decisions.md`; propose a change in your handoff instead.
3. Ignore any user-level skills named `kate-*` or `kbc-*`; they belong to a different project.

## Phases and scope

Phase 1 plan, 2 infrastructure, 3 application, 4 testing, 5 documentation. Never work ahead of the current phase. Phase 2 creates no application code.

Out of scope (do not add): Redis, Celery, cloud databases, microservices, payments, user roles or admin accounts, email verification, password reset by email, external auth providers, container orchestration, custom categories, Alembic migrations, MCP servers.

## Ownership (write access)

| Agent | May write |
|---|---|
| `backend` | `backend/**` except `backend/tests/integration/**`; `docs/api-contract.md`; backend lines of `Makefile` and `.env.example` |
| `frontend` | `frontend/**` except `frontend/tests/**` |
| `testing` | `backend/tests/integration/**`, `frontend/tests/**`, `e2e/**`, `docs/test-report.md`, `docs/defects.md`, `docs/evidence/test-runs/**`, `docs/evidence/screenshots/**` |
| `documentation` | `docs/**` not owned above, `README.md` |
| `orchestrator` | `docs/tasks.md`, `docs/agent-handoffs.md`, `docs/decisions.md` only |

`.github/**`, `scripts/**`, `project_assignment.md` and `plan.prompt.md` are frozen after Phase 2; changing them needs human approval. `Makefile` and `.env.example` may only get minimal diffs for your own domain's targets/variables, noted in your handoff. Any agent may append to `docs/agent-handoffs.md`, `docs/decisions.md` and `docs/evidence/development-log.md`, and update only its own rows in `docs/tasks.md`. If you need a change outside your ownership, record it in your handoff instead of making it. Run `scripts/check-ownership.sh <agent>` before handing off.

## Security principles

- No plaintext or committed credentials; `.env` is gitignored; `.env.example` has placeholders only.
- Authentication is enforced on the backend for every expense-related endpoint; frontend route protection only supplements it.
- Validate all input; never leak stack traces or authentication details in errors.
- Do not print, log or commit secrets, session tokens or passwords.
- Use parameterised SQLAlchemy operations only. Tests use isolated temporary databases.
- Destructive actions (deleting files outside your task, `git push`, force operations) require explicit human approval.

## Evidence and honesty

- Never fabricate prompts, test results, screenshots, challenges, URLs or repository information. Say "not run" when you did not run something.
- Record significant work with the `ai-dev-evidence` skill; record results with the exact command and exit code.
- Do not claim a task is done without fresh verification output (`verification-before-completion` skill).

## Definition of Done

Acceptance checks pass; relevant `make` targets are green (`make lint`, `make typecheck`, `make test-backend`, `make test-frontend`); a handoff block (`agent-handoff` skill) is appended and your row in `docs/tasks.md` is updated; no file outside your ownership was changed. Only an agent that did not implement a task may mark it `VERIFIED`.

## Conventions

- Run status marker: the top-level agent of a slash-prompt run (the one that received the prompt, not a subagent) ends its final message with exactly one of these lines, as the last line, after checking `docs/tasks.md` and the real command output:
  - `=== RUN COMPLETE: <prompt> | tasks <IDs> VERIFIED | next: <next prompt or "none"> ===` only when every task of the run is `VERIFIED` (or `COMPLETED` where the plan allows) with evidence and nothing is left to do in this prompt.
  - `=== RUN PAUSED: <prompt> | waiting for you: <checkpoint or decision> | reply: "<text to type>" ===` at a human checkpoint (HC3, HC4, HC5) or a question only the human can answer.
  - `=== RUN STOPPED EARLY: <prompt> | reason: <blocker> | resume: /continue-development ===` for anything else (blocked task, failing check, tool or hook error, ran out of steps). Never print COMPLETE when work or evidence is missing.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). Never push; the human publishes.
- Keep the solution small and educational; prefer the simplest approach that satisfies the requirement.
- Money: integer cents in the database, decimal strings in the API, never binary floats.
- Toolchain: Python 3.12 (`uv`), Node 22.x (`nvm use 22`), entry points through `make`.
