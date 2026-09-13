#!/usr/bin/env bash
# Build a self-contained native desktop Arch Linux package (pacman) for
# spotify-local: Tauri 2 shell + Next.js standalone server + private Node.js
# runtime.
#
# Output: dist/pacman/spotify-local-<version>-<pkgrel>-x86_64.pkg.tar.zst
#         dist/pacman/README.txt
#
# Usage:  bash scripts/build-pacman-package.sh [--skip-build]
#
# The package embeds:
#   - the Tauri 2 desktop shell (release build; system WebKitGTK webview)
#   - the Next.js standalone production build (.next/standalone + static + public)
#   - a private Node.js runtime (copied from the build host's `node`)
#   - launcher wrapper, .desktop entry, icons, systemd user unit
#
# End users need nothing preinstalled beyond the standard desktop libraries:
# no Node.js, no npm, no project dependencies, no rust toolchain at runtime.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PKG_DIR="$PROJECT_ROOT/packaging/pacman"
OUT_DIR="$PROJECT_ROOT/dist/pacman"
STAGING="$OUT_DIR/staging/spotify-local"
WORK_DIR="$OUT_DIR/pacman-work"

SKIP_BUILD=0
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=1 ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

PKGVER="$(node -p "require('./package.json').version")"
PKGREL="1"

if [ "$SKIP_BUILD" != "1" ]; then
    echo "==> Building Next.js production bundle (standalone)"
    # Empty the Navidrome URL so no developer-specific value is baked into
    # the distributed package; users pick their server at first launch (or
    # via /etc/spotify-local/spotify-local.env).
    env NEXT_PUBLIC_NAVIDROME_URL= NAVIDROME_URL= npm run build

    echo "==> Building Tauri desktop shell (release)"
    (cd src-tauri && cargo build --release)
fi

SHELL_BIN="src-tauri/target/release/spotify-local"
test -f ".next/standalone/server.js" || {
    echo "ERROR: .next/standalone/server.js missing — run the build first." >&2
    exit 1
}
test -x "$SHELL_BIN" || {
    echo "ERROR: $SHELL_BIN missing — build the Tauri shell first." >&2
    exit 1
}

echo "==> Staging package payload in $STAGING"
rm -rf "$OUT_DIR/staging"
mkdir -p "$STAGING"

# Tauri shell binary (prebuilt; the PKGBUILD installs it under /opt).
mkdir -p "$STAGING/bin"
install -m 755 "$SHELL_BIN" "$STAGING/bin/spotify-local"

# Next.js standalone server (portable: no absolute host paths inside).
cp -a .next/standalone "$STAGING/standalone"
# Client-side static assets must be merged into the standalone tree.
cp -a .next/static "$STAGING/static"
# Public assets (fonts, favicon, etc.).
cp -a public "$STAGING/public"

# Prune musl-variant native modules (wrong libc for Arch; dead weight).
rm -rf "$STAGING/standalone/node_modules/@img/sharp-linuxmusl-x64" \
       "$STAGING/standalone/node_modules/@img/sharp-libvips-linuxmusl-x64" 2>/dev/null || true

# Private Node.js runtime (guarantees makedepends version compatibility).
mkdir -p "$STAGING/nodebin"
cp -a "$(command -v node)" "$STAGING/nodebin/node"
if [ -f /usr/share/licenses/nodejs/LICENSE ]; then
    cp -a /usr/share/licenses/nodejs/LICENSE "$STAGING/nodebin/LICENSE"
fi

# Packaging assets the PKGBUILD installs into the filesystem.
mkdir -p "$STAGING/usr/bin" \
         "$STAGING/usr/share/applications" \
         "$STAGING/usr/share/icons/hicolor/scalable/apps" \
         "$STAGING/usr/share/doc/spotify-local/examples" \
         "$STAGING/usr/lib/systemd/user"

install -m 755 "$PKG_DIR/spotify-local.sh" "$STAGING/usr/bin/spotify-local"
install -m 644 "$PKG_DIR/spotify-local.desktop" "$STAGING/usr/share/applications/spotify-local.desktop"
install -m 644 "$PKG_DIR/spotify-local.svg" "$STAGING/usr/share/icons/hicolor/scalable/apps/spotify-local.svg"
install -m 644 "$PKG_DIR/spotify-local.env" \
    "$STAGING/usr/share/doc/spotify-local/examples/spotify-local.env"
install -m 644 "$PKG_DIR/spotify-local.service" "$STAGING/usr/lib/systemd/user/spotify-local.service"

# Raster icon set generated from the SVG (rsvg-convert preferred).
for size in 256x256 128x128 64x64 48x48 32x32 16x16; do
    mkdir -p "$STAGING/usr/share/icons/hicolor/$size/apps"
    px="${size%%x*}"
    out="$STAGING/usr/share/icons/hicolor/$size/apps/spotify-local.png"
    if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert -w "$px" -h "$px" "$PKG_DIR/spotify-local.svg" -o "$out"
    else
        magick -background none "$PKG_DIR/spotify-local.svg" -resize "${px}x${px}" "$out"
    fi
done

# Support files referenced by the PKGBUILD live inside the tarball root.
install -m 644 package.json "$STAGING/package.json"
install -m 644 next.config.ts "$STAGING/next.config.ts"
install -m 755 "$PKG_DIR/server.sh" "$STAGING/server.sh"
mkdir -p "$STAGING/scripts"
install -m 755 "$PKG_DIR/test-installed-runtime.sh" "$STAGING/scripts/test-installed-runtime.sh"
install -m 644 LICENSE "$STAGING/LICENSE"
install -m 644 "$PKG_DIR/README.md" "$STAGING/README.md"
install -m 644 "$PKG_DIR/README.md" "$OUT_DIR/README.txt"

# --- Source tarball for makepkg ---------------------------------------------
echo "==> Creating source tarball"
mkdir -p "$OUT_DIR"
TARBALL="$OUT_DIR/spotify-local-$PKGVER.tar.zst"
rm -f "$TARBALL"
# Top-level directory inside the tarball must be $pkgname-$pkgver for makepkg.
mv "$STAGING" "$OUT_DIR/staging/spotify-local-$PKGVER"
tar --zstd -cf "$TARBALL" -C "$OUT_DIR/staging" "spotify-local-$PKGVER"

# --- PKGBUILD + checksums ----------------------------------------------------
mkdir -p "$WORK_DIR"
install -m 644 "$PKG_DIR/PKGBUILD" "$WORK_DIR/PKGBUILD"
install -m 644 "$PKG_DIR/spotify-local.install" "$WORK_DIR/spotify-local.install"
SHA="$(sha256sum "$TARBALL" | awk '{print $1}')"
sed -i "s|sha256sums=(\"SKIP\")|sha256sums=(\"$SHA\")|" "$WORK_DIR/PKGBUILD"
# makepkg resolves local sources relative to the PKGBUILD directory.
cp -f "$TARBALL" "$WORK_DIR/"

echo "==> Building pacman package with makepkg"
(cd "$WORK_DIR" && makepkg -f --noconfirm)

BUILT="$WORK_DIR/spotify-local-$PKGVER-$PKGREL-x86_64.pkg.tar.zst"
test -f "$BUILT" || { echo "ERROR: package file not found: $BUILT" >&2; exit 1; }
mv -f "$BUILT" "$OUT_DIR/"

echo "==> Package ready: dist/pacman/spotify-local-$PKGVER-$PKGREL-x86_64.pkg.tar.zst"
echo "    Install with: sudo pacman -U dist/pacman/spotify-local-$PKGVER-$PKGREL-x86_64.pkg.tar.zst"
