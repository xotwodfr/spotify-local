#!/bin/bash
# Verify that the assembled bundle serves the application using ONLY the
# bundled runtime, from its own layout — the same layout the package installs
# under /opt/spotify-local. Proves the app does not depend on the project
# directory, Node.js, or npm on the host.
#
# Usage: bash test-installed-runtime.sh [bundle-root]

set -euo pipefail

ROOT="${1:-$PWD}"
APP="$ROOT/app"
NODE_BIN="$ROOT/runtime/bin/node"
PORT="${SPOTIFY_LOCAL_TEST_PORT:-3977}"
BASE="http://127.0.0.1:${PORT}"

test -x "$NODE_BIN"
test -f "$APP/server.js"

export PORT
export HOSTNAME=127.0.0.1
export NODE_ENV=production

cd "$APP"
"$NODE_BIN" server.js >"$ROOT/runtime-test.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true' EXIT

ok=0
for _ in $(seq 1 50); do
    if curl -sf -o /dev/null "$BASE/api/navidrome/session"; then
        ok=1
        break
    fi
    sleep 0.2
done
if [ "$ok" != 1 ]; then
    echo "test-installed-runtime: server did not become healthy" >&2
    cat "$ROOT/runtime-test.log" >&2 || true
    exit 1
fi

# Health/session API answers JSON.
curl -sf "$BASE/api/navidrome/session" >"$ROOT/runtime-test-session.json"
grep -q '"connected"' "$ROOT/runtime-test-session.json"

# Root page renders.
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"
if [ "$code" != "200" ]; then
    echo "test-installed-runtime: expected 200 for /, got $code" >&2
    exit 1
fi

# A regular client chunk is served via /_next/static (avoid bracketed
# route names, which would need URL escaping).
ASSET="$(find "$APP/.next/static/chunks" -type f -name '*.js' ! -name '_*' | head -1 || true)"
if [ -n "$ASSET" ]; then
    REL="${ASSET#"$APP/.next"}"
    code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/_next$REL")"
    if [ "$code" != "200" ]; then
        echo "test-installed-runtime: expected 200 for $BASE/_next$REL, got $code" >&2
        exit 1
    fi
fi

echo "test-installed-runtime: OK (session API, root page and static assets served by the bundled runtime)"
