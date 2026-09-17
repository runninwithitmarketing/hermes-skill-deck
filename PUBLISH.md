# PUBLISH.md — local dev repo ↔ public release repo

This file tracks the relationship between the two repos so it's always clear
what is up to date where:

| | Local (dev) | Public (release) |
|---|---|---|
| Repo | `~/Desktop/Hermes Projects/1 - Hermes Skills Dashboard App` | `github.com/runninwithitmarketing/hermes-skill-deck` |
| Role | Where features get built and tested (`npm run app:build` → test app in `src-tauri/target/release/bundle/macos/`) | What the world sees; tagged `v*` builds the release DMGs via `.github/workflows/release.yml` |

## Rule of thumb

**All code and docs intended for users must be identical in both repos.**
If a file differs below and isn't listed under "Intentional differences",
one of the two repos is stale — sync it before the next release.

Shared (must match) — `server.py`, `agent.py`, `skill_ops.py`, `sync_skills.py`,
`stage-backend.js`, `requirements.txt`, `.env.example`, `package.json`,
`frontend/package.json`, everything under `frontend/src/`, `src-tauri/src/`,
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`,
`src-tauri/backend-stage/*.py`, `docs/screenshots/`, `PUBLISH.md`.

## Intentional differences (never sync these)

| Only in local | Why |
|---|---|
| `Design Concepts/`, `*_Build_Plan.md`, `CODEX_*.md` | private design/dev notes |
| `frontend/public/fonts/PPFragment*.woff2` | Pangram Pangram font, personal-use license — must not be redistributed |
| `frontend/.claude/`, `.zcode/`, `skills.db`, `.env` | machine-local / gitignored in public |
| `src-tauri/backend-stage/frontend/dist/` (tracked) | local build output; public regenerates it in CI |

| Only in public | Why |
|---|---|
| `LICENSE` (MIT) | public license |
| `.github/workflows/release.yml` | CI builds + attaches DMGs on `v*` tags |
| README "Download" / "Features" / "Fonts" / "License" sections | public-facing README; local README is the dev version |

The READMEs are intentionally different documents. When you change **content
that matters to both** (new section, screenshot table, model docs), apply it to
both by hand.

## How to publish (local → public)

1. Commit the work locally.
2. Copy the changed shared files into a clone of the public repo
   (everything in the "must match" list above).
3. Bump the version in `package.json`, `frontend/package.json`,
   `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (both repos) and let a
   local `npm run app:build` refresh `Cargo.lock`; copy it over too.
4. Commit + push the public repo, then `git tag vX.Y.Z && git push origin vX.Y.Z` —
   the Release workflow builds unsigned Apple Silicon + Intel DMGs.
5. Add a row to the log below.

## Sync log

| Date | Direction | What | Versions |
|---|---|---|---|
| 2026-09-16 | → public | v0.1.1: traversal fix, dock at all widths, GLM/Z.AI docs, hide empty boxes, id-based nav | 0.1.1 |
| 2026-09-16 | → public | "+" nav customization, first-run "Sync my own menus" card, dropdown clip + scrollbar fixes, folder delete fix, dock clearance | 0.1.1 (untagged) |
| 2026-09-16 | → public | v0.1.2: README screenshots + version bump; tagged release built | 0.1.2 |
| 2026-09-16 | ← local | `menu-cascades.png`, `quick-access.png`, corrected `terminal-mode.png` (added on GitHub), README table row mirrored | 0.1.2 |
| 2026-09-16 | → public | `Cargo.lock` refreshed to 0.1.2 | 0.1.2 |

**Current status: fully in sync (2026-09-16) — all shared files identical;
repos at v0.1.2. Repo is PRIVATE pending final review.**
