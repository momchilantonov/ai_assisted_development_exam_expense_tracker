---
name: automated-testing
description: Use when designing, writing, running or reporting tests - scenario design from requirements, test generation, execution with saved output, failure analysis, defect reports and regression validation (backend pytest, frontend Vitest, Playwright E2E).
---
# Automated testing workflow

## Steps
1. **Scenarios:** derive from `project_assignment.md`, `plan.prompt.md` requirements and `docs/api-contract.md`; list them in `docs/test-report.md` (scenario, layer, owner). Do not copy the implementation's behaviour into expectations.
2. **Write tests** in the layer you own (see ownership in `.github/copilot-instructions.md` and `.github/instructions/testing.instructions.md`). Authenticated tests also need an anonymous 401 counterpart.
3. **Run:** `make test-backend`, `make test-frontend`, `make test-e2e` or `scripts/check-all.sh [--e2e]` (saves output to `docs/evidence/test-runs/<timestamp>.txt`). Record exact command, exit code, counts.
4. **Analyse failures:** reproduce with the smallest command; decide whether it is a test defect (fix it if you own the test) or a production defect (report it).
5. **Defect report:** append to `docs/defects.md` using [defect-report-template.md](./defect-report-template.md); set the owner (`backend` or `frontend`); never edit production code yourself.
6. **Regression:** after the owner's fix, re-run the failing test, then the affected suite, then `make check`; record results and set state `VERIFIED` only if the evidence is green.
7. **Limits:** 3 fix attempts per defect; then mark `BLOCKED` and escalate to the orchestrator/human.

## E2E specifics
- Use `playwright-best-practices` guidance: role/label locators, auto-waiting, no fixed sleeps, isolated data.
- Backend for E2E is started and restarted by a helper in `e2e/support/`; temp DB under `e2e/.tmp/`; credentials generated at run time.
- The 16-step workflow and the persistence scenario are required; the screenshot spec saves real PNGs to `docs/evidence/screenshots/`.

## Security review mode
Apply the checklist in `.github/skills/session-auth/review-checklist.md`; report findings as defects; read-only on production code.
