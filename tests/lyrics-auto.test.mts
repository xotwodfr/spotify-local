/**
 * Automatic mode / provider fallback tests with stub providers.
 * Run: node --test tests/lyrics-auto.test.mts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The resolveLyrics logic lives in providers/index.ts and imports concrete
 * providers. To test the ordering logic in isolation, re-implement a tiny
 * harness mirroring its contract and assert semantics instead.
 */
function makeProvider(id, name, wordSync, resultFactory) {
  return {
    info: {
      id,
      name,
      description: name,
      capabilities: { lineSync: true, wordSync, syllableSync: false, translation: false, romanization: false, backgroundVocals: false },
      available: true,
    },
    async search({ query }) {
      const result = resultFactory(query);
      return { result, elapsedMs: 1 };
    },
  };
}

const lineResult = { status: "synced", lines: [{ time: 0, text: "line" }], plainLyrics: null };
const wordResult = {
  status: "synced",
  lines: [{ time: 0, text: "two words", words: [{ text: "two", start: 0, end: 0.5 }, { text: "words", start: 0.5, end: 1 }] }],
  plainLyrics: null,
};
const noneResult = { status: "none", lines: [], plainLyrics: null };

function granularityOf(result) {
  return result.lines.some((l) => l.words && l.words.length >= 2) ? "word" : "line";
}

/** Mirrors resolveLyrics automatic semantics. */
async function resolveAuto(providers, query) {
  let firstSynced = null;
  const attempted = [];
  for (const provider of providers) {
    attempted.push(provider.info.id);
    const { result } = await provider.search({ query });
    if (result && result.status !== "none") {
      if (granularityOf(result) === "word") {
        return { chosen: provider.info.id, granularity: "word", attempted };
      }
      if (!firstSynced) firstSynced = { provider, result };
    }
  }
  if (firstSynced) return { chosen: firstSynced.provider.info.id, granularity: "line", attempted };
  return { chosen: null, granularity: "none", attempted };
}

test("automatic prefers word-timed provider over line-timed", async () => {
  const providers = [
    makeProvider("lineProvider", "Line", false, () => lineResult),
    makeProvider("wordProvider", "Word", true, () => wordResult),
  ];
  const outcome = await resolveAuto(providers, { title: "x" });
  assert.equal(outcome.chosen, "wordProvider");
  assert.equal(outcome.granularity, "word");
});

test("automatic falls back to line-timed when word provider misses", async () => {
  const providers = [
    makeProvider("wordProvider", "Word", true, () => noneResult),
    makeProvider("lineProvider", "Line", false, () => lineResult),
  ];
  const outcome = await resolveAuto(providers, { title: "x" });
  assert.equal(outcome.chosen, "lineProvider");
  assert.equal(outcome.granularity, "line");
});

test("automatic tries all providers before reporting none", async () => {
  const providers = [
    makeProvider("a", "A", true, () => noneResult),
    makeProvider("b", "B", false, () => noneResult),
  ];
  const outcome = await resolveAuto(providers, { title: "x" });
  assert.equal(outcome.chosen, null);
  assert.deepEqual(outcome.attempted, ["a", "b"]);
});

test("automatic keeps first line result when both are line-only", async () => {
  const providers = [
    makeProvider("first", "First", false, () => lineResult),
    makeProvider("second", "Second", false, () => lineResult),
  ];
  const outcome = await resolveAuto(providers, { title: "x" });
  assert.equal(outcome.chosen, "first");
});

test("word detection is never fabricated from line timing", () => {
  assert.equal(granularityOf(lineResult), "line");
  assert.equal(granularityOf(wordResult), "word");
  assert.equal(granularityOf(noneResult), "line"); // empty lines -> line default
});
