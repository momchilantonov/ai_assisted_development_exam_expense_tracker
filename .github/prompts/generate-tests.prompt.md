---
description: Generate and run tests for a scope (backend, frontend or e2e) as the independent testing agent.
agent: testing
argument-hint: scope - backend | frontend | e2e, plus task IDs
---
Apply the `automated-testing` skill for the requested scope.

1. List scenarios from the requirements and `docs/api-contract.md` in `docs/test-report.md`.
2. Write the tests in the directories you own; authenticated tests need anonymous 401 counterparts.
3. Run them (`make test-backend`, `make test-frontend`, `make test-e2e` or `scripts/check-all.sh`), saving output to `docs/evidence/test-runs/`.
4. File defects for production failures in `docs/defects.md`; never edit production code.
5. Hand off with exact commands, exit codes and counts.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
