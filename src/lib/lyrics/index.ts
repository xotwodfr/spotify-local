export type {
  LyricLine,
  LyricWord,
  LyricsGranularity,
  LyricsProvenance,
  LyricsProviderCapabilities,
  LyricsQuery,
  LyricsResult,
  LyricsResultStatus,
  MatchMethod,
} from "./model";
export {
  granularityOf,
  normalizeLyrics,
  parseRichsync,
  parseSyncedLyrics,
} from "./parse";
export { parseTtml, parseTtmlTime } from "./parse-ttml";
export { normalizeMetadata, scoreMatch, splitArtists } from "./match";
export { availableProviders, resolveLyrics, type ProviderSelection, type ResolvedLyrics } from "./providers";
export { musixmatchConfigured } from "./providers/musixmatch";
export { LyricsNetworkError, fetchLyrics } from "./client";
