import { fetchJsonAgent } from "../http";
import { granularityOf } from "../parse";
import { provenance, type LyricsProvider } from "../provider";
import type { LyricsResult } from "../model";
import { parseTtml } from "../parse-ttml";

const BASE = "https://lyrics-api.boidu.dev";
const PROVIDER_INFO = {
  id: "better-lyrics",
  name: "Better Lyrics",
  description: "Word synchronized (TTML)",
  capabilities: {
    lineSync: true,
    wordSync: true,
    syllableSync: true,
    translation: false,
    romanization: false,
    backgroundVocals: true,
  },
  available: true,
} as const;

interface BetterLyricsEnvelope {
  ttml?: string;
  score?: number;
  error?: string;
}

export const betterLyricsProvider: LyricsProvider = {
  info: PROVIDER_INFO,

  async search({ query, signal }) {
    const started = performance.now();

    // The API serves a per-query-string cache; uncached queries need an API
    // key (401: "Uncached queries require a valid API key"). Try the base
    // title+artist form first — the most common fingerprint already cached —
    // then enrich with album and duration before giving up.
    const base: Array<[string, string]> = [["s", query.title]];
    if (query.artist) base.push(["a", query.artist]);

    const full: Array<[string, string]> = [...base];
    if (query.album) full.push(["al", query.album]);
    if (typeof query.duration === "number" && query.duration > 0) {
      full.push(["d", String(Math.round(query.duration))]);
    }

    for (const params of [base, full]) {
      const url = new URL(`${BASE}/getLyrics`);
      for (const [key, value] of params) url.searchParams.set(key, value);

      let response;
      try {
        // Two-tier cache: cached responses are free and need no API key.
        response = await fetchJsonAgent(url, signal);
      } catch (error) {
        return {
          result: null,
          error: error instanceof Error ? error.message : "Better Lyrics request failed.",
          elapsedMs: performance.now() - started,
        };
      }

      if (response.status === 404) continue;
      if (response.status === 422) continue;
      if (response.status === 401 || response.status === 429) continue;

      if (response.status < 200 || response.status >= 300) {
        return {
          result: null,
          error: `Better Lyrics returned ${response.status}.`,
          elapsedMs: performance.now() - started,
        };
      }

      const envelope = response.payload as BetterLyricsEnvelope | null;
      const ttml = envelope?.ttml;
      if (!ttml) continue;

      const parsed = parseTtml(ttml);
      if (parsed.lines.length === 0) continue;

      const value: LyricsResult = {
        status: "synced",
        lines: parsed.lines,
        plainLyrics: parsed.plainText || null,
      };
      return {
        result: { ...value, __provenance: provenance(PROVIDER_INFO, granularityOf(parsed.lines), "exact-metadata") } as typeof value & { __provenance?: unknown },
        elapsedMs: performance.now() - started,
      };
    }

    return { result: null, elapsedMs: performance.now() - started };
  },
};