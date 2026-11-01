---
description: Redesign the frontend to the Notion-style expenses tracker look in docs/design/ui-style-guide.md, keep behaviour and tests green, regenerate screenshots, pause for your review, then update all documentation.
agent: orchestrator
argument-hint: optional - extra design notes, or "skip-docs" to stop after the human review
---
Run tasks UI-01..UI-05 from `docs/tasks.md`. This changes presentation only.

1. Read `docs/design/ui-style-guide.md` and ADR-012 in `docs/decisions.md`. If images exist in `docs/design/reference/`, view them and adjust the tokens to match. The `premium-frontend-ui` skill was evaluated and rejected (see section 7 of the style guide); do not install or use it.
2. Delegate UI-01..UI-03 to `frontend` (skills: `react-feature-development`; `vercel-react-best-practices` for generic React rules only):
   - UI-01: design tokens, base styles and the page shell (top bar, page header with icon and title, buttons, inputs, tag pills, table styling) in `frontend/src/index.css` and the layout component.
   - UI-02: restyle the Expenses page (database-style table, category tags and icons, "All / This month / Past month" view tabs that only set the existing `date_from` and `date_to` filters) and the Dashboard (summary cards, tag-coloured category bars, recent-expenses table).
   - UI-03: restyle login, sign-up, expense form, delete dialog, toasts, empty, loading and error states; responsive at 360 px; motion rules from section 5 of the guide.
   - Constraints: no behaviour, API, contract or validation changes; no new dependencies; keep accessible names, roles and labels used by tests; update component tests only where markup was deliberately restructured; emoji icons are decorative (`aria-hidden`).
3. Verify yourself with `scripts/check-all.sh --e2e` (output saved) and `scripts/check-ownership.sh frontend`. Re-delegate failures (3 attempts per defect).
4. Delegate UI-04 to `testing`: regenerate `login.png`, `signup.png`, `expenses.png`, `dashboard.png` with the screenshot spec, add `expenses-mobile.png` at 360 px width and an E2E check that the Expenses page has no horizontal page scroll at 360 px; update `docs/test-report.md` with real results. The testing agent does not edit production code.
5. PAUSE for the human UI review: tell the human to run `make dev-backend` and `make dev-frontend`, open `http://localhost:5173`, and compare with the Notion template. End with a RUN PAUSED line whose reply text is `UI approved` (or a list of changes to make; apply them and repeat steps 3 to 5, at most 3 rounds).
6. After "UI approved" (skip when the argument says skip-docs), delegate UI-05 to `documentation`: update README (features, how to run, screenshots), `docs/architecture.md` (frontend section), the status and "implemented" notes in `docs/design/ui-style-guide.md`, `docs/assignment-evidence.md`, `docs/report/final-report.md` (final UI description and the new screenshots) and add a development-log entry with real results and any challenge. Historical records (development log entries, decisions, handoffs, prompts) are not rewritten. Do not claim anything that was not run.
7. Run `scripts/check-all.sh --e2e` one last time, commit each verified task locally (never push), update `docs/tasks.md`.

Finish with the run status marker line defined under Conventions in `.github/copilot-instructions.md`.
