"""Multi-provider, streaming terminal agent for the Hermes Skill Deck.

The backend talks to each provider through its own native SDK:
  - Claude   -> official `anthropic` SDK
  - OpenAI   -> `openai` SDK
  - DeepSeek -> `openai` SDK pointed at DeepSeek's OpenAI-compatible base URL
  - Z.AI     -> `openai` SDK pointed at the GLM Coding Plan endpoint (subscription)

A neutral tool set (search / list categories / read / create / delete) is defined
once and translated to each provider's tool-calling format. `run_agent` is a sync
generator that yields Server-Sent Events (text / tool / error / done) which the
FastAPI endpoint streams to the terminal.
"""

from __future__ import annotations

import json
import os
from typing import Any, Iterator

from skill_ops import (
    SkillOpError,
    create_skill,
    delete_skill_by_path,
    read_skill_body,
)
from sync_skills import connect, init_db

# ── Model registry ────────────────────────────────────────────────────────────
# `api_id` is the exact string sent to the provider (verified against each
# provider's /models endpoint on 2026-09-12). Routing also falls back to a
# prefix guess (see `resolve_model`), so unknown ids still work. Entries whose
# provider has no API key in the environment are annotated unavailable by the
# /api/agent/models endpoint and hidden in the picker.
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
# Z.AI Coding Plan endpoint (OpenAI-compatible) — the user's GLM subscription,
# same base URL hermes itself uses for its zai-coding custom provider.
ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4"
DEFAULT_MODEL = "glm-5.3-flash"

MODELS: list[dict[str, str]] = [
    {"id": "glm-5.3-flash", "api_id": "glm-5.3-flash", "provider": "zai", "label": "GLM 5.3 Flash"},
    {"id": "glm-5.3", "api_id": "glm-5.3", "provider": "zai", "label": "GLM 5.3"},
    {"id": "claude-opus-5", "api_id": "claude-opus-5", "provider": "anthropic", "label": "Claude Opus 5"},
    {"id": "claude-sonnet-5", "api_id": "claude-sonnet-5", "provider": "anthropic", "label": "Claude Sonnet 5"},
    {"id": "claude-fable-5-1", "api_id": "claude-fable-5-1", "provider": "anthropic", "label": "Claude Fable 5.1"},
    {"id": "deepseek-v4-pro", "api_id": "deepseek-v4-pro", "provider": "deepseek", "label": "DeepSeek V4 Pro"},
    {"id": "deepseek-flash", "api_id": "deepseek-flash", "provider": "deepseek", "label": "DeepSeek Flash"},
    {"id": "gpt-5.5", "api_id": "gpt-5.5", "provider": "openai", "label": "OpenAI GPT-5.5"},
]
MODELS_BY_ID = {m["id"]: m for m in MODELS}

KEY_ENV = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "zai": "Z_AI_API_KEY",
}

MAX_STEPS = 6  # cap on tool-call iterations per turn
MAX_OUTPUT_TOKENS = 4096
MAX_SKILLS_IN_PROMPT = 400


def resolve_model(model: str | None) -> tuple[str, str, str | None]:
    """Return (provider, api_model_id, base_url) for a requested model string."""
    model = (model or DEFAULT_MODEL).strip()
    entry = MODELS_BY_ID.get(model)
    if entry:
        provider, api_id = entry["provider"], entry["api_id"]
    else:  # prefix-based fallback so new/unknown ids still route
        api_id = model
        if model.startswith("claude"):
            provider = "anthropic"
        elif model.startswith("deepseek"):
            provider = "deepseek"
        elif model.startswith("glm"):
            provider = "zai"
        else:
            provider = "openai"
    if provider == "deepseek":
        base_url: str | None = DEEPSEEK_BASE_URL
    elif provider == "zai":
        base_url = ZAI_BASE_URL
    else:
        base_url = None
    return provider, api_id, base_url


# ── DB helpers (read-only; writes go through skill_ops) ─────────────────────────
def _query(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    conn = connect()
    try:
        init_db(conn)
        return [dict(row) for row in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()


# ── Tools ───────────────────────────────────────────────────────────────────--
TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_skills",
        "description": (
            "Search the user's skills by free-text query, optionally filtered by "
            "category or profile. Returns matching skills with id, name, category, "
            "profile, and description. Use it to find skills or answer questions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Free-text search over name/description/category/profile. Empty string matches all."},
                "category": {"type": "string", "description": "Optional exact category filter."},
                "profile": {"type": "string", "description": "Optional exact profile filter."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "list_categories",
        "description": "List all skill categories with how many skills are in each.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "fetch_skill_content",
        "description": "Read the full SKILL.md body of a skill by id. Use when asked about a specific skill's contents.",
        "input_schema": {
            "type": "object",
            "properties": {"skill_id": {"type": "integer", "description": "The skill id."}},
            "required": ["skill_id"],
        },
    },
    {
        "name": "create_skill",
        "description": (
            "Create a new skill (writes a SKILL.md under ~/.hermes). Needs a name and "
            "a category; description, profile (default 'default') and a markdown body "
            "are optional. Confirm ambiguous details with the user first."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "category": {"type": "string"},
                "description": {"type": "string"},
                "profile": {"type": "string", "description": "Profile to create under; defaults to 'default'."},
                "body": {"type": "string", "description": "Optional markdown body."},
            },
            "required": ["name", "category"],
        },
    },
    {
        "name": "delete_skill",
        "description": (
            "Delete a skill by id. DESTRUCTIVE. You MUST ask the user to confirm and "
            "only call this with confirm=true after they explicitly agree. With "
            "confirm omitted/false it returns the skill details for you to confirm."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "skill_id": {"type": "integer"},
                "confirm": {"type": "boolean", "description": "Set true ONLY after the user explicitly confirmed deletion."},
            },
            "required": ["skill_id"],
        },
    },
]

WRITE_TOOLS = {"create_skill", "delete_skill"}


def _impl_search_skills(query: str = "", category: str | None = None, profile: str | None = None, **_: Any) -> dict[str, Any]:
    sql = "SELECT id, name, category, profile, description FROM skills WHERE 1 = 1"
    params: list[Any] = []
    if query:
        like = f"%{query}%"
        sql += " AND (name LIKE ? OR description LIKE ? OR category LIKE ? OR profile LIKE ?)"
        params += [like, like, like, like]
    if category:
        sql += " AND category = ?"
        params.append(category)
    if profile:
        sql += " AND profile = ?"
        params.append(profile)
    sql += " ORDER BY category COLLATE NOCASE, name COLLATE NOCASE LIMIT 50"
    rows = _query(sql, tuple(params))
    return {"count": len(rows), "results": rows}


def _impl_list_categories(**_: Any) -> dict[str, Any]:
    return {"categories": _query(
        "SELECT category, COUNT(*) AS count FROM skills GROUP BY category "
        "ORDER BY count DESC, category COLLATE NOCASE"
    )}


def _impl_fetch_skill_content(skill_id: int | None = None, **_: Any) -> dict[str, Any]:
    rows = _query("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        return {"error": "skill not found"}
    return {"id": rows[0]["id"], "name": rows[0]["name"], "body": read_skill_body(rows[0]["file_path"])[:8000]}


def _impl_create_skill(name: str | None = None, category: str | None = None, description: str = "", profile: str = "default", body: str = "", **_: Any) -> dict[str, Any]:
    res = create_skill(name, category, description or "", profile or "default", body or "")
    rows = _query("SELECT * FROM skills WHERE file_path = ?", (res["file_path"],))
    return {"status": "created", "skill": rows[0] if rows else res}


def _impl_delete_skill(skill_id: int | None = None, confirm: bool = False, **_: Any) -> dict[str, Any]:
    rows = _query("SELECT * FROM skills WHERE id = ?", (skill_id,))
    if not rows:
        return {"error": "skill not found"}
    if not confirm:
        s = rows[0]
        return {
            "status": "needs_confirmation",
            "skill": {"id": s["id"], "name": s["name"], "category": s["category"], "profile": s["profile"]},
            "note": "Confirm with the user, then call delete_skill again with confirm=true.",
        }
    return delete_skill_by_path(rows[0]["file_path"])


TOOL_IMPLS = {
    "search_skills": _impl_search_skills,
    "list_categories": _impl_list_categories,
    "fetch_skill_content": _impl_fetch_skill_content,
    "create_skill": _impl_create_skill,
    "delete_skill": _impl_delete_skill,
}


def execute_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return {"error": f"unknown tool: {name}"}
    if not isinstance(args, dict):
        args = {}
    try:
        return impl(**args)
    except SkillOpError as exc:
        return {"error": str(exc)}
    except TypeError as exc:
        return {"error": f"bad arguments: {exc}"}
    except Exception as exc:  # noqa: BLE001 - surface any tool failure to the model
        return {"error": f"{type(exc).__name__}: {exc}"}


def _tool_summary(name: str, args: dict[str, Any], result: dict[str, Any]) -> str:
    if result.get("error"):
        return f"{name}: {result['error']}"
    if name == "search_skills":
        return f"searched skills · {result.get('count', 0)} match(es)"
    if name == "list_categories":
        return f"listed {len(result.get('categories', []))} categories"
    if name == "fetch_skill_content":
        return f'read "{result.get("name", "")}"'
    if name == "create_skill":
        created = (result.get("skill") or {}).get("name") or args.get("name", "")
        return f'created skill "{created}"'
    if name == "delete_skill":
        if result.get("status") == "needs_confirmation":
            return f'delete "{result["skill"]["name"]}" — awaiting confirmation'
        return "deleted skill"
    return name


def _is_write(name: str, result: dict[str, Any]) -> bool:
    return name in WRITE_TOOLS and result.get("status") in {"created", "ok"}


def _do_tool(name: str, args: dict[str, Any], state: dict[str, bool]) -> tuple[dict[str, Any], str]:
    result = execute_tool(name, args)
    if _is_write(name, result):
        state["wrote"] = True
    return result, _tool_summary(name, args, result)


# ── System prompt ───────────────────────────────────────────────────────────--
SYSTEM_TEMPLATE = """You are the assistant built into the Hermes Skill Deck — a local dashboard of the \
user's Hermes agent "skills" (each skill is a SKILL.md file under ~/.hermes). You run inside a \
terminal, so keep replies short, plain-text, and scannable: no markdown headings, tables, or code \
fences.

You can search skills, read a skill's full contents, answer questions, create new skills, and delete \
skills — use the tools to take actions or fetch details. For quick questions you may answer directly \
from the skill list below. When creating a skill, make sure you have a name and a category. Before \
deleting anything, ask the user to confirm and only call delete_skill with confirm=true after they \
explicitly say yes.

There are {count} skills. Current skills (id · name · category · profile):
{skill_list}
"""


def build_system_prompt() -> str:
    rows = _query(
        "SELECT id, name, category, profile, description FROM skills "
        "ORDER BY category COLLATE NOCASE, name COLLATE NOCASE"
    )
    shown = rows[:MAX_SKILLS_IN_PROMPT]
    lines = [
        f"- {r['id']} · {r['name']} · {r['category']} · {r['profile']}"
        + (f" — {r['description']}" if r["description"] else "")
        for r in shown
    ]
    if len(rows) > len(shown):
        lines.append(f"…and {len(rows) - len(shown)} more (use search_skills to find them)")
    return SYSTEM_TEMPLATE.format(count=len(rows), skill_list="\n".join(lines) if lines else "(no skills yet)")


# ── SSE helper ──────────────────────────────────────────────────────────────--
def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


# ── Provider loops ────────────────────────────────────────────────────────────
def _run_anthropic(model_id: str, key: str, system: str, messages: list[dict[str, Any]], state: dict[str, bool]) -> Iterator[str]:
    import anthropic

    client = anthropic.Anthropic(api_key=key)
    a_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    tools = [{"name": t["name"], "description": t["description"], "input_schema": t["input_schema"]} for t in TOOLS]

    for _ in range(MAX_STEPS):
        with client.messages.stream(
            model=model_id,
            max_tokens=MAX_OUTPUT_TOKENS,
            system=system,
            tools=tools,
            thinking={"type": "adaptive"},
            messages=a_messages,
        ) as stream:
            for event in stream:
                if event.type == "content_block_delta" and getattr(event.delta, "type", None) == "text_delta":
                    yield _sse("text", {"text": event.delta.text})
            final = stream.get_final_message()

        a_messages.append({"role": "assistant", "content": final.content})
        tool_uses = [b for b in final.content if getattr(b, "type", None) == "tool_use"]
        if final.stop_reason != "tool_use" or not tool_uses:
            return

        results = []
        for tu in tool_uses:
            result, summary = _do_tool(tu.name, dict(tu.input or {}), state)
            yield _sse("tool", {"name": tu.name, "summary": summary})
            results.append({"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(result, default=str)})
        a_messages.append({"role": "user", "content": results})

    yield _sse("text", {"text": "\n[stopped: too many tool steps]"})


def _run_openai(provider: str, model_id: str, base_url: str | None, key: str, system: str, messages: list[dict[str, Any]], state: dict[str, bool]) -> Iterator[str]:
    from openai import OpenAI

    client = OpenAI(api_key=key, base_url=base_url) if base_url else OpenAI(api_key=key)
    o_messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    o_messages += [{"role": m["role"], "content": m["content"]} for m in messages]
    tools = [{"type": "function", "function": {"name": t["name"], "description": t["description"], "parameters": t["input_schema"]}} for t in TOOLS]

    for _ in range(MAX_STEPS):
        # Newer OpenAI models require max_completion_tokens; DeepSeek's
        # OpenAI-compatible API still uses max_tokens.
        token_kwarg = (
            {"max_completion_tokens": MAX_OUTPUT_TOKENS}
            if provider == "openai"
            else {"max_tokens": MAX_OUTPUT_TOKENS}
        )
        stream = client.chat.completions.create(
            model=model_id,
            messages=o_messages,
            tools=tools,
            stream=True,
            **token_kwarg,
        )
        text_parts: list[str] = []
        acc: dict[int, dict[str, str]] = {}
        order: list[int] = []
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if getattr(delta, "content", None):
                text_parts.append(delta.content)
                yield _sse("text", {"text": delta.content})
            for tc in (getattr(delta, "tool_calls", None) or []):
                idx = tc.index if tc.index is not None else len(order)
                if idx not in acc:
                    acc[idx] = {"id": "", "name": "", "args": ""}
                    order.append(idx)
                slot = acc[idx]
                if tc.id:
                    slot["id"] = tc.id
                fn = getattr(tc, "function", None)
                if fn and getattr(fn, "name", None):
                    slot["name"] += fn.name
                if fn and getattr(fn, "arguments", None):
                    slot["args"] += fn.arguments

        if not acc:
            return

        o_messages.append({
            "role": "assistant",
            "content": "".join(text_parts) or None,
            "tool_calls": [
                {"id": acc[i]["id"], "type": "function", "function": {"name": acc[i]["name"], "arguments": acc[i]["args"] or "{}"}}
                for i in order
            ],
        })
        for i in order:
            slot = acc[i]
            try:
                args = json.loads(slot["args"] or "{}")
            except Exception:
                args = {}
            result, summary = _do_tool(slot["name"], args, state)
            yield _sse("tool", {"name": slot["name"], "summary": summary})
            o_messages.append({"role": "tool", "tool_call_id": slot["id"], "content": json.dumps(result, default=str)})

    yield _sse("text", {"text": "\n[stopped: too many tool steps]"})


# ── Entry point ────────────────────────────────────────────────────────────--
def run_agent(messages: list[dict[str, Any]], model: str | None = None) -> Iterator[str]:
    """Stream a turn of the agent as SSE strings."""
    provider, model_id, base_url = resolve_model(model)
    key = os.environ.get(KEY_ENV[provider], "").strip()
    if not key:
        yield _sse("error", {"message": f"No API key for {provider}. Set {KEY_ENV[provider]} in the backend environment (.env)."})
        yield _sse("done", {"refresh": False})
        return
    if not messages:
        yield _sse("error", {"message": "no message provided"})
        yield _sse("done", {"refresh": False})
        return

    state = {"wrote": False}
    try:
        system = build_system_prompt()
        if provider == "anthropic":
            yield from _run_anthropic(model_id, key, system, messages, state)
        else:
            yield from _run_openai(provider, model_id, base_url, key, system, messages, state)
    except Exception as exc:  # noqa: BLE001 - report any provider/SDK error to the terminal
        yield _sse("error", {"message": f"{type(exc).__name__}: {exc}"})
    yield _sse("done", {"refresh": state["wrote"]})
