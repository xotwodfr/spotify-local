"use client";

import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";

import { usePlayer } from "@/components/player-provider";
import { coverArtUrl } from "@/lib/navidrome/client";
import {
  useSettings,
  type BackgroundIntensity,
  type AnimationMode,
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
  ["--frame", "frame"],
  ["--surface", "surface"],
  ["--surface-hover", "surfaceHover"],
  ["--surface-raised", "surfaceRaised"],
  ["--panel", "panel"],
  ["--border-color", "border"],
  ["--input-color", "input"],
  ["--text-subdued", "textSubdued"],
];

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

      for (const [name, key] of THEME_VARS) {
        root.style.setProperty(name, effective[key]);
      }

      // Ambient layer intensity + glow colors used by CSS gradients.
      root.style.setProperty(
        "--ambient-opacity",
        settings.backgroundEffects ? ambientOpacityFor(settings.backgroundIntensity, isLight) : "0",
      );
      root.style.setProperty("--glow-a", effective.glowA);
      root.style.setProperty("--glow-b", effective.glowB);
      root.style.setProperty("--glow-c", effective.glowC);

      // Artwork-tinted radial glow used inside panels (lyrics orb, scrims).
      // Light mode keeps the scrim whisper-soft so it never muddies the
      // warm off-white surfaces; dark mode gets the full cinematic wash.
      const glow = hexToRgb(effective.accent);
      root.style.setProperty(
        "--accent-glow",
        `rgba(${glow.r},${glow.g},${glow.b},${isLight ? 0.07 : 0.42})`,
      );

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
    },
    [settings.theme, settings.dynamicColors, settings.backgroundIntensity, settings.backgroundEffects],
  );

  // Re-apply whenever settings that influence it change (no palette artwork).
  useEffect(() => {
    applyPalette(null);
  }, [applyPalette]);

  // Apply/transition the artwork palette when the current track changes.
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
    const setMode = (reduced: boolean) => {
      document.documentElement.dataset.motion = motionMode(settings.animations, reduced);
    };
    setMode(media.matches);
    const listener = (event: MediaQueryListEvent) => setMode(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [settings.animations]);

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
      <div className="ambient-blob ambient-blob-c" />
    </div>
  );
}