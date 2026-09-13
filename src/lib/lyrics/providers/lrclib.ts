import { fetchJsonAgent } from "../http";
import { granularityOf, normalizeLyrics } from "../parse";
import { pickBest } from "../match";
import { provenance, type LyricsProvider } from "../provider";

const BASE = "https://lrclib.net/api";
const PROVIDER_INFO = {
  id: "lrclib",
  name: "LRCLIB",
  description: "Line synchronized",
  capabilities: {
    lineSync: true,
    wordSync: false,
    syllableSync: false,
    translation: false,
    romanization: false,
    backgroundVocals: false,
  },
  available: true,
} as const;

interface LrclibRecord {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

function toResult(record: LrclibRecord): { lines: number; granularity: "none" | "line" | "word" } | null {
  const value = normalizeLyrics(record);
  if (value.status === "none") return null;
  return { lines: value.lines.length, granularity: granularityOf(value.lines) };
}

export const lrclibProvider: LyricsProvider = {
  info: PROVIDER_INFO,

  async search({ query, signal }) {
    const started = performance.now();
    const params = new URLSearchParams();
    if (query.artist) params.set("artist_name", query.artist);
    params.set("track_name", query.title);

    // Exact match first (LRCLIB rejects /get without artist).
    if (query.artist) {
      const exactParams = new URLSearchParams(params);
      if (query.album) exactParams.set("album_name", query.album);
      if (query.duration) exactParams.set("duration", String(Math.round(query.duration)));
      try {
        const response = await fetchJsonAgent(`${BASE}/get?${exactParams}`, signal);
        if (response.status === 200 && response.payload) {
          const record = response.payload as LrclibRecord;
          const outcome = toResult(record);
          if (outcome) {
            return {
              result: {
                ...normalizeLyrics(record),
              },
              elapsedMs: performance.now() - started,
            };
          }
        }
      } catch {
        // fall through to search
      }
    }

    try {
      const response = await fetchJsonAgent(`${BASE}/search?${params}`, signal);
      if (response.status !== 200 || !Array.isArray(response.payload)) {
        return { result: null, elapsedMs: performance.now() - started };
      }
      const candidates = response.payload as LrclibRecord[];
      const best = pickBest(
        candidates,
        (entry) => ({
          title: entry.trackName,
          artist: entry.artistName,
          album: entry.albumName,
          duration: entry.duration,
        }),
        query,
      );
      if (!best) return { result: null, elapsedMs: performance.now() - started };
      const value = normalizeLyrics(best);
      if (value.status === "none") return { result: null, elapsedMs: performance.now() - started };
      return {
        result: { ...value, __provenance: provenance(PROVIDER_INFO, granularityOf(value.lines), "fuzzy-metadata", best.id !== undefined ? String(best.id) : undefined) } as typeof value & { __provenance?: unknown },
        elapsedMs: performance.now() - started,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "LRCLIB request failed.",
        elapsedMs: performance.now() - started,
      };
    }
  },
};
