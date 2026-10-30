# AI-Driven Expense Tracker

A single-user expense tracker (FastAPI + SQLite backend, React + TypeScript + Vite frontend) built entirely by specialised GitHub Copilot agents as an AI-assisted development exam project.

> Status: Phase 2 (AI development infrastructure) only. The application is not implemented yet. This README is finalised in Phase 5.

## Prerequisites

- Python 3.12+ (this machine uses `uv python install 3.12`)
- Node.js 22.20+ with npm (`nvm install 22`)
- `make`, `git`
- VS Code with GitHub Copilot, Local harness, `chat.useHooks` enabled and the workspace trusted

## Initial user (to be implemented in Stage C)

Copy `.env.example` to `.env`, set `INITIAL_USERNAME` (and optionally `INITIAL_PASSWORD`; if empty you are prompted), then run `make seed-user`. Re-running never overwrites an existing password; use `--reset-password` explicitly.

## Where things are

- `.github/` - agents, instructions, skills, prompts, hooks, CI
- `docs/` - plan, architecture, API contract, task board, handoffs, evidence
- `Makefile` - `make help` lists all targets; `make validate-infra` checks the AI infrastructure
