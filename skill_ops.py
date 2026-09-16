"""Filesystem write/read operations for skills (create, delete, read body).

Every path is built from sanitized components and validated to live under
``~/.hermes`` before any write or delete, so the terminal agent (or the API) can
never touch files outside the Hermes home — even if the model is prompt-injected.
Reuses the directory conventions and re-sync logic from ``sync_skills``.
"""

from __future__ import annotations

import re
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Any

from sync_skills import HERMES_HOME, sync

_SLUG_RE = re.compile(r"[^a-z0-9]+")


class SkillOpError(ValueError):
    """Invalid input or an unsafe path."""


def slugify(value: str) -> str:
    return _SLUG_RE.sub("-", str(value or "").strip().lower()).strip("-")


def _safe_component(value: str, field: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        raise SkillOpError(f"{field} is required")
    if "/" in raw or "\\" in raw or ".." in raw:
        raise SkillOpError(f"{field} may not contain path separators or '..'")
    return raw


def _ensure_within_hermes(path: Path) -> Path:
    resolved = path.resolve()
    home = HERMES_HOME.resolve()
    if resolved != home and home not in resolved.parents:
        raise SkillOpError("refusing to operate outside ~/.hermes")
    return resolved


def skill_dir_for(name: str, category: str, profile: str = "default") -> Path:
    name_slug = slugify(_safe_component(name, "name"))
    category_slug = slugify(_safe_component(category, "category"))
    profile_clean = _safe_component(profile or "default", "profile")
    if not name_slug:
        raise SkillOpError("name must contain letters or numbers")
    if not category_slug:
        raise SkillOpError("category must contain letters or numbers")

    if profile_clean == "default":
        root = HERMES_HOME / "skills"
    else:
        root = HERMES_HOME / "profiles" / slugify(profile_clean) / "skills"
    return root / category_slug / name_slug


def _frontmatter_block(name: str, category: str, description: str) -> str:
    def esc(value: str) -> str:
        return str(value or "").replace("\\", "\\\\").replace('"', '\\"')

    return (
        "---\n"
        f'name: "{esc(name)}"\n'
        f'category: "{esc(category)}"\n'
        f'description: "{esc(description)}"\n'
        "---\n"
    )


def create_skill(
    name: str,
    category: str,
    description: str = "",
    profile: str = "default",
    body: str = "",
) -> dict[str, Any]:
    """Write a new ``SKILL.md`` and re-sync the database."""
    skill_dir = _ensure_within_hermes(skill_dir_for(name, category, profile))
    md_path = skill_dir / "SKILL.md"
    if md_path.exists():
        raise SkillOpError(f"a skill already exists at {md_path}")

    content = _frontmatter_block(name, category, description)
    body = (body or "").strip()
    content += "\n" + (body if body else f"# {name}\n\n{description}".strip()) + "\n"

    skill_dir.mkdir(parents=True, exist_ok=True)
    md_path.write_text(content, encoding="utf-8")
    sync(verbose=False)
    return {"status": "ok", "file_path": str(md_path)}


def delete_skill_by_path(file_path: str) -> dict[str, Any]:
    """Delete a skill's folder (the directory containing its ``SKILL.md``)."""
    md_path = _ensure_within_hermes(Path(file_path))
    if md_path.name != "SKILL.md" or not md_path.exists():
        raise SkillOpError("not a SKILL.md file under ~/.hermes")

    skill_dir = _ensure_within_hermes(md_path.parent)
    # Never delete a skills root (e.g. ~/.hermes/skills) — only an actual skill folder.
    if skill_dir.name == "skills" or skill_dir == HERMES_HOME.resolve():
        raise SkillOpError("refusing to delete a skills root")

    shutil.rmtree(skill_dir)
    sync(verbose=False)
    return {"status": "ok", "deleted": str(skill_dir)}


def open_skill_folder(file_path: str, which: str = "skill") -> dict[str, Any]:
    """Reveal a skill's folder (or its references folder) in Finder.

    Same path-safety rules as the other operations: the path must be a
    SKILL.md under ~/.hermes, and only the skill's own directory or its
    ``references`` subfolder can ever be opened.
    """
    md_path = _ensure_within_hermes(Path(file_path))
    if md_path.name != "SKILL.md" or not md_path.exists():
        raise SkillOpError("not a SKILL.md file under ~/.hermes")

    skill_dir = _ensure_within_hermes(md_path.parent)
    if which == "references":
        target = skill_dir / "references"
    else:
        target = skill_dir
    if not target.is_dir():
        raise SkillOpError("folder not found")

    subprocess.run(["open", str(target)], check=False)
    return {"status": "ok", "path": str(target)}


def launch_skill_session(file_path: str, name: str, profile: str | None = None) -> dict[str, Any]:
    """Open a Terminal.app window running an interactive hermes chat session
    with this skill preloaded.

    The CLI resolves skills by name (``hermes chat -s <name>``) and scopes
    profile-installed skills via ``--profile <id>``, so the dashboard passes
    the skill's DB name plus its profile. Path safety mirrors the other
    operations: the SKILL.md must exist under ~/.hermes.
    """
    md_path = _ensure_within_hermes(Path(file_path))
    if md_path.name != "SKILL.md" or not md_path.exists():
        raise SkillOpError("not a SKILL.md file under ~/.hermes")

    hermes = shutil.which("hermes") or str(Path.home() / ".local" / "bin" / "hermes")
    if not Path(hermes).is_file():
        raise SkillOpError("hermes CLI not found on this machine")

    cmd = " ".join([
        shlex.quote(hermes),
        "--profile", shlex.quote(profile or "default"),
        "chat",
        "-s", shlex.quote(name),
    ])
    # Launch via a throwaway .command file: `open`ing it makes Terminal.app run
    # the script without any Apple Events, so no macOS Automation permission
    # prompt (which a background server can't answer and would hang on).
    #
    # The script first recolors its window to match Terminal.app's "Basic"
    # profile (white background, black text) via OSC escape sequences — `open`
    # can't choose a profile per window, and these sequences recolor just this
    # window regardless of the user's default profile, no permissions needed.
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-") or "skill"
    sessions_dir = Path.home() / "Library" / "Caches" / "com.hermes.skilldeck" / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)
    script_path = sessions_dir / f"hermes-{safe_name}.command"
    script = (
        "#!/bin/zsh\n"
        "printf '\\e]11;#FFFFFF\\a'  # window background (Basic: white)\n"
        "printf '\\e]10;#000000\\a'  # normal text (Basic: black)\n"
        "printf '\\e]12;#333333\\a'  # cursor\n"
        f"exec {cmd}\n"
    )
    script_path.write_text(script, encoding="utf-8")
    script_path.chmod(0o755)
    result = subprocess.run(["open", str(script_path)], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise SkillOpError(f"Terminal launch failed: {result.stderr.strip()[:200]}")
    return {"status": "launched", "command": cmd, "skill": name, "profile": profile or "default"}


def read_skill_body(file_path: str) -> str:
    """Return the markdown body of a SKILL.md (everything after the frontmatter)."""
    md_path = _ensure_within_hermes(Path(file_path))
    if not md_path.exists():
        raise SkillOpError("file not found")
    text = md_path.read_text(encoding="utf-8", errors="replace")
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[2].lstrip("\n")
    return text
