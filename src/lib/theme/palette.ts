/**
 * Client-side artwork color extraction and palette generation.
 *
 * Colors are pulled from the current track's artwork (routed through the
 * Navidrome proxy, so same-origin), quantized with a small median-cut, and
 * turned into a readable, artwork-derived palette. The palette is cached per
 * artwork URL so extraction never repeats for the same cover while browsing;
 * applying a palette is a couple of CSS variable writes, not a React render.
 */

export interface ArtPalette {
  accent: string;
  accentHover: string;
  accentDeep: string;
  /** Secondary song color for the lyric color-flow gradient (artwork-derived). */
  songSecondary: string;
  frame: string;
  surface: string;
  surfaceHover: string;
  surfaceRaised: string;
  panel: string;
  border: string;
  input: string;
  textSubdued: string;
  glowA: string;
  glowB: string;
  glowC: string;
}

export const DEFAULT_DARK_PALETTE: ArtPalette = {
  accent: "#1ed760",
  accentHover: "#1fdf6b",
  accentDeep: "#0e7a37",
  songSecondary: "#177a41",
  frame: "#000000",
  surface: "#121212",
  surfaceHover: "#1f1f1f",
  surfaceRaised: "#282828",
  panel: "#181818",
  border: "#292929",
  input: "#3e3e3e",
  textSubdued: "#b3b3b3",
  glowA: "#1ed760",
  glowB: "#1f7a4d",
  glowC: "#2a2a2a",
};

