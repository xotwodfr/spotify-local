// Tauri 2 desktop shell for Spotify Local.
//
// The shell owns the server lifecycle: on startup it reuses an already-running
// healthy server on this user's per-UID port, otherwise it spawns the bundled
// Next.js standalone server shipped under /opt/spotify-local (app + private
// Node runtime; `NODE`/`APP` env overrides exist for dev environments). When
// the last window closes, the spawned server is shut down. A second launch
// detects the running instance via a file lock and exits quietly.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicI32, Ordering};
use std::time::{Duration, Instant};

const APP_ID: &str = "spotify-local";
const HEALTH_PATH: &str = "/api/navidrome/session";
const STARTUP_TIMEOUT: Duration = Duration::from_secs(20);
const POLL_INTERVAL: Duration = Duration::from_millis(150);
const SERVER_GRACE: Duration = Duration::from_secs(5);
const HEALTH_CONNECT_TIMEOUT: Duration = Duration::from_secs(2);

struct SpawnedServer {
    child: Child,
}

impl SpawnedServer {
    fn poll_exit(&mut self) -> Option<std::process::ExitStatus> {
        self.child.try_wait().ok().flatten()
    }

    fn arm_signal_cleanup(&self) {
        CHILD_PID.store(self.child.id() as i32, Ordering::SeqCst);
    }
}

// Pid of the spawned server, so the signal handler below can stop it even
// though Rust destructors do not run on SIGTERM/SIGINT/SIGHUP.
static CHILD_PID: AtomicI32 = AtomicI32::new(0);

extern "C" fn stop_server_on_signal(sig: libc::c_int) {
    let pid = CHILD_PID.load(Ordering::SeqCst);
    if pid > 0 {
        unsafe { libc::kill(pid, libc::SIGTERM) };
    }
    unsafe {
        libc::signal(sig, libc::SIG_DFL);
        libc::raise(sig);
    }
}

fn install_signal_handlers() {
    let handler = stop_server_on_signal as *const () as libc::sighandler_t;
    unsafe {
        libc::signal(libc::SIGINT, handler);
        libc::signal(libc::SIGTERM, handler);
        libc::signal(libc::SIGHUP, handler);
    }
}

impl Drop for SpawnedServer {
    fn drop(&mut self) {
        // Politely stop the standalone server, escalating to SIGKILL.
        unsafe { libc::kill(self.child.id() as i32, libc::SIGTERM) };
        let deadline = Instant::now() + SERVER_GRACE;
        while Instant::now() < deadline {
            match self.child.try_wait() {
                Ok(Some(_)) | Err(_) => return,
                Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            }
        }
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn env_or(name: &str, default: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| default.to_string())
}

fn configured_port_range() -> (u16, u16) {
    let parse = |name: &str, default: u16| -> u16 {
        env_or(name, &default.to_string()).trim().parse().unwrap_or(default)
    };
    let min = parse("SPOTIFY_LOCAL_PORT_MIN", 3927);
    let max = parse("SPOTIFY_LOCAL_PORT_MAX", 3957);
    (min.min(max), max.max(min))
}

fn preferred_port() -> u16 {
    if let Ok(port) = std::env::var("SPOTIFY_LOCAL_PORT") {
        if let Ok(port) = port.trim().parse::<u16>() {
            return port;
        }
    }
    let (min, max) = configured_port_range();
    let uid = unsafe { libc::getuid() };
    min + (uid % u32::from(max - min + 1)) as u16
}

fn port_is_free(port: u16) -> bool {
    TcpListener::bind((Ipv4Addr::LOCALHOST, port)).is_ok()
}

fn free_port_from(range: (u16, u16), skip: u16) -> Option<u16> {
    let (min, max) = range;
    (min..=max).find(|p| *p != skip && port_is_free(*p))
}

/// Probe this user's preferred port first, then the whole configured range,
/// for an already-running healthy server (e.g. one started by the optional
/// systemd user unit or a previous instance still holding its window open).
fn find_healthy_server() -> Option<u16> {
    let preferred = preferred_port();
    if health_ok(preferred) {
        return Some(preferred);
    }
    let (min, max) = configured_port_range();
    (min..=max).find(|p| *p != preferred && health_ok(*p))
}

fn health_ok(port: u16) -> bool {
    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, HEALTH_CONNECT_TIMEOUT) else {
        return false;
    };
    let request = format!(
        "GET {HEALTH_PATH} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n"
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0u8; 128];
    let read = stream.read(&mut buf).unwrap_or(0);
    let head = String::from_utf8_lossy(&buf[..read]).to_uppercase();
    // The session endpoint answers 200 both signed in and signed out.
    head.starts_with("HTTP/") && head.contains(" 200 ")
}

fn wait_until_healthy(port: u16, server: &mut SpawnedServer, timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if health_ok(port) {
            return Ok(());
        }
        if server.poll_exit().is_some() {
            return Err("bundled server exited during startup (see server.log)".to_string());
        }
        std::thread::sleep(POLL_INTERVAL);
    }
    Err(format!(
        "server on port {port} did not become healthy within {}s",
        timeout.as_secs()
    ))
}

