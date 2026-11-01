# Final submission brief

Used by `/create-final-document`. Target file (repository root, exact name):
`MCA85_ai_assisted_development_exam_expense_tracker.docx` (a plain-text copy `.txt` only if explicitly requested).
The human uploads it to Google Drive and sets "Anyone with the link can view". Do not claim that upload or sharing happened.

## 1. Requirements from `project_assignment.md` (follow strictly; use these headings)

| # | Assignment section | What the document must contain | Budget |
|---|---|---|---|
| 1 | Project idea and system requirements | Idea, purpose, users, functional requirements, stack, constraints | up to 1 page |
| 2 | System Architecture - Modules | The system broken into technological modules (Authentication, Backend API, Database and persistence, Frontend, Testing and integration) and how AI helped break it down; architecture diagram | about 1/2 page + diagram |
| 3 | Development Process per Module | For every module: Approach and reasoning; Step-by-step workflow (what the tool was asked to generate or modify); Testing strategy; AI tool choice (which tool and why); Key prompts or interactions (2 to 3) | up to 1/2 page per module |
| 4 | Challenges and Tool Comparison | Biggest challenges; which tool helped the most and why; what would be improved with more time | about 1/2 page |
| 5 | Working System Evidence | At least two screenshots of the functioning system (terminal, UI, logs, API result) | images + captions |
| 6 | Repository | Link to the GitHub repository with the source code | one line plus links |
| 7 | Submission format | Document suitable for Google Drive, typically 3 to 6 pages in total | measured |

Total length: 3 to 6 pages (A4, 11 pt, 2 cm margins). Measure by converting to PDF (see section 5); trim text, never shrink images below legibility.

## 2. Repository link map (add the matching link next to each requirement)

Base: `https://github.com/momchilantonov/ai_assisted_development_exam_expense_tracker`

| Where in the document | Link |
|---|---|
| Repository (section 6) | `<base>` |
| Working System Evidence (section 5) | `<base>/tree/main/docs/evidence` |
| Screenshots | `<base>/tree/main/docs/evidence/screenshots` |
| Test runs (saved outputs) | `<base>/tree/main/docs/evidence/test-runs` |
| Architecture (section 2) | `<base>/blob/main/docs/architecture.md` |
| API contract | `<base>/blob/main/docs/api-contract.md` |
| Decisions | `<base>/blob/main/docs/decisions.md` |
| Authentication module | `<base>/blob/main/backend/app/api/auth.py` and `<base>/blob/main/backend/app/services/auth.py` |
| Backend API module | `<base>/tree/main/backend/app/api` |
| Database and persistence module | `<base>/tree/main/backend/app/models` |
| Frontend module | `<base>/tree/main/frontend/src` |
| Testing and integration module | `<base>/tree/main/backend/tests`, `<base>/tree/main/frontend/tests`, `<base>/tree/main/e2e`, `<base>/blob/main/docs/test-report.md` |
| Key prompts | `<base>/blob/main/docs/evidence/prompts.md` and `<base>/tree/main/.github/prompts` |
| AI workflow setup (agents, skills, hooks) | `<base>/tree/main/.github` |
| Challenges and development log | `<base>/blob/main/docs/evidence/development-log.md` |

Verify every local path exists before citing it. Show links as readable text and as hyperlinks.

## 3. Images

Mandatory: at least 2 screenshots from `docs/evidence/screenshots/` (use the four current files: `login.png`, `signup.png`, `expenses.png`, `dashboard.png`; add `expenses-mobile.png` if it exists). Captions say what is shown and which file it is.

Useful additions (only if real and legible):
1. Architecture diagram from GitDiagram: https://gitdiagram.com/momchilantonov/ai_assisted_development_exam_expense_tracker . Preferred: render its Mermaid source (the page text contains a "Diagram (Mermaid)" block) to PNG; alternative: screenshot of the page with Playwright. Record the method and date. The diagram is AI-generated: cite it as such and check it against the code.
2. Repository digest from GitIngest: https://gitingest.com/momchilantonov/ai_assisted_development_exam_expense_tracker . It did not return readable content when fetched by the planning agent. Try once more; if it works, use real numbers (files, size, tokens) in a short "Additional resources" line; if not, list the URL as a resource and state that it could not be retrieved at build time. Never invent a digest.
3. Optional: a rendered image of the test summary (counts and exit codes from the latest `docs/evidence/test-runs/check-*.txt`) if the text version would take too much space.

Store prepared images in `docs/submission/images/` (PNG, at most 1600 px wide, each under about 500 KB) and keep sources there.

## 4. Content rules (honesty)

- Everything must trace to files in this repository: `docs/report/final-report.md` (starting text), `docs/evidence/*`, `docs/test-report.md`, `docs/decisions.md`, git history.
- AI tool choice: the tool used was GitHub Copilot in VS Code (Plan mode, Agent mode with custom agents, skills, prompt files, hooks). State the models only where the log records them; write "not recorded" otherwise. Compare only tools actually used (Copilot modes, agents versus single chat, models if recorded). Do not mention Claude Code, Cursor or Augment as used.
- Key prompts (2 to 3 per module): verbatim and redacted. Sources: `docs/evidence/prompts.md`; the reviewed `docs/evidence/prompt-log.jsonl` (raw hook log, gitignored; check it for secrets); the prompt files in `.github/prompts/` (cite file and quote the relevant lines); delegation prompts recorded in `docs/agent-handoffs.md`. State the source for each quoted prompt and append the chosen ones to `docs/evidence/prompts.md`. Never write a prompt that was not actually used.
- Design history: the final design is multi-user with open sign-up and per-user data. Mention in Challenges, in one short paragraph, that the first version was single-user, was changed after manual testing (ADR-011), and how the agents handled the change.
- The UI redesign (task UI-01..UI-05) must be reflected: describe the final UI and use the regenerated screenshots.
- No claims of publication, sharing or page counts that were not measured.

## 5. Build method (no repository dependencies are added)

- Content source: Markdown in `docs/submission/submission.md` (written by the documentation agent).
- Builder: `docs/submission/build_docx.py`, run with `uv run --with python-docx --with pillow python docs/submission/build_docx.py`; it creates the `.docx` in the repository root with headings, paragraphs, bullet lists, hyperlinks, tables, images and captions.
- Optional diagram capture: `docs/submission/capture-gitdiagram.mjs` using Playwright from `e2e/node_modules`, or `npx --yes @mermaid-js/mermaid-cli` against the Mermaid source with the Playwright Chromium. Use whichever works and record it.
- Page count: `soffice --headless --convert-to pdf --outdir docs/submission/build MCA85_ai_assisted_development_exam_expense_tracker.docx`, then count pages (for example `uv run --with pypdf python -c "..."`). Record the measured number in the handoff and development log. `docs/submission/build/` holds throwaway PDFs and is ignored by git.
- Verification: reopen the docx (python-docx) and check headings, number of images, hyperlinks; list unverified items.
