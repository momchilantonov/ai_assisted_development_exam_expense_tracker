import { existsSync } from "node:fs";
import { resolve } from "node:path";
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

const FROZEN = existsSync(resolve(ROOT, ".github/hooks/INFRA_FROZEN"));

const PROTECTED_FILES = [
  [/^project_assignment\.md$/, "project_assignment.md is frozen"],
  [/^plan\.prompt\.md$/, "plan.prompt.md is frozen"],
  [
    /(^|\/)\.env(?:\.(?!example$)[\w.-]+)?$/,
    "never write real .env files (secrets); edit .env.example placeholders only",
  ],
];

const COMMAND_RULES = [
  [
    /\bgit\s+(?:-C\s+\S+\s+)?push\b/,
    "git push requires explicit human approval (the human publishes)",
  ],
  [
    /\bgit\s+reset\s+--hard\b/,
    "git reset --hard is destructive; ask the human",
  ],
  [
    /\bgit\s+clean\b[^|;&\n]*-\w*f/,
    "git clean -f is destructive; ask the human",
  ],
  [/--no-verify\b/, "do not bypass git hooks"],
  [
    /\brm\s+-\w*[rR]\w*\s+(?:--\s+)?(?:\/(?:\s|$)|~|\$HOME|\.\.|\*|\.git\b|\.\s*$)/,
    "recursive rm of root, home, parent, wildcard or .git is blocked",
  ],
  [
    /\b(?:curl|wget)\b[^|;&\n]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/,
    "piping downloads into a shell is blocked",
  ],
  [/\bsudo\b/, "sudo is not allowed for agents; ask the human"],
  [/\bchmod\s+-R\s+0?777\b/, "chmod -R 777 is blocked"],
  [
    /\b(?:cat|less|more|head|tail|bat|grep|rg|sed|awk|printenv)\b[^|;&\n]*(?:^|[\s=/"'])\.env(?![.\w-])/,
    "do not read or print .env (secrets)",
  ],
];

const event = readEvent();
const name = toolName(event);
const input = toolInput(event);

function main() {
  if (isWriteTool(name)) {
    for (const p of extractPaths(input)) {
      for (const [re, why] of PROTECTED_FILES)
        if (re.test(p)) return deny(`Blocked write to ${p}: ${why}.`);
      if (
        FROZEN &&
        p.startsWith(".github/") &&
        !p.startsWith(".github/hooks/INFRA_FROZEN")
      ) {
        return deny(
          `Blocked write to ${p}: infrastructure is frozen after Phase 2 (delete .github/hooks/INFRA_FROZEN only with human approval).`,
        );
      }
    }
  }
  const command =
    typeof input.command === "string"
      ? input.command
      : typeof input.cmd === "string"
        ? input.cmd
        : "";
  if (command) {
    for (const [re, why] of COMMAND_RULES)
      if (re.test(command)) return deny(`Blocked command: ${why}.`);
  }
  allow();
}

main();
