/**
 * Crossfade gain curves.
 *
 * Perceptual loudness scales with amplitude², so summing two equal-power
 * signals needs each ramp shaped as cos/sin — the constant-sum
 * ("equal-power") pair used by DJ mixers and Spotify. A linear pair dips
 * ~3 dB mid-fade; this keeps the blended overlap at full loudness.
 */

export type FadeDirection = "in" | "out";

/** Equal-power gain for progress `t` ∈ [0,1]. */
export function fadeGain(t: number, direction: FadeDirection): number {
  const clamped = Math.min(1, Math.max(0, t));
  const angle = clamped * (Math.PI / 2);
  return direction === "in" ? Math.sin(angle) : Math.cos(angle);
}
