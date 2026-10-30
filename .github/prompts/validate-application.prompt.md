---
description: Stages G/H - run the full validation (lint, types, unit, integration, component, E2E), review architecture and complexity, and write the test report.
agent: orchestrator
---
Run tasks T-06 (and T-01..T-05 if still open).

1. Run `make validate` (saves output under `docs/evidence/test-runs/`). Quote exit codes and counts.
2. Delegate E2E work and the architecture/complexity review (read-only) to `testing`; the review checks contract conformance, unnecessary complexity, out-of-scope additions (see global instructions) and secrets.
3. Every failure becomes a defect with an owner; run `/fix-defects` logic until green or `BLOCKED` (3 attempts per defect).
4. Ensure `docs/test-report.md` contains actual outputs and the 16-step workflow plus persistence scenario results.
5. Stop for human checkpoint HC4.
