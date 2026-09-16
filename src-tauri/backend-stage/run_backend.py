"""Launcher that runs the Hermes Skill Deck backend and exits when its parent
process disappears.

This is what the Tauri shell spawns instead of `python -m uvicorn` directly.
Why: when a GUI app is force-killed the OS may not run its cleanup hooks, so a
plain child uvicorn can outlive the app. This wrapper watches `os.getppid()`:
on macOS, a process whose parent has died gets reparented to launchd (pid 1),
so a change in parent pid means "my parent is gone, time to exit."

The uvicorn server runs in a background thread; when the watcher detects
orphaning it triggers a graceful shutdown so the port is released cleanly.

Usage (mirrors `python -m uvicorn server:app ...`):
    python run_backend.py --host 127.0.0.1 --port 8765
"""

from __future__ import annotations

import argparse
import os
import threading
import time

import uvicorn


def _watch_parent(stop_event: threading.Event) -> None:
    """Exit the process if our parent changes (i.e. the original parent died
    and we were reparented to launchd / pid 1)."""
    initial_parent = os.getppid()
    while not stop_event.wait(1.0):
        if os.getppid() != initial_parent:
            # Parent is gone. Shut the server down and exit.
            stop_event.set()
            os._exit(0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Hermes Skill Deck backend launcher")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    # Production mode: backend also serves the built frontend (one origin).
    os.environ.setdefault("HERMES_DECK_PROD", "1")
    os.environ.setdefault("HERMES_DECK_PORT", str(args.port))

    config = uvicorn.Config(
        "server:app",
        host=args.host,
        port=args.port,
        reload=False,
        log_level="info",
    )
    server = uvicorn.Server(config)

    # Parent-watcher: stops the server (and exits) when Tauri dies.
    stop_event = threading.Event()
    watcher = threading.Thread(target=_watch_parent, args=(stop_event,), daemon=True)
    watcher.start()

    try:
        server.run()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
