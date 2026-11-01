// Usage: hook mode `node ownership-guard.mjs <agent>` (event JSON on stdin);
// check mode `node ownership-guard.mjs --check <agent> [--since <ref>]`.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  readEvent,
  toolName,
  toolInput,
  extractPaths,
  isWriteTool,
  deny,
  allow,
} from "./lib.mjs";

const SHARED = [
  /^docs\/tasks\.md$/,
  /^docs\/agent-handoffs\.md$/,
  /^docs\/decisions\.md$/,
  /^docs\/evidence\/development-log\.md$/,
  /^docs\/evidence\/prompts\.md$/,
];

const RULES = {
  orchestrator: [],
  backend: [
    /^backend\/(?!tests\/integration\/)/,
    /^docs\/api-contract\.md$/,
    /^Makefile$/,
    /^\.env\.example$/,
  ],
  frontend: [/^frontend\/(?!tests\/)/],
  testing: [
    /^backend\/tests\/integration\//,
    /^frontend\/tests\//,
    /^e2e\//,
    /^docs\/test-report\.md$/,
    /^docs\/defects\.md$/,
    /^docs\/evidence\/(?:test-runs|screenshots)\//,
  ],
  documentation: [
    /^docs\/(?!api-contract\.md$|test-report\.md$|defects\.md$|evidence\/(?:test-runs|screenshots)\/)/,
    /^README\.md$/,
    /^MCA85_ai_assisted_development_exam_expense_tracker\.(?:docx|txt)$/,
  ],
};

const NEVER = [
  [/^\.github\//, ".github/** is frozen for agents (human approval required)"],
  [/^scripts\//, "scripts/** is frozen for agents (human approval required)"],
  [/^project_assignment\.md$/, "project_assignment.md is frozen"],
  [/^plan\.prompt\.md$/, "plan.prompt.md is frozen"],
];

export function violation(agent, path) {
  if (!(agent in RULES)) return `unknown agent "${agent}"`;
  for (const [re, why] of NEVER) if (re.test(path)) return why;
  if (SHARED.some((re) => re.test(path))) return null;
  if (RULES[agent].some((re) => re.test(path))) return null;
  return `${path} is outside the ownership of the ${agent} agent`;
}

function changedFiles(since) {
  const run = (args) =>
    spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }).stdout ?? "";
  const files = new Set();
  const status = run(["status", "--porcelain=v1", "-uall"]);
  for (const line of status.split("\n")) {
    if (!line.trim()) continue;
    const p = line.slice(3);
    files.add(
      (p.includes(" -> ") ? p.split(" -> ")[1] : p).replace(/^"|"$/g, ""),
    );
  }
  if (since)
    for (const f of run(["diff", "--name-only", since]).split("\n"))
      if (f) files.add(f);
  return [...files];
}

function check(agent, since) {
  const bad = changedFiles(since)
    .map((f) => [f, violation(agent, f)])
    .filter(([, v]) => v);
  if (bad.length === 0) {
    console.log(`ownership OK for ${agent}`);
    return 0;
  }
  console.error(`ownership violations for ${agent}:`);
  for (const [f, v] of bad) console.error(`  ${f}: ${v}`);
  return 1;
}

function hook(agent) {
  const event = readEvent();
  if (!isWriteTool(toolName(event))) return allow();
  for (const p of extractPaths(toolInput(event))) {
    const why = violation(agent, p);
    if (why)
      return deny(
        `Ownership guard (${agent}): ${why}. Record the needed change in your handoff instead.`,
      );
  }
  allow();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--check") {
    const since =
      args.indexOf("--since") > -1
        ? args[args.indexOf("--since") + 1]
        : undefined;
    process.exitCode = check(args[1], since);
  } else {
    hook(args[0]);
  }
}
