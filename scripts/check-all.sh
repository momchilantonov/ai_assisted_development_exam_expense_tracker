#!/usr/bin/env bash
# Run make check (and E2E with --e2e), saving the full output as evidence.
set -uo pipefail
cd "$(dirname "$0")/.."

out_dir=docs/evidence/test-runs
mkdir -p "$out_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$out_dir/check-$stamp.txt"

{
  echo "# command: make check${1:+ + make test-e2e}"
  echo "# started: $(date -u +%FT%TZ)"
} > "$file"

make check 2>&1 | tee -a "$file"
status=${PIPESTATUS[0]}

if [ "${1:-}" = "--e2e" ] && [ "$status" -eq 0 ]; then
  make test-e2e 2>&1 | tee -a "$file"
  status=${PIPESTATUS[0]}
fi

echo "# finished: $(date -u +%FT%TZ) exit=$status" | tee -a "$file"
echo "evidence saved to $file"
exit "$status"
