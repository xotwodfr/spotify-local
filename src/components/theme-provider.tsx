"use client";

import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";

import { usePlayer } from "@/components/player-provider";
import { coverArtUrl } from "@/lib/navidrome/client";
import {
  useSettings,
  type BackgroundIntensity,
  type AnimationMode,
  type PaletteSpeed,
} from "@/lib/settings";
import {
  artworkPalette,
  DEFAULT_DARK_PALETTE,
  DEFAULT_LIGHT_PALETTE,
  hexToRgb,
  type ArtPalette,
} from "@/lib/theme/palette";

const THEME_VARS: Array<[string, keyof ArtPalette]> = [
  ["--accent", "accent"],
  ["--accent-hover", "accentHover"],
  ["--accent-deep", "accentDeep"],
  ["--song-secondary", "songSecondary"],
  ["--frame", "frame"],
  ["--surface", "surface"],
  ["--surface-hover", "surfaceHover"],
  ["--surface-raised", "surfaceRaised"],
  ["--panel", "panel"],
  ["--border-color", "border"],
  ["--input-color", "input"],
  ["--text-subdued", "textSubdued"],
];

/** Root transition duration for palette color properties, per speed setting. */
const PALETTE_SPEED_MS: Record<PaletteSpeed, number> = {
  fast: 280,
  smooth: 640,
  gentle: 1100,
};

/** Opacity of the ambient background per intensity setting. */
function ambientOpacityFor(intensity: BackgroundIntensity, isLight: boolean): string {
  const base = intensity === "subtle" ? 0.3 : intensity === "strong" ? 0.78 : 0.52;
  return String(isLight ? base * 0.6 : base);
}

function motionMode(animations: AnimationMode, reducedBySystem: boolean): AnimationMode {
  if (animations === "off") return "off";
  if (reducedBySystem && animations === "full") return "reduced";
  return animations;
}

