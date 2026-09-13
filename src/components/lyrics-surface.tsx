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
  type LyricWord,
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

/**
 * How far the bright flow head rides ahead of the raw sung progress, in word
 * units, per intensity setting. The head sweeping slightly early reads as the
 * color "arriving" on the word as it is sung; the colored trail behind it is
 * CSS-side (--flow-trail) and widens with the same intensity setting.
 */
const FLOW_LEAD: Record<string, number> = { subtle: 0.05, normal: 0.15, strong: 0.3 };

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

function findActiveWordIndex(words: LyricWord[], time: number): number {
  let low = 0;
  let high = words.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (words[mid].start <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
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
 * No React state changes during playback — active-line emphasis, the word
 * color flow, and follow scroll are all direct style/class writes on cached
 * elements.
 *
 * Word synchronization is a single custom property per frame: the engine
 * maintains the active word index incrementally (binary search only on seeks)
 * and writes one `--flow` value (in word units) on the active line. Each
 * word's gradient maps that shared value into its own box via its static
 * `--word-i` index, so the accent travels word-by-word in timing order —
 * one style write per frame total, no per-word loops, no transforms, no
 * compositor layers.
 */
function useLyricsEngine(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  lineElsRef: React.RefObject<Map<number, HTMLDivElement>>,
  lines: LyricLine[],
  enabled: boolean,
) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!enabled || !lines.length) return;

    // The scroll container may attach after this effect runs (the surface's
    // content node is rendered by the parent shell), so wait for it via rAF
    // instead of failing silently for the lifetime of the panel.
    let attachRaf = 0;
    let container: HTMLDivElement | null = scrollRef.current;
    const engine = { started: false, stop: () => {} };

    const startEngine = (el: HTMLDivElement) => {
      if (engine.started) return;
      engine.started = true;
      engine.stop = runEngine(el);
    };

    const tryAttach = () => {
      container = scrollRef.current;
      if (container) startEngine(container);
      else attachRaf = requestAnimationFrame(tryAttach);
    };
    tryAttach();

    return () => {
      cancelAnimationFrame(attachRaf);
      engine.stop();
    };
  // `runEngine` is intentionally scoped to the effect's settings snapshot;
  // changing any listed setting tears down and recreates the controller.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scrollRef,
    lineElsRef,
    lines,
    enabled,
    settings.autoScrollLyrics,
    settings.centerActiveLyric,
    settings.lyricsStyle,
    settings.wordFlow,
    settings.wordFlowIntensity,
    settings.lineAnimation,
    settings.respectReducedMotion,
    settings.wordSyncedLyrics,
    settings.animations,
  ]); // runEngine is intentionally scoped to this hook and covered by the settings dependencies

  /** The full animation engine, bound to its scroll container. */
  function runEngine(container: HTMLDivElement) {
    // The theme provider is the single source of truth for the resolved
    // motion mode (settings + prefers-reduced-motion). Read its flag once;
    // on first mount it may not have run yet, so fall back to the media query.
    const motion = document.documentElement.dataset.motion;
    const reducedMotion =
      motion === "off" ||
      motion === "reduced" ||
      (motion === undefined && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const lineAnimEnabled = settings.lineAnimation === "on" && !reducedMotion;
    const snapScroll = !lineAnimEnabled;

    const autoScrollEnabled = settings.autoScrollLyrics && !reducedMotion;
    const style = settings.lyricsStyle;
    const useFlow = style === "flow" && settings.wordSyncedLyrics && settings.wordFlow;
    const flowLead = FLOW_LEAD[settings.wordFlowIntensity] ?? 0.15;
    const useWordFill = style === "standard" && settings.wordSyncedLyrics;
    const focusRatio = settings.centerActiveLyric ? 0.42 : 0.36;

    const spring = { y: 0, init: false };
    let containerHeight = container.clientHeight;
    let maxScroll = Math.max(0, container.scrollHeight - containerHeight);
    let measuredFor = -2;
    let geometry: { top: number; height: number } | null = null;
    let lastActive = -2;
    let lastTime = -1;
    // Word bookkeeping for the active line only (fill path + flow index).
    let activeSpans: HTMLElement[] | null = null;
    let activeWordIndex = -2;
    let activeLineEl: HTMLElement | null = null;
    let raf = 0;
    let last = performance.now();
    let userScrolling = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    // Idle management: the loop stops entirely when nothing changes visually
    // (paused + scroll settled) and restarts from media events.
    let running = true;
    let idle = false;

    const wake = () => {
      if (!running || !idle) return;
      idle = false;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const sleep = () => {
      if (idle) return;
      idle = true;
      cancelAnimationFrame(raf);
    };

    // Media events (via the clock's single subscription) restart the loop
    // after sleep; the clock itself is read inside the loop, so no state is
    // captured at wake time. The subscription also covers active-element
    // switches (crossfade), which re-emit from setElement.
    const unsubscribeClock = playbackClock.subscribe(wake);
    const onVisibility = () => {
      if (document.hidden) sleep();
      else wake();
    };
    document.addEventListener("visibilitychange", onVisibility);

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

    // Cached container metrics: clientHeight/scrollHeight are layout reads,
    // so they are refreshed only on resize or when a new line is measured.
    const refreshGeometry = () => {
      measuredFor = -2;
      containerHeight = container.clientHeight;
      maxScroll = Math.max(0, container.scrollHeight - containerHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      refreshGeometry();
      wake();
    });
    resizeObserver.observe(container);
    const onResize = () => {
      refreshGeometry();
      wake();
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

    const setWordProgress = (span: HTMLElement, progress: number) => {
      const progressText = progress.toFixed(2);
      if (span.dataset.progress !== progressText) {
        span.dataset.progress = progressText;
        span.style.setProperty("--word-progress", progressText);
      }
    };

    const initializeLineWords = (words: LyricWord[], spans: HTMLElement[], time: number) => {
      for (let index = 0; index < spans.length; index += 1) {
        const word = words[index];
        const span = spans[index];
        if (!word || !span) continue;
        const past = time >= word.end;
        setWordProgress(span, past ? 1 : 0);
      }
    };

    let activeCursor = 0;
    const findActiveIncremental = (time: number): number => {
      let index = Math.min(Math.max(activeCursor, 0), lines.length - 1);
      if (index >= 0 && lines[index] && time >= lines[index].time) {
        while (index + 1 < lines.length && time >= lines[index + 1].time) index += 1;
        activeCursor = index;
        return index;
      }
      // Time moved before the cached line: fall back to binary search.
      const found = findActiveIndex(lines, time);
      activeCursor = Math.max(found, 0);
      return found;
    };

    // Only the neighborhoods around an active line can change emphasis.
    const updateLineClasses = (center: number) => {
      if (center < 0) return;
      for (let offset = -3; offset <= 3; offset += 1) {
        const index = center + offset;
        if (index < 0 || index >= lines.length) continue;
        const el = lineElsRef.current?.get(index);
        if (!el) continue;
        const nextClass = `lyrics-line ${distanceClass(Math.abs(offset))}`;
        if (el.className !== nextClass) {
          el.className = nextClass;
        }
      }
    };

    /** Drop the flow value from a line so its words return to the base color. */
    const clearFlow = (lineEl: HTMLElement | null) => {
      if (!lineEl) return;
      if (lineEl.dataset.flow !== undefined) delete lineEl.dataset.flow;
      lineEl.style.removeProperty("--flow");
    };

    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      // The audio element IS the clock: reads are always true playback
      // position — seeks, pauses, and track changes are reflected instantly
      // with no anchor/extrapolation state to invalidate.
      const time = playbackClock.getTime();
      const playing = !playbackClock.getElement()?.paused;
      const isSeek = lastTime >= 0 && Math.abs(time - lastTime) > SEEK_JUMP_SECONDS;

      const active = isSeek ? findActiveIndex(lines, time) : findActiveIncremental(time);

      if (isSeek) {
        activeCursor = Math.max(active, 0);
        spring.init = false;
        measuredFor = -2;
      }
      lastTime = time;

      if (active !== lastActive) {
        // Only the neighborhoods around the old and new active lines can
        // change emphasis. This stays O(1) even when a seek jumps hundreds
        // of lines; the skipped lines were already distant.
        updateLineClasses(lastActive);
        updateLineClasses(active);

        // Reset word state on the outgoing line in one pass. The write
        // caches must clear too, or a re-activated line would skip its first
        // write (dataset value would equal the stale cached one).
        clearFlow(activeLineEl);
        if (activeSpans) {
          for (const span of activeSpans) {
            span.dataset.progress = "";
            span.style.removeProperty("--word-progress");
          }
          activeSpans = null;
        }
        activeWordIndex = -2;
        lastActive = active;
        measuredFor = -2;
      }

      if (measuredFor !== active) {
        const measured = active >= 0 ? measure(active) : null;
        if (measured || active < 0) {
          geometry = measured;
          measuredFor = active;
          // Content height is stable between lyric/layout changes. Refresh it
          // once with the active-line measurement, never inside every frame.
          maxScroll = Math.max(0, container.scrollHeight - containerHeight);
        }
      }

      // --- Follow scroll: continuous spring toward the active line ---
      let scrollSettled = true;
      if (autoScrollEnabled) {
        const rawTargetY = geometry ? geometry.top + geometry.height / 2 - containerHeight * focusRatio : 0;
        const targetY = Math.min(Math.max(rawTargetY, 0), maxScroll);

        if (!spring.init || snapScroll) {
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
            if (Math.abs(container.scrollTop - spring.y) >= 0.5) {
              container.scrollTop = spring.y;
              scrollSettled = false;
            }
          }
        }
      }

      // --- Word color flow / legacy fill: only the active line participates ---
      if (active >= 0) {
        const line = lines[active];
        const words = line?.words;
        const hasWords = Boolean(words && words.length >= 2);

        if ((useFlow || useWordFill) && hasWords) {
          const list = words!;
          const lineEl = lineElsRef.current?.get(active) ?? null;
          if (lineEl !== activeLineEl) {
            // Line switch: the outgoing line already had its flow cleared
            // above; just adopt the new line element.
            activeLineEl = lineEl;
          }

          // Maintain the active word index incrementally; binary search only
          // on seeks or when time moved before the cached word.
          let nextWordIndex = activeWordIndex;
          if (
            nextWordIndex === -2 ||
            nextWordIndex >= list.length ||
            (nextWordIndex >= 0 && time < list[nextWordIndex].start)
          ) {
            nextWordIndex = findActiveWordIndex(list, time);
          } else {
            while (nextWordIndex + 1 < list.length && time >= list[nextWordIndex + 1].start) {
              nextWordIndex += 1;
            }
          }
          activeWordIndex = nextWordIndex;

          if (useFlow) {
            // One custom-property write per frame for the whole line: the
            // flow head position in word units. Each word resolves its own
            // gradient stop from this value and its static --word-i index.
            const count = list.length;
            let flow: number;
            if (nextWordIndex < 0) {
              // Line started but the first word has not: head parked before
              // the line so every word renders in its dim base color.
              flow = -0.5;
            } else {
              const word = list[nextWordIndex];
              const progress =
                time <= word.start ? 0 : time >= word.end ? 1 : (time - word.start) / Math.max(0.001, word.end - word.start);
              flow = nextWordIndex + progress + flowLead;
            }
            flow = Math.min(count + flowLead, Math.max(-0.5, flow));
            const flowText = flow.toFixed(2);
            if (lineEl && lineEl.dataset.flow !== flowText) {
              lineEl.dataset.flow = flowText;
              lineEl.style.setProperty("--flow", flowText);
            }
          } else if (useWordFill && lineEl) {
            // Standard style: legacy per-word karaoke fill (unchanged cost
            // profile: only the current word's value updates per frame).
            if (!activeSpans) {
              activeSpans = collectSpans(active);
              initializeLineWords(list, activeSpans, time);
            }
            if (nextWordIndex >= 0 && nextWordIndex < activeSpans.length) {
              const word = list[nextWordIndex];
              const span = activeSpans[nextWordIndex];
              if (word && span) {
                const progress =
                  time <= word.start ? 0 : time >= word.end ? 1 : (time - word.start) / Math.max(0.001, word.end - word.start);
                setWordProgress(span, progress);
              }
            }
          }
        }
      }

      // Idle management: while paused with the scroll settled, stop the loop
      // entirely; play/seek/element-switch events wake it via the clock
      // subscription. A paused frame is visually static by definition.
      if (!playing && scrollSettled) {
        sleep();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribeClock();
      container.removeEventListener("wheel", beginUserScroll);
      container.removeEventListener("touchstart", beginUserScroll);
      container.removeEventListener("pointerdown", beginUserScroll);
      for (const lineEl of lineElsRef.current?.values() ?? []) {
        lineEl.style.removeProperty("--flow");
        if (lineEl.dataset.flow !== undefined) delete lineEl.dataset.flow;
      }
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }
}

/**
 * Lyrics controller hook: data loading, empty/error states, provider
 * selection, the rAF engine, and the scrollable line-list node. Shared by
 * the centered pop-out panel and the floating window — each shell provides
 * its own chrome around `content`.
 */
export function useLyrics(
  onLoadedChange?: (loaded: boolean) => void,
  visible = true,
) {
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

  // Load provider options when a lyrics surface becomes visible.
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
  }, [visible]);

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
    if (!visible || !song || !cacheKey) return;
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
  }, [cacheKey, song, retryAttempt, providerSelection, visible]);

  const syncedLines = useMemo(
    () => (status.kind === "loaded" && status.result?.status === "synced" ? status.result.lines : null),
    [status],
  );

  useEffect(() => {
    onLoadedChangeRef.current?.(Boolean(syncedLines));
  }, [syncedLines]);

  // One rAF engine per open surface; writes DOM directly, no React churn.
  useLyricsEngine(
    scrollRef,
    lineElsRef,
    syncedLines ?? [],
    Boolean(syncedLines) && visible,
  );

  const providerLabel = useMemo(() => {
    if (providerSelection === "auto") {
      const resolved = status.kind === "loaded" ? status.provenance?.providerName : undefined;
      return resolved && resolved !== "None" ? `Automatic · ${resolved}` : "Automatic";
    }
    return providerOptions.find((option) => option.id === providerSelection)?.name ?? providerSelection;
  }, [providerSelection, status, providerOptions]);

  const flowOn = settings.lyricsStyle === "flow" && settings.wordSyncedLyrics && settings.wordFlow;
  const standardFillOn = settings.lyricsStyle === "standard" && settings.wordSyncedLyrics;
  const styleClass = flowOn
    ? `lyrics-style-flow lyrics-flow-${settings.wordFlowIntensity}`
    : standardFillOn
      ? "lyrics-style-standard"
      : "lyrics-style-minimal";
  const lineStaticClass = settings.lineAnimation === "off" ? "lyrics-line-static" : "";

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
          <div className={`lyrics-lines relative z-10 flex flex-col items-start gap-[0.35em] ${fontClass} ${styleClass} ${lineStaticClass}`}>
            {status.result.lines.map((line, index) => {
              const hasWords = Boolean(line.words && line.words.length >= 2);
              const useWords = (flowOn || standardFillOn) && hasWords;
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
                        style={{ "--word-i": wordIndex, "--word-progress": 0 } as React.CSSProperties}
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
