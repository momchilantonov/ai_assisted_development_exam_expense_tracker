#!/usr/bin/env bash
# Usage: scripts/check-ownership.sh <orchestrator|backend|frontend|testing|documentation> [--since <git-ref>]
# Compares changed files (git status, optionally plus diff since a ref) with the agent's ownership.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "usage: $0 <agent> [--since <ref>]" >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null 2>&1
fi

exec node .github/hooks/scripts/ownership-guard.mjs --check "$@"
