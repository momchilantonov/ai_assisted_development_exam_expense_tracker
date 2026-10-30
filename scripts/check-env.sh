#!/usr/bin/env bash
# Verify the toolchain required by the plan. Exit 1 if anything is missing.
set -u
fail=0

note() { printf '%-10s %s\n' "$1" "$2"; }

# nvm is optional but this machine uses it for Node 22.x.
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null 2>&1
fi

if command -v python3.12 >/dev/null 2>&1; then
  note python "$(python3.12 --version) ($(command -v python3.12))"
elif command -v uv >/dev/null 2>&1 && uv python find 3.12 >/dev/null 2>&1; then
  note python "uv-managed $(uv python find 3.12)"
else
  note python "MISSING: Python 3.12 (run: uv python install 3.12)"; fail=1
fi

if command -v uv >/dev/null 2>&1; then note uv "$(uv --version)"; else note uv "not installed (venv fallback will be used)"; fi

if command -v node >/dev/null 2>&1; then
  v=$(node --version | sed 's/^v//')
  lowest=$(printf '%s\n22.20.0\n' "$v" | sort -V | head -1)
  if [ "$lowest" != "22.20.0" ]; then
    note node "v$v is below 22.20 (run: nvm install 22)"; fail=1
  else
    note node "v$v"
  fi
else
  note node "MISSING"; fail=1
fi

for tool in npm make git; do
  if command -v "$tool" >/dev/null 2>&1; then note "$tool" "$($tool --version | head -1)"; else note "$tool" "MISSING"; fail=1; fi
done

exit $fail
