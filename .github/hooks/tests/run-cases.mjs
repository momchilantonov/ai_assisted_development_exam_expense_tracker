// Runs fixture events through the hook scripts and checks exit codes / output.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const cases = JSON.parse(readFileSync(resolve(here, "cases.json"), "utf8"));

let failed = 0;
for (const c of cases) {
  const input = JSON.stringify(c.input).replaceAll("__ROOT__", root);
  const r = spawnSync(
    "node",
    [resolve(here, "../scripts", c.script), ...c.args],
    { input, encoding: "utf8", cwd: root, timeout: 30000 },
  );
  const okExit = r.status === c.exit;
  const okOut = c.stdout === undefined || (r.stdout ?? "").includes(c.stdout);
  if (okExit && okOut) {
    console.log(`PASS ${c.name}`);
  } else {
    failed += 1;
    console.log(
      `FAIL ${c.name} (exit ${r.status}, expected ${c.exit}; stdout: ${(r.stdout ?? "").slice(0, 120)}; stderr: ${(r.stderr ?? "").slice(0, 160)})`,
    );
  }
}
console.log(`${cases.length - failed}/${cases.length} hook cases passed`);
process.exitCode = failed ? 1 : 0;
