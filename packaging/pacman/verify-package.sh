#!/usr/bin/env bash
# Real-world verification of the built pacman package.
#
# Runs `pacman -U` and `pacman -R` for real inside a user namespace (mapped
# root via unshare -r) with a private tmpfs as the install root, so the host
# system is never touched. Dependency resolution is skipped (--nodeps) because
# the sandbox has no repo databases; the declared runtime deps are verified
# separately against the host system (see verify-deps.sh).
#
# Validates:
#   1. the package installs cleanly and registers as "spotify-local"
#   2. .desktop, icons, /usr/bin launcher, /opt layout, /etc config exist
#   3. the app actually serves from the INSTALLED location via the BUNDLED
#      runtime, with a minimal environment (no project directory involved)
#   4. pacman -R removes it again
#
# Usage: bash packaging/pacman/verify-package.sh [path/to/*.pkg.tar.zst]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PKG_GLOB="${1:-$PROJECT_ROOT/dist/pacman/spotify-local-*.pkg.tar.zst}"
PKGFILE="$(ls -t $PKG_GLOB | head -1)"

echo "==> Verifying: $(basename "$PKGFILE")"

unshare -r -m --fork bash -s "$PKGFILE" <<'VERIFY'
set -euo pipefail
PKGFILE="$1"

echo "==> [ns] private tmpfs on /tmp (sandbox install root)"
mount -t tmpfs -o size=2g tmpfs /tmp
# Pre-create every dir pacman wants, so it never falls back to creating or
# chowning temporary directories (chown fails under a mapped user namespace).
mkdir -p /tmp/var/lib/pacman /tmp/var/lib/pacman/hooks /tmp/var/cache/pacman/pkg /tmp/home
# Pacman runs .install scriptlets chrooted into the target root, so that root
# needs a shell. Bind the host /usr into the sandbox and point /bin/sh at it
# (on a real Arch system /bin/sh always exists — this only affects the sandbox).
mkdir -p /tmp/bin /tmp/host-usr
mount --bind /usr /tmp/host-usr
ln -sf host-usr/bin/bash /tmp/bin/sh
# The shell is dynamically linked: expose the host loader inside the sandbox.
ln -sfn host-usr/lib64 /tmp/lib64
ln -sfn host-usr/lib /tmp/lib

# Minimal pacman config: no repos, no DownloadUser sandboxing (chown of the
# download dir fails under a mapped user namespace), optional local sigs.
cat >/tmp/pacman.conf <<'PACCONF'
[options]
HoldPkg = pacman glibc
Architecture = auto
CheckSpace
SigLevel = Never
LocalFileSigLevel = Never
PACCONF

echo "==> [ns] pacman -U --root /tmp (real install, real hooks, no repo dbs in sandbox)"
pacman --config /tmp/pacman.conf -U --noconfirm -dd --root /tmp \
    --dbpath /tmp/var/lib/pacman \
    --cachedir /tmp/var/cache/pacman/pkg \
    --hookdir /tmp/var/lib/pacman/hooks \
    "$PKGFILE"

echo "==> [ns] verifying installed files"
test -x /tmp/usr/bin/spotify-local
test -x /tmp/opt/spotify-local/bin/spotify-local
test -f /tmp/usr/share/applications/spotify-local.desktop
test -f /tmp/usr/share/icons/hicolor/scalable/apps/spotify-local.svg
test -f /tmp/usr/share/icons/hicolor/256x256/apps/spotify-local.png
test -f /tmp/usr/share/icons/hicolor/32x32/apps/spotify-local.png
test -f /tmp/etc/spotify-local/spotify-local.env
test -f /tmp/opt/spotify-local/app/server.js
test -x /tmp/opt/spotify-local/runtime/bin/node
test -f /tmp/usr/lib/systemd/user/spotify-local.service
test -f /tmp/usr/share/doc/spotify-local/README.md

echo "==> [ns] pacman database entry:"
pacman -Q --root /tmp spotify-local

# Dynamic libraries the Tauri shell needs at runtime; the sandbox binds host
# /usr, so a missing host lib would also break a real install.
ldd /tmp/opt/spotify-local/bin/spotify-local | grep -q "libwebkit2gtk-4.1.so.0" || {
    echo "FAIL: shell binary not linked against WebKitGTK" >&2; exit 1
}
ldd /tmp/opt/spotify-local/bin/spotify-local | grep -q "libgtk-3.so.0" || {
    echo "FAIL: shell binary not linked against GTK 3" >&2; exit 1
}

# The launcher wrapper must exec the native shell, not open a browser.
grep -q "/opt/spotify-local/bin/spotify-local" /tmp/usr/bin/spotify-local || {
    echo "FAIL: /usr/bin/spotify-local does not reference the native shell" >&2; exit 1
}

echo "==> [ns] launching the app from the INSTALLED location (bundled runtime, clean env)"
env -i HOME=/tmp/home PATH=/usr/bin:/bin PORT=3967 HOSTNAME=127.0.0.1 \
    /tmp/opt/spotify-local/runtime/bin/node /tmp/opt/spotify-local/app/server.js \
    >/tmp/verify-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

ok=0
for _ in $(seq 1 50); do
    if curl -sf -o /dev/null "http://127.0.0.1:3967/api/navidrome/session"; then ok=1; break; fi
    sleep 0.2
done
if [ "$ok" != 1 ]; then
    echo "FAIL: server did not become healthy" >&2; cat /tmp/verify-server.log >&2; exit 1
fi

code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3967/)"
[ "$code" = "200" ] || { echo "FAIL: / returned $code" >&2; exit 1; }

CHUNK="$(find /tmp/opt/spotify-local/app/.next/static/chunks -name '*.js' ! -name '_*' | head -1)"
REL="${CHUNK#/tmp/opt/spotify-local/app/.next}"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3967/_next$REL")"
[ "$code" = "200" ] || { echo "FAIL: static chunk returned $code" >&2; exit 1; }
echo "==> [ns] app served from /tmp/opt/spotify-local: session API OK, page 200, static chunk 200"

kill $SRV 2>/dev/null || true
wait $SRV 2>/dev/null || true
trap - EXIT

echo "==> [ns] desktop-file-validate on the installed .desktop"
desktop-file-validate /tmp/usr/share/applications/spotify-local.desktop
echo "==> [ns] desktop-file-validate: OK"

echo "==> [ns] uninstalling with pacman -R spotify-local"
pacman --config /tmp/pacman.conf -R --noconfirm -dd --root /tmp \
    --dbpath /tmp/var/lib/pacman \
    --cachedir /tmp/var/cache/pacman/pkg \
    --hookdir /tmp/var/lib/pacman/hooks \
    spotify-local
if pacman -Q --root /tmp spotify-local >/dev/null 2>&1; then
    echo "FAIL: package still registered after pacman -R" >&2
    exit 1
fi
for f in /tmp/usr/bin/spotify-local \
         /tmp/usr/share/applications/spotify-local.desktop \
         /tmp/opt/spotify-local/app/server.js; do
    if [ -e "$f" ]; then echo "FAIL: not removed: $f" >&2; exit 1; fi
done
echo "==> [ns] uninstall verified: package and files removed cleanly"
VERIFY

echo
echo "==> Package verification PASSED"
echo "    $PKGFILE"
