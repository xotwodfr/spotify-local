"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconChevronDown } from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
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

/** Spring stiffness for the continuous follow scroll (higher = snappier). */
const FOLLOW_STIFFNESS = 6;
/** How long auto-follow stays paused after the user scrolls manually. */
const USER_SCROLL_RESUME_MS = 4000;
/** Reported-time jumps larger than this are treated as seeks and snapped to. */
const SEEK_JUMP_SECONDS = 1.2;
/** Maximum playback-time extrapolation between reported positions. */
const MAX_EXTRAPOLATION_SECONDS = 0.75;

/** Peak word scale per animation-strength setting (Word Sync style). */
const WORD_SCALE: Record<string, number> = { off: 0, subtle: 0.05, normal: 0.1, strong: 0.16 };

const PROVIDER_STORAGE_KEY = "spotify-local/lyrics-provider";

/** Font size mapping for the lyric lines (setting → size). */
const LINE_FONT_SIZES: Record<string, string> = {
  sm: "lyrics-text-sm",
  md: "lyrics-text-md",
  lg: "lyrics-text-lg",
  xl: "lyrics-text-xl",
};

interface ProviderOption {
  id: string;
  name: string;
  description: string;
  wordSync: boolean;
  available: boolean;
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

/**
 * Word motion envelope, p ∈ [0, 1+]: how "sung" a word is at playback time.
 * Rises quickly as the word begins, peaks while it is being sung, then eases
 * back down right after it ends — the breathing curve that makes words feel
 * alive without ever looking jumpy.
 */
function wordEnvelope(time: number, start: number, end: number): number {
  if (time <= start) return 0;
  const duration = Math.max(0.05, end - start);
  const p = (time - start) / duration;
  // Rise: 0→1 over the first 35% (smoothstep), hold, fall: 1→0 from 75%→135%.
  if (p < 0.35) {
    const t = p / 0.35;
    return t * t * (3 - 2 * t);
  }
  if (p < 0.75) return 1;
  const t = Math.min(1, (p - 0.75) / 0.6);
  const decay = 1 - t;
  return decay * decay * (3 - 2 * decay);
}

export function LyricsPanel({ onClose }: { onClose: () => void }) {
  const player = usePlayer();
  const { settings } = useSettings();
  const song = player.current;
  const fontClass = LINE_FONT_SIZES[settings.lyricsFontSize] ?? LINE_FONT_SIZES.md;
  const [state, setState] = useState<{ key: string; kind: "loading" | "loaded" | "error"; result?: LyricsResult; provenance?: LyricsProvenance; message?: string }>({ key: "", kind: "loading" });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [providerSelection, setProviderSelection] = useState<string>("auto");
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
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
    setState({ key: "", kind: "loading" });
    setRetryAttempt((value) => value + 1);
  }

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  // Mirror shared player state into refs after every render (interpolation anchor).
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

  // Single rAF loop: interpolated time, follow spring, and per-word motion.
  // All visual updates are direct style writes — no React re-renders per frame.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const autoScrollEnabled = settings.autoScrollLyrics;
    const style = settings.lyricsStyle;
    const wordScale = reducedMotion ? 0 : WORD_SCALE[settings.wordAnimation] ?? 0.1;
    const useWordMotion = style === "wordsync" && settings.wordSyncedLyrics && wordScale > 0;
    const useWordFill = style === "standard" && settings.wordSyncedLyrics;
    const focusRatio = settings.centerActiveLyric ? 0.42 : 0.36;

    const spring = { y: 0, init: false };
    let measuredFor = -2;
    let geometry: { top: number; height: number } | null = null;
    let lastActive = -2;
    let activeSpans: HTMLElement[] | null = null;
    let raf = 0;
    let last = performance.now();

