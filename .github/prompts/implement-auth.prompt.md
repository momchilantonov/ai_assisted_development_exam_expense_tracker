---
description: Stage C - implement and independently test single-user authentication (backend), stopping at the auth review checkpoint.
agent: orchestrator
---
Run Stage C tasks B-01..B-02 (if not done), A-01 to A-06 from `docs/tasks.md`.

1. Delegate A-01..A-04 to `backend` (skills: `single-user-auth`, `fastapi-feature-development`). Design is fixed in `docs/decisions.md` (session cookie); do not change it.
2. Verify each: `make lint-backend`, `make test-backend`, `scripts/check-ownership.sh backend`.
3. Delegate A-05 to `testing` (black-box auth integration tests from `docs/api-contract.md`; scenarios in the testing instructions).
4. Delegate A-06 to `testing` in review mode using `.github/skills/single-user-auth/review-checklist.md`.
5. Verify with `scripts/check-all.sh`, set states with evidence, then STOP for human checkpoint HC3 and present the review findings. Do not start Stage D.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
