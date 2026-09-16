"""FastAPI backend for the local Hermes Skill Deck dashboard."""

from __future__ import annotations

import os
import re
import sqlite3
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import skill_ops
from agent import DEFAULT_MODEL, KEY_ENV, MODELS, run_agent
from sync_skills import DB_PATH, init_db, sync

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover - dotenv is optional
    pass

# Also read a .env sitting next to server.py itself. load_dotenv() searches
# from the CWD, which in the packaged desktop app is not the backend folder —
# this keeps API keys loading for both `python server.py` in the repo and the
# bundled backend-stage copy (stage-backend.js ships the .env alongside).
# Fills only keys not already set, same precedence as load_dotenv.
_env_file = Path(__file__).resolve().parent / ".env"
if _env_file.is_file():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#"):
            continue
        _m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)", _line)
        if _m and _m.group(1) not in os.environ:
            os.environ[_m.group(1)] = _m.group(2).strip().strip('"').strip("'")

# ── Production mode ────────────────────────────────────────────────────────────
# When HERMES_DECK_PROD is set, the backend also serves the built frontend from
# frontend/dist so the whole app lives at one origin (used by the desktop shell).
# In dev, leave it unset and run the Vite dev server separately.
PROD = os.environ.get("HERMES_DECK_PROD", "").lower() in {"1", "true", "yes"}
REPO_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
INDEX_HTML = FRONTEND_DIST / "index.html"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def query_db(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    conn = connect()
    try:
        init_db(conn)
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def execute_scalar(sql: str, params: tuple[Any, ...] = ()) -> int:
    rows = query_db(sql, params)
    return int(rows[0]["value"] or 0) if rows else 0


def summary_payload() -> dict[str, int]:
    return {
        "total_skills": execute_scalar("SELECT COUNT(*) AS value FROM skills"),
        "profile_count": execute_scalar("SELECT COUNT(DISTINCT profile) AS value FROM skills"),
        "category_count": execute_scalar("SELECT COUNT(DISTINCT category) AS value FROM skills"),
        "reference_count": execute_scalar("SELECT COUNT(*) AS value FROM skills WHERE has_reference = 1"),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync(verbose=True)
    yield


app = FastAPI(title="Hermes Skill Deck", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In production, mount the built frontend's static assets. The catch-all SPA
# route is registered last (see bottom of file) so all /api routes win first.
if PROD and (FRONTEND_DIST / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "database": str(Path(DB_PATH).resolve()), **summary_payload()}


@app.get("/api/skills")
def list_skills(
    category: str | None = Query(None),
    profile: str | None = Query(None),
    search: str | None = Query(None),
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM skills WHERE 1 = 1"
    params: list[Any] = []

    if category:
        sql += " AND category = ?"
        params.append(category)
    if profile:
        sql += " AND profile = ?"
        params.append(profile)
    if search:
        like = f"%{search}%"
        sql += """
            AND (
                name LIKE ?
                OR description LIKE ?
                OR profile LIKE ?
                OR category LIKE ?
            )
        """
        params.extend([like, like, like, like])

    sql += " ORDER BY category COLLATE NOCASE, name COLLATE NOCASE"
    return query_db(sql, tuple(params))


@app.get("/api/skills/{skill_id}")
def get_skill(skill_id: int) -> dict[str, Any]:
    rows = query_db("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Skill not found")
    return rows[0]


@app.get("/api/categories")
def list_categories() -> list[dict[str, Any]]:
    return query_db(
        """
        SELECT category, COUNT(*) AS count
        FROM skills
        GROUP BY category
        ORDER BY count DESC, category COLLATE NOCASE
        """
    )


@app.get("/api/profiles")
def list_profiles() -> list[dict[str, Any]]:
    return query_db(
        """
        SELECT profile, COUNT(*) AS count
        FROM skills
        GROUP BY profile
        ORDER BY count DESC, profile COLLATE NOCASE
        """
    )


@app.post("/api/sync")
def run_sync() -> dict[str, Any]:
    sync_result = sync(verbose=True)
    return {"status": "ok", "sync": sync_result, "summary": summary_payload()}


@app.get("/api/summary")
def get_summary() -> dict[str, int]:
    return summary_payload()


@app.post("/api/open/{target}")
def open_target(target: str) -> dict[str, Any]:
    paths = {
        "db": str(Path(DB_PATH).resolve()),
        "hermes": str(Path.home() / ".hermes"),
        "profiles": str(Path.home() / ".hermes" / "profiles"),
        "skills": str(Path.home() / ".hermes" / "skills"),
    }
    if target not in paths:
        raise HTTPException(status_code=404, detail=f"Unknown target: {target}")
    subprocess.run(["open", paths[target]], check=False)
    return {"status": "ok", "path": paths[target]}


class AgentMessage(BaseModel):
    role: str
    content: str


class AgentRequest(BaseModel):
    messages: list[AgentMessage]
    model: str | None = None


class CreateSkillRequest(BaseModel):
    name: str
    category: str
    description: str = ""
    profile: str = "default"
    body: str = ""


@app.get("/api/agent/models")
def agent_models() -> dict[str, Any]:
    # Annotate each model with whether its provider has an API key in this
    # environment, so the picker can hide entries that would only error.
    models = [
        {**m, "available": bool(os.environ.get(KEY_ENV.get(m["provider"], ""), "").strip())}
        for m in MODELS
    ]
    return {"models": models, "default": DEFAULT_MODEL}


@app.post("/api/agent")
def agent_chat(request: AgentRequest) -> StreamingResponse:
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    return StreamingResponse(
        run_agent(messages, request.model),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/skills")
def create_skill_endpoint(request: CreateSkillRequest) -> dict[str, Any]:
    try:
        result = skill_ops.create_skill(
            request.name, request.category, request.description, request.profile, request.body
        )
    except skill_ops.SkillOpError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = query_db("SELECT * FROM skills WHERE file_path = ?", (result["file_path"],))
    return rows[0] if rows else result


@app.delete("/api/skills/{skill_id}")
def delete_skill_endpoint(skill_id: int) -> dict[str, Any]:
    rows = query_db("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        return skill_ops.delete_skill_by_path(rows[0]["file_path"])
    except skill_ops.SkillOpError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/skills/{skill_id}/content")
def skill_content_endpoint(skill_id: int) -> dict[str, Any]:
    rows = query_db("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        body = skill_ops.read_skill_body(rows[0]["file_path"])
    except skill_ops.SkillOpError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"id": skill_id, "name": rows[0]["name"], "body": body}


@app.post("/api/skills/{skill_id}/open")
def open_skill_folder_endpoint(skill_id: int, which: str = Query("skill")) -> dict[str, Any]:
    if which not in {"skill", "references"}:
        raise HTTPException(status_code=400, detail="which must be 'skill' or 'references'")
    rows = query_db("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        return skill_ops.open_skill_folder(rows[0]["file_path"], which)
    except skill_ops.SkillOpError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/skills/{skill_id}/session")
def start_skill_session_endpoint(skill_id: int) -> dict[str, Any]:
    """Open a Terminal.app window with `hermes --profile P chat -s <skill>`."""
    rows = query_db("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill = rows[0]
    try:
        return skill_ops.launch_skill_session(skill["file_path"], skill["name"], skill["profile"])
    except skill_ops.SkillOpError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── SPA fallback (MUST be last — registered after every /api route) ────────────
# Serves the built frontend for any non-API path so client-side routing works.
# In dev (PROD off) it 404s, leaving the Vite dev server to handle the frontend.
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if not PROD or not INDEX_HTML.exists():
        raise HTTPException(status_code=404, detail="frontend build not found")
    # A real file in the build (favicon, vite.svg, etc.)? Serve it directly.
    candidate = FRONTEND_DIST / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)
    # Otherwise return index.html so the React app can handle the route.
    return FileResponse(INDEX_HTML)


if __name__ == "__main__":
    import uvicorn

    # HERMES_DECK_PORT picks the port (desktop shell uses a non-default port so
    # it doesn't collide with the dev backend on 8000). Defaults to 8000 in dev.
    port = int(os.environ.get("HERMES_DECK_PORT", "8000"))
    # Reload only makes sense in dev; disable it in prod (serving a build).
    uvicorn.run("server:app", host="127.0.0.1", port=port, reload=not PROD)
