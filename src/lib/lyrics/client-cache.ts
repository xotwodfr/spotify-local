import type { LyricsProvenance, LyricsResult } from "@/lib/lyrics/model";

export interface CachedLyrics {
  lyrics: LyricsResult;
  provenance?: LyricsProvenance;
}

const clientCache = new Map<string, CachedLyrics>();
const failures = new Map<string, { expiresAt: number }>();

export function cachedLyrics(cacheId: string): CachedLyrics | undefined {
  return clientCache.get(cacheId);
}

export function cacheLyrics(cacheId: string, entry: CachedLyrics): void {
  clientCache.set(cacheId, entry);
}

export function failureIsActive(cacheId: string): boolean {
  const entry = failures.get(cacheId);
  return Boolean(entry && entry.expiresAt > Date.now());
}

export function recordLyricsFailure(cacheId: string, ttlMs = 30_000): void {
  failures.set(cacheId, { expiresAt: Date.now() + ttlMs });
}

export function forgetLyricsFailure(cacheId: string): void {
  failures.delete(cacheId);
}

export function clearLyricsClientCache(providerSelection?: string, cacheKey?: string): number {
  if (providerSelection !== undefined && cacheKey !== undefined) {
    const cacheId = `${providerSelection}\u0000${cacheKey}`;
    const removed = clientCache.delete(cacheId) ? 1 : 0;
    failures.delete(cacheId);
    return removed;
  }
  const count = clientCache.size;
  clientCache.clear();
  failures.clear();
  return count;
}

export function lyricsClientCacheSize(): number {
  return clientCache.size;
}