---
description: Stage B (foundation) or Stage D (expense backend) implementation by the backend agent with independent verification.
agent: orchestrator
argument-hint: stage - B or D
---
Run the backend stage given as input (`B` or `D`) from `docs/tasks.md`.

- Stage B (B-01, B-02): scaffold, config, db init, health, error envelope, pytest fixtures, models. Requires INF-11 and HC2.
- Stage D (X-01..X-06): requires A-06 reviewed and HC3 approved. Schemas and money handling, CRUD, filters/sorting/pagination, dashboard, categories, contract update; then delegate X-06 integration tests to `testing`.

For each task: delegate to `backend` with the skill `fastapi-feature-development`; verify with `make lint-backend` and `make test-backend`; run `scripts/check-ownership.sh backend`; update the board with evidence. Contract changes must appear in `docs/api-contract.md`. Stop at the end of the stage.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
