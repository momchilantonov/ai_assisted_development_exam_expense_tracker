import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  ROOT,
  readEvent,
  toolName,
  toolInput,
  extractPaths,
  isWriteTool,
} from "./lib.mjs";

const event = readEvent();
if (isWriteTool(toolName(event))) {
  const ruff = resolve(ROOT, "backend/.venv/bin/python");
  if (existsSync(ruff)) {
    for (const p of extractPaths(toolInput(event))) {
      if (
        p.startsWith("backend/") &&
        p.endsWith(".py") &&
        existsSync(resolve(ROOT, p))
      ) {
        spawnSync(ruff, ["-m", "ruff", "format", p], {
          cwd: ROOT,
          timeout: 15000,
        });
      }
    }
  }
}
process.stdout.write("{}");
