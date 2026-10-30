---
description: Resume development after a pause or context loss - read the board and run the next unblocked tasks.
agent: orchestrator
argument-hint: optional - limit to a stage (B, C, D, E, F, G, H) or task IDs
---
Resume the build from the files, not from memory.

1. Read `docs/tasks.md`, the last 5 entries of `docs/agent-handoffs.md` and open defects in `docs/defects.md`.
2. Report the current phase/stage and which tasks are `TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `VERIFIED`.
3. Determine the next unblocked tasks (all dependencies `VERIFIED`/allowed `COMPLETED`). If a human checkpoint (HC2-HC6) is due, stop and ask.
4. Delegate them to the owning agents using the delegation template in the orchestrator instructions, verify the results yourself, update the board.
5. Stop after one stage gate or when blocked. End with the next action.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
