---
name: agent-handoff
description: Use at the start and end of every delegated task to report status, modified files, decisions, test results, known issues and next action, and to update the task board with evidence-based states.
---
# Agent handoff

## When
- Start: you receive a delegation with task IDs. Read `docs/tasks.md`, the latest `docs/agent-handoffs.md` entries and the files named in the prompt.
- End: always, even when blocked.

## Task states (evidence-based)
`TODO` -> `IN_PROGRESS` -> `BLOCKED` | `COMPLETED` -> `VERIFIED`
- `IN_PROGRESS`: you started it. `BLOCKED`: you cannot proceed; say why and who must act.
- `COMPLETED`: you finished and ran the checks; the handoff quotes command, exit code and result.
- `VERIFIED`: set only by an agent that did not implement the task, after re-running the check and linking its output. The orchestrator verifies with `make` targets; the testing agent verifies with tests.

## Steps
1. Run the relevant checks and keep the raw output (save to `docs/evidence/test-runs/` when it is a test run: `scripts/check-all.sh` does this).
2. Run `scripts/check-ownership.sh <your-agent>`; fix any violation (revert or hand the change to its owner).
3. Update only your rows in `docs/tasks.md` (state, evidence link).
4. Append a handoff block using [handoff-template.md](./handoff-template.md) to `docs/agent-handoffs.md`.
5. End your final message with the same block so the orchestrator receives it.

## Rules
- Never write "done"/"passes" without fresh evidence. If something was not run, write "not run".
- Contract or decision changes go in the block under "Decisions" and, if architectural, as an ADR in `docs/decisions.md`.
- Keep it short: facts, file paths, commands.
