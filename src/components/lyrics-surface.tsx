"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconChevronDown } from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { useSettings } from "@/lib/settings";
import { playbackClock } from "@/lib/audio/clock";
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
/** Frame-to-frame time jump larger than this is a seek → snap instead of glide. */
const SEEK_JUMP_SECONDS = 1.2;

/** Peak word scale per animation-strength setting (Word Sync style). */
const WORD_SCALE: Record<string, number> = { off: 0, subtle: 0.05, normal: 0.1, strong: 0.16 };

export const PROVIDER_STORAGE_KEY = "spotify-local/lyrics-provider";

/** Font size mapping for the lyric lines (setting → size). */
const LINE_FONT_SIZES: Record<string, string> = {
  sm: "lyrics-text-sm",
  md: "lyrics-text-md",
  lg: "lyrics-text-lg",
  xl: "lyrics-text-xl",
};

export interface ProviderOption {
  id: string;
  name: string;
  description: string;
  wordSync: boolean;
  available: boolean;
}

type SurfaceState =
  | { key: string; kind: "loading" }
  | { key: string; kind: "loaded"; result: LyricsResult; provenance?: LyricsProvenance }
  | { key: string; kind: "error"; message: string };

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

/** Emphasis class for a line at `distance` from the active line. */
function distanceClass(distance: number): string {
  if (distance === 0) return "is-active";
  if (distance === 1) return "is-next";
  if (distance === 2) return "is-far";
  return "is-distant";
}

/**
 * Shared lyrics engine: one rAF loop per open surface that reads the audio
 * element's clock directly and writes only the DOM properties that changed.
 * No React state changes during playback — active-line emphasis, word motion,
 * and follow scroll are all direct style/class writes on cached elements.
 */
