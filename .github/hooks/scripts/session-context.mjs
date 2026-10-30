import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib.mjs";

const tasks = resolve(ROOT, "docs/tasks.md");
let context =
  "Expense tracker project: read docs/tasks.md and the latest docs/agent-handoffs.md entries before working; follow .github/copilot-instructions.md.";
if (existsSync(tasks)) {
  const text = readFileSync(tasks, "utf8");
  const phase =
    text.split("\n").find((l) => /^Current (phase|stage)/i.test(l)) ?? "";
  const counts = {};
  for (const m of text.matchAll(
    /\|\s*(TODO|IN_PROGRESS|BLOCKED|COMPLETED|VERIFIED)\s*\|/g,
  ))
    counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  const summary = Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  context += ` ${phase} Task states: ${summary || "n/a"}.`;
}
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
    additionalContext: context,
  }),
);
