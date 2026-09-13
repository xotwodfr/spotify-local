/** Shared lyrics parsing: LRC, enhanced LRC, Musixmatch richsync. */

import type { LyricLine, LyricWord, LyricsResult } from "./model";

const timestampPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const wordTagPattern = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;

function timestampToSeconds(minutes: string, seconds: string, fraction = ""): number {
  const fractionalSeconds = fraction ? Number(`0.${fraction}`) : 0;
  return Number(minutes) * 60 + Number(seconds) + fractionalSeconds;
}

/** Parse plain and enhanced LRC. Enhanced word tags <mm:ss.xx> become words. */
export function parseSyncedLyrics(value: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of value.split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(timestampPattern)];
    if (!timestamps.length) continue;
    const withoutLineStamps = rawLine.replace(timestampPattern, "");

    // Enhanced LRC: word-level tags inside the line.
    const wordTags = [...withoutLineStamps.matchAll(wordTagPattern)];
    let text = withoutLineStamps;
    let words: LyricWord[] | undefined;

    if (wordTags.length >= 2) {
      const segments: string[] = [];
      const firstTag = wordTags[0];
      const preText = withoutLineStamps.slice(0, firstTag.index ?? 0).trim();
      if (preText) segments.push(preText);

      for (let i = 0; i < wordTags.length; i += 1) {
        const tag = wordTags[i];
        const start = timestampToSeconds(tag[1], tag[2], tag[3]);
        const nextTag = wordTags[i + 1];
        const end = nextTag
          ? timestampToSeconds(nextTag[1], nextTag[2], nextTag[3])
          : start + 1;
        const chunk = withoutLineStamps.slice(
          (tag.index ?? 0) + tag[0].length,
          nextTag ? nextTag.index : undefined,
        );
        const wordText = chunk.trim();
        if (wordText) {
          segments.push(wordText);
          words = words ?? [];
          words.push({ text: wordText, start, end });
        }
      }
      text = segments.join(" ");
    } else {
      text = withoutLineStamps.replace(wordTagPattern, "");
    }

    text = text.trim();
    if (!text) continue;

    // Use the earliest timestamp on the line.
    const times = timestamps.map((m) => timestampToSeconds(m[1], m[2], m[3]));
    const line: LyricLine = { time: Math.min(...times), text };
    if (words) line.words = words;
    lines.push(line);
  }

  return lines.sort((a, b) => a.time - b.time);
}

export interface RichsyncToken {
  c: string;
  o: number;
}

export interface RichsyncLine {
  ts: number;
  te: number;
  l: RichsyncToken[];
  x?: string;
}

/** Parse Musixmatch richsync JSON (word timing with char offsets). */
export function parseRichsync(value: string): LyricLine[] {
  let parsed: RichsyncLine[];
  try {
    parsed = JSON.parse(value) as RichsyncLine[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const lines: LyricLine[] = [];
  for (const entry of parsed) {
    if (typeof entry?.ts !== "number" || !Array.isArray(entry?.l)) continue;
    const words: LyricWord[] = [];
    for (const token of entry.l) {
      if (!token || typeof token.c !== "string" || typeof token.o !== "number") continue;
      const text = token.c.trim();
      if (!text) continue; // skip pure spacing tokens
      const start = entry.ts + token.o;
      // Token end is derived from the next token's start or the line end:
      // richsync only supplies offsets, so this is interpolation of bounds,
      // not fabricated word timing.
      words.push({ text, start, end: start }); // end patched below
    }
    for (let i = 0; i < words.length; i += 1) {
      const next = words[i + 1];
      words[i].end = next ? next.start : entry.te ?? entry.ts + 1;
    }
    const text = typeof entry.x === "string" ? entry.x : words.map((w) => w.text).join(" ");
    if (!text.trim()) continue;
    lines.push({ time: entry.ts, text, end: entry.te, words: words.length >= 2 ? words : undefined });
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function parseLyricsfile(): LyricLine[] {
  // Lyricsfile is YAML; a full parser is intentionally avoided. Word-timed
  // Lyricsfile support lands with a proper YAML dependency if LRCLIB word
  // data becomes common. Fall back to line timing via syncedLyrics instead.
  return [];
}

export function normalizeLyrics(payload: unknown): LyricsResult {
  if (!payload || typeof payload !== "object") {
    return { status: "none", lines: [], plainLyrics: null };
  }

  const record = payload as Record<string, unknown>;
  const syncedLyrics = typeof record.syncedLyrics === "string" ? record.syncedLyrics : "";
  const plainLyrics = typeof record.plainLyrics === "string" ? record.plainLyrics.trim() : "";
  const lines = parseSyncedLyrics(syncedLyrics);

  if (lines.length) return { status: "synced", lines, plainLyrics: plainLyrics || null };
  if (plainLyrics) return { status: "plain", lines: [], plainLyrics };
  return { status: "none", lines: [], plainLyrics: null };
}

/** Finest genuine granularity present in normalized lines. */
export function granularityOf(lines: LyricLine[]): "none" | "line" | "word" {
  return lines.some((line) => line.words && line.words.length >= 2) ? "word" : "line";
}
