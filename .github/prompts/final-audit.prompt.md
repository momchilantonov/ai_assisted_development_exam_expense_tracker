---
description: Final audit of requirements, evidence, secrets and repository state before human publication.
agent: orchestrator
---
Run DOC-05 (read-only except the audit result recorded in `docs/agent-handoffs.md` and `docs/tasks.md`).

1. Check every requirement in `project_assignment.md` and `plan.prompt.md` against `docs/assignment-evidence.md` and the files it cites; confirm cited files exist.
2. Run `make validate` and confirm it is green with saved output; confirm at least 2 real screenshots exist.
3. Secrets scan: `git ls-files` contains no `.env`, `*.db` or credentials; grep tracked files for passwords/tokens; `.env.example` has placeholders only.
4. Confirm `git status` is clean, no files outside ownership changed (`scripts/check-ownership.sh` for each agent), and the README commands work.
5. Report PASS/FAIL per item. Flag that the GitHub URL and Google Drive link are still to be provided by the human (HC5, HC6). Do not push.
