import { getServerSession } from "@/lib/navidrome/server-session";

export const dynamic = "force-dynamic";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ENDPOINT_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9_-]*)$/;
const IMAGE_CACHE_ENDPOINTS = new Set(["getCoverArt"]);
const STREAM_ENDPOINT = "stream";

const STREAM_HEADERS = new Set([
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getServerSession();
  if (!session) {
    return Response.json(
      {
        ok: false,
        connected: false,
        code: "not_authenticated",
        error: "Not connected to a Navidrome server. Open Settings to connect.",
      },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!endpoint || !ENDPOINT_PATTERN.test(endpoint)) {
    return Response.json({ ok: false, error: "Invalid endpoint." }, { status: 400 });
  }

  let origin: string;
  try {
    const parsed = new URL(session.url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return Response.json(
        { ok: false, code: "bad_config", error: "Server URL protocol is not allowed." },
        { status: 500 },
      );
    }
    origin = parsed.origin;
  } catch {
    return Response.json(
      { ok: false, code: "bad_config", error: "Stored server URL is invalid." },
      { status: 500 },
    );
  }

  const target = new URL(`${origin}/rest/${endpoint}`);
  target.search = new URL(request.url).search;
  target.searchParams.set("u", session.username);
  target.searchParams.set("t", session.subsonicToken);
  target.searchParams.set("s", session.subsonicSalt);
  target.searchParams.set("v", "1.16.1");
  target.searchParams.set("c", "spotify-local");
  target.searchParams.set("f", "json");

  const isStream = endpoint === STREAM_ENDPOINT;

  try {
    const headers = new Headers();
    const range = request.headers.get("range");
    if (isStream && range) headers.set("range", range);

    const upstream = await fetch(target, {
      cache: "no-store",
      headers,
      signal: isStream ? undefined : AbortSignal.timeout(20000),
    });

    if (isStream) {
      const passthrough = new Headers();
      for (const name of STREAM_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) passthrough.set(name, value);
      }
      if (!passthrough.has("accept-ranges")) passthrough.set("accept-ranges", "bytes");
      passthrough.set("cache-control", "private, no-store");
      return new Response(upstream.body, { status: upstream.status, headers: passthrough });
    }

    const body = await upstream.arrayBuffer();

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    responseHeaders.set(
      "cache-control",
      IMAGE_CACHE_ENDPOINTS.has(endpoint)
        ? "public, max-age=604800, immutable"
        : "private, no-store",
    );

    return new Response(body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Navidrome server did not respond in time."
        : "Could not reach the Navidrome server.";
    return Response.json(
      { ok: false, code: "unreachable", error: message },
      { status: 502 },
    );
  }
}