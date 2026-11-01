// Structural validation of .github infrastructure and seeded docs. No dependencies.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
let failures = 0;
const ok = (m) => console.log(`PASS ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`FAIL ${m}`);
};
const check = (cond, m) => (cond ? ok(m) : bad(m));

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      out[key] = kv[2].trim();
    }
  }
  return out;
}

const list = (dir, ext) =>
  existsSync(resolve(root, dir))
    ? readdirSync(resolve(root, dir))
        .filter((f) => f.endsWith(ext))
        .sort()
    : [];

// instructions
check(
  existsSync(resolve(root, ".github/copilot-instructions.md")),
  "copilot-instructions.md exists",
);
const instr = list(".github/instructions", ".instructions.md");
check(instr.length === 4, `4 path instruction files (found ${instr.length})`);
for (const f of instr) {
  const fm = frontmatter(resolve(root, ".github/instructions", f));
  check(
    fm && fm.applyTo && fm.description,
    `instructions ${f} has applyTo and description`,
  );
}

// agents
const agentNames = [
  "orchestrator",
  "backend",
  "frontend",
  "testing",
  "documentation",
];
for (const a of agentNames) {
  const p = resolve(root, `.github/agents/${a}.agent.md`);
  if (!existsSync(p)) {
    bad(`agent ${a} exists`);
    continue;
  }
  const fm = frontmatter(p);
  check(
    fm && fm.name === a && fm.description && fm.tools,
    `agent ${a}: name, description, tools`,
  );
  if (a === "orchestrator") {
    check(
      agentNames.slice(1).every((n) => (fm?.agents ?? "").includes(n)) &&
        (fm?.tools ?? "").includes("agent"),
      "orchestrator can delegate to the 4 specialists",
    );
  }
}

// prompts
const prompts = [
  "setup-environment",
  "continue-development",
  "implement-auth",
  "implement-backend",
  "implement-frontend",
  "integrate-application",
  "generate-tests",
  "review-auth-security",
  "validate-application",
  "fix-defects",
  "generate-exam-documentation",
  "final-audit",
];
for (const p of prompts) {
  const path = resolve(root, `.github/prompts/${p}.prompt.md`);
  const fm = existsSync(path) ? frontmatter(path) : null;
  check(
    fm && fm.description && agentNames.includes(fm.agent),
    `prompt ${p}: description and valid agent`,
  );
}

// skills
const skills = [
  "fastapi-feature-development",
  "session-auth",
  "react-feature-development",
  "automated-testing",
  "ai-dev-evidence",
  "agent-handoff",
  "fastapi",
  "vercel-react-best-practices",
  "playwright-best-practices",
  "verification-before-completion",
];
for (const s of skills) {
  const path = resolve(root, `.github/skills/${s}/SKILL.md`);
  const fm = existsSync(path) ? frontmatter(path) : null;
  const valid =
    fm &&
    fm.name === s &&
    /^[a-z0-9-]{1,64}$/.test(s) &&
    fm.description &&
    fm.description.length <= 1024;
  check(valid, `skill ${s}: name matches directory, description <= 1024`);
}
const present = existsSync(resolve(root, ".github/skills"))
  ? readdirSync(resolve(root, ".github/skills")).filter((d) =>
      statSync(resolve(root, ".github/skills", d)).isDirectory(),
    )
  : [];
check(
  present.every((d) => skills.includes(d)),
  "no unexpected skill directories",
);
check(
  existsSync(resolve(root, "skills-lock.json")),
  "skills-lock.json present (provenance of external skills)",
);

// hooks
for (const h of ["safety", "quality", "context", "evidence"]) {
  const path = resolve(root, `.github/hooks/${h}.json`);
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    bad(`hook ${h}.json parses`);
    continue;
  }
  const commands = Object.values(cfg.hooks ?? {})
    .flat()
    .map((x) => x.command);
  const scripts = commands.map((c) => c.split(" ")[1]);
  check(
    cfg.version === 1 &&
      commands.length > 0 &&
      scripts.every((s) => existsSync(resolve(root, s))),
    `hook ${h}.json valid and scripts exist`,
  );
}

// agent-scoped hook scripts exist
check(
  existsSync(resolve(root, ".github/hooks/scripts/ownership-guard.mjs")),
  "ownership-guard.mjs exists",
);
check(
  existsSync(resolve(root, ".github/workflows/ci.yml")),
  "CI workflow exists",
);

// docs seeds
for (const f of [
  "docs/plan/master-plan.md",
  "docs/architecture.md",
  "docs/api-contract.md",
  "docs/decisions.md",
  "docs/tasks.md",
  "docs/agent-handoffs.md",
  "docs/defects.md",
  "docs/evidence/development-log.md",
  "docs/evidence/prompts.md",
  "README.md",
  ".env.example",
  ".gitignore",
  "Makefile",
]) {
  check(existsSync(resolve(root, f)), `${f} exists`);
}
const tasks = existsSync(resolve(root, "docs/tasks.md"))
  ? readFileSync(resolve(root, "docs/tasks.md"), "utf8")
  : "";
const ids = [
  ...Array.from(
    { length: 11 },
    (_, i) => `INF-${String(i + 1).padStart(2, "0")}`,
  ),
  "B-01",
  "B-02",
  "A-01",
  "A-02",
  "A-03",
  "A-04",
  "A-05",
  "A-06",
  "X-01",
  "X-02",
  "X-03",
  "X-04",
  "X-05",
  "X-06",
  "F-01",
  "F-02",
  "F-03",
  "F-04",
  "F-05",
  "F-06",
  "I-01",
  "T-01",
  "T-02",
  "T-03",
  "T-04",
  "T-05",
  "T-06",
  "DOC-01",
  "DOC-02",
  "DOC-03",
  "DOC-04",
  "DOC-05",
  "DOC-06",
];
check(
  ids.every((id) => tasks.includes(`| ${id} |`)),
  `docs/tasks.md lists all ${ids.length} tasks`,
);

// Phase 2 exit check only: application code is expected once Phase 3 has started.
const phase3Started = /Current phase: (?:[3-9]|2 complete)/.test(tasks);
check(
  phase3Started ||
    (!existsSync(resolve(root, "backend/app")) &&
      !existsSync(resolve(root, "frontend/src"))),
  "no application code before Phase 3",
);

console.log(
  failures === 0
    ? "structure: all checks passed"
    : `structure: ${failures} check(s) failed`,
);
process.exitCode = failures ? 1 : 0;
