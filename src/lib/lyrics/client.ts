import type { LyricsProvenance, LyricsQuery, LyricsResult } from "./model";

export class LyricsNetworkError extends Error {
  constructor() {
    super("Lyrics service is unavailable right now.");
    this.name = "LyricsNetworkError";
  }
}

export interface ClientLyricsPayload {
  lyrics: LyricsResult;
  provenance?: LyricsProvenance;
  attempted?: string[];
}

export async function fetchLyrics(
  query: LyricsQuery,
  signal?: AbortSignal,
  provider?: string,
): Promise<{ lyrics: LyricsResult; provenance?: LyricsProvenance; attempted?: string[] }> {
  const params = new URLSearchParams({ title: query.title });
  if (query.artist) params.set("artist", query.artist);
  if (query.album) params.set("album", query.album);
  if (typeof query.duration === "number" && query.duration > 0) {
    params.set("duration", String(Math.round(query.duration)));
  }
  if (provider && provider !== "auto") params.set("provider", provider);

  let response: Response;
  try {
    response = await fetch(`/api/lyrics?${params.toString()}`, {
      signal,
      cache: "no-store",
    });
  } catch (loadError) {
    if (loadError instanceof DOMException && loadError.name === "AbortError") throw loadError;
    throw new LyricsNetworkError();
  }

  const payload = (await response.json().catch(() => null)) as
    | (ClientLyricsPayload & { error?: string })
    | null;

  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) throw new LyricsNetworkError();
    throw new Error(payload?.error ?? "Could not load lyrics.");
  }

  return {
    lyrics: payload?.lyrics ?? { status: "none", lines: [], plainLyrics: null },
    provenance: payload?.provenance,
    attempted: payload?.attempted,
  };
}