fn load_env_file(path: &Path) {
    let Ok(content) = std::fs::read_to_string(path) else {
        return;
    };
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() || std::env::var_os(key).is_some() {
            continue; // The user's environment always wins.
        }
        let mut value = value.trim();
        if value.len() >= 2
            && ((value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\'')))
        {
            value = &value[1..value.len() - 1];
        }
        // SAFETY: single-threaded startup, before any threads read the env.
        unsafe { std::env::set_var(key, value) };
    }
}

fn source_system_config() {
    load_env_file(Path::new("/etc/spotify-local/spotify-local.env"));
    if let Ok(dir) = std::env::var("XDG_CONFIG_HOME") {
        load_env_file(&PathBuf::from(dir).join("spotify-local/spotify-local.env"));
    } else if let Ok(home) = std::env::var("HOME") {
        load_env_file(&PathBuf::from(home).join(".config/spotify-local/spotify-local.env"));
    }
}

fn resolve_node(app_dir: &Path) -> Option<PathBuf> {
    if let Ok(node) = std::env::var("NODE") {
        let node = PathBuf::from(node);
        if node.is_file() {
            return Some(node);
        }
    }
    // Bundled runtime sits next to the app dir: /opt/spotify-local/{app,runtime}.
    let sibling = app_dir.parent()?.join("runtime/bin/node");
    (sibling.is_file()).then_some(sibling)
}

fn runtime_dir() -> PathBuf {
    let base = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(base).join(APP_ID)
}

fn spawn_server(app_dir: &Path, port: u16) -> Result<SpawnedServer, String> {
    let node = resolve_node(app_dir).ok_or_else(|| {
        "no Node runtime found (NODE unset and bundled runtime missing)".to_string()
    })?;
    let server_js = app_dir.join("server.js");
    if !server_js.is_file() {
        return Err(format!("missing server.js at {}", server_js.display()));
    }

    let log_dir = runtime_dir();
    let _ = std::fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("server.log");
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("cannot open {}: {e}", log_path.display()))?;

    let child = Command::new(&node)
        .arg(&server_js)
        .env("NODE_ENV", "production")
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file.try_clone().map_err(|e| e.to_string())?))
        .stderr(Stdio::from(log_file))
        .spawn()
        .map_err(|e| format!("failed to start bundled server: {e}"))?;

    Ok(SpawnedServer { child })
}

fn single_instance_lock() -> Option<FileLock> {
    let dir = runtime_dir();
    let _ = std::fs::create_dir_all(&dir);
    FileLock::acquire(&dir.join("app.lock"))
}

struct FileLock(#[allow(dead_code)] std::fs::File);

impl FileLock {
    fn acquire(path: &Path) -> Option<FileLock> {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(false)
            .open(path)
            .ok()?;
        let fd = std::os::unix::io::AsRawFd::as_raw_fd(&file);
        (unsafe { libc::flock(fd, libc::LOCK_EX | libc::LOCK_NB) } == 0).then_some(FileLock(file))
    }
}

fn run() -> i32 {
    install_signal_handlers();
    source_system_config();

    // Single instance: if another window is already up, exit quietly.
    let _instance_lock = match single_instance_lock() {
        Some(lock) => lock,
        None => return 0,
    };

    // App dir: `APP` override for dev, else the installed layout.
    let app_dir = std::env::var("APP")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/opt/spotify-local/app"));

    let preferred = preferred_port();
    let (spawned, port): (Option<SpawnedServer>, u16) = match find_healthy_server() {
        // Healthy server already listening — reuse it (never killed on exit).
        Some(healthy) => (None, healthy),
        None => {
            let free = if port_is_free(preferred) {
                preferred
            } else {
                free_port_from(configured_port_range(), preferred).unwrap_or(preferred)
            };
            match spawn_server(&app_dir, free) {
                Ok(mut server) => {
                    server.arm_signal_cleanup();
                    if let Err(err) =
                        wait_until_healthy(free, &mut server, STARTUP_TIMEOUT)
                    {
                        eprintln!("spotify-local: {err}");
                        return 1;
                    }
                    (Some(server), free)
                }
                Err(err) => {
                    eprintln!("spotify-local: {err}");
                    return 1;
                }
            }
        }
    };

    // Hold the server for the whole app lifetime; dropped on exit, which
    // terminates a server this instance spawned.
    let _server = spawned;
    let url = format!("http://127.0.0.1:{port}/");

    let builder = tauri::Builder::default().setup(move |app| {
        let window = tauri::WebviewWindowBuilder::new(
            app,
            "main",
            tauri::WebviewUrl::External(url.parse().expect("valid server URL")),
        )
        .title("Spotify Local")
        .inner_size(1280.0, 800.0)
        .min_inner_size(940.0, 600.0)
        .center()
        .build()?;
        let _ = window.set_focus();
        Ok(())
    });

    match builder.build(tauri::generate_context!()) {
        Ok(app) => {
            // Returns when the last window closes (default exit behavior);
            // `_server` then drops and shuts down the spawned server.
            app.run(|_app_handle, _event| {});
            0
        }
        Err(err) => {
            eprintln!("spotify-local: tauri error: {err}");
            1
        }
    }
}

fn main() {
    std::process::exit(run());
}
