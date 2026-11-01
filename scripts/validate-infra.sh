#!/usr/bin/env bash
# Validate the AI development infrastructure (Phase 2 exit check).
set -uo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null 2>&1
fi

fail=0
step() { echo; echo "== $1"; }

step "toolchain"
scripts/check-env.sh || fail=1

step "structure, front-matter, skills, hooks, docs"
node scripts/validate-infra.mjs || fail=1

step "hook fixtures"
node .github/hooks/tests/run-cases.mjs | tail -3
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "make targets parse"
make -n check >/dev/null && echo "make -n check OK" || { echo "make -n check FAILED"; fail=1; }
make help >/dev/null && echo "make help OK" || fail=1

step "ownership script runs"
scripts/check-ownership.sh orchestrator >/dev/null 2>&1; rc=$?
{ [ $rc -eq 0 ] || [ $rc -eq 1 ]; } && echo "check-ownership.sh runs (exit $rc is informational here)" || { echo "check-ownership.sh failed to run"; fail=1; }

step "secrets hygiene"
if git ls-files --error-unmatch .env >/dev/null 2>&1; then echo "FAIL .env is tracked"; fail=1; else echo "OK .env not tracked"; fi
if grep -Eq '^INITIAL_PASSWORD=.+' .env.example; then echo "FAIL .env.example has a password value"; fail=1; else echo "OK .env.example has placeholders only"; fi
if [ -d .agents ]; then echo "FAIL .agents/ still exists (skills must live in .github/skills)"; fail=1; else echo "OK no .agents/ directory"; fi

step "manual prerequisites (cannot be verified by script)"
cat <<'EOF'
 1. VS Code setting chat.useHooks is enabled and the workspace is trusted.
 2. Local harness selected in the Chat view (prompt files and handoffs need it).
 3. Chat > right-click > Diagnostics lists 5 agents, 14 prompts, 5 instruction files,
    10 skills and 4 hook files without errors.
 4. UNVERIFIED until observed: applyTo comma-separated globs; tool aliases
    (read/search/edit/execute/agent/todo); agent-scoped PreToolUse hooks firing in Local;
    parallel write-capable subagents.
EOF

echo
if [ $fail -eq 0 ]; then echo "validate-infra: PASS"; else echo "validate-infra: FAIL"; fi
exit $fail
