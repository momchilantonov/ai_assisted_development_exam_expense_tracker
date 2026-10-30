---
name: ai-dev-evidence
description: Use after any significant development step to record real evidence for the exam report - development-log entries, verbatim key prompts, decisions, challenges, test outputs and screenshots. Never fabricate.
---
# AI development evidence

The exam report is built from this evidence. Record only what actually happened.

## When
After finishing a task, after a notable problem (challenge), when you used a prompt worth showing, and when a test run or screenshot is produced.

## Steps
1. **Log entry:** append to `docs/evidence/development-log.md` using [log-entry-template.md](./log-entry-template.md). Module is one of: Authentication, Backend API, Database and persistence, Frontend, Testing and integration (or Infrastructure/Planning/Documentation).
2. **Key prompts:** if the prompt that drove the work is instructive, append it verbatim to `docs/evidence/prompts.md` with module, agent, date and outcome. Redact secrets as `[REDACTED]`. Aim for 2-3 representative prompts per module, not all.
3. **Challenges:** give each a `CHAL-nn` id (next free number) with what went wrong, how it was diagnosed and how it was fixed. Only real ones.
4. **Test output:** store raw output under `docs/evidence/test-runs/` (use `scripts/check-all.sh`); cite file name, command, exit code and counts.
5. **Screenshots:** only the Playwright screenshot spec writes to `docs/evidence/screenshots/`; log the file names.
6. **Model/tool:** note which agent and, if visible, which model ran the step. Unknown -> write "model: not recorded".

## Rules
- No invented prompts, results, challenges, screenshots or URLs; use "not verified" where applicable.
- The raw hook log `docs/evidence/prompt-log.jsonl` is gitignored; copy from it only after reading it for secrets.
- Entries are append-only; correct mistakes with a new entry that references the old one.