export const DEFAULT_LIGHT_PALETTE: ArtPalette = {
  accent: "#1db954",
  accentHover: "#1f9e4f",
  accentDeep: "#0e7a37",
  songSecondary: "#17693c",
  frame: "#e4e2de",
  surface: "#f4f2ee",
  surfaceHover: "#e9e7e2",
  surfaceRaised: "#ffffff",
  panel: "#ffffff",
  border: "#d0cec8",
  input: "#dfddd8",
  textSubdued: "#4c4c4c",
  glowA: "#1db954",
  glowB: "#1f7a4d",
  glowC: "#c8c8c8",
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const num = Number.parseInt(full, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

export function rgbToHex(rgb: Rgb): string {
  const to = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`;
}

function rgbToHsl(rgb: Rgb): { h: number; s: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(channel(h + 1 / 3) * 255),
    g: Math.round(channel(h) * 255),
    b: Math.round(channel(h - 1 / 3) * 255),
  };
}

export function relativeLuminance(rgb: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

export function mixHex(a: string, b: string, weightB: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const blend = (x: number, y: number) => x * (1 - weightB) + y * weightB;
  return rgbToHex({ r: blend(ca.r, cb.r), g: blend(ca.g, cb.g), b: blend(ca.b, cb.b) });
}

function darken(hex: string, amount: number): string {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb(h, s, clamp(l - amount, 0.02, 1)));
}

function lighten(hex: string, amount: number): string {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb(h, s, clamp(l + amount, 0.02, 0.98)));
}

/** Tune an artwork color into a usable accent: controlled saturation + lightness. */
function tuneAccent(hex: string): string {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  if (s < 0.14) return "#1ed760"; // near-neutral artwork: keep the house accent
  return rgbToHex(hslToRgb(h, clamp(s * 0.82, 0.42, 0.9), clamp(l, 0.42, 0.56)));
}

/**
 * Secondary song color for the lyric flow gradient: a deep, saturated sibling
 * of the accent (rotated slightly toward the dominant artwork hue so the
 * ramp reads as artwork-derived rather than a one-hue fade).
 */
function songSecondaryColor(colors: string[], accentHex: string): string {
  const accentHsl = rgbToHsl(hexToRgb(accentHex));
  // Try the next-most-saturated artwork colors for a genuinely distinct hue.
  const ranked = colors
    .map((color) => ({ color, hsl: rgbToHsl(hexToRgb(color)) }))
    .filter((entry) => entry.hsl.s >= 0.22)
    .sort((a, b) => b.hsl.s - a.hsl.s);
  const distinct = ranked.find((entry) => {
    const delta = Math.abs(entry.hsl.h - accentHsl.h);
    return Math.min(delta, 1 - delta) > 0.08;
  });
  if (distinct) {
    return rgbToHex(hslToRgb(distinct.hsl.h, clamp(distinct.hsl.s, 0.35, 0.85), clamp(distinct.hsl.l, 0.3, 0.5)));
  }
  // No distinct artwork hue: a darker, hue-shifted companion of the accent.
  const shift = accentHsl.s < 0.14 ? 0 : accentHsl.h + 0.035;
  return rgbToHex(hslToRgb(shift, clamp(accentHsl.s, 0.38, 0.85), clamp(accentHsl.l - 0.22, 0.26, 0.5)));
}

/**
 * Median-cut quantization over an RGBA buffer. Returns representative colors
 * ordered by population (most common first).
 */
function medianCut(buffer: Uint8ClampedArray, maxColors = 5): string[] {
  const count = buffer.length / 4;
  const buckets: Rgb[][] = [];
  const current: Rgb[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = i * 4;
    current.push({ r: buffer[offset], g: buffer[offset + 1], b: buffer[offset + 2] });
  }
  buckets.push(current);

  while (buckets.length < maxColors) {
    let largestIndex = -1;
    let largestVolume = -1;
    for (let b = 0; b < buckets.length; b += 1) {
      const bucket = buckets[b];
      if (bucket.length < 4) continue;
      let minR = 255;
      let minG = 255;
      let minB = 255;
      let maxR = 0;
      let maxG = 0;
      let maxB = 0;
      for (const rgb of bucket) {
        minR = Math.min(minR, rgb.r);
        minG = Math.min(minG, rgb.g);
        minB = Math.min(minB, rgb.b);
        maxR = Math.max(maxR, rgb.r);
        maxG = Math.max(maxG, rgb.g);
        maxB = Math.max(maxB, rgb.b);
      }
      const rangeR = maxR - minR;
      const rangeG = maxG - minG;
      const rangeB = maxB - minB;
      const volume = rangeR * rangeG * rangeB * bucket.length;
      if (volume > largestVolume) {
        largestVolume = volume;
        largestIndex = b;
      }
    }
    if (largestIndex < 0) break;
    const bucket = buckets[largestIndex];
    const channel = rangeOfChannel(bucket);
    bucket.sort((a, b) => a[channel] - b[channel]);
    const mid = bucket.length >> 1;
    buckets.splice(largestIndex, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  return buckets
    .map((bucket) => {
      if (!bucket.length) return null;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const rgb of bucket) {
        r += rgb.r;
        g += rgb.g;
        b += rgb.b;
      }
      return rgbToHex({ r: r / bucket.length, g: g / bucket.length, b: b / bucket.length });
    })
    .filter((color): color is string => Boolean(color));
}

function rangeOfChannel(bucket: Rgb[]): "r" | "g" | "b" {
  let minR = 255;
  let minG = 255;
  let minB = 255;
  let maxR = 0;
  let maxG = 0;
  let maxB = 0;
  for (const rgb of bucket) {
    minR = Math.min(minR, rgb.r);
    minG = Math.min(minG, rgb.g);
    minB = Math.min(minB, rgb.b);
    maxR = Math.max(maxR, rgb.r);
    maxG = Math.max(maxG, rgb.g);
    maxB = Math.max(maxB, rgb.b);
  }
  const ranges: Array<["r" | "g" | "b", number]> = [
    ["r", maxR - minR],
    ["g", maxG - minG],
    ["b", maxB - minB],
  ];
  ranges.sort((a, b) => b[1] - a[1]);
  return ranges[0][0] ?? "r";
}

async function loadArtworkColors(source: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.decoding = "async";
  img.src = source;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Artwork could not be loaded."));
  });
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(img, 0, 0, size, size);
  return context.getImageData(0, 0, size, size).data;
}

function mostSaturated(colors: string[]): string {
  let best = colors[0] ?? "#1ed760";
  let bestSaturation = -1;
  for (const color of colors) {
    const s = rgbToHsl(hexToRgb(color)).s;
    if (s > bestSaturation) {
      bestSaturation = s;
      best = color;
    }
  }
  return best;
}

function dominantColor(colors: string[], fallback: string): string {
  return colors[0] ?? fallback;
}

export function buildPalette(colors: string[], isLight: boolean): ArtPalette {
  const dominant = dominantColor(colors, isLight ? "#f2f2f2" : "#121212");
  const accentRaw = mostSaturated(colors);
  const accent = tuneAccent(accentRaw);
  const secondary = songSecondaryColor(colors, accent);
  const accentHover = lighten(accent, 0.045);
  const accentDeep = darken(accent, 0.42);
  const glowB = mixHex(dominant, "#ffffff", isLight ? 0.35 : 0.22);
  const glowC = mixHex(dominant, isLight ? "#ffffff" : "#000000", 0.55);

  if (isLight) {
    const surface = mixHex("#f4f2ee", dominant, 0.08);
    const frame = mixHex("#e4e2de", dominant, 0.06);
    return {
      accent,
      accentHover,
      accentDeep,
      songSecondary: secondary,
      frame,
      surface,
      surfaceHover: lighten(surface, 0.05),
      surfaceRaised: "#ffffff",
      panel: "#ffffff",
      border: mixHex("#d0cec8", dominant, 0.12),
      input: mixHex("#dfddd8", dominant, 0.1),
      textSubdued: "#4c4c4c",
      glowA: mixHex(accent, "#1db954", 0.3),
      glowB,
      glowC,
    };
  }

  const surface = mixHex("#101010", dominant, 0.11);
  const frame = mixHex("#000000", dominant, 0.09);
  return {
    accent,
    accentHover,
    accentDeep,
    songSecondary: secondary,
    frame,
    surface,
    surfaceHover: mixHex(surface, "#ffffff", 0.16),
    surfaceRaised: mixHex(surface, "#ffffff", 0.24),
    panel: mixHex(surface, "#ffffff", 0.2),
    border: mixHex(surface, "#ffffff", 0.34),
    input: mixHex(surface, "#ffffff", 0.22),
    textSubdued: "#b3b3b3",
    glowA: accent,
    glowB,
    glowC,
  };
}

const paletteCache = new Map<string, Promise<ArtPalette | null>>();

/**
 * Extract + build a palette for an artwork URL, cached by URL. Resolves to
 * null when extraction fails (caller falls back to defaults).
 */
export function artworkPalette(source: string, isLight = false): Promise<ArtPalette | null> {
  const key = `${isLight ? "l" : "d"}:${source}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;
  const pending = (async () => {
    try {
      const data = await loadArtworkColors(source);
      const colors = medianCut(data, 5);
      return buildPalette(colors, isLight);
    } catch {
      return null;
    }
  })().finally(() => {
    // Keep failures cached briefly so broken art doesn't retry every render.
    setTimeout(() => paletteCache.delete(key), 30_000);
  });
  paletteCache.set(key, pending);
  return pending;
}

export { hexToRgb, rgbToHsl, mixHex as mix };