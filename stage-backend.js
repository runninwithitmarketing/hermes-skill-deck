#!/usr/bin/env node
// Stages the Python backend + built frontend into src-tauri/backend-stage/ so
// Tauri can bundle them as resources (see `bundle.resources` in tauri.conf.json).
//
// Run automatically by `tauri build` via `build.beforeBuildCommand`. Produces:
//   src-tauri/backend-stage/
//     ├─ server.py, agent.py, skill_ops.py, sync_skills.py  (copied from root)
//     ├─ requirements.txt                                    (copied from root)
//     ├─ ensure_venv.py, run_backend.py                      (app-specific, kept in place)
//     └─ frontend/dist/   ← the compiled frontend the backend serves in prod
//
// NOTE: the frontend MUST be staged or the backend's SPA fallback returns
// {"detail":"frontend build not found"}. Build the frontend first:
//   npm --prefix frontend run build

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STAGE_DIR = join(__dirname, "src-tauri", "backend-stage");
const FRONTEND_DIST = join(__dirname, "frontend", "dist");
const STAGE_DIST = join(STAGE_DIR, "frontend", "dist");

// These live at the project root and get copied INTO backend-stage/ on every
// build, so edits to the dashboard backend are picked up.
const ROOT_FILES = [
  "server.py",
  "agent.py",
  "skill_ops.py",
  "sync_skills.py",
  "requirements.txt",
];

// Copied when present so the bundled backend keeps its API keys (the packaged
// app's server reads the .env sitting next to it). The staged copy must stay
// gitignored — never commit it.
const OPTIONAL_SECRET_FILES = [".env"];

// Backend-stage is append/refresh: create it if missing, refresh root files in
// place, and rebuild frontend/dist — but never wipe the app-specific helpers
// (ensure_venv.py, run_backend.py) that only live here.
mkdirSync(STAGE_DIR, { recursive: true });

for (const file of ROOT_FILES) {
  const src = join(__dirname, file);
  if (!existsSync(src)) {
    console.error(`[stage-backend] missing source file: ${file}`);
    process.exit(1);
  }
  copyFileSync(src, join(STAGE_DIR, file));
  console.log(`[stage-backend] copied ${file}`);
}

for (const file of OPTIONAL_SECRET_FILES) {
  const src = join(__dirname, file);
  if (existsSync(src)) {
    copyFileSync(src, join(STAGE_DIR, file));
    console.log(`[stage-backend] copied ${file} (gitignored secret)`);
  } else {
    console.warn(`[stage-backend] note: ${file} not found — bundled app will lack its keys`);
  }
}

// Copy the built frontend (recursive). Critical — see file header.
if (!existsSync(FRONTEND_DIST)) {
  console.error(
    "[stage-backend] frontend/dist not found — run `npm --prefix frontend run build` first"
  );
  process.exit(1);
}
rmSync(STAGE_DIST, { recursive: true, force: true });
cpSync(FRONTEND_DIST, STAGE_DIST, { recursive: true });
console.log(
  `[stage-backend] staged frontend/dist (${readdirSync(STAGE_DIST).length} top-level entries)`
);

console.log(`[stage-backend] done → ${STAGE_DIR}`);
