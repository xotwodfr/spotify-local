"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconChevronDown } from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { coverArtUrl } from "@/lib/navidrome/client";
import { useSettings } from "@/lib/settings";
import {
  fetchLyrics,
  LyricsNetworkError,
  type LyricLine,
  type LyricsProvenance,
  type LyricsResult,
} from "@/lib/lyrics";
import {
  cacheLyrics,
  cachedLyrics,
  failureIsActive,
  forgetLyricsFailure,
  recordLyricsFailure,
} from "@/lib/lyrics/client-cache";

/** Base orb size; per-frame scale is applied on top so only transforms are written. */
const ORB_BASE_W = 360;
const ORB_BASE_H = 150;
const ORB_PADDING_X = 84;
const ORB_PADDING_Y = 36;

/** Spring stiffness for the continuous follow scroll (higher = snappier). */
const FOLLOW_STIFFNESS = 6;
/** How long auto-follow stays paused after the user scrolls manually. */
const USER_SCROLL_RESUME_MS = 4000;
/** Reported-time jumps larger than this are treated as seeks and snapped to. */
const SEEK_JUMP_SECONDS = 1.2;
/** Maximum playback-time extrapolation between reported positions. */
const MAX_EXTRAPOLATION_SECONDS = 0.75;

const PROVIDER_STORAGE_KEY = "spotify-local/lyrics-provider";

/** Font size mapping for the active lyric line (setting → size/leading). */
const LINE_FONT_SIZES: Record<string, string> = {
  sm: "text-xl leading-8 max-[640px]:text-lg max-[640px]:leading-7",
  md: "text-2xl leading-9 max-[640px]:text-xl max-[640px]:leading-8",
  lg: "text-3xl leading-11 max-[640px]:text-2xl max-[640px]:leading-9",
  xl: "text-4xl leading-13 max-[640px]:text-3xl max-[640px]:leading-10",
};

interface ProviderOption {
  id: string;
  name: string;
  description: string;
  wordSync: boolean;
  available: boolean;
}

