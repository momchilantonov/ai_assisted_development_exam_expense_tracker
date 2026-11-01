---
name: Documentation and evidence conventions
description: How to record decisions, development progress, real prompts, test results, challenges and screenshots for the exam report.
applyTo: 'docs/**,README.md'
---
# Documentation and evidence conventions

## Files
- `docs/architecture.md` (diagram, modules), `docs/api-contract.md` (backend-owned), `docs/decisions.md` (ADRs, append-only), `docs/tasks.md` (board), `docs/agent-handoffs.md` (append-only), `docs/test-report.md` and `docs/defects.md` (testing-owned), `docs/assignment-evidence.md`, `docs/report/final-report.md`, `docs/evidence/{development-log.md,prompts.md,test-runs/,screenshots/}`.

## Rules
- Everything recorded must have happened. Mark unknowns "not verified". Never invent prompts, results, screenshots, challenges or the repository URL (use `<GITHUB_URL_TO_BE_ADDED_BY_HUMAN>`).
- Decisions: ADR entries `ADR-nnn` with context, decision, alternatives, consequences, date.
- Development log: one entry per significant step with module, agent/tool, model if known, reasoning, steps, key prompt reference, files, tests with actual results, challenge, solution (use the `ai-dev-evidence` skill). Challenges are tagged `CHAL-nn`.
- Prompts: `docs/evidence/prompts.md` holds verbatim prompts (redact secrets with `[REDACTED]`); raw hook log `prompt-log.jsonl` is gitignored and must be reviewed before anything is copied.
- Test results: link to saved outputs in `docs/evidence/test-runs/`; quote counts and exit codes exactly.
- Screenshots: only real captures of the running app saved in `docs/evidence/screenshots/` by the Playwright screenshot spec; name `NN-description.png`; the report cites file names. A human reviews them for sensitive data before publication.
- Report (`final-report.md`): 3-6 pages: overview (<= 1 page), 5 modules at <= 1/2 page each (approach, workflow, testing, AI tool choice and why, 2-3 key prompts), challenges and honest tool comparison (only tools actually used), screenshots, repository link, possible improvements.
- Do not claim Google Drive publication or sharing occurred; the human uploads and sets "anyone with the link can view".
- Final submission file: follow `docs/submission/brief.md` and `project_assignment.md` strictly; file name `MCA85_ai_assisted_development_exam_expense_tracker.docx` in the repository root; every image and number must come from a real file or run; UI design rules live in `docs/design/ui-style-guide.md`.
