/**
 * Lyrics provider unit tests.
 * Run: node --test tests/lyrics-providers.test.mts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseRichsync, parseSyncedLyrics, granularityOf } from "../src/lib/lyrics/parse.ts";
import { normalizeMetadata, scoreMatch, splitArtists, pickBest } from "../src/lib/lyrics/match.ts";

test("parseSyncedLyrics handles plain LRC", () => {
  const lines = parseSyncedLyrics("[00:01.20]First line\n[00:03.00]Second line");
  assert.equal(lines.length, 2);
  assert.equal(lines[0].time, 1.2);
  assert.equal(lines[1].text, "Second line");
  assert.equal(granularityOf(lines), "line");
});

test("parseSyncedLyrics preserves enhanced LRC word timing", () => {
  const lrc = "[00:10.00]<00:10.00>Hello <00:10.50>cruel <00:11.00>world";
  const lines = parseSyncedLyrics(lrc);
  assert.equal(lines.length, 1);
  assert.ok(lines[0].words, "words present");
  assert.equal(lines[0].words?.length, 3);
  assert.equal(lines[0].words?.[0].text, "Hello");
  assert.ok((lines[0].words?.[0].start ?? 0) < (lines[0].words?.[1].start ?? 1));
  assert.equal(granularityOf(lines), "word");
});

test("parseRichsync converts token offsets into word timing", () => {
  const richsync = JSON.stringify([
    { ts: 3.92, te: 5.409, l: [{ c: "I", o: 0 }, { c: " ", o: 0.022 }, { c: "want", o: 0.11 }], x: "I want" },
  ]);
  const lines = parseRichsync(richsync);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].time, 3.92);
  assert.equal(lines[0].words?.length, 2);
  assert.equal(lines[0].words?.[1].text, "want");
  assert.ok((lines[0].words?.[1].start ?? 0) > (lines[0].words?.[0].start ?? 1));
  assert.equal(granularityOf(lines), "word");
});

test("normalizeMetadata strips featuring, punctuation, and case", () => {
  assert.equal(normalizeMetadata("Song (feat. Someone)"), "song");
  assert.equal(normalizeMetadata("Don't Stop Me Now!"), "don t stop me now");
  assert.equal(normalizeMetadata("Song - Remix"), "song");
});

test("splitArtists separates primary from featured", () => {
  const { primary, featured } = splitArtists("Taylor Swift feat. Brendon Urie");
  assert.equal(primary, "Taylor Swift");
  assert.deepEqual(featured, ["Brendon Urie"]);
});

test("scoreMatch ranks exact over fuzzy", () => {
  const query = { title: "Blinding Lights", artist: "The Weeknd", duration: 200 };
  const exact = scoreMatch(query, { title: "Blinding Lights", artist: "The Weeknd" });
  const fuzzy = scoreMatch(query, { title: "blinding lights", artist: "Weeknd, The", duration: 201 });
  assert.equal(exact, "exact");
  assert.ok(fuzzy !== "none");
});

test("scoreMatch rejects wrong tracks", () => {
  const query = { title: "Blinding Lights", artist: "The Weeknd" };
  assert.equal(scoreMatch(query, { title: "Save Your Tears", artist: "The Weeknd" }), "none");
});

test("pickBest returns highest scoring candidate", () => {
  const candidates = [
    { title: "Save Your Tears", artist: "The Weeknd" },
    { title: "Blinding Lights", artist: "The Weeknd" },
  ];
  const best = pickBest(
    candidates,
    (c) => c,
    { title: "Blinding Lights", artist: "The Weeknd" },
  );
  assert.equal(best?.title, "Blinding Lights");
});
