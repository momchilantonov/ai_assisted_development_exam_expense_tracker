# Prompts (verbatim, secrets redacted)

Curated key prompts for the report. Format per entry: date, module, agent/tool, prompt, outcome. Raw hook log `prompt-log.jsonl` is gitignored; review it before copying anything here.

## 2026-10-30 - Planning - GitHub Copilot Plan Mode

Prompt: the full text of `plan.prompt.md` (MASTER PLANNING PROMPT, repository root) with the additional instruction "Use .github folder for all MAD tools".
Outcome: approved architecture and agent plan, stored (condensed) in `docs/plan/master-plan.md`. User answered three clarification questions: Local harness; no MCP; skills moved from `.agents/skills/` into `.github/skills/`.

## 2026-10-30 - Infrastructure - GitHub Copilot Agent Mode

Prompt: "Start implementation" (user message approving the plan; the setup procedure is section P of the plan, tasks INF-01..INF-11).
Outcome: see `docs/evidence/development-log.md`.
