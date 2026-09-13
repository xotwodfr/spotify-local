import {
  lyricsCacheDelete,
  lyricsCacheFirstKey,
  lyricsCacheGet,
  lyricsCacheSet,
  lyricsCacheSize,
  type LyricCacheEntryValue,
} from "@/app/api/lyrics/cache-store";
import { resolveLyrics, type ProviderSelection } from "@/lib/lyrics/providers";
import type { LyricsQuery } from "@/lib/lyrics/model";

export const dynamic = "force-dynamic";

const CACHE_TTL = 1000 * 60 * 30;
const MAX_CACHE_ENTRIES = 200;

function requiredParam(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function store(key: string, value: LyricCacheEntryValue) {
  lyricsCacheSet(key, { expiresAt: Date.now() + CACHE_TTL, value });
  if (lyricsCacheSize() > MAX_CACHE_ENTRIES) {
    // Map keeps insertion order; the first key is the oldest entry to evict.
    const oldest = lyricsCacheFirstKey();
    if (oldest) lyricsCacheDelete(oldest);
  }
}

function cachedResponse(value: LyricCacheEntryValue): Response {
  return Response.json(value, { headers: { "cache-control": "private, max-age=1800" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = requiredParam(url.searchParams.get("title"));
  const artist = requiredParam(url.searchParams.get("artist"));
  const album = requiredParam(url.searchParams.get("album"));
  const providerParam = requiredParam(url.searchParams.get("provider"));
  const provider: ProviderSelection =
    providerParam && providerParam !== "auto" ? providerParam : "auto";

  const durationRaw = Number(url.searchParams.get("duration"));
  const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;

  if (!title) {
    return Response.json({ error: "A track title is required." }, { status: 400 });
  }

  const query: LyricsQuery = {
    title,
    ...(artist ? { artist } : {}),
    ...(album ? { album } : {}),
    ...(duration ? { duration } : {}),
  };

  const key = [provider, title, artist ?? "", album ?? "", duration ?? ""].join("\u0000");
  const cached = lyricsCacheGet(key);
  if (cached && cached.expiresAt > Date.now()) return cachedResponse(cached.value);
  if (cached) lyricsCacheDelete(key);

  try {
    const resolved = await resolveLyrics(provider, query);
    const value = { lyrics: resolved.result, provenance: resolved.provenance, attempted: resolved.attempted };

    // Cache misses per provider too, but with a shorter TTL so newly added
    // provider coverage becomes visible without an app redeploy.
    store(key, { lyrics: resolved.result, provenance: resolved.provenance });
    if (resolved.manualMiss && resolved.error) {
      return Response.json(
        { ...value, error: resolved.error },
        { status: resolved.error.includes("API key") ? 503 : 200 },
      );
    }
    if (!resolved.error && resolved.result.status === "none") {
      return cachedResponse(value);
    }
    if (resolved.error && resolved.result.status === "none") {
      return Response.json({ ...value, error: resolved.error }, { status: 502 });
    }
    return cachedResponse(value);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Lyrics lookup failed." },
      { status: 502 },
    );
  }
}