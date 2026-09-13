import type { LyricsQuery } from "./model";

/** Normalize a title/artist string for comparison: lowercase, strip extras. */
export function normalizeMetadata(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/\((?:feat|ft|featuring|with)[^)]*\)/g, "")
    .replace(/\[(?:feat|ft|featuring|with)[^\]]*\]/g, "")
    .replace(/-\s*(?:remix|radio edit|remaster(?:ed)?(?:\s+\d{4})?|deluxe(?:\s+edition)?|single version|album version)\s*$/g, "")
    .replace(/\((?:remix|radio edit|remaster(?:ed)?(?:\s+\d{4})?|deluxe(?:\s+edition)?|single version|album version)\)/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split "Artist A feat. Artist B" into primary + featured artists. */
export function splitArtists(artist: string): { primary: string; featured: string[] } {
  const parts = artist
    .split(/\s*(?:,|\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\band\b|\b&\b|\bx\b|\b×\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return { primary: parts[0] ?? "", featured: parts.slice(1) };
}

export type MatchConfidence = "exact" | "strong" | "weak" | "none";

/**
 * Score how well a provider record matches the query. Purely structural:
 * compares normalized titles, artists, and duration tolerance.
 */
export function scoreMatch(
  query: LyricsQuery,
  candidate: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
  },
): MatchConfidence {
  const queryTitle = normalizeMetadata(query.title);
  const candidateTitle = candidate.title ? normalizeMetadata(candidate.title) : "";
  const titleMatch = candidateTitle === queryTitle;

  const queryArtistParts = query.artist ? splitArtists(query.artist) : null;
  const queryArtist = queryArtistParts ? normalizeMetadata(queryArtistParts.primary) : "";
  const candidateArtist = candidate.artist ? normalizeMetadata(candidate.artist) : "";
  const artistMatch = Boolean(queryArtist) && candidateArtist === queryArtist;

  const queryAlbum = query.album ? normalizeMetadata(query.album) : "";
  const candidateAlbum = candidate.album ? normalizeMetadata(candidate.album) : "";
  const albumMatch = Boolean(queryAlbum) && candidateAlbum === queryAlbum;

  const durationClose =
    typeof query.duration === "number" &&
    typeof candidate.duration === "number" &&
    Math.abs(query.duration - candidate.duration) <= 2;

  if (titleMatch && artistMatch) return "exact";
  if (titleMatch && (artistMatch || durationClose || albumMatch)) return "strong";
  if (titleMatch) return "weak";
  if (artistMatch && durationClose) return "weak";
  return "none";
}

const confidencyRank: Record<MatchConfidence, number> = {
  exact: 3,
  strong: 2,
  weak: 1,
  none: 0,
};

/** Pick the best candidate from an ordered list; null when nothing matches. */
export function pickBest<T>(
  candidates: T[],
  fieldsOf: (entry: T) => { title?: string; artist?: string; album?: string; duration?: number },
  query: LyricsQuery,
  minimum: MatchConfidence = "weak",
): T | null {
  let best: { entry: T; score: MatchConfidence } | null = null;
  for (const entry of candidates) {
    const score = scoreMatch(query, fieldsOf(entry));
    if (score === "none") continue;
    if (confidencyRank[score] < confidencyRank[minimum]) continue;
    if (!best || confidencyRank[score] > confidencyRank[best.score]) {
      best = { entry, score };
    }
  }
  return best?.entry ?? null;
}

export { confidencyRank as confidenceRank };