/** Layout box of one lyric line in the scroll content coordinate space. */
interface LineGeometry {
  top: number;
  height: number;
  left: number;
  width: number;
  textHeight: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

/** Binary search for the lyric active at `time` (lines are sorted by timestamp). */
function findActiveIndex(lines: LyricLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (lines[mid].time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

export function LyricsPanel({ onClose }: { onClose: () => void }) {
  const player = usePlayer();
  const { settings } = useSettings();
  const song = player.current;
  const artUrl = song?.coverArt ? coverArtUrl(song.coverArt, 480) : null;
  const fontClass = LINE_FONT_SIZES[settings.lyricsFontSize] ?? LINE_FONT_SIZES.md;
  const [state, setState] = useState<{ key: string; kind: "loading" | "loaded" | "error"; result?: LyricsResult; provenance?: LyricsProvenance; message?: string }>({ key: "", kind: "loading" });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [providerSelection, setProviderSelection] = useState<string>("auto");
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const lineElsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  // Shared mutable state read by the rAF loop without triggering renders.
  const liveRef = useRef<{ lines: LyricLine[]; playing: boolean }>({ lines: [], playing: false });
  // Last reported playback position and when it was reported, for interpolation.
  const anchorRef = useRef<{ time: number; at: number }>({ time: 0, at: 0 });
  // Set when a seek (or large jump) requires an immediate snap instead of a glide.
  const snapRef = useRef(true);
  const userScrollingRef = useRef(false);

  // Load persisted selection + provider options once (async, outside render).
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      let saved: string | null = null;
      try {
        saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
      } catch {
        // storage unavailable
      }
      if (!cancelled && saved) setProviderSelection(saved);
    });
    void fetch("/api/lyrics/providers")
      .then((res) => res.json())
      .then((data: { providers?: ProviderOption[] }) => {
        if (!cancelled && Array.isArray(data.providers)) {
          setProviderOptions(data.providers);
          // Drop a stale persisted selection for a provider that no longer exists.
          setProviderSelection((current) =>
            current === "auto" || data.providers!.some((option) => option.id === current)
              ? current
              : "auto",
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function chooseProvider(id: string) {
    setProviderSelection(id);
    setSelectorOpen(false);
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
    } catch {
      // storage unavailable
    }
    // Force a refetch under the new selection.
    setState({ key: "", kind: "loading" });
    setRetryAttempt((value) => value + 1);
  }

  const cacheKey = useMemo(
    () => (song ? [song.id, song.title, song.artist, song.album].join("\u0000") : ""),
    [song],
  );

  const status = useMemo(() => {
    const cacheId = `${providerSelection}\u0000${cacheKey}`;
    if (state.key === cacheId) return state;
    const cached = cachedLyrics(cacheId);
    if (cached) {
      return { key: cacheId, kind: "loaded" as const, result: cached.lyrics, provenance: cached.provenance };
    }
    if (cacheKey && failureIsActive(cacheId)) {
      return { key: cacheId, kind: "error" as const, message: "Lyrics service is unavailable right now." };
    }
    return { key: cacheId, kind: "loading" as const };
  }, [state, cacheKey, providerSelection]);

  useEffect(() => {
    if (!song || !cacheKey) return;
    const cacheId = `${providerSelection}\u0000${cacheKey}`;
    if (cachedLyrics(cacheId) || failureIsActive(cacheId)) return;

    const requestId = ++requestRef.current;
    const controller = new AbortController();
    void fetchLyrics(
      {
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
      },
      controller.signal,
      providerSelection,
    )
      .then(({ lyrics, provenance }) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        cacheLyrics(cacheId, { lyrics, provenance });
        setState({ key: cacheId, kind: "loaded", result: lyrics, provenance });
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        if (loadError instanceof LyricsNetworkError) {
          recordLyricsFailure(cacheId);
        }
        setState({
          key: cacheId,
          kind: "error",
          message: loadError instanceof Error ? loadError.message : "Could not load lyrics.",
        });
      });

    return () => controller.abort();
  }, [cacheKey, song, retryAttempt, providerSelection]);

  const syncedLines = status.kind === "loaded" && status.result?.status === "synced" ? status.result.lines : null;

  // Mirror the shared player state into refs after every render. Reported positions
  // re-anchor the time interpolation; large jumps flag a seek snap.
  useEffect(() => {
    liveRef.current.lines = syncedLines ?? [];
    liveRef.current.playing = player.isPlaying;
    const anchor = anchorRef.current;
    if (player.currentTime !== anchor.time) {
      if (Math.abs(player.currentTime - anchor.time) > SEEK_JUMP_SECONDS) snapRef.current = true;
      anchorRef.current = { time: player.currentTime, at: performance.now() };
    }
  });

  function beginUserScroll() {
    userScrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false;
    }, USER_SCROLL_RESUME_MS);
  }

  // Single rAF loop for the whole panel: interpolated time, follow spring, orb,
  // and per-word karaoke progress writes (direct style writes, no React state).
  useEffect(() => {
    const container = scrollRef.current;
    const orb = orbRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const autoScrollEnabled = settings.autoScrollLyrics;
    const showOrb = settings.backgroundEffects;
    const useKaraoke = settings.wordSyncedLyrics && settings.wordHighlighting;
    const focusRatio = settings.centerActiveLyric ? 0.5 : 0.4;

    const orbState = { x: 0, y: 0, init: false };
    const spring = { y: 0, init: false };
    let measuredFor = -2;
    let geometry: LineGeometry | null = null;
    let lastActive = -2;
    let raf = 0;
    let last = performance.now();

    const measure = (index: number): LineGeometry | null => {
      const button = lineElsRef.current.get(index);
      if (!button) return null;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const spanRect = (button.firstElementChild ?? button).getBoundingClientRect();
      return {
        top: buttonRect.top - containerRect.top + container.scrollTop,
        height: buttonRect.height,
        left: spanRect.left - containerRect.left + container.scrollLeft,
        width: spanRect.width,
        textHeight: spanRect.height,
      };
    };

    const invalidate = () => {
      measuredFor = -2;
    };

    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(container);
    window.addEventListener("resize", invalidate);
    if (typeof document.fonts?.ready?.then === "function") {
      void document.fonts.ready.then(invalidate).catch(() => {});
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const { lines, playing } = liveRef.current;
      const anchor = anchorRef.current;

      let time = anchor.time;
      if (playing) time += Math.min(MAX_EXTRAPOLATION_SECONDS, (now - anchor.at) / 1000);

      let active = -1;
      if (lines.length) {
        active = findActiveIndex(lines, time);
        if (active >= 0) {
          const upcoming = lines[active + 1];
          if (upcoming && time >= upcoming.time) time = upcoming.time - 0.01;
        }
      }

      if (active !== lastActive) {
        lastActive = active;
        measuredFor = -2;
        setActiveIndex(active);
      }

      if (measuredFor !== active) {
        const measured = active >= 0 ? measure(active) : null;
        if (measured || active < 0) {
          geometry = measured;
          measuredFor = active;
        }
      }

      // --- Follow scroll: continuous spring toward the active line ---
      if (autoScrollEnabled) {
        const maxScroll = container.scrollHeight - container.clientHeight;
        const rawTargetY = geometry ? geometry.top + geometry.height / 2 - container.clientHeight * focusRatio : 0;
        const targetY = Math.min(Math.max(rawTargetY, 0), maxScroll);

        if (snapRef.current || !spring.init || reducedMotion) {
          spring.y = targetY;
          spring.init = true;
          snapRef.current = false;
          container.scrollTop = targetY;
        } else if (userScrollingRef.current) {
          spring.y = container.scrollTop;
        } else {
          if (Math.abs(container.scrollTop - spring.y) > 2) {
            beginUserScroll();
            spring.y = container.scrollTop;
          } else {
            spring.y += (targetY - spring.y) * (1 - Math.exp(-dt * FOLLOW_STIFFNESS));
            if (Math.abs(targetY - spring.y) < 0.05) spring.y = targetY;
            if (container.scrollTop !== spring.y) container.scrollTop = spring.y;
          }
        }
      } else {
        // Manual reading mode: leave the user's scroll position alone.
        snapRef.current = false;
      }

      // --- Word-level karaoke: fill active words up to interpolated time ---
      if (useKaraoke && active >= 0) {
        const line = lines[active];
        const words = line?.words;
        if (words && words.length >= 2) {
          const button = lineElsRef.current.get(active);
          if (button) {
            const spans = button.querySelectorAll<HTMLElement>("[data-word]");
            spans.forEach((span, index) => {
              const word = words[index];
              if (!word) return;
              const progress = time >= word.end ? 1 : time <= word.start ? 0 : (time - word.start) / Math.max(0.001, word.end - word.start);
              span.style.setProperty("--word-progress", progress.toFixed(3));
            });
          }
        }
      }

      // --- Organic orb: grows with lyric progress, glides to the next line ---
      if (orb) {
        if (!showOrb || active < 0 || !geometry) {
          orb.style.opacity = "0";
          orbState.init = false;
        } else {
          const current = lines[active];
          const next = lines[active + 1];
          const progress = current
            ? next
              ? clamp01((time - current.time) / Math.max(0.4, (next.time - current.time)))
              : clamp01((time - current.time) / 5)
            : 0;

          const targetX = geometry.left + geometry.width / 2;
          const targetOrbY = geometry.top + geometry.height / 2;
          const targetW = geometry.width + ORB_PADDING_X;
          const targetH = geometry.textHeight + ORB_PADDING_Y;

          const t = now / 1000;
          const grow = 0.72 + 0.28 * easeOutCubic(progress);
          const breatheX = reducedMotion ? 0 : 0.045 * Math.sin(t * 1.7);
          const breatheY = reducedMotion ? 0 : 0.06 * Math.sin(t * 1.1 + 1.3);
          const rotate = reducedMotion ? 0 : 5 * Math.sin(t * 0.45);

          const distance = Math.abs(targetOrbY - orbState.y);
          const k = !orbState.init || distance > 260 ? 1 : 1 - Math.exp(-dt * 7);

          if (!orbState.init) {
            orbState.x = targetX;
            orbState.y = targetOrbY;
            orbState.init = true;
          } else {
            orbState.x += (targetX - orbState.x) * k;
            orbState.y += (targetOrbY - orbState.y) * k;
          }

          const scaleX = (targetW / ORB_BASE_W) * grow * (1 + breatheX);
          const scaleY = (targetH / ORB_BASE_H) * grow * (1 + breatheY);

          const radiusA = 55 + 8 * Math.sin(t * 0.9);
          const radiusB = 45 + 7 * Math.sin(t * 0.7 + 2.1);
          const opacity = 0.42 + 0.3 * easeOutCubic(progress) + 0.05 * Math.sin(t * 2.3);

          orb.style.opacity = String(Math.min(0.85, opacity));
          orb.style.borderRadius = `${radiusA}% ${100 - radiusA}% ${radiusB}% ${100 - radiusB}% / ${radiusB}% ${radiusA}% ${100 - radiusA}% ${100 - radiusB}%`;
          orb.style.transform = `translate3d(${orbState.x - ORB_BASE_W / 2}px, ${orbState.y - ORB_BASE_H / 2}px, 0) rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`;
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, [syncedLines, settings.autoScrollLyrics, settings.centerActiveLyric, settings.backgroundEffects, settings.wordHighlighting, settings.wordSyncedLyrics]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const providerLabel = useMemo(() => {
    if (providerSelection === "auto") {
      const resolved = status.provenance?.providerName;
      return resolved && resolved !== "None" ? `Automatic · ${resolved}` : "Automatic";
    }
    return providerOptions.find((option) => option.id === providerSelection)?.name ?? providerSelection;
  }, [providerSelection, status.provenance, providerOptions]);

  return (
    <section
      aria-label="Lyrics"
      className="lyrics-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col overflow-hidden border-l border-white/10 bg-(--panel)/[0.72] animate-in slide-in-from-right duration-500 max-[640px]:max-w-full"
    >
      {artUrl && (
        <img
          aria-hidden
          alt=""
          src={artUrl}
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-[70px] saturate-150 will-change-transform"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--panel)_78%,transparent)_0%,color-mix(in_oklab,var(--panel)_52%,transparent)_45%,color-mix(in_oklab,var(--panel)_82%,transparent)_100%)]"
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-(--panel)/40 px-5 py-4 backdrop-blur-xl max-[640px]:px-4 max-[640px]:py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-(--text-subdued)">Lyrics</p>
          <p className="mt-1 truncate text-sm font-bold text-(--fg-primary)">{song?.title ?? "Nothing playing"}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={selectorOpen}
              title="Lyrics provider"
              className="flex h-8 max-w-[200px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.06] px-3 text-xs font-semibold text-(--text-subdued) transition-colors hover:bg-white/10 hover:text-(--fg-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
            >
              <span className="truncate">{providerLabel}</span>
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
            </button>

            {selectorOpen && (
              <ul
                role="listbox"
                aria-label="Lyrics provider"
                className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-lg border border-white/10 bg-(--surface-raised) py-1 shadow-[0_16px_40px_rgba(0,0,0,.6)]"
              >
                {providerOptions.length === 0 && (
                  <li className="px-4 py-2 text-sm text-(--text-subdued)">Loading providers…</li>
                )}
                {providerOptions.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={providerSelection === option.id}
                      disabled={!option.available}
                      onClick={() => chooseProvider(option.id)}
                      className={`flex w-full items-start gap-3 px-4 py-2 text-left transition-colors ${
                        providerSelection === option.id ? "bg-white/10" : "hover:bg-white/5"
                      } ${option.available ? "" : "cursor-not-allowed opacity-40"}`}
                    >
                      <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            providerSelection === option.id ? "bg-(--accent)" : "bg-transparent ring-1 ring-(--fg-primary)/40"
                          }`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-(--fg-primary)">{option.name}</span>
                        <span className="block truncate text-xs text-(--text-subdued)">
                          {!option.available ? "API key required" : option.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-white/10 px-4 py-2 text-[11px] leading-relaxed text-(--text-subdued)">
                  Word-synced lyrics by{" "}
                  <a
                    href="https://github.com/soitora/lyrics_Api_v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--fg-primary)/80 underline underline-offset-2 hover:text-(--fg-primary)"
                  >
                    Better Lyrics
                  </a>
                  , line-synced fallback by{" "}
                  <a
                    href="https://lrclib.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--fg-primary)/80 underline underline-offset-2 hover:text-(--fg-primary)"
                  >
                    LRCLIB
                  </a>
                </li>
              </ul>
            )}
          </div>

          <button type="button" onClick={onClose} aria-label="Close lyrics" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-(--text-subdued) transition-colors hover:bg-white/10 hover:text-(--fg-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80">
            <IconChevronDown className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onWheel={beginUserScroll}
        onTouchStart={beginUserScroll}
        onPointerDown={beginUserScroll}
        onKeyDown={beginUserScroll}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 py-10 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-tint)_transparent] max-[640px]:px-4 max-[640px]:py-8"
      >
        {syncedLines && settings.backgroundEffects && (
          <div
            ref={orbRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-0 opacity-0 blur-xl will-change-transform"
            style={{
              width: ORB_BASE_W,
              height: ORB_BASE_H,
              background:
                "radial-gradient(ellipse at center, color-mix(in_oklab,var(--accent)_50%,transparent) 0%, color-mix(in_oklab,var(--accent)_22%,transparent) 48%, color-mix(in_oklab,var(--accent)_0%,transparent) 72%)",
            }}
          />
        )}

        {!song && <p className="py-16 text-center text-base text-(--text-subdued)">Play a song to see its lyrics.</p>}

        {song && status.kind === "loading" && <p className="py-16 text-center text-base text-(--text-subdued)">Loading lyrics…</p>}

        {song && status.kind === "error" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base text-[#f15e6c]">{status.message}</p>
            <button
              type="button"
              onClick={() => {
                forgetLyricsFailure(`${providerSelection}\u0000${cacheKey}`);
                setState({ key: "", kind: "loading" });
                setRetryAttempt((value) => value + 1);
              }}
              className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--panel)"
            >
              Try again
            </button>
          </div>
        )}

        {song && status.kind === "loaded" && status.result?.status === "none" && (
          <p className="py-16 text-center text-base text-(--text-subdued)">
            {providerSelection === "auto"
              ? "No lyrics available for this track."
              : `No lyrics found from ${providerLabel}.`}
          </p>
        )}

        {song && status.kind === "loaded" && status.result?.status === "plain" && (
          <p className="whitespace-pre-wrap text-center text-2xl font-bold leading-10 text-(--fg-primary)/90 max-[640px]:text-xl max-[640px]:leading-8">{status.result.plainLyrics}</p>
        )}

        {song && status.kind === "loaded" && status.result?.status === "synced" && (
          <div className="lyrics-lines relative z-10 flex flex-col items-center gap-2">
            {status.result.lines.map((line, index) => {
              const dist = activeIndex < 0 ? 1 : Math.abs(index - activeIndex);
              const isActive = index === activeIndex;
              const showKaraoke =
                settings.wordSyncedLyrics &&
                settings.wordHighlighting &&
                line.words &&
                line.words.length >= 2;
              const showTranslation = settings.showTranslation && line.translation;

              let lineClass =
                `lyrics-line w-full rounded-lg px-4 py-2 text-center font-bold transition-all duration-[400ms] will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 cursor-pointer ${fontClass}`;

              if (isActive) {
                lineClass += " scale-100 text-(--fg-primary)";
              } else if (dist === 1) {
                lineClass += " scale-[0.93] text-(--fg-primary)/55 hover:text-(--fg-primary)/80";
              } else if (dist === 2) {
                lineClass += " scale-[0.86] text-(--fg-primary)/30 blur-[1px] hover:text-(--fg-primary)/55";
              } else {
                lineClass += " scale-[0.82] text-(--fg-primary)/20 blur-[2px] hover:text-(--fg-primary)/40";
              }

              return (
                <button
                  key={`${line.time}-${index}`}
                  ref={(node) => {
                    if (node) lineElsRef.current.set(index, node);
                    else lineElsRef.current.delete(index);
                  }}
                  type="button"
                  onClick={() => player.seek(line.time)}
                  className={lineClass}
                >
                  {showKaraoke ? (
                    <span className="inline-block max-w-full">
                      {line.words!.map((word, wordIndex) => (
                        <span
                          key={`${word.start}-${wordIndex}`}
                          data-word
                          className="karaoke-word"
                          style={{ "--word-progress": 0 } as React.CSSProperties}
                        >
                          {word.text}
                          {" "}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="inline-block max-w-full">{line.text}</span>
                  )}
                  {showTranslation && (
                    <span className="mt-1 block text-[13px] font-medium leading-6 text-(--text-subdued) max-[640px]:text-xs">
                      {line.translation}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
