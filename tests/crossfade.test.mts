import assert from "node:assert/strict";
import { test } from "node:test";

import { fadeGain } from "../src/lib/audio/fade.ts";

test("fadeGain endpoints are exact", () => {
  const eps = 1e-12;
  assert.ok(Math.abs(fadeGain(0, "in")) < eps);
  assert.ok(Math.abs(fadeGain(1, "in") - 1) < eps);
  assert.ok(Math.abs(fadeGain(0, "out") - 1) < eps);
  assert.ok(Math.abs(fadeGain(1, "out")) < eps);
});

test("fadeGain is monotonically increasing for fade-in", () => {
  let previous = -1;
  for (let i = 0; i <= 100; i += 1) {
    const value = fadeGain(i / 100, "in");
    assert.ok(value > previous, `expected ${value} > ${previous} at t=${i / 100}`);
    previous = value;
  }
});

test("fadeGain is monotonically decreasing for fade-out", () => {
  let previous = 2;
  for (let i = 0; i <= 100; i += 1) {
    const value = fadeGain(i / 100, "out");
    assert.ok(value < previous, `expected ${value} < ${previous} at t=${i / 100}`);
    previous = value;
  }
});

test("fadeGain pair holds constant power sum", () => {
  // Equal-power property: sin² + cos² = 1 at every point, so the overlapped
  // loudness of two summed signals stays flat through the crossfade.
  for (let i = 0; i <= 100; i += 1) {
    const t = i / 100;
    const sum = fadeGain(t, "in") ** 2 + fadeGain(t, "out") ** 2;
    assert.ok(Math.abs(sum - 1) < 1e-9, `expected sin²+cos² = 1 at t=${t}, got ${sum}`);
  }
});

test("fadeGain midpoint is ~0.707 on both ramps", () => {
  const midIn = fadeGain(0.5, "in");
  const midOut = fadeGain(0.5, "out");
  assert.ok(Math.abs(midIn - Math.SQRT1_2) < 1e-9, `mid fade-in ${midIn}`);
  assert.ok(Math.abs(midOut - Math.SQRT1_2) < 1e-9, `mid fade-out ${midOut}`);
  // A linear pair would sit at 0.5 — ~3 dB quieter mid-fade.
  assert.ok(midIn > 0.5);
});

test("fadeGain clamps out-of-range input", () => {
  const eps = 1e-12;
  assert.ok(Math.abs(fadeGain(-0.5, "in")) < eps);
  assert.ok(Math.abs(fadeGain(1.5, "in") - 1) < eps);
  assert.ok(Math.abs(fadeGain(-0.5, "out") - 1) < eps);
  assert.ok(Math.abs(fadeGain(1.5, "out")) < eps);
});