    const measure = (index: number): { top: number; height: number } | null => {
      const line = lineElsRef.current.get(index);
      if (!line) return null;
      const containerRect = container.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      return {
        top: lineRect.top - containerRect.top + container.scrollTop,
        height: lineRect.height,
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

    const collectSpans = (index: number): HTMLElement[] => {
      const line = lineElsRef.current.get(index);
      if (!line) return [];
      return Array.from(line.querySelectorAll<HTMLElement>("[data-word]"));
    };

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
        // Reset motion on the outgoing line's words in one pass.
        if (activeSpans) {
          for (const span of activeSpans) {
            span.style.transform = "";
            span.style.setProperty("--wpos", "-30%");
          }
        }
        activeSpans = null;
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
        snapRef.current = false;
      }

      // --- Word-level motion: scale while sung + gradient sweep position ---
      if (active >= 0) {
        const line = lines[active];
        const words = line?.words;
        const hasWords = Boolean(words && words.length >= 2);

        if ((useWordMotion || useWordFill) && hasWords) {
          if (!activeSpans) activeSpans = collectSpans(active);
          const list = words!;
          for (let index = 0; index < activeSpans.length; index += 1) {
            const word = list[index];
            const span = activeSpans[index];
            if (!word || !span) continue;
            if (useWordMotion) {
              const envelope = wordEnvelope(time, word.start, word.end);
              // Direct transform write: reliable across CSS optimizers, and the
              // only per-frame cost is a style recalc on already-composited spans.
              span.style.transform = `scale(${(1 + wordScale * envelope).toFixed(4)})`;
              // Gradient sweep: -30% (not started) → 115% (fully sung).
              const progress = time >= word.end ? 1 : time <= word.start ? 0 : (time - word.start) / Math.max(0.001, word.end - word.start);
              const position = -30 + progress * 145;
              span.style.setProperty("--wpos", `${position.toFixed(2)}%`);
            } else if (useWordFill) {
              const progress = time >= word.end ? 1 : time <= word.start ? 0 : (time - word.start) / Math.max(0.001, word.end - word.start);
              span.style.setProperty("--word-progress", progress.toFixed(3));
            }
          }
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", invalidate);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [syncedLines, settings.autoScrollLyrics, settings.centerActiveLyric, settings.lyricsStyle, settings.wordAnimation, settings.wordSyncedLyrics]);

  const providerLabel = useMemo(() => {
    if (providerSelection === "auto") {
      const resolved = status.provenance?.providerName;
      return resolved && resolved !== "None" ? `Automatic · ${resolved}` : "Automatic";
    }
    return providerOptions.find((option) => option.id === providerSelection)?.name ?? providerSelection;
  }, [providerSelection, status.provenance, providerOptions]);

  const wordStyleOn = settings.lyricsStyle === "wordsync" && settings.wordSyncedLyrics;
  const standardFillOn = settings.lyricsStyle === "standard" && settings.wordSyncedLyrics;

  return (
    <section
      aria-label="Lyrics"
      className="lyrics-popout"
    >
      {/* Ambient artwork background: two soft color fields, driven by the app palette */}
      {settings.backgroundEffects && (
        <div aria-hidden className="lyrics-dynamic-bg">
          <div className="lyrics-dynamic-blob lyrics-dynamic-blob-a" />
          <div className="lyrics-dynamic-blob lyrics-dynamic-blob-b" />
        </div>
      )}
      <div aria-hidden className="lyrics-dynamic-scrim" />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-6 pt-4 max-[640px]:px-4 max-[640px]:pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">Lyrics</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white/85">
            {song ? `${song.title}${song.artist ? ` — ${song.artist}` : ""}` : "Nothing playing"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative max-[640px]:hidden">
            <button
              type="button"
              onClick={() => setSelectorOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={selectorOpen}
              title="Lyrics provider"
              className="flex h-7 max-w-[190px] items-center gap-1 rounded-full bg-white/[.07] px-2.5 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="truncate">{providerLabel}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
            </button>

            {selectorOpen && (
              <ul
                role="listbox"
                aria-label="Lyrics provider"
                className="absolute right-0 top-9 z-50 w-60 overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-[0_16px_40px_rgba(0,0,0,.6)]"
              >
                {providerOptions.length === 0 && (
                  <li className="px-4 py-2 text-sm text-white/55">Loading providers…</li>
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
                            providerSelection === option.id ? "bg-(--accent)" : "bg-transparent ring-1 ring-white/40"
                          }`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">{option.name}</span>
                        <span className="block truncate text-xs text-white/55">
                          {!option.available ? "API key required" : option.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" onClick={onClose} aria-label="Close lyrics" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.07] text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <IconChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onWheel={beginUserScroll}
        onTouchStart={beginUserScroll}
        onPointerDown={beginUserScroll}
        onKeyDown={beginUserScroll}
        className="lyrics-scroll relative z-10 mx-auto min-h-0 w-full max-w-[820px] flex-1 overflow-y-auto px-8 pb-[26vh] pt-[18vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[640px]:px-5"
      >
        {!song && <p className="py-16 text-center text-base text-white/50">Play a song to see its lyrics.</p>}

        {song && status.kind === "loading" && <p className="py-16 text-center text-base text-white/50">Loading lyrics…</p>}

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
              className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Try again
            </button>
          </div>
        )}

        {song && status.kind === "loaded" && status.result?.status === "none" && (
          <p className="py-16 text-center text-base text-white/50">
            {providerSelection === "auto"
              ? "No lyrics available for this track."
              : `No lyrics found from ${providerLabel}.`}
          </p>
        )}

        {song && status.kind === "loaded" && status.result?.status === "plain" && (
          <p className="whitespace-pre-wrap text-center text-xl font-bold leading-8 text-white/85 max-[640px]:text-lg">{status.result.plainLyrics}</p>
        )}

        {song && status.kind === "loaded" && status.result?.status === "synced" && (
          <div className={`lyrics-lines relative z-10 flex flex-col items-start gap-[0.35em] ${fontClass} ${wordStyleOn ? "lyrics-style-wordsync" : standardFillOn ? "lyrics-style-standard" : "lyrics-style-minimal"}`}>
            {status.result.lines.map((line, index) => {
              const dist = activeIndex < 0 ? 3 : Math.abs(index - activeIndex);
              const isActive = index === activeIndex;
              const hasWords = Boolean(line.words && line.words.length >= 2);
              const useWords = (wordStyleOn || standardFillOn) && settings.wordSyncedLyrics && hasWords;
              const showTranslation = settings.showTranslation && line.translation;

              return (
                <div
                  key={`${line.time}-${index}`}
                  ref={(node) => {
                    if (node) lineElsRef.current.set(index, node);
                    else lineElsRef.current.delete(index);
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => player.seek(line.time)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      player.seek(line.time);
                    }
                  }}
                  aria-label={`Seek to ${line.text}`}
                  className={`lyrics-line ${isActive ? "is-active" : dist === 1 ? "is-next" : dist === 2 ? "is-far" : "is-distant"}`}
                >
                  {useWords ? (
                    line.words!.map((word, wordIndex) => (
                      <span
                        key={`${word.start}-${wordIndex}`}
                        data-word
                        data-start={word.start}
                        className="lyrics-word"
                        style={{ "--wscale": 1, "--wpos": "-30%", "--word-progress": 0 } as React.CSSProperties}
                        onClick={(event) => {
                          event.stopPropagation();
                          player.seek(word.start);
                        }}
                      >
                        {word.text}
                      </span>
                    ))
                  ) : (
                    <span className="lyrics-plain">{line.text}</span>
                  )}
                  {showTranslation && (
                    <span className="lyrics-translation">{line.translation}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile: provider chip floats at the bottom edge of the panel */}
      <div className="absolute inset-x-0 bottom-3 z-20 hidden justify-center px-4 max-[640px]:flex">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSelectorOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={selectorOpen}
            title="Lyrics provider"
            className="flex h-8 max-w-[240px] items-center gap-1.5 rounded-full bg-white/[.08] px-3.5 text-[11px] font-semibold text-white/65 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="truncate">{providerLabel}</span>
            <IconChevronDown className={`h-3 w-3 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
          </button>
          {selectorOpen && (
            <ul
              role="listbox"
              aria-label="Lyrics provider"
              className="absolute bottom-10 left-1/2 z-50 w-60 -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-[0_16px_40px_rgba(0,0,0,.6)]"
            >
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
                          providerSelection === option.id ? "bg-(--accent)" : "bg-transparent ring-1 ring-white/40"
                        }`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{option.name}</span>
                      <span className="block truncate text-xs text-white/55">
                        {!option.available ? "API key required" : option.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