function isLightTheme(theme: string): boolean {
  if (theme === "light") return true;
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const player = usePlayer();

  const artUrl = player.current?.coverArt ? coverArtUrl(player.current.coverArt, 480) : null;

  const applyPalette = useCallback(
    (palette: ArtPalette | null) => {
      const root = document.documentElement;
      const isLight = isLightTheme(settings.theme);
      const fallback = isLight ? DEFAULT_LIGHT_PALETTE : DEFAULT_DARK_PALETTE;
      const effective = settings.dynamicColors && palette ? palette : fallback;
      const songMode = settings.dynamicColors && Boolean(palette);

      for (const [name, key] of THEME_VARS) {
        root.style.setProperty(name, effective[key]);
      }

      // Ambient layer intensity + glow colors used by CSS gradients.
      root.style.setProperty(
        "--ambient-opacity",
        settings.backgroundEffects ? ambientOpacityFor(settings.backgroundIntensity, isLight) : "0",
      );
      const glowScale =
        settings.backgroundIntensity === "subtle" ? 0.55 : settings.backgroundIntensity === "strong" ? 1.5 : 1;
      root.style.setProperty("--glow-a", effective.glowA);
      root.style.setProperty("--glow-b", effective.glowB);
      root.style.setProperty(
        "--glow-c",
        settings.backgroundEffects
          ? `color-mix(in oklab, ${effective.glowC} ${Math.round(Math.min(100, glowScale * 100))}%, #000000)`
          : effective.glowC,
      );

      // Artwork-tinted radial glow used inside panels (lyrics orb, scrims).
      // Light mode keeps the scrim whisper-soft so it never muddies the
      // warm off-white surfaces; dark mode gets the full cinematic wash,
      // scaled by the color-intensity setting.
      const glow = hexToRgb(effective.accent);
      const glowAlpha = Math.min(0.85, (isLight ? 0.07 : 0.42) * glowScale);
      root.style.setProperty(
        "--accent-glow",
        `rgba(${glow.r},${glow.g},${glow.b},${glowAlpha.toFixed(2)})`,
      );

      // --- Song palette for the lyric color flow + cohesive accents ---
      const songAccent = songMode ? effective.accent : "#1ed760";
      const songSecondary = songMode ? effective.songSecondary : "#177a41";
      root.style.setProperty("--song-accent", songAccent);
      root.style.setProperty("--song-secondary", songSecondary);
      const songGlow = hexToRgb(songAccent);
      root.style.setProperty(
        "--song-glow",
        `rgba(${songGlow.r},${songGlow.g},${songGlow.b},${(isLight ? 0.16 : 0.5) * glowScale})`,
      );
      const secGlow = hexToRgb(songSecondary);
      root.style.setProperty(
        "--song-glow-b",
        `rgba(${secGlow.r},${secGlow.g},${secGlow.b},${(isLight ? 0.1 : 0.32) * glowScale})`,
      );
      // Bright, high-contrast face of the accent for glowing text/icons on
      // dark surfaces (the raw accent can be too dark to read as text).
      root.style.setProperty("--song-bright", mixTowardWhite(songAccent, isLight ? 0.1 : 0.38));

      // Cohesive tone for scrollbars / subtle whites.
      root.style.setProperty("--scrollbar-tint", isLight ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.25)");
      root.style.setProperty("--fg-primary", isLight ? "#161616" : "#ffffff");

      // shadcn semantic tokens driven by the same palette.
      root.style.setProperty("--background", effective.frame);
      root.style.setProperty("--foreground", isLight ? "#111111" : "#ffffff");
      root.style.setProperty("--card", effective.surface);
      root.style.setProperty("--card-foreground", isLight ? "#111111" : "#ffffff");
      root.style.setProperty("--popover", effective.surfaceRaised);
      root.style.setProperty("--popover-foreground", isLight ? "#111111" : "#ffffff");
      root.style.setProperty("--muted", effective.surfaceHover);
      root.style.setProperty("--muted-foreground", effective.textSubdued);
      root.style.setProperty("--secondary", effective.surfaceRaised);
      root.style.setProperty("--secondary-foreground", isLight ? "#111111" : "#ffffff");
      root.style.setProperty("--accent", effective.accent);
      root.style.setProperty("--primary", effective.accent);
      root.style.setProperty("--primary-foreground", isLight ? "#ffffff" : "#000000");
      root.style.setProperty("--border", effective.border);
      root.style.setProperty("--input", effective.input);
      root.style.setProperty("--ring", isLight ? "#111111" : "#ffffff");

      // Palette crossfade speed for track changes (see globals.css :root).
      root.style.setProperty("--palette-speed", `${PALETTE_SPEED_MS[settings.paletteSpeed]}ms`);
      root.style.setProperty(
        "--palette-speed-short",
        `${Math.round(PALETTE_SPEED_MS[settings.paletteSpeed] * 0.55)}ms`,
      );
    },
    [
      settings.theme,
      settings.dynamicColors,
      settings.backgroundIntensity,
      settings.backgroundEffects,
      settings.paletteSpeed,
    ],
  );

  // Re-apply whenever settings that influence it change (no palette artwork).
  useEffect(() => {
    applyPalette(null);
  }, [applyPalette]);

  // Apply/transition the artwork palette when the current track changes.
  // Extraction is cached per artwork URL inside artworkPalette(), so a repeat
  // play of the same track costs a Map lookup — never re-processing.
  useEffect(() => {
    if (!artUrl || !settings.dynamicColors) {
      applyPalette(null);
      return;
    }
    const isLight = isLightTheme(settings.theme);
    let cancelled = false;
    void artworkPalette(artUrl, isLight).then((palette) => {
      if (!cancelled) applyPalette(palette);
    });
    return () => {
      cancelled = true;
    };
  }, [artUrl, settings.dynamicColors, settings.theme, applyPalette]);

  // Keep the motion flag in sync with prefers-reduced-motion + the animations setting.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const honorSystem = settings.respectReducedMotion;
    const setMode = (reduced: boolean) => {
      document.documentElement.dataset.motion = motionMode(
        honorSystem && reduced ? "reduced" : settings.animations,
        reduced,
      );
    };
    setMode(media.matches);
    const listener = (event: MediaQueryListEvent) => setMode(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [settings.animations, settings.respectReducedMotion]);

  return (
    <div className="relative h-full">
      <AmbientLayer />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/** Fixed, behind-everything ambient gradient layer driven by the current palette. */
function AmbientLayer() {
  return (
    <div aria-hidden data-testid="ambient-layer" className="ambient-layer">
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
    </div>
  );
}

/** Blend a hex color toward white by `weight` (0–1). */
function mixTowardWhite(hex: string, weight: number): string {
  const { r, g, b } = hexToRgb(hex);
  const blend = (channel: number) => Math.round(channel + (255 - channel) * weight);
  return `rgb(${blend(r)},${blend(g)},${blend(b)})`;
}
