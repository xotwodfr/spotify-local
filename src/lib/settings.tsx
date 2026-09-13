"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "dynamic" | "dark" | "light" | "system";
export type BackgroundIntensity = "subtle" | "balanced" | "strong";
export type AnimationMode = "full" | "reduced" | "off";
export type PlaybackQuality = "original" | "high" | "medium" | "low";
export type LyricsFontSize = "sm" | "md" | "lg" | "xl";

/**
 * Typed, persisted application settings. Everything that influences how the
 * app looks and plays is stored here instead of scattered localStorage calls.
 */
export interface AppSettings {
  theme: ThemeMode;
  dynamicColors: boolean;
  backgroundIntensity: BackgroundIntensity;
  animations: AnimationMode;
  playbackQuality: PlaybackQuality;
  crossfade: number;
  autoplay: boolean;
  wordSyncedLyrics: boolean;
  autoScrollLyrics: boolean;
  centerActiveLyric: boolean;
  wordHighlighting: boolean;
  lyricsFontSize: LyricsFontSize;
  showTranslation: boolean;
  backgroundEffects: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  dynamicColors: true,
  backgroundIntensity: "balanced",
  animations: "full",
  playbackQuality: "original",
  crossfade: 0,
  autoplay: true,
  wordSyncedLyrics: true,
  autoScrollLyrics: true,
  centerActiveLyric: true,
  wordHighlighting: true,
  lyricsFontSize: "md",
  showTranslation: true,
  backgroundEffects: true,
};

const STORAGE_KEY = "spotify-local/settings";
const ART_VERSION_KEY = "spotify-local/art-version";

const THEME_MODES: ThemeMode[] = ["dynamic", "dark", "light", "system"];
const INTENSITIES: BackgroundIntensity[] = ["subtle", "balanced", "strong"];
const ANIMATIONS: AnimationMode[] = ["full", "reduced", "off"];
const QUALITIES: PlaybackQuality[] = ["original", "high", "medium", "low"];
const FONT_SIZES: LyricsFontSize[] = ["sm", "md", "lg", "xl"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS };
    const crossfade = Number(parsed.crossfade);
    return {
      theme: pickEnum(parsed.theme, THEME_MODES, DEFAULT_SETTINGS.theme),
      dynamicColors:
        typeof parsed.dynamicColors === "boolean"
          ? parsed.dynamicColors
          : DEFAULT_SETTINGS.dynamicColors,
      backgroundIntensity: pickEnum(
        parsed.backgroundIntensity,
        INTENSITIES,
        DEFAULT_SETTINGS.backgroundIntensity,
      ),
      animations: pickEnum(parsed.animations, ANIMATIONS, DEFAULT_SETTINGS.animations),
      playbackQuality: pickEnum(
        parsed.playbackQuality,
        QUALITIES,
        DEFAULT_SETTINGS.playbackQuality,
      ),
      crossfade:
        Number.isFinite(crossfade) && crossfade >= 0 && crossfade <= 15 ? crossfade : DEFAULT_SETTINGS.crossfade,
      autoplay:
        typeof parsed.autoplay === "boolean" ? parsed.autoplay : DEFAULT_SETTINGS.autoplay,
      wordSyncedLyrics:
        typeof parsed.wordSyncedLyrics === "boolean"
          ? parsed.wordSyncedLyrics
          : DEFAULT_SETTINGS.wordSyncedLyrics,
      autoScrollLyrics:
        typeof parsed.autoScrollLyrics === "boolean"
          ? parsed.autoScrollLyrics
          : DEFAULT_SETTINGS.autoScrollLyrics,
      centerActiveLyric:
        typeof parsed.centerActiveLyric === "boolean"
          ? parsed.centerActiveLyric
          : DEFAULT_SETTINGS.centerActiveLyric,
      wordHighlighting:
        typeof parsed.wordHighlighting === "boolean"
          ? parsed.wordHighlighting
          : DEFAULT_SETTINGS.wordHighlighting,
      lyricsFontSize: pickEnum(
        parsed.lyricsFontSize,
        FONT_SIZES,
        DEFAULT_SETTINGS.lyricsFontSize,
      ),
      showTranslation:
        typeof parsed.showTranslation === "boolean"
          ? parsed.showTranslation
          : DEFAULT_SETTINGS.showTranslation,
      backgroundEffects:
        typeof parsed.backgroundEffects === "boolean"
          ? parsed.backgroundEffects
          : DEFAULT_SETTINGS.backgroundEffects,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Synchronous read for non-React code (players, libs). Cheapest path, no renders. */
export function getSyncSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  try {
    if (typeof window === "undefined") return DEFAULT_SETTINGS[key];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS[key];
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed[key] !== "undefined") {
      return parsed[key] as AppSettings[K];
    }
    return DEFAULT_SETTINGS[key];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export function getArtVersion(): string {
  try {
    return window.localStorage.getItem(ART_VERSION_KEY) ?? "0";
  } catch {
    return "0";
  }
}

export function bumpArtVersion(): string {
  const next = String((Number(getArtVersion()) || 0) + 1);
  try {
    window.localStorage.setItem(ART_VERSION_KEY, next);
  } catch {
    // storage unavailable
  }
  return next;
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Tiny external store so settings survive SSR/hydration without an effect.
 * The server snapshot keeps SSR markup identical to the first client render;
 * React then swaps in the persisted client snapshot after hydration.
 */
let clientSnapshot: AppSettings | null = null;
const listeners = new Set<() => void>();

/** Cached server snapshot (required stable reference for useSyncExternalStore). */
const serverSnapshot: AppSettings = { ...DEFAULT_SETTINGS };

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppSettings {
  if (clientSnapshot === null) clientSnapshot = loadSettings();
  return clientSnapshot;
}

function getServerSnapshot(): AppSettings {
  return serverSnapshot;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(settings: AppSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...getSnapshot(), ...patch };
    clientSnapshot = next;
    persist(next);
    notify();
  }, []);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS };
    clientSnapshot = next;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    notify();
  }, []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider.");
  }
  return context;
}

export function maxBitRateFor(quality: PlaybackQuality): number {
  switch (quality) {
    case "high":
      return 320;
    case "medium":
      return 192;
    case "low":
      return 128;
    case "original":
      return 0;
  }
}