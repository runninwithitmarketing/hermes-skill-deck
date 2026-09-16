//! Hermes Skill Deck — Tauri shell.
//!
//! Spawns the Python backend, waits for it, opens the window pointed at the
//! backend's URL, and kills the backend cleanly on quit. See `backend.rs` for
//! the process management.

mod backend;

use backend::{kill_port_on_exit, Backend, BACKEND_PORT, BACKEND_URL};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

type ManagedBackend = Mutex<Option<Backend>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage::<ManagedBackend>(Mutex::new(None))
        .setup(|app| {
            match Backend::start(app.handle()) {
                Ok(backend) => {
                    // Stash the backend so its Drop keeps it alive for the app lifetime.
                    let state: tauri::State<ManagedBackend> = app.state();
                    *state.lock().unwrap() = Some(backend);

                    // The window always loads the backend origin (it serves API + UI).
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval(&format!("window.location.replace('{BACKEND_URL}')"));
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    Ok(())
                }
                Err(err) => {
                    eprintln!("[hermes-skill-deck] backend failed to start: {err}");
                    Err(err.into())
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // SIGTERM (e.g. force-quit / logout) bypasses both the Backend Drop and the
    // window-destroy path, so we also scrub the port here on exit.
    app.run(|_app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            kill_port_on_exit(BACKEND_PORT);
        }
    });
}
