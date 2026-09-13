/**
 * TTML parser unit tests.
 * Run: node --test tests/lyrics-ttml.test.mts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseTtml, parseTtmlTime } from "../src/lib/lyrics/parse-ttml.ts";
import { granularityOf } from "../src/lib/lyrics/parse.ts";

test("parseTtmlTime accepts decimal seconds and clock formats", () => {
  assert.equal(parseTtmlTime("9.731"), 9.731);
  assert.equal(parseTtmlTime("185.8"), 185.8);
  assert.equal(parseTtmlTime("00:00.000"), 0);
  assert.equal(parseTtmlTime("03:08.002"), 188.002);
  assert.equal(parseTtmlTime("00:00:18.234"), 18.234);
  assert.equal(parseTtmlTime(null), 0);
});

test("parseTtml extracts word timing from Apple-Music style TTML", () => {
  const ttml = `<tt xmlns="http://www.w3.org/ns/ttml" itunes:timing="Word" xml:lang="en">
  <body dur="3:53.713">
    <div begin="9.731" end="29.942">
      <p begin="9.731" end="12.105" itunes:key="L1">
        <span begin="9.731" end="9.927">The</span> <span begin="9.927" end="10.284">club</span> <span begin="10.284" end="11.091">isn't</span>
      </p>
      <p begin="12.105" end="13.478">
        <span begin="12.105" end="12.508">the</span> <span begin="12.508" end="13.478">best</span>
      </p>
    </div>
  </body>
</tt>`;

  const { lines, plainText } = parseTtml(ttml);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].time, 9.731);
  assert.equal(lines[0].text, "The club isn't");
  assert.equal(lines[0].words?.length, 3);
  assert.equal(lines[0].words?.[0].text, "The");
  assert.equal(lines[0].words?.[0].start, 9.731);
  assert.equal(lines[0].words?.[0].end, 9.927);
  assert.equal(lines[1].words?.[1].text, "best");
  assert.equal(plainText, "The club isn't\nthe best");
  assert.equal(granularityOf(lines), "word");
});

test("parseTtml handles clock-based TTML (AMLL style)", () => {
  const ttml = `<tt>
  <p begin="00:00.000" end="00:02.500">
    <span begin="00:00.000" end="00:00.700">你</span> <span begin="00:00.700" end="00:01.400">好</span>
  </p>
</tt>`;

  const { lines } = parseTtml(ttml);
  assert.equal(lines[0].time, 0);
  assert.equal(lines[0].text, "你好");
  assert.equal(lines[0].words?.[1].start, 0.7);
  assert.equal(granularityOf(lines), "word");
});

test("parseTtml merges syllable-split spans into whole words", () => {
  const ttml = `<tt>
  <p begin="31.498" end="32.529">
    <span begin="31.498" end="31.839">long</span> <span begin="31.839" end="31.996">e</span><span begin="31.996" end="32.529">nough</span>
  </p>
  <p begin="35.729" end="37.394">
    <span begin="35.729" end="36.489">may</span><span begin="36.489" end="37.394">be</span>
  </p>
</tt>`;

  const { lines } = parseTtml(ttml);
  assert.equal(lines[0].words?.length, 2);
  assert.equal(lines[0].words?.[0].text, "long");
  assert.equal(lines[0].words?.[1].text, "enough");
  assert.equal(lines[0].words?.[1].start, 31.839);
  assert.equal(lines[0].words?.[1].end, 32.529);
  assert.equal(lines[0].text, "long enough");
  assert.equal(lines[1].words?.length, 1);
  assert.equal(lines[1].words?.[0].text, "maybe");
  assert.equal(lines[1].text, "maybe");
});

test("parseTtml keeps comma-adjacent words separate", () => {
  const ttml = `<tt>
  <p begin="34.628" end="37.394">
    <span begin="34.628" end="35.382">love,</span><span begin="35.729" end="36.489">may</span><span begin="36.489" end="37.394">be</span>
  </p>
</tt>`;
  const { lines } = parseTtml(ttml);
  assert.equal(lines[0].words?.length, 2);
  assert.equal(lines[0].words?.[0].text, "love,");
  assert.equal(lines[0].words?.[1].text, "maybe");
  assert.equal(lines[0].text, "love, maybe");
});

test("parseTtml marks background vocals and keeps their timing", () => {
  const ttml = `<tt>
  <p begin="21.859" end="23.959">
    <span begin="21.859" end="22.067">I</span> <span ttm:role="x-bg" begin="22.000" end="23.500">
      <span begin="22.000" end="22.500">(echo</span> <span begin="22.500" end="23.000">I)</span>
    </span> <span begin="23.000" end="23.959">know</span>
  </p>
</tt>`;

  const { lines } = parseTtml(ttml);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].background, true);
  assert.equal(lines[0].words?.length, 4);
  assert.equal(lines[0].words?.[1].text, "(echo");
  assert.equal(lines[0].words?.[1].start, 22);
  assert.equal(lines[0].words?.[3].text, "know");
});

test("parseTtml captures translations and romanizations separately", () => {
  const ttml = `<tt>
  <p begin="1.0" end="2.0">
    <span begin="1.0" end="1.5">Hello</span>
    <span ttm:role="x-translation" xml:lang="zh-CN">你好</span>
  </p>
</tt>`;

  const { lines } = parseTtml(ttml);
  assert.equal(lines[0].words?.length, 1);
  assert.equal(lines[0].translation, "你好");
  assert.equal(lines[0].text, "Hello");
});

test("parseTtml keeps non-word lines as line-synced only", () => {
  const ttml = `<tt>
  <p begin="0.0" end="1.0">Instrumental intro</p>
  <p begin="1.0" end="2.0"><span begin="1.0" end="1.5">One</span> <span begin="1.5" end="2.0">word</span></p>
</tt>`;

  const { lines } = parseTtml(ttml);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].words, undefined);
  assert.equal(lines[0].text, "Instrumental intro");
  assert.equal(lines[1].words?.length, 2);
  assert.equal(granularityOf(lines), "word");
});