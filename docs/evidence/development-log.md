# Development log (append-only)

Template: `.github/skills/ai-dev-evidence/log-entry-template.md`. Only record what actually happened.

## 2026-10-30 - Planning (Phase 1)

- **Module:** Planning
- **Agent / AI tool (model):** GitHub Copilot Plan Mode in VS Code (model: not recorded)
- **Technical objective:** Produce an actionable plan for an autonomous multi-agent development environment for the Expense Tracker.
- **Reasoning / approach:** Read `project_assignment.md` and `plan.prompt.md`; fetched current VS Code and GitHub docs for custom agents, skills, prompt files, hooks and MCP, and skills.sh pages for candidate skills; compared session-cookie and JWT authentication; asked the user three clarification questions (Local harness, MCP, skill install location).
- **Key prompt:** see `docs/evidence/prompts.md` (2026-10-30 Planning).
- **Files created/changed:** none during planning (Plan mode is read-only); the plan was later stored as `docs/plan/master-plan.md`.
- **Testing:** n/a.
- **Challenge:** CHAL-01 - the plan assumed Python >= 3.12 and Node >= 22.20, but they could not be checked in Plan mode. Resolved in Phase 2 preflight (below).

## 2026-10-30 - Infrastructure setup (Phase 2)

- **Module:** Infrastructure
- **Agent / AI tool (model):** GitHub Copilot Agent Mode (Local harness) acting as the Infrastructure Setup Agent (model: not recorded)
- **Technical objective:** Create the AI development infrastructure under `.github/` (instructions, skills, agents, prompts, hooks, CI) plus docs seeds, Makefile and scripts, without any application code.
- **Reasoning / approach:** Followed tasks INF-01..INF-11 of the approved plan in order.
- **Preflight (INF-01), actual results:** git repo on `main` with no commits; system Python 3.10.12 (below 3.12), Node 22.13.1 (below 22.20), npm 10.9.2, GNU Make 4.3, `uv` and `jq` present. The user approved installing Python 3.12 through `uv python install 3.12` (result: Python 3.12.12) and `nvm install 22` (result: Node v22.23.4, npm 10.9.9).
- **CHAL-01 resolution:** toolchain upgrade above; `scripts/check-env.sh` now verifies it.
- **External skills (INF-05):** installed with `npx skills add <url> --skill <name> -a github-copilot --copy -y` (telemetry disabled) into `.agents/skills/`; reviewed: only markdown files plus one `metadata.json`, no executable scripts, no prompt-injection phrases found by grep; moved to `.github/skills/`; `.agents/` removed; `skills-lock.json` kept.
- **Hooks (INF-08):** Node scripts tested with 33 fixture events (see `docs/evidence/test-runs/infra.txt`).
- **Not verified:** whether Local accepts comma-separated `applyTo`, the tool aliases in agent front matter, and whether agent-scoped `PreToolUse` hooks fire; to be observed in Chat diagnostics and the first delegated task.
- **Note on `docs/plan/master-plan.md`:** it is a condensed copy of the approved plan, not a verbatim copy; the full text is in the Phase 1 chat transcript.

## 2026-10-30 - HC2 and first commit (Phase 2 close)

- **Module:** Infrastructure
- **Agent / AI tool (model):** GitHub Copilot Agent Mode (Local harness), model: not recorded
- **What happened:** The user answered the HC2 questions: enable `chat.useHooks` (done in user settings.json), check Copilot diagnostics (the agent cannot open the diagnostics view; it confirmed from VS Code's customization listing that 5 agents, 4 path instruction files and 10 skills are loaded; prompts and hooks are not in that listing and are not verified in the UI), approve a local commit, and asked whether the agent can create the GitHub repository.
- **CHAL-02:** VS Code's user settings (`files.trimTrailingWhitespace`, `files.insertFinalNewline`, `files.trimFinalNewlines`) reformatted 13 infrastructure files after they were created. Resolved by re-running `scripts/validate-infra.sh` (exit 0, 33/33 hook cases) to confirm nothing broke.
- **CHAL-03:** `gh` (GitHub CLI) is not installed and installing it needs sudo, so the agent cannot create the GitHub repository; the human creates it and pushes (the safety hook also blocks agent `git push` by design).
