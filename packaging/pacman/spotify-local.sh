#!/bin/bash
# SPDX-License-Identifier: MIT
# Spotify Local desktop launcher.
#
# The native Tauri shell owns the server lifecycle: it reuses an
# already-running healthy server on this user's per-UID port, otherwise it
# spawns the bundled Next.js standalone server (shipping with the package
# under /opt/spotify-local, together with its private Node.js runtime), and
# opens the app window. Safe to run multiple times: the shell takes a
# single-instance lock in $XDG_RUNTIME_DIR/spotify-local and exits if another
# instance is already showing the window.
#
# This wrapper only forwards system-wide defaults and debug overrides before
# exec'ing the real binary.

set -euo pipefail

SHELL_BIN="/opt/spotify-local/bin/spotify-local"
CONFIG_FILE="/etc/spotify-local/spotify-local.env"

if [ ! -x "$SHELL_BIN" ]; then
    echo "spotify-local: installation is broken ($SHELL_BIN missing)." >&2
    exit 1
fi

# System-wide defaults (Navidrome URL etc.). User environment always wins,
# because we source with defaults only.
if [ -r "$CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    . "$CONFIG_FILE"
fi

export SPOTIFY_LOCAL_PORT_MIN="${SPOTIFY_LOCAL_PORT_MIN:-3927}"
export SPOTIFY_LOCAL_PORT_MAX="${SPOTIFY_LOCAL_PORT_MAX:-3957}"

exec "$SHELL_BIN"
