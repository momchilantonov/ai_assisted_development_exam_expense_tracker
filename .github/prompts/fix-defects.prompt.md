---
description: Stage H - coordinate defect corrections with retry limits and regression verification.
agent: orchestrator
argument-hint: optional - defect IDs (DEF-nnn)
---
Work through open defects in `docs/defects.md`.

For each defect: confirm owner, delegate the fix to that agent with the reproduction and the failing test, then have `testing` re-run the failing test and the related regression suite (`make check`; `make test-e2e` if the UI flow was affected). Record result, attempt count (max 3) and evidence. After 3 failed attempts mark `BLOCKED` and escalate to the human with a summary. Never let `testing` edit production code and never let implementers mark their own fix `VERIFIED`.