function useLyricsEngine(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  lineElsRef: React.RefObject<Map<number, HTMLDivElement>>,
  lines: LyricLine[],
  enabled: boolean,
) {
  const { settings } = useSettings();

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !enabled || !lines.length) return;

    const reducedMotion =
      settings.animations === "reduced" ||
      settings.animations === "off" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const autoScrollEnabled = settings.autoScrollLyrics && !reducedMotion;
    const wordScale = settings.animations === "off" ? 0 : reducedMotion ? 0 : WORD_SCALE[settings.wordAnimation] ?? 0.1;
    const style = settings.lyricsStyle;
    const useWordMotion = style === "wordsync" && settings.wordSyncedLyrics && wordScale > 0;
    const useWordFill = style === "standard" && settings.wordSyncedLyrics;
    const focusRatio = settings.centerActiveLyric ? 0.42 : 0.36;

    const spring = { y: 0, init: false };
    let measuredFor = -2;
    let geometry: { top: number; height: number } | null = null;
    let lastActive = -2;
    let lastTime = -1;
    let activeSpans: HTMLElement[] | null = null;
    let raf = 0;
    let last = performance.now();
    let userScrolling = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const beginUserScroll = () => {
      userScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        userScrolling = false;
      }, USER_SCROLL_RESUME_MS);
    };
    container.addEventListener("wheel", beginUserScroll, { passive: true });
    container.addEventListener("touchstart", beginUserScroll, { passive: true });
    container.addEventListener("pointerdown", beginUserScroll);

    // offsetTop reads (no getBoundingClientRect) avoid forced layout; the
    // measurement happens only when the active line changes, not per frame.
    const measure = (index: number): { top: number; height: number } | null => {
      const line = lineElsRef.current?.get(index);
      if (!line) return null;
      return { top: line.offsetTop, height: line.offsetHeight };
    };

    const resizeObserver = reducedMotion ? null : new ResizeObserver(() => {
      measuredFor = -2;
    });
    resizeObserver?.observe(container);
    const onResize = () => {
      measuredFor = -2;
    };
    window.addEventListener("resize", onResize);
    if (typeof document.fonts?.ready?.then === "function") {
      void document.fonts.ready.then(onResize).catch(() => {});
    }

    const collectSpans = (index: number): HTMLElement[] => {
      const line = lineElsRef.current?.get(index);
      if (!line) return [];
      return Array.from(line.querySelectorAll<HTMLElement>("[data-word]"));
    };

    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      // The audio element IS the clock: reads are always true playback
      // position — seeks, pauses, and track changes are reflected instantly
      // with no anchor/extrapolation state to invalidate.
      const time = playbackClock.getTime();

      const active = findActiveIndex(lines, time);

      // A large jump between frames means the user sought — snap the scroll.
      if (lastTime >= 0 && Math.abs(time - lastTime) > SEEK_JUMP_SECONDS) {
        spring.init = false;
        measuredFor = -2;
      }
      lastTime = time;

      if (active !== lastActive) {
        // Update emphasis classes only for lines whose class actually changes.
        const lo = Math.min(active, lastActive);
        const hi = Math.max(active, lastActive);
        for (let index = Math.max(0, lo - 1); index <= hi + 1; index += 1) {
          const el = lineElsRef.current?.get(index);
          if (!el) continue;
          const nextClass = distanceClass(Math.abs(index - active));
          if (el.className !== `lyrics-line ${nextClass}`) {
            el.className = `lyrics-line ${nextClass}`;
          }
        }
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

        if (!spring.init || reducedMotion) {
          spring.y = targetY;
          spring.init = true;
          container.scrollTop = targetY;
        } else if (userScrolling) {
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
              span.style.transform = `scale(${(1 + wordScale * envelope).toFixed(4)})`;
              // Gradient sweep: -30% (not started) → 115% (fully sung).
              const progress = time >= word.end ? 1 : time <= word.start ? 0 : (time - word.start) / Math.max(0.001, word.end - word.start);
              span.style.setProperty("--wpos", `${(-30 + progress * 145).toFixed(2)}%`);
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
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      container.removeEventListener("wheel", beginUserScroll);
      container.removeEventListener("touchstart", beginUserScroll);
      container.removeEventListener("pointerdown", beginUserScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [scrollRef, lineElsRef, lines, enabled, settings.autoScrollLyrics, settings.centerActiveLyric, settings.lyricsStyle, settings.wordAnimation, settings.wordSyncedLyrics, settings.animations]);
}

/**
 * Lyrics controller hook: data loading, empty/error states, provider
 * selection, the rAF engine, and the scrollable line-list node. Shared by
 * the centered pop-out panel and the floating window — each shell provides
 * its own chrome around `content`.
 */
export function useLyrics(onLoadedChange?: (loaded: boolean) => void) {
  const player = usePlayer();
  const { settings } = useSettings();
  const song = player.current;
  const fontClass = LINE_FONT_SIZES[settings.lyricsFontSize] ?? LINE_FONT_SIZES.md;
  const [state, setState] = useState<SurfaceState>({ key: "", kind: "loading" });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [providerSelection, setProviderSelection] = useState<string>(() => {
    try {
      return window.localStorage.getItem(PROVIDER_STORAGE_KEY) ?? "auto";
    } catch {
      return "auto";
    }
  });
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const requestRef = useRef(0);
  const onLoadedChangeRef = useRef(onLoadedChange);

  useEffect(() => {
    onLoadedChangeRef.current = onLoadedChange;
  }, [onLoadedChange]);

  // Load provider options once (async, outside render).
  useEffect(() => {
    let cancelled = false;
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

  const chooseProvider = useCallback((id: string) => {
    setProviderSelection(id);
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
    } catch {
      // storage unavailable
    }
    setState({ key: "", kind: "loading" });
    setRetryAttempt((value) => value + 1);
  }, []);

  const cacheKey = useMemo(
    () => (song ? [song.id, song.title, song.artist, song.album].join("\u0000") : ""),
    [song],
  );

  const status = useMemo<SurfaceState>(() => {
    const cacheId = `${providerSelection}\u0000${cacheKey}`;
    if (state.key === cacheId) return state;
    const cached = cachedLyrics(cacheId);
    if (cached) {
      return { key: cacheId, kind: "loaded", result: cached.lyrics, provenance: cached.provenance };
    }
    if (cacheKey && failureIsActive(cacheId)) {
      return { key: cacheId, kind: "error", message: "Lyrics service is unavailable right now." };
    }
    return { key: cacheId, kind: "loading" };
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

  const syncedLines = useMemo(
    () => (status.kind === "loaded" && status.result?.status === "synced" ? status.result.lines : null),
    [status],
  );

  useEffect(() => {
    onLoadedChangeRef.current?.(Boolean(syncedLines));
  }, [syncedLines]);

  // One rAF engine per open surface; writes DOM directly, no React churn.
  useLyricsEngine(scrollRef, lineElsRef, syncedLines ?? [], Boolean(syncedLines));

  const providerLabel = useMemo(() => {
    if (providerSelection === "auto") {
      const resolved = status.kind === "loaded" ? status.provenance?.providerName : undefined;
      return resolved && resolved !== "None" ? `Automatic · ${resolved}` : "Automatic";
    }
    return providerOptions.find((option) => option.id === providerSelection)?.name ?? providerSelection;
  }, [providerSelection, status, providerOptions]);

  const wordStyleOn = settings.lyricsStyle === "wordsync" && settings.wordSyncedLyrics;
  const standardFillOn = settings.lyricsStyle === "standard" && settings.wordSyncedLyrics;

  const picker = (
    <ProviderPicker
      providerLabel={providerLabel}
      providerOptions={providerOptions}
      providerSelection={providerSelection}
      chooseProvider={chooseProvider}
      align="right"
    />
  );

  return {
    picker,
    hasSynced: Boolean(syncedLines),
    content: (
      <div
        ref={scrollRef}
        className="lyrics-scroll relative z-10 min-h-0 w-full flex-1 overflow-y-auto px-8 pb-[18vh] pt-[12vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[640px]:px-5"
      >
        {!song && <p className="py-16 text-center text-base text-white/50">Play a song to see its lyrics.</p>}

        {song && status.kind === "loading" && (
          <div className="flex flex-col gap-5 py-10" aria-hidden>
            {[92, 78, 84, 60].map((width, index) => (
              <div
                key={index}
                className="lyrics-skeleton h-[1.2em] rounded-lg"
                style={{ width: `${width}%`, animationDelay: `${index * 0.12}s` }}
              />
            ))}
          </div>
        )}

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
                  className="lyrics-line is-distant"
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
    ),
  };
}

/** Provider selection control, styled for both panel and floating chrome. */
export function ProviderPicker({
  providerLabel,
  providerOptions,
  providerSelection,
  chooseProvider,
  align,
}: {
  providerLabel: string;
  providerOptions: ProviderOption[];
  providerSelection: string;
  chooseProvider: (id: string) => void;
  align: "right" | "center";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${align === "center" ? "" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Lyrics provider"
        className="flex h-7 max-w-[190px] items-center gap-1 rounded-full bg-white/[.07] px-2.5 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="truncate">{providerLabel}</span>
        <IconChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Lyrics provider"
          className={`absolute z-50 w-60 overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-[0_16px_40px_rgba(0,0,0,.6)] ${
            align === "right" ? "right-0 top-9" : "bottom-10 left-1/2 -translate-x-1/2"
          }`}
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
                onClick={() => {
                  chooseProvider(option.id);
                  setOpen(false);
                }}
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
  );
}
