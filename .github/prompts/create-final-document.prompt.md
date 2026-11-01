---
description: Create the final Google Drive document MCA85_ai_assisted_development_exam_expense_tracker.docx in the repository root, strictly following project_assignment.md, with images, repository links and real evidence.
agent: documentation
argument-hint: optional - "txt" to also write a plain-text copy
---
Execute tasks SUB-01..SUB-03 from `docs/tasks.md`. Run this after `/refine-ui` is finished, so the document shows the final UI.

1. Read `project_assignment.md` completely, then `docs/submission/brief.md` (requirements table, link map, image plan, honesty rules, build method). Follow the assignment headings and budgets strictly.
2. Inventory the evidence: `docs/report/final-report.md` (starting text), `docs/evidence/*`, `docs/test-report.md`, `docs/decisions.md`, `docs/architecture.md`, `git log`, the latest `docs/evidence/test-runs/check-*.txt` for real numbers. List gaps instead of filling them.
3. Collect key prompts (2 to 3 per module, verbatim, redacted) from the sources named in the brief, state the source of each, and append the chosen ones to `docs/evidence/prompts.md`.
4. Prepare images in `docs/submission/images/`: the current screenshots from `docs/evidence/screenshots/` (at least 2 are mandatory), the GitDiagram architecture diagram (render the Mermaid source from https://gitdiagram.com/momchilantonov/ai_assisted_development_exam_expense_tracker, or capture the page), and the GitIngest resource (try https://gitingest.com/momchilantonov/ai_assisted_development_exam_expense_tracker; if it returns nothing readable, list the URL only and say so).
5. Write `docs/submission/submission.md` (one section per assignment requirement, with the repository link for each as listed in the link map), write `docs/submission/build_docx.py` and build `MCA85_ai_assisted_development_exam_expense_tracker.docx` in the repository root with the command given in the brief. Add a `.txt` copy only if the argument says so.
6. Verify: convert to PDF with LibreOffice and measure the page count (target 3 to 6; trim text if more); reopen the docx and check the headings, images, hyperlinks and that every cited local path exists. Record the real page count and any unverified item. Do not claim Google Drive upload or sharing.
7. Hand off with the exact commands and results, add a development-log entry, update `docs/tasks.md` rows SUB-01..SUB-03 and commit locally (never push). Tell the human: open the docx, check the images and numbers, upload to Google Drive, set "Anyone with the link can view", and submit the link.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
