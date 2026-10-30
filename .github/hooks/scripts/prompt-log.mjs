import { appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, readEvent } from "./lib.mjs";

const REDACTIONS = [
  [
    /\b(password|passwd|pwd|secret|token|api[_-]?key)\b(\s*[:=]\s*)\S+/gi,
    "$1$2[REDACTED]",
  ],
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/g, "Bearer [REDACTED]"],
  [/\b[A-Fa-f0-9]{40,}\b/g, "[REDACTED_HEX]"],
  [/\b[A-Za-z0-9+/_-]{48,}={0,2}/g, "[REDACTED_LONG]"],
];

const event = readEvent();
const dir = resolve(ROOT, "docs/evidence");
const prompt = typeof event.prompt === "string" ? event.prompt : "";
if (prompt && existsSync(dir)) {
  let text = prompt;
  for (const [re, rep] of REDACTIONS) text = text.replace(re, rep);
  const line = JSON.stringify({
    ts: event.timestamp ?? new Date().toISOString(),
    session: event.session_id ?? event.sessionId ?? null,
    prompt: text,
  });
  appendFileSync(resolve(dir, "prompt-log.jsonl"), `${line}\n`);
}
process.stdout.write("{}");
