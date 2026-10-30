---
name: fastapi-feature-development
description: Use when adding or changing a backend feature in the FastAPI expense tracker - model, Pydantic schema, service function, route, error handling, tests and contract update, in that order.
---
# FastAPI feature workflow

Follow `.github/instructions/backend.instructions.md`. Also apply the external `fastapi` skill if installed. Ignore user-level `kate-*`/`kbc-*` skills.

## Steps
1. **Read** `docs/api-contract.md` for the endpoint(s) and error codes; do not deviate silently.
2. **Test first (recommended):** add failing unit tests in `backend/tests/unit/` for the service behaviour and validation.
3. **Model:** `backend/app/models/` with SQLAlchemy 2.x `Mapped` columns and CHECK/UNIQUE/index constraints.
4. **Schemas:** `backend/app/schemas/` separate input/output models; money as decimal strings with <= 2 decimals; trim strings.
5. **Service:** `backend/app/services/` pure functions taking a `Session` (and a clock where time matters); no FastAPI imports.
6. **Route:** `backend/app/api/` thin; router-level `Depends(require_auth)` for anything that touches expense data; correct status codes; map domain errors to the envelope.
7. **Verify:** `make lint-backend` and `make test-backend`; start the app and hit the endpoint (e.g. via `/api/docs`) when practical.
8. **Contract:** update `docs/api-contract.md` if anything observable changed; note it in the handoff.
9. **Hand off** with the `agent-handoff` skill; log with `ai-dev-evidence`.

## Output
Code, unit tests, updated contract, handoff block with real test output.
