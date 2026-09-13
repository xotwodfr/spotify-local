import type { LyricsProvenance, LyricsResult } from "@/lib/lyrics/model";

export interface LyricCacheEntryValue {
  lyrics: LyricsResult;
  provenance: LyricsProvenance;
}

export interface LyricCacheEntry {
  expiresAt: number;
  value: LyricCacheEntryValue;
}

const cache = new Map<string, LyricCacheEntry>();

export function lyricsCacheGet(key: string): LyricCacheEntry | undefined {
  return cache.get(key);
}

export function lyricsCacheSet(key: string, entry: LyricCacheEntry): void {
  cache.set(key, entry);
}

export function lyricsCacheDelete(key: string): void {
  cache.delete(key);
}

export function lyricsCacheClear(): number {
  const count = cache.size;
  cache.clear();
  return count;
}

export function lyricsCacheSize(): number {
  return cache.size;
}

/** First key in insertion order (oldest entry), used for LRU-style eviction. */
export function lyricsCacheFirstKey(): string | undefined {
  return cache.keys().next().value;
}