# Hermes Skill Deck

Hermes Skill Deck is a local dashboard for browsing Hermes Agent skills from your filesystem. It syncs `SKILL.md` files from `~/.hermes/skills/` and `~/.hermes/profiles/*/skills/` into SQLite, then serves them through a FastAPI backend and a React/Vite/Tailwind frontend. A built-in **Terminal Mode** adds an AI agent (GLM / Claude / OpenAI / DeepSeek) that searches your skills and can create or delete them in natural language.

## Download

Prebuilt macOS bundles (Apple Silicon + Intel) are attached to [GitHub Releases](https://github.com/runninwithitmarketing/hermes-skill-deck/releases).

The app is **unsigned**, so macOS Gatekeeper will warn on first launch. Either:

- Right-click `Hermes Skill Deck.app` → **Open** → **Open**, or
- Run: `xattr -cr "/Applications/Hermes Skill Deck.app"`

Everything runs locally: the dashboard is a native webview pointed at a FastAPI server on `127.0.0.1:8765`, and your skills never leave your machine. The only optional outbound calls are the Terminal Mode AI providers, using **your own** API keys.

## Features

- **Desktop-style dashboard** — folders, drag-to-reorder, favorites, profiles, search
- **Custom skill boxes** with category rules; skills can be filed into boxes
- **Customizable top menu bar** — pick your own menus on first launch or anytime with the `+`; menus are live views of your synced skills
- **Skill viewer** with markdown rendering, related-skill chips, and quick actions
- **Terminal Mode** — an AI agent (GLM / Claude / OpenAI / DeepSeek) that can search, create, and delete skills in natural language
- **Read-only browsing** of your `~/.hermes` skills; deletes require agent confirmation

## Requirements

- macOS
- Python 3.10+
- Node.js 20+

## Backend

```bash
python3 -m pip install -r requirements.txt
python3 sync_skills.py
uvicorn server:app --reload --port 8000
```

Backend endpoints are served from `http://localhost:8000/api`.

Useful checks:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/summary
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Production build:

```bash
cd frontend
npm run build
```

## Terminal AI Agent

Open **Terminal Mode** from the Dock (or press `` Ctrl+` ``) and type a question in
plain English. A GLM / Claude / OpenAI / DeepSeek model answers, searches your skills,
and can **create** or **delete** skills via tool calls. The built-in commands (`help`,
`ls`, `search`, `open`, …) still work; anything that isn't a command is sent to the AI.

The model runs server-side through each provider's native SDK — the Anthropic SDK for
Claude, the OpenAI SDK for OpenAI, and the OpenAI SDK pointed at Z.ai's (default, GLM)
or DeepSeek's base URL for those providers. Provide a key for whichever provider(s)
you use:

```bash
cp .env.example .env   # then fill in the keys you have
# …or export them in your shell:
export Z_AI_API_KEY=...       # Z.ai / GLM (default model)
export ANTHROPIC_API_KEY=...
export OPENAI_API_KEY=...
export DEEPSEEK_API_KEY=...
```

Switch models from the terminal with `model <id>` (default `glm-5.3-flash`). Usage bills
to your own provider key. Creating/deleting a skill writes/removes a `SKILL.md` folder
under `~/.hermes`; every path is validated to stay inside it, and deletes require the
agent to confirm with you first.

> The model strings in `agent.py` (`glm-5.3-flash`, `gpt-5.5`, DeepSeek V4, …) are
> best-effort defaults — adjust them if a provider has renamed a model.

## Sync Behavior

`sync_skills.py` scans:

- `~/.hermes/skills/`
- `~/.hermes/profiles/*/skills/`

It skips `.archive` directories, parses YAML frontmatter, writes to `skills.db`, updates existing rows by `file_path`, and removes stale rows for files that no longer exist. The FastAPI server runs sync on startup, and the dashboard `Sync Now` action calls `POST /api/sync`.

## The Top Bar & Your Skill Boxes

Everything on screen is built from **your** skills — nothing ships with the app:

- **First launch** shows a one-time setup card: **Start with the default menus**
  or **Sync my own menus**. The second option opens a checklist built live from
  the skill boxes your synced skills actually landed in (empty lanes are hidden,
  so a different skill set produces a different checklist). The card never
  appears again after choosing.
- **The `+` at the end of the top bar** reopens that checklist anytime. Check
  boxes and they become your personal top-bar menus — exactly those boxes, in
  the order you checked. **Use default menus** restores the standard layout.
- **Menus are live views, not snapshots.** Skills sync from `~/.hermes` on
  every launch (and on demand via `Sync Now`), auto-file into boxes by
  category rules, and the menus reflect whatever synced — install a new skill
  and it appears in its box's menu automatically.
- **Menus cascade** Mac-style: top-level menu → subcategories → individual
  skills, each level revealed by hovering the row with a chevron.
- **Custom skill boxes** you create (the dashed **New Skill Box** tile) can
  carry a category rule so future syncs auto-file matching skills into them,
  and show up in a live **My Boxes** menu until you pin a custom layout.
  Right-click any folder tile to rename, recolor, edit its rule, or delete it.

## Desktop App (Tauri)

This project also builds into a native macOS app — **Hermes Skill Deck** — that
wraps the backend + frontend into a double-clickable `.app` in `/Applications`.

### How it works

- The **Tauri shell** (Rust, in `src-tauri/`) launches on app open, spawns the
  Python backend as a child process, opens a webview pointed at it, and kills the
  backend cleanly on quit.
- The backend serves **both** the API **and** the built frontend from one origin,
  so the whole app lives at a single address.

### Ports — read this if nothing else

| Port | Used by | Notes |
|------|---------|-------|
| **8765** | **Desktop app backend** | The bundled backend listens here. The app's webview loads `http://127.0.0.1:8765`. |
| **8000** | **Dev backend** | `uvicorn server:app --port 8000` during local development. |
| **5173 / 5174** | **Vite dev server** | The frontend dev server (`npm run dev`). The app calls the API on :8000 directly (localhost CORS). |

> ⚠️ **The frontend auto-detects its environment** (`frontend/src/lib/api.js`):
> if the page itself is served on port 8765 (the app), it uses same-origin `/api`;
> otherwise (dev) it talks to `http://localhost:8000/api`. **If the app ever shows
> empty folders with no skills, the first thing to check is this port detection.**

### App data locations (macOS)

- **App:** `/Applications/Hermes Skill Deck.app`
- **Private Python venv:** `~/Library/Application Support/Hermes Skill Deck/venv`
  (auto-created on first launch; ~30s the first time, instant after)
- **WebView cache / localStorage:** `~/Library/WebKit/com.hermes.skilldeck/`
  (holds folder color/name customizations + favorites — clear only the
  `NetworkCache` subfolder, never `LocalStorage`, or customizations are lost)

### Rebuilding the app after code changes

```bash
npm --prefix frontend run build   # 1. build the frontend
npm run app:build                 # 2. stage backend + compile Rust + bundle
```

The new `.app` lands at `src-tauri/target/release/bundle/macos/Hermes Skill Deck.app`.
To install it, **delete the old app first** (so macOS forgets the cached version),
then copy the new one in, then clear the webview cache:

```bash
rm -rf "/Applications/Hermes Skill Deck.app"
cp -R "src-tauri/target/release/bundle/macos/Hermes Skill Deck.app" "/Applications/"
rm -rf ~/Library/Caches/com.hermes.skilldeck/WebKit/NetworkCache
```

### Building a release from source

```bash
npm --prefix frontend run build
npm run app:build
```

`.dmg`/`.app` bundles land in `src-tauri/target/release/bundle/`. Pushing a `v*` tag
to GitHub also triggers the release workflow (`.github/workflows/release.yml`),
which builds unsigned Apple Silicon + Intel bundles and attaches them to a Release.

## Fonts

This repository intentionally ships **without** the `PP Fragment` font file, which is
licensed by [Pangram Pangram](https://pangrampangram.com) for personal use only and may
not be redistributed. The UI falls back cleanly to system fonts without it. If you have
a copy you're licensed to use, drop `PPFragment-SansVariable.woff2` into
`frontend/public/fonts/` (that path is gitignored) and rebuild.

## MVP Notes

- The dashboard browsing UI is read-only; the Terminal Mode AI agent can create and delete skills (writing/removing `SKILL.md` files under `~/.hermes`).
- The New Bundle, Import Skills, and Analytics controls are intentionally marked as coming soon.
- If the backend is offline, the frontend switches to clearly labeled demo data so the interface still loads.

## License

[MIT](LICENSE) © 2026 Jason Pollak. Font files are excluded from this license and repo
(see [Fonts](#fonts)).
