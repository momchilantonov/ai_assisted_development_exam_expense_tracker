# Assignment evidence matrix

Maps each requirement of `project_assignment.md` to files. Status: DONE (evidence exists), PARTIAL, HUMAN (needs the human), GAP.

| Requirement | Evidence | Status |
|---|---|---|
| Choose a project; describe idea and requirements in up to 1 page | `docs/report/final-report.md` section 1; `docs/plan/master-plan.md` | DONE (page length not measured) |
| Break the system into technological modules with AI | `docs/decisions.md` ADR-001; `docs/architecture.md` (5 modules); report section 2 | DONE |
| Per module: approach and reasoning | report section 2, `docs/decisions.md` ADR-002..005 | DONE |
| Per module: step-by-step workflow | report section 2; `docs/evidence/development-log.md`; `docs/agent-handoffs.md` | DONE |
| Per module: testing strategy | report section 2; `docs/test-report.md`; `docs/defects.md`; `docs/evidence/test-runs/` | DONE |
| Per module: AI tool choice and why | report section 2 (only GitHub Copilot was used) | DONE |
| Per module: 2-3 key prompts | `docs/evidence/prompts.md` holds 2 prompts (planning, infrastructure); report section 3 lists 3 including the documentation prompt. Modules 1-5 have no recorded verbatim prompt | PARTIAL (gap) |
| Each module up to half a page | report section 2 (length not measured) | NOT VERIFIED |
| Challenges | report section 4; `CHAL-01..04` in the development log | DONE |
| Which tool helped most and why | report section 4 (single tool; no comparison possible) | DONE (honest limit) |
| What to improve | report section 6 | DONE |
| At least two screenshots / proof the system works | `docs/evidence/screenshots/{login,expenses,dashboard}.png`; `docs/evidence/test-runs/check-20261101T005613Z.txt` | DONE; human review of screenshots pending (HUMAN) |
| Link to GitHub repository | placeholder `<GITHUB_URL_TO_BE_ADDED_BY_HUMAN>` in the report; URL recorded in the development log and README | HUMAN |
| Google Drive document, anyone with the link can view | not done by agents | HUMAN |
| 3-6 pages total | `docs/report/final-report.md` (page count not measured; check after export) | NOT VERIFIED |

## Gaps

- Verbatim key prompts for the backend, auth, database, frontend and testing modules were not recorded (`prompt-log.jsonl` is gitignored and was not reviewed or copied by the documentation agent).
- The planning and infrastructure model is not recorded.
- Chat diagnostics UI, hooks firing in Local, and agent-scoped hooks were not verified.
- `make setup`, `make seed-user` and dev servers were not re-run in the documentation step.
- mypy not installed; 360 px and non-Chromium browsers not run.
- Screenshot file names do not follow `NN-description.png`.
