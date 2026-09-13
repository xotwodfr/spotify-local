import { granularityOf } from "../parse";
import type { LyricsProvenance, LyricsQuery, LyricsResult } from "../model";
import type { LyricsProvider, ProviderFetchResult } from "../provider";
import { betterLyricsProvider } from "./better-lyrics";
import { lrclibProvider } from "./lrclib";
import { musixmatchProvider, musixmatchConfigured } from "./musixmatch";

export type ProviderId = string;
export type ProviderSelection = "auto" | ProviderId;

/**
 * Automatic priority is derived from measured coverage and timing quality:
 * 1. Better Lyrics — Apple Music TTML with word-level timing, free, no key.
 * 2. Musixmatch richsync — licensed word timing; only when the official API
 *    key is configured.
 * 3. LRCLIB — huge coverage, line timing, free, no key.
 */
function orderedProviders(): LyricsProvider[] {
  const list: LyricsProvider[] = [];
  list.push(betterLyricsProvider);
  if (musixmatchConfigured()) list.push(musixmatchProvider);
  list.push(lrclibProvider);
  return list;
}

export function availableProviders() {
  return orderedProviders().map((provider) => ({
    id: provider.info.id,
    name: provider.info.name,
    description: provider.info.description,
    wordSync: provider.info.capabilities.wordSync,
    available: provider.info.available || provider.info.id !== "musixmatch" || musixmatchConfigured(),
  }));
}

export function getProvider(id: ProviderId): LyricsProvider | null {
  return orderedProviders().find((provider) => provider.info.id === id) ?? null;
}

export interface ResolvedLyrics {
  result: LyricsResult;
  provenance: LyricsProvenance;
  /** When auto mode, lists what was tried in order. */
  attempted: string[];
  /** Set when a manually pinned provider failed (no silent fallback). */
  manualMiss?: boolean;
  error?: string;
}

interface ProvenanceCarrier {
  __provenance?: LyricsProvenance;
}

function provenanceOf(result: LyricsResult, fallbackProvider: string, fallbackName: string): LyricsProvenance {
  const carrier = result as LyricsResult & ProvenanceCarrier;
  if (carrier.__provenance) {
    const { __provenance, ...clean } = carrier;
    Object.assign(result, clean);
    return __provenance;
  }
  return {
    provider: fallbackProvider,
    providerName: fallbackName,
    granularity: granularityOf(result.lines),
  };
}

async function tryProvider(
  provider: LyricsProvider,
  query: LyricsQuery,
  signal?: AbortSignal,
): Promise<ProviderFetchResult> {
  try {
    return await provider.search({ query, signal });
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Provider request failed.",
      elapsedMs: 0,
    };
  }
}

/**
 * Resolve lyrics for a query. Automatic mode walks the priority list and
 * prefers word-timed results; manual mode never silently falls back.
 */
export async function resolveLyrics(
  selection: ProviderSelection,
  query: LyricsQuery,
  signal?: AbortSignal,
): Promise<ResolvedLyrics> {
  const attempted: string[] = [];

  if (selection !== "auto") {
    const provider = getProvider(selection);
    attempted.push(selection);
    if (!provider) {
      return {
        result: { status: "none", lines: [], plainLyrics: null },
        provenance: { provider: selection, providerName: selection, granularity: "none" },
        attempted,
        manualMiss: true,
        error: "Unknown provider.",
      };
    }
    const outcome = await tryProvider(provider, query, signal);
    if (!outcome.result || outcome.result.status === "none") {
      return {
        result: { status: "none", lines: [], plainLyrics: null },
        provenance: {
          provider: provider.info.id,
          providerName: provider.info.name,
          granularity: "none",
        },
        attempted,
        manualMiss: true,
        error: outcome.error,
      };
    }
    return {
      result: outcome.result,
      provenance: provenanceOf(outcome.result, provider.info.id, provider.info.name),
      attempted,
      error: outcome.error,
    };
  }

  // Automatic: prefer the first provider that yields word timing, else the
  // first with any result, remembering the first non-empty result as fallback.
  // With only line-synced providers configured, LRCLIB's result wins.
  let firstSynced: { provider: LyricsProvider; result: LyricsResult } | null = null;

  for (const provider of orderedProviders()) {
    if (provider.info.id === "musixmatch" && !musixmatchConfigured()) continue;
    attempted.push(provider.info.id);
    const outcome = await tryProvider(provider, query, signal);

    if (outcome.result && outcome.result.status !== "none") {
      const granularity = granularityOf(outcome.result.lines);
      if (granularity === "word") {
        return {
          result: outcome.result,
          provenance: provenanceOf(outcome.result, provider.info.id, provider.info.name),
          attempted,
          error: outcome.error,
        };
      }
      if (!firstSynced) firstSynced = { provider, result: outcome.result };
    }
    if (signal?.aborted) break;
  }

  if (firstSynced) {
    return {
      result: firstSynced.result,
      provenance: provenanceOf(
        firstSynced.result,
        firstSynced.provider.info.id,
        firstSynced.provider.info.name,
      ),
      attempted,
    };
  }

  const anyError = attempted.length ? undefined : "No providers configured.";
  return {
    result: { status: "none", lines: [], plainLyrics: null },
    provenance: { provider: "none", providerName: "None", granularity: "none" },
    attempted,
    error: anyError,
  };
}
