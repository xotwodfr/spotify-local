# Spotify Local — Arch Linux Package (Native Desktop App)

Self-hosted, Spotify-style music player client for your own Navidrome server,
packaged as a **self-contained native desktop application** for Arch Linux
(Tauri 2 shell, system WebKitGTK webview).

Everything needed to run the app is inside the package: the native desktop
shell, the Next.js production server, and a private Node.js runtime. You do
**not** need Node.js, npm, or any project dependencies installed. The only
requirements are the standard desktop libraries (GTK 3, WebKitGTK), declared
as pacman dependencies and pulled in automatically.

## Installation

```bash
sudo pacman -U spotify-local-1.0.0-1-x86_64.pkg.tar.zst
```

## Launch

Pick **Spotify Local** in your application menu (category: Multimedia), or run:

```bash
spotify-local
```

A native app window opens. The shell starts the bundled server on a per-user
local port (`http://127.0.0.1:39xx`) and loads the UI in the system webview —
no browser involved. Closing the window stops the server (unless it was
started externally, e.g. by the systemd user service, in which case it is
left running and reused next launch). On first launch, log in with your
Navidrome server URL and your Navidrome credentials.

### Pre-configuring the Navidrome server URL

Optional. Edit `/etc/spotify-local/spotify-local.env`:

```ini
NAVIDROME_URL="https://navidrome.example.com"
```

The URL is shown as the default on the login screen. Users can always type a
different server. Individual users may also export `NAVIDROME_URL` themselves,
which takes precedence. A per-user override file is also read from
`$XDG_CONFIG_HOME/spotify-local/spotify-local.env`.

### Port selection & running instances

The desktop shell picks a stable per-UID port in the range 3927–3957
(configurable via `SPOTIFY_LOCAL_PORT_MIN`/`SPOTIFY_LOCAL_PORT_MAX`, or a
fixed port via `SPOTIFY_LOCAL_PORT`). It reuses an already-running healthy
server in that range — including one started by the systemd user unit — before
spawning a new one. Logs: `$XDG_RUNTIME_DIR/spotify-local/server.log`.

### Running the server headlessly (optional)

If you prefer the server to run in the background continuously (e.g. to open
the app in a regular browser on another machine via SSH tunnel):

```bash
systemctl --user enable --now spotify-local.service
```

The app is then available at `http://127.0.0.1:3927/`. The desktop app reuses
that server instead of spawning its own.

## Uninstall

```bash
sudo pacman -R spotify-local
```

Running app instances are stopped automatically. Personal webview data for the
local app (login sessions etc.) is not removed.

## Files

| Path                                    | Purpose                                        |
|-----------------------------------------|------------------------------------------------|
| `/opt/spotify-local/bin/spotify-local`  | Native desktop shell (Tauri 2)                 |
| `/opt/spotify-local/app/`               | Application (Next.js standalone server)        |
| `/opt/spotify-local/runtime/`           | Private Node.js runtime                        |
| `/usr/bin/spotify-local`                | Launcher wrapper                               |
| `/etc/spotify-local/spotify-local.env`  | System-wide defaults (Navidrome URL, ...)      |
| `/usr/share/applications/spotify-local.desktop` | Menu entry                             |
| `/usr/share/icons/hicolor/*/apps/spotify-local.*` | Icons                               |
| `/usr/lib/systemd/user/spotify-local.service` | Optional headless user service          |

## Building the package yourself

From a git checkout of the project:

```bash
bash scripts/build-pacman-package.sh
```

Requires `makepkg`, `fakeroot` (default on Arch), `rsvg-convert` or
ImageMagick, Node.js ≥ 24 with npm (build machine only), and a Rust toolchain
with `pkgconf`, `webkit2gtk-4.1` and `gtk3` headers to compile the desktop
shell.

Verify a built package in a sandboxed user namespace (no root needed):

```bash
bash packaging/pacman/verify-package.sh
```
