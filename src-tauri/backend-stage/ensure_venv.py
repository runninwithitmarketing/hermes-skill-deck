"""Ensures a private Python virtual environment exists for Hermes Skill Deck.

Run by the Tauri shell before starting the backend. On first launch it creates
a venv under ~/Library/Application Support/Hermes Skill Deck/venv and installs
requirements.txt into it. On later launches it's a fast no-op. Prints the path
to the venv's python interpreter on stdout (last line) so the shell can use it.

    python3 ensure_venv.py
    -> /Users/<you>/Library/Application Support/Hermes Skill Deck/venv/bin/python

The venv is kept outside the project folder on purpose: it's machine-specific
(built for this Mac's Python) and shouldn't be copied or shipped. Rebuilding
the app folder won't disturb it.
"""

from __future__ import annotations

import sys
import subprocess
import shutil
from pathlib import Path

APP_NAME = "Hermes Skill Deck"
SUPPORT_DIR = Path.home() / "Library" / "Application Support" / APP_NAME
VENV_DIR = SUPPORT_DIR / "venv"

# requirements.txt lives next to this script in the project root.
REQUIREMENTS = Path(__file__).resolve().parent / "requirements.txt"


def venv_python() -> Path:
    """Path to the venv's python interpreter."""
    return VENV_DIR / "bin" / "python"


def venv_exists() -> bool:
    return venv_python().is_file()


def create_venv() -> None:
    """Create the venv at VENV_DIR using the system python3."""
    VENV_DIR.parent.mkdir(parents=True, exist_ok=True)
    if VENV_DIR.exists():
        shutil.rmtree(VENV_DIR)
    print(f"[ensure_venv] creating venv at {VENV_DIR} ...", file=sys.stderr)
    subprocess.run(
        [sys.executable, "-m", "venv", str(VENV_DIR)],
        check=True,
    )


def install_requirements() -> None:
    """pip install -r requirements.txt into the venv."""
    if not REQUIREMENTS.is_file():
        print(f"[ensure_venv] WARNING: {REQUIREMENTS} not found, skipping install",
              file=sys.stderr)
        return
    print(f"[ensure_venv] installing dependencies from {REQUIREMENTS} ...",
          file=sys.stderr)
    subprocess.run(
        [
            str(venv_python()),
            "-m",
            "pip",
            "install",
            "--no-input",
            "--prefer-binary",
            "-r",
            str(REQUIREMENTS),
        ],
        check=True,
    )


def main() -> int:
    if not venv_exists():
        create_venv()
        install_requirements()
    else:
        print(f"[ensure_venv] venv already exists at {VENV_DIR}", file=sys.stderr)

    py = venv_python()
    if not py.is_file():
        print(f"[ensure_venv] ERROR: expected python at {py} not found",
              file=sys.stderr)
        return 1

    print(py)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
