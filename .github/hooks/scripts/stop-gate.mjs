import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, readEvent } from "./lib.mjs";

const STATE = resolve(ROOT, ".github/hooks/.last-stop-gate");
const event = readEvent();

function finish(reason) {
  if (!reason) {
    process.stdout.write("{}");
    return;
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "Stop", decision: "block", reason },
      decision: "block",
      reason,
    }),
  );
}

function main() {
  // Already forced to continue once: let the agent stop to avoid loops.
  if (event.stop_hook_active || event.stopHookActive) return finish();

  const status =
    spawnSync("git", ["status", "--porcelain=v1", "-uall"], {
      cwd: ROOT,
      encoding: "utf8",
    }).stdout ?? "";
  const files = status
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, ""));
  const backend = files.filter((f) => f.startsWith("backend/"));
  const frontend = files.filter((f) => f.startsWith("frontend/"));
  if (!backend.length && !frontend.length) return finish();

  const hash = createHash("sha1");
  for (const f of [...backend, ...frontend]) {
    try {
      const s = statSync(resolve(ROOT, f));
      hash.update(`${f}:${s.size}:${s.mtimeMs}\n`);
    } catch {
      hash.update(`${f}:deleted\n`);
    }
  }
  const fingerprint = hash.digest("hex");
  if (existsSync(STATE) && readFileSync(STATE, "utf8") === fingerprint)
    return finish();
  writeFileSync(STATE, fingerprint);

  const targets = [];
  if (
    backend.length &&
    existsSync(resolve(ROOT, "backend/.venv")) &&
    existsSync(resolve(ROOT, "backend/app"))
  ) {
    targets.push("lint-backend", "test-backend");
  }
  if (frontend.length && existsSync(resolve(ROOT, "frontend/node_modules"))) {
    targets.push("lint-frontend", "typecheck-frontend", "test-frontend");
  }
  const failures = [];
  for (const t of targets) {
    const r = spawnSync("make", [t], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 600000,
    });
    if (r.status !== 0) {
      const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`
        .trim()
        .split("\n")
        .slice(-40)
        .join("\n");
      failures.push(`make ${t} exited ${r.status ?? "timeout"}:\n${tail}`);
    }
  }
  if (failures.length) {
    return finish(
      `Fast quality gate failed; fix before finishing (or report the failure honestly in your handoff):\n\n${failures.join("\n\n")}`,
    );
  }
  finish();
}

main();
