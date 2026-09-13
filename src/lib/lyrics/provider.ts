import type {
  LyricsProviderInfo,
  LyricsProvenance,
  LyricsQuery,
  LyricsResult,
} from "./model";

export interface ProviderFetchResult {
  result: LyricsResult | null;
  /** Error message when a provider failure (vs. a clean miss) occurred. */
  error?: string;
  /** Milliseconds the provider took. */
  elapsedMs: number;
}

export interface LyricsProvider {
  readonly info: LyricsProviderInfo;
  search(context: { query: LyricsQuery; signal?: AbortSignal }): Promise<ProviderFetchResult>;
}

/** Build provenance for a resolved result. */
export function provenance(
  provider: LyricsProviderInfo,
  granularity: LyricsProvenance["granularity"],
  matchMethod?: LyricsProvenance["matchMethod"],
  sourceId?: string,
): LyricsProvenance {
  return {
    provider: provider.id,
    providerName: provider.name,
    granularity,
    ...(matchMethod ? { matchMethod } : {}),
    ...(sourceId !== undefined ? { sourceId } : {}),
  };
}
