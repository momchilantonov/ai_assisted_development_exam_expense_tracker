---
description: Read-only authentication security review using the session-auth checklist.
agent: testing
---
Review authentication in review mode (read-only on production code).

1. Open `.github/skills/session-auth/review-checklist.md` and evaluate every item against the code, the running app or tests, marking PASS / FAIL / NOT RUN with evidence (file path, test name or command output).
2. Run the auth integration tests and the route-guard test; quote results.
3. Check `git ls-files` for committed secrets and `.env`.
4. File every FAIL as a defect (`DEF-nnn`) in `docs/defects.md` with owner and reproduction.
5. Summarise in `docs/test-report.md` and hand off. This is the input for human checkpoint HC3.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
