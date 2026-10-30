import { readFileSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export function readEvent() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const toolName = (e) => String(e.tool_name ?? e.toolName ?? "");

export function toolInput(e) {
  const v = e.tool_input ?? e.toolArgs ?? {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return { raw: v };
    }
  }
  return v;
}

// Write-capable tool names differ per harness, so match by verb.
export function isWriteTool(name) {
  return (
    /(create|edit|replace|insert|write|patch|rename|delete|move|apply)/i.test(
      name,
    ) && !/(read|view|search|list|grep|errors|usages)/i.test(name)
  );
}

const PATH_KEYS = new Set([
  "filepath",
  "path",
  "file",
  "uri",
  "oldpath",
  "newpath",
  "destination",
  "target",
  "files",
  "paths",
]);

// Returns repo-relative posix paths; paths outside the repository are dropped.
function normalise(p) {
  let s = String(p).replace(/^file:\/\//, "");
  if (isAbsolute(s)) {
    const rel = relative(ROOT, s);
    if (rel.startsWith("..") || isAbsolute(rel)) return null;
    s = rel;
  }
  return s.replace(/^\.\//, "").split("\\").join("/");
}

export function extractPaths(input) {
  const out = new Set();
  const add = (p) => {
    const n = normalise(p);
    if (n) out.add(n);
  };
  const walk = (v, key = "") => {
    if (typeof v === "string") {
      if (PATH_KEYS.has(key.toLowerCase())) add(v);
      for (const m of v.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm))
        add(m[1].trim());
      for (const m of v.matchAll(/^\*\*\* Move to: (.+)$/gm)) add(m[1].trim());
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, key));
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) walk(x, k);
    }
  };
  walk(input);
  return [...out];
}

export function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    }),
  );
  process.stderr.write(`${reason}\n`);
  process.exitCode = 2;
}

export function allow() {
  process.stdout.write("{}");
}
