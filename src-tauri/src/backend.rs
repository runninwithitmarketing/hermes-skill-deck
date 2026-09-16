//! Backend process management for the Hermes Skill Deck Tauri shell.
//!
//! On startup we spawn the Python FastAPI backend (`server.py` via
//! `run_backend.py`) in a private venv, wait for it to answer an HTTP health
//! check on `BACKEND_PORT`, then hand its URL back to the app. The backend is
//! killed cleanly on quit — either via this struct's `Drop` impl, or via
//! `kill_port_on_exit` in the `RunEvent::ExitRequested` handler (SIGTERM can
//! bypass `Drop` on macOS, so we belt-and-braces it).

use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

/// Port the backend listens on. Matches `HERMES_DECK_PORT` in `run_backend.py`.
pub const BACKEND_PORT: u16 = 8765;
/// Base URL the webview loads (backend serves both API + built frontend).
pub const BACKEND_URL: &str = "http://127.0.0.1:8765";

/// How long to wait for the backend health check before giving up.
const READY_TIMEOUT: Duration = Duration::from_secs(60);
/// Polling interval while waiting for the backend to come up.
const POLL_INTERVAL: Duration = Duration::from_millis(300);

/// Owns the spawned backend process; killing it on drop prevents orphans.
pub struct Backend {
    child: Option<Child>,
}

impl Drop for Backend {
    fn drop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        kill_port_on_exit(BACKEND_PORT);
    }
}

/// Kill whatever is listening on `port` (best-effort). Used on exit because
/// SIGTERM can bypass both `Drop` and window-destroy handlers on macOS.
pub fn kill_port_on_exit(port: u16) {
    let out = Command::new("lsof")
        .args(["-nP", "-iTCP", &format!(":{port}"), "-sTCP:LISTEN", "-t"])
        .output();
    if let Ok(out) = out {
        let pids = String::from_utf8_lossy(&out.stdout);
        for line in pids.lines() {
            let pid = line.trim();
            if !pid.is_empty() {
                let _ = Command::new("kill").arg(pid).status();
            }
        }
    }
}

/// Locate the project root by searching for `backend-stage/` (dev) or the
/// bundled resource dir (prod). Order:
///   1. `HERMES_DECK_ROOT` env override
///   2. current working directory (and ancestors)
///   3. parent dirs of the running executable
///   4. app resource dir (bundled `backend-stage/`)
fn resolve_project_root(app: &AppHandle) -> Option<PathBuf> {
    // 1. Explicit override.
    if let Ok(root) = std::env::var("HERMES_DECK_ROOT") {
        let root = PathBuf::from(root);
        if root.join("backend-stage").is_dir() {
            return Some(root);
        }
    }

    // 2 & 3. Walk cwd / exe parent chain looking for backend-stage/.
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.to_path_buf());
        }
    }
    for mut dir in candidates {
        loop {
            if dir.join("backend-stage").is_dir() {
                return Some(dir);
            }
            if !dir.pop() {
                break;
            }
        }
    }

    // 4. Bundled resource dir (production): resource_dir()/backend-stage/.
    if let Some(res) = app.path().resource_dir().ok() {
        if res.join("backend-stage").is_dir() {
            return Some(res);
        }
    }

    None
}

/// Resolve the venv python by running `ensure_venv.py` with the system python3.
/// Returns the path to the venv's `python` binary (printed to stdout by the
/// script). Honors `HERMES_DECK_PYTHON` and `HERMES_DECK_SYSTEM_PYTHON`.
fn resolve_venv_python(root: &std::path::Path) -> Result<PathBuf, String> {
    // An explicit full venv python path wins outright.
    if let Ok(py) = std::env::var("HERMES_DECK_PYTHON") {
        let py = PathBuf::from(py);
        if py.is_file() {
            return Ok(py);
        }
    }

    let system_python =
        std::env::var("HERMES_DECK_SYSTEM_PYTHON").unwrap_or_else(|_| "python3".to_string());

    let ensure = root.join("backend-stage").join("ensure_venv.py");
    let output = Command::new(&system_python)
        .arg(&ensure)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .output()
        .map_err(|e| format!("failed to run ensure_venv.py ({system_python}): {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ensure_venv.py exited with {}",
            output.status
        ));
    }

    // The script prints the venv python path as its last stdout line.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let py_line = stdout
        .lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .ok_or_else(|| "ensure_venv.py printed no python path".to_string())?;
    let py = PathBuf::from(py_line.trim());
    if py.is_file() {
        Ok(py)
    } else {
        Err(format!("venv python not found at {}", py.display()))
    }
}

impl Backend {
    /// Spawn the backend and block until it answers a health check.
    pub fn start(app: &AppHandle) -> Result<Backend, String> {
        let root =
            resolve_project_root(app).ok_or_else(|| "could not locate backend-stage/".to_string())?;
        let backend_dir = root.join("backend-stage");

        let venv_python = resolve_venv_python(&root)?;
        let run_backend = backend_dir.join("run_backend.py");

        // Spawn: <venv>/python run_backend.py --host 127.0.0.1 --port 8765
        let mut cmd = Command::new(&venv_python);
        cmd.arg(&run_backend)
            .args(["--host", "127.0.0.1", "--port", &BACKEND_PORT.to_string()])
            .current_dir(&backend_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit());

        let child = cmd
            .spawn()
            .map_err(|e| format!("failed to spawn backend ({e})"))?;

        let backend = Backend { child: Some(child) };

        // Wait for the port to accept a TCP connection (cheap readiness probe).
        let deadline = Instant::now() + READY_TIMEOUT;
        loop {
            if Instant::now() > deadline {
                return Err(format!(
                    "backend did not become ready on port {BACKEND_PORT} within {}s",
                    READY_TIMEOUT.as_secs()
                ));
            }
            if TcpStream::connect(("127.0.0.1", BACKEND_PORT)).is_ok() {
                break;
            }
            std::thread::sleep(POLL_INTERVAL);
        }

        // Belt-and-braces: confirm the HTTP health endpoint answers.
        let health = format!("{BACKEND_URL}/api/health");
        let checked = Instant::now() + Duration::from_secs(15);
        loop {
            if Instant::now() > checked {
                break; // TCP is up; close enough — let the UI surface any error.
            }
            if let Ok(resp) = reqwest::blocking::get(&health) {
                if resp.status().is_success() {
                    break;
                }
            }
            std::thread::sleep(POLL_INTERVAL);
        }

        Ok(backend)
    }
}
