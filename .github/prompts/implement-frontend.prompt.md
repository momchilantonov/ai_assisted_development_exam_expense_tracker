---
description: Stage E - implement the frontend (scaffold, login, protected routes, expenses, dashboard) with component tests.
agent: orchestrator
argument-hint: optional - task IDs F-01..F-06
---
Run Stage E tasks F-01..F-06 from `docs/tasks.md`. The contract in `docs/api-contract.md` must be frozen first (it is seeded in Phase 2). This may run in parallel with backend stages because directories are disjoint; otherwise run sequentially.

1. Delegate to `frontend` (skill `react-feature-development`), one or two tasks per delegation, using MSW mocks that follow the contract until the backend exists.
2. Verify each with `make lint-frontend`, `make typecheck-frontend`, `make test-frontend`, and `scripts/check-ownership.sh frontend`.
3. Record any contract gaps reported by the frontend agent as proposals for `backend`; do not let the frontend invent behaviour.
4. Update the board with evidence. Stop at the end of the stage.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
