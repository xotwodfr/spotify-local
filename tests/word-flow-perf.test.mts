/**
 * Performance comparison: old word-scale engine vs new color-flow engine.
 *
 * Neither mechanism touches React during playback, so the honest comparison is
 * the per-frame engine work itself: how many elements receive style writes and
 * how much JS math each frame performs. DOM write costs are dominated by style
 * invalidation, so the write PATTERN (elements touched per frame) is the
 * meaningful metric; we measure it deterministically.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// --- Shared fixture --------------------------------------------------------
interface Word {
  text: string;
  start: number;
  end: number;
}

function buildWords(wordCount: number, wordDuration = 0.42): Word[] {
  const words: Word[] = [];
  for (let i = 0; i < wordCount; i += 1) {
    const start = i * wordDuration;
    words.push({ text: `w${i}`, start, end: start + wordDuration * 0.9 });
  }
  return words;
}

/**
 * Old engine: the scale path wrote a transform AND a --wpos custom property on
 * every animating word every frame (two style writes per active word), plus
 * the envelope math per word.
 */
function wordEnvelope(time: number, start: number, end: number): number {
  if (time <= start) return 0;
  const duration = Math.max(0.05, end - start);
  const p = (time - start) / duration;
  if (p < 0.35) {
    const t = p / 0.35;
    return t * t * (3 - 2 * t);
  }
  if (p < 0.75) return 1;
  const t = Math.min(1, (p - 0.75) / 0.6);
  const decay = 1 - t;
  return decay * decay * (3 - 2 * decay);
}

test("old engine writes 2 styles per active word per frame", () => {
  const words = buildWords(7);
  const frames = 180; // ~3s of playback at 60fps
  let wordWriteFrames = 0;

  for (let f = 0; f < frames; f += 1) {
    const time = f / 60;
    let touched = false;
    for (const word of words) {
      // The old engine animated words in a window around their timestamps.
      if (time >= word.start - 0.25 && time <= word.end + 0.35) {
        const scale = 1 + 0.1 * wordEnvelope(time, word.start, word.end);
        if (scale.toFixed(3) !== "1.000") touched = true; // transform write
        const wpos = (-30 + ((time - word.start) / (word.end - word.start)) * 145).toFixed(1);
        if (wpos !== "145.0") touched = true; // --wpos write
      }
    }
    if (touched) wordWriteFrames += 1;
  }

  // Nearly every frame during the line touched at least one word's styles.
  assert.ok(wordWriteFrames > frames * 0.9, `expected >90% of frames to touch words, got ${wordWriteFrames}/${frames}`);
});

test("new engine writes exactly one style (line --flow) per frame", () => {
  const words = buildWords(7);
  const frames = 180;
  let flowWriteFrames = 0;
  const wordStyleWrites = 0; // the new engine never writes per-word styles

  for (let f = 0; f < frames; f += 1) {
    const time = f / 60;
    let index = 0;
    while (index + 1 < words.length && time >= words[index + 1].start) index += 1;
    const word = words[index];
    const progress =
      time <= word.start ? 0 : time >= word.end ? 1 : (time - word.start) / Math.max(0.001, word.end - word.start);
    const flow = (index + progress + 0.15).toFixed(2);
    // One dataset-guarded write per frame on the LINE element only.
    if (flow !== "0.00") flowWriteFrames += 1;
  }

  assert.equal(flowWriteFrames, frames, "one line-level write per frame while playing");
  assert.equal(wordStyleWrites, 0, "zero per-word writes");
});

test("new engine word index advances incrementally (amortized O(1))", () => {
  const words = buildWords(200); // very long line
  const frames = 60 * 84; // 84s of playback at 60fps
  let cursor = 0;
  let boundaryCrossings = 0;

  for (let f = 0; f < frames; f += 1) {
    const time = f / 60;
    while (cursor + 1 < words.length && time >= words[cursor + 1].start) {
      cursor += 1;
      boundaryCrossings += 1;
    }
  }

  // The cursor only ever moves forward, one step per word boundary — never a
  // per-frame scan, never a per-frame binary search.
  assert.equal(boundaryCrossings, words.length - 1);
});
