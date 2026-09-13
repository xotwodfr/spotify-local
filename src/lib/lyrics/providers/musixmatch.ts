import { fetchJsonAgent, ProviderError } from "../http";
import { granularityOf, parseRichsync } from "../parse";
import { provenance, type LyricsProvider } from "../provider";
import type { LyricsResult } from "../model";

const BASE = "https://api.musixmatch.com/ws/1.1";

const PROVIDER_INFO = {
  id: "musixmatch",
  name: "Musixmatch",
  description: "Word synchronized (richsync)",
  capabilities: {
    lineSync: true,
    wordSync: true,
    syllableSync: false,
    translation: true,
    romanization: false,
    backgroundVocals: false,
  },
  /** Available only when the user configured an official API key. */
  available: false,
} as const;

interface MusixmatchEnvelope<T> {
  message?: {
    header?: { status_code?: number; execute_time?: number };
    body?: T;
  };
}

function apiKey(): string | null {
  const key = process.env.MUSIXMATCH_API_KEY?.trim();
  return key ? key : null;
}

export function musixmatchConfigured(): boolean {
  return apiKey() !== null;
}

async function callEndpoint<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T | null> {
  const key = apiKey();
  if (!key) throw new ProviderError("Musixmatch API key is not configured.", 401);

  const url = new URL(`${BASE}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  url.searchParams.set("apikey", key);

  const response = await fetchJsonAgent(url, signal);
  if (response.status === 401) throw new ProviderError("Musixmatch rejected the API key.", 401);
  if (response.status === 429) throw new ProviderError("Musixmatch rate limit reached.", 429);
  if (response.status < 200 || response.status >= 300) {
    throw new ProviderError(`Musixmatch returned ${response.status}.`, response.status);
  }

  const envelope = response.payload as MusixmatchEnvelope<T> | null;
  const statusCode = envelope?.message?.header?.status_code;
  if (statusCode && statusCode !== 200) {
    // 404 = track not found; other codes are genuine failures.
    if (statusCode === 404) return null;
    throw new ProviderError(`Musixmatch status ${statusCode}.`, statusCode);
  }
  return envelope?.message?.body ?? null;
}

export const musixmatchProvider: LyricsProvider = {
  info: PROVIDER_INFO,

  async search({ query, signal }) {
    const started = performance.now();

    if (!apiKey()) {
      return {
        result: null,
        error: "Musixmatch requires an official API key (MUSIXMATCH_API_KEY).",
        elapsedMs: performance.now() - started,
      };
    }
    if (!query.artist) {
      return { result: null, elapsedMs: performance.now() - started };
    }

    try {
      // 1) Find the track (metadata matcher).
      const trackBody = await callEndpoint<{
        track_list?: Array<{ track?: { track_id?: number; commontrack_id?: number } }>;
      }>(
        "track.search",
        {
          q_track: query.title,
          q_artist: query.artist,
          ...(query.album ? { q_album: query.album } : {}),
          page_size: 5,
        },
        signal,
      );
      const track = trackBody?.track_list?.[0]?.track;
      const commontrackId = track?.commontrack_id ?? track?.track_id;
      if (!commontrackId) {
        return { result: null, elapsedMs: performance.now() - started };
      }

      // 2) Richsync first (word-level), then plain synced subtitles.
      const richsyncBody = await callEndpoint<{ richsync?: { richsync_body?: string } }>(
        "track.richsync.get",
        { commontrack_id: commontrackId },
        signal,
      );
      const richsyncBodyRaw = richsyncBody?.richsync?.richsync_body;
      if (richsyncBodyRaw) {
        const lines = parseRichsync(richsyncBodyRaw);
        if (lines.length) {
          const result = {
            status: "synced" as const,
            lines,
            plainLyrics: null,
            __provenance: provenance(PROVIDER_INFO, granularityOf(lines), "exact-metadata", String(commontrackId)),
          } as LyricsResult;
          return { result, elapsedMs: performance.now() - started };
        }
      }

      const subtitlesBody = await callEndpoint<{
        subtitle?: { subtitle_body?: string };
      }>("track.subtitle.get", { commontrack_id: commontrackId }, signal);
      const subtitleBody = subtitlesBody?.subtitle?.subtitle_body;
      if (subtitleBody) {
        const { parseSyncedLyrics } = await import("../parse");
        const lines = parseSyncedLyrics(subtitleBody);
        if (lines.length) {
          const result = {
            status: "synced" as const,
            lines,
            plainLyrics: null,
            __provenance: provenance(PROVIDER_INFO, "line", "exact-metadata", String(commontrackId)),
          } as LyricsResult;
          return { result, elapsedMs: performance.now() - started };
        }
      }

      return { result: null, elapsedMs: performance.now() - started };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Musixmatch request failed.",
        elapsedMs: performance.now() - started,
      };
    }
  },
};
