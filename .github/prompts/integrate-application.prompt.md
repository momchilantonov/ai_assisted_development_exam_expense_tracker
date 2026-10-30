---
description: Stage F - connect frontend and backend, run both servers and verify the integration checklist with evidence.
agent: orchestrator
---
Run task I-01. Prerequisites: X-06 and F-06 verified.

1. Ensure `.env` exists locally (copy of `.env.example`; do not print secrets), provision the user with `make seed-user`, then start `make dev-backend` and `make dev-frontend`.
2. Verify with real requests/browser checks and record evidence: login and invalid login, protected-route redirect, expense create/edit/delete, category and date-range filters and sort, dashboard figures against known data, logout (old cookie returns 401), API error handling in the UI, persistence after restarting the backend.
3. Delegate defects to the owners (`backend` or `frontend`) via `docs/defects.md`; re-verify. Limit 3 attempts each.
4. Write the checklist results into `docs/test-report.md` through the `testing` agent. Update the board.
