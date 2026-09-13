/**
 * Normalized multi-provider lyric model.
 *
 * Timing is never fabricated: a provider that only exposes line timing produces
 * lines without `words`; word timing only appears when the source truly has it.
 */

export interface LyricWord {
  /** Word/token text. */
  text: string;
  /** Start offset in seconds, relative to the song start. */
  start: number;
  /** End offset in seconds. */
  end: number;
}

export interface LyricLine {
  time: number;
  text: string;
  /** Optional end time when the provider supplies line durations. */
  end?: number;
  /** Genuine word timing straight from the provider; never synthesized. */
  words?: LyricWord[];
  /** Background vocals marker (e.g. ttm:role="x-bg"). */
  background?: boolean;
  /** Romanization line when the provider supplies it. */
  romanization?: string;
  /** Translation line when the provider supplies it. */
  translation?: string;
}

export type LyricsGranularity = "none" | "line" | "word";

export type LyricsResultStatus = "synced" | "plain" | "none";

export type MatchMethod =
  | "spotify-id"
  | "isrc"
  | "musicbrainz-id"
  | "exact-metadata"
  | "fuzzy-metadata";

/** Normalized lyrics payload any provider returns. */
export interface LyricsResult {
  status: LyricsResultStatus;
  lines: LyricLine[];
  plainLyrics: string | null;
}

/** Provider stamp attached to every resolved result. */
export interface LyricsProvenance {
  /** Provider identifier, e.g. "lrclib", "musixmatch". */
  provider: string;
  /** Human-readable provider name for UI display. */
  providerName: string;
  /** Finest timing granularity the payload genuinely contains. */
  granularity: LyricsGranularity;
  /** How the track was matched, when known. */
  matchMethod?: MatchMethod;
  /** Source-side track/lyric identifier when the provider exposes one. */
  sourceId?: string;
}

export interface LyricsQuery {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
}

export interface ProviderSearchContext {
  query: LyricsQuery;
  signal?: AbortSignal;
}

export interface LyricsProviderCapabilities {
  lineSync: boolean;
  wordSync: boolean;
  syllableSync: boolean;
  translation: boolean;
  romanization: boolean;
  backgroundVocals: boolean;
}

export interface LyricsProviderInfo {
  id: string;
  name: string;
  description: string;
  capabilities: LyricsProviderCapabilities;
  /** Whether the provider can currently be used (e.g. API key configured). */
  available: boolean;
}


