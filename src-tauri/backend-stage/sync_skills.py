#!/usr/bin/env python3
"""Sync Hermes skills into SQLite for the Hermes Skill Deck dashboard."""

from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - exercised only before PyYAML is installed
    yaml = None


HERMES_HOME = Path.home() / ".hermes"
DB_PATH = Path(__file__).resolve().parent / "skills.db"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if value[0:1] in {"'", '"'} and value[-1:] == value[0]:
        return value[1:-1]
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    return value


def parse_frontmatter_fallback(raw: str) -> dict[str, Any]:
    """Parse simple YAML frontmatter without requiring PyYAML.

    Hermes skill metadata is usually scalar keys plus occasional list fields.
    This fallback keeps `python3 sync_skills.py` useful on a fresh macOS setup.
    """

    data: dict[str, Any] = {}
    active_list_key: str | None = None

    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        list_match = re.match(r"^\s*-\s+(.*)$", line)
        if list_match and active_list_key:
            data.setdefault(active_list_key, []).append(parse_scalar(list_match.group(1)))
            continue
        active_list_key = None
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if not key:
            continue
        if value.strip() == "":
            data[key] = []
            active_list_key = key
        else:
            data[key] = parse_scalar(value)

    return data


def parse_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("---"):
        return {}

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}

    raw = parts[1]
    if yaml is None:
        return parse_frontmatter_fallback(raw)

    try:
        parsed = yaml.safe_load(raw) or {}
    except Exception:
        return parse_frontmatter_fallback(raw)

    return parsed if isinstance(parsed, dict) else {}


def slug_to_title(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("_", " ").replace("-", " ")).strip().title()


def get_category(skill_dir: Path, skills_root: Path, metadata: dict[str, Any]) -> str:
    metadata_category = metadata.get("category")
    if isinstance(metadata_category, str) and metadata_category.strip():
        return metadata_category.strip()

    try:
        relative = skill_dir.relative_to(skills_root)
    except ValueError:
        return skill_dir.parent.name or skill_dir.name

    if len(relative.parts) > 1:
        return relative.parts[0]
    return relative.parts[0] if relative.parts else skill_dir.name


def skill_roots() -> list[tuple[Path, str]]:
    roots: list[tuple[Path, str]] = []
    default_root = HERMES_HOME / "skills"
    if default_root.is_dir():
        roots.append((default_root, "default"))

    profiles_root = HERMES_HOME / "profiles"
    if profiles_root.is_dir():
        for profile_dir in sorted(profiles_root.iterdir()):
            skills_root = profile_dir / "skills"
            if profile_dir.is_dir() and skills_root.is_dir():
                roots.append((skills_root, profile_dir.name))

    return roots


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            profile TEXT NOT NULL DEFAULT 'default',
            file_path TEXT NOT NULL UNIQUE,
            has_reference INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_profile ON skills(profile)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills(updated_at)")


def iter_skill_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("SKILL.md")
        if ".archive" not in path.parts and path.is_file()
    )


def build_record(md_path: Path, skills_root: Path, profile: str) -> dict[str, Any]:
    metadata = parse_frontmatter(md_path)
    skill_dir = md_path.parent
    name = metadata.get("name") if isinstance(metadata.get("name"), str) else skill_dir.name
    description = metadata.get("description") if isinstance(metadata.get("description"), str) else ""

    return {
        "name": name.strip() or slug_to_title(skill_dir.name),
        "category": get_category(skill_dir, skills_root, metadata),
        "description": description.strip(),
        "profile": profile,
        "file_path": str(md_path.resolve()),
        "has_reference": 1 if (skill_dir / "references").is_dir() else 0,
    }


def row_needs_update(row: sqlite3.Row, record: dict[str, Any]) -> bool:
    return any(row[key] != record[key] for key in record.keys())


def sync(verbose: bool = True) -> dict[str, int]:
    conn = connect()
    init_db(conn)
    now = utc_now()
    seen_paths: set[str] = set()
    inserted = 0
    updated = 0
    unchanged = 0

    try:
        for root, profile in skill_roots():
            for md_path in iter_skill_files(root):
                record = build_record(md_path, root, profile)
                seen_paths.add(record["file_path"])

                existing = conn.execute(
                    "SELECT * FROM skills WHERE file_path = ?",
                    (record["file_path"],),
                ).fetchone()

                if existing is None:
                    conn.execute(
                        """
                        INSERT INTO skills
                            (name, category, description, profile, file_path, has_reference, created_at, updated_at)
                        VALUES
                            (:name, :category, :description, :profile, :file_path, :has_reference, :created_at, :updated_at)
                        """,
                        {**record, "created_at": now, "updated_at": now},
                    )
                    inserted += 1
                elif row_needs_update(existing, record):
                    conn.execute(
                        """
                        UPDATE skills
                        SET name = :name,
                            category = :category,
                            description = :description,
                            profile = :profile,
                            has_reference = :has_reference,
                            updated_at = :updated_at
                        WHERE file_path = :file_path
                        """,
                        {**record, "updated_at": now},
                    )
                    updated += 1
                else:
                    unchanged += 1

        removed = 0
        for row in conn.execute("SELECT id, file_path FROM skills").fetchall():
            file_path = row["file_path"]
            if file_path not in seen_paths or not Path(file_path).exists():
                conn.execute("DELETE FROM skills WHERE id = ?", (row["id"],))
                removed += 1

        conn.commit()
    finally:
        conn.close()

    summary = {
        "inserted": inserted,
        "updated": updated,
        "unchanged": unchanged,
        "removed": removed,
        "total_seen": len(seen_paths),
    }
    if verbose:
        print(
            "Sync complete: "
            f"{inserted} inserted, {updated} updated, {unchanged} unchanged, "
            f"{removed} removed, {len(seen_paths)} files seen"
        )
    return summary


if __name__ == "__main__":
    sync()
