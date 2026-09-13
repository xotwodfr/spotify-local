#!/bin/bash
# Assemble the self-contained application bundle from staged parts.
#
# Usage: bash server.sh [version]
#
# Expected in the current directory (staged by scripts/build-pacman-package.sh):
#   standalone/   Next.js standalone server (.next/standalone, musl pruned)
#   static/       Next.js client assets (.next/static)
#   public/       Static public assets
#   nodebin/      Private Node.js runtime (node binary [+ LICENSE])
#
# Produces:
#   app/          Application served from /opt/spotify-local/app
#   runtime/      Private runtime served from /opt/spotify-local/runtime

set -euo pipefail

VERSION="${1:-unknown}"

test -f standalone/server.js
test -d static
test -d public
test -x nodebin/node

# --- Application -----------------------------------------------------------
rm -rf app runtime
mkdir -p app
cp -a standalone/. app/
mkdir -p app/.next
cp -a static app/.next/static
cp -a public app/public
mkdir -p app/.next/cache

# --- Private runtime -------------------------------------------------------
mkdir -p runtime/bin runtime/share/licenses/nodejs
cp -a nodebin/node runtime/bin/node
chmod 755 runtime/bin/node
if [ -f nodebin/LICENSE ]; then
    cp -a nodebin/LICENSE runtime/share/licenses/nodejs/LICENSE
fi

NODE_VER="$(./runtime/bin/node --version)"
printf 'spotify-local bundled Node.js runtime\nVersion: %s\nBundled at package build time from the build host Node.js.\n' \
    "$NODE_VER" >runtime/VERSION

# --- Verification ----------------------------------------------------------
test -x runtime/bin/node
test -f app/server.js
test -f app/package.json
test -d app/.next/static
test -d app/public

echo "server.sh: bundle assembled (app/ + runtime/, Node.js $NODE_VER, app $VERSION)"
