import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const E2E_DIR = resolve(here, "..");
const REPO = resolve(E2E_DIR, "..");
const BACKEND_DIR = join(REPO, "backend");
const FRONTEND_DIR = join(REPO, "frontend");
const TMP_ROOT = join(E2E_DIR, ".tmp");
const STATE_FILE = join(TMP_ROOT, "state.json");

// The Vite dev proxy targets 127.0.0.1:8000, so these ports are fixed.
export const BACKEND_URL = "http://127.0.0.1:8000";
export const FRONTEND_URL = "http://127.0.0.1:5173";

interface State {
  runDir: string;
  databaseUrl: string;
  backendPid: number;
  frontendPid: number;
}

function readState(): State {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
}

function writeState(state: State): void {
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function waitFor(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function isUp(url: string): Promise<boolean> {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

function backendEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    ALLOWED_ORIGINS: `${FRONTEND_URL},http://localhost:5173`,
    COOKIE_SECURE: "false",
    APP_TIMEZONE: "UTC",
  };
}

function startBackend(databaseUrl: string): number {
  const child = spawn(
    join(BACKEND_DIR, ".venv/bin/python"),
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: BACKEND_DIR,
      env: backendEnv(databaseUrl),
      stdio: "ignore",
      detached: true,
    },
  );
  child.unref();
  return child.pid!;
}

function killTree(pid: number): void {
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // already gone
  }
}

async function waitGone(url: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (!(await isUp(url))) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${url} still answering after stop`);
}

/** Creates a temp DB, provisions the user (runtime credentials), starts both servers. */
export async function startAll(): Promise<void> {
  for (const url of [`${BACKEND_URL}/api/health`, FRONTEND_URL]) {
    if (await isUp(url)) {
      throw new Error(
        `${url} is already in use; stop the dev server before running E2E`,
      );
    }
  }
  mkdirSync(TMP_ROOT, { recursive: true });
  const runDir = mkdtempSync(join(TMP_ROOT, "run-"));
  const databaseUrl = `sqlite:///${join(runDir, "e2e.db")}`;

  // Generated per run, kept in memory/env only; never written to disk or logged.
  const username = "e2e-user";
  const password = randomBytes(18).toString("base64url");
  process.env.E2E_USERNAME = username;
  process.env.E2E_PASSWORD = password;

  const seed = spawnSync(
    join(BACKEND_DIR, ".venv/bin/python"),
    ["-m", "app.cli", "create-user"],
    {
      cwd: BACKEND_DIR,
      env: {
        ...backendEnv(databaseUrl),
        INITIAL_USERNAME: username,
        INITIAL_PASSWORD: password,
      },
      encoding: "utf8",
    },
  );
  if (seed.status !== 0)
    throw new Error(`create-user failed (exit ${seed.status})`);

  const backendPid = startBackend(databaseUrl);
  const frontend = spawn(
    "npx",
    ["vite", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { cwd: FRONTEND_DIR, env: process.env, stdio: "ignore", detached: true },
  );
  frontend.unref();
  writeState({ runDir, databaseUrl, backendPid, frontendPid: frontend.pid! });

  try {
    await waitFor(`${BACKEND_URL}/api/health`);
    await waitFor(FRONTEND_URL);
  } catch (error) {
    await stopAll();
    throw error;
  }
}

/** Stops the backend and starts it again on the same database file. */
export async function restartBackend(): Promise<void> {
  const state = readState();
  killTree(state.backendPid);
  await waitGone(`${BACKEND_URL}/api/health`);
  state.backendPid = startBackend(state.databaseUrl);
  writeState(state);
  await waitFor(`${BACKEND_URL}/api/health`);
}

export async function stopAll(): Promise<void> {
  let state: State;
  try {
    state = readState();
  } catch {
    return;
  }
  killTree(state.backendPid);
  killTree(state.frontendPid);
  rmSync(state.runDir, { recursive: true, force: true });
  rmSync(STATE_FILE, { force: true });
}
