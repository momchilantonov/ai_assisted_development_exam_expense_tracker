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
| At least two screenshots / proof the system works | `docs/evidence/screenshots/{login,signup,expenses,dashboard,expenses-mobile}.png` (restyled UI, viewed by the documentation agent); `docs/evidence/test-runs/check-20261101T145021Z.txt` (exit 0: backend 389, frontend 72, E2E 5 passed) | DONE; human review of screenshots pending (HUMAN) |
| Link to GitHub repository | URL confirmed by the human, present in `docs/report/final-report.md` and `README.md` (push status not verified) | DONE |
| Google Drive document, anyone with the link can view | not done by agents | HUMAN |
| 3-6 pages total | `docs/report/final-report.md` (page count not measured; check after export) | NOT VERIFIED |

## Gaps

- Verbatim key prompts for the backend, auth, database, frontend and testing modules were not recorded (`prompt-log.jsonl` is gitignored and was not reviewed or copied by the documentation agent).
- The planning and infrastructure model is not recorded.
- Chat diagnostics UI, hooks firing in Local, and agent-scoped hooks were not verified.
- `make setup` and the dev servers were not re-run in the documentation step.
- mypy not installed; non-Chromium browsers not run. 360 px was checked only for page-level scroll plus a screenshot (DEF-006 CSS fixes after the last full run were verified by the frontend agent's specs, a final `check-all` is pending).
- UI: the cover banner image (`frontend/src/assets/cover.jpg`) is user-supplied and AI-generated; licence/attribution not recorded (HUMAN). Contrast not measured; no pixel diff against the design reference.
- Screenshot file names do not follow `NN-description.png`.
