---
description: Verify and bootstrap the development environment (toolchain, dependencies, browsers) and run the infrastructure validation.
agent: orchestrator
argument-hint: optional - "repair" to fix findings
---
Run an idempotent environment check and bootstrap. Do not implement application features.

1. Run `scripts/check-env.sh` (Python 3.12, Node >= 22.20, npm, make, git, uv). Record versions.
2. If `backend/`, `frontend/` or `e2e/` exist, run `make setup`; otherwise note they are not created yet.
3. Run `scripts/validate-infra.sh` and save the output with `scripts/check-all.sh`-style evidence under `docs/evidence/test-runs/`.
4. Print the manual prerequisites (setting `chat.useHooks`, trusted workspace, Local harness) and ask the human to confirm Chat diagnostics shows all agents, prompts, instructions and skills without errors.
5. Report: what passed, what failed, what is not verified. Append a short entry via the `ai-dev-evidence` skill.
