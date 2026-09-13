"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getSessionInfo } from "@/lib/navidrome/auth";
import {
  getPlayQueue,
  savePlayQueue,
  scrobble,
  streamUrl,
} from "@/lib/navidrome/playback";
import type { NSong } from "@/lib/navidrome/types";
import { getSyncSetting } from "@/lib/settings";

export type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  connected: boolean;
  queue: NSong[];
  index: number;
  current: NSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  playSong: (song: NSong, contextQueue?: NSong[]) => void;
  playQueueAt: (queue: NSong[], index: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (song: NSong) => void;
  playNext: (song: NSong) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveInQueue: (from: number, to: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const VOLUME_KEY = "spotify-local/volume";

function cloneSongList(list: NSong[]): NSong[] {
  return list.map((song) => ({ ...song }));
}

const EASE_FADE_STEPS_MS = 32;

/**
 * Ease the audio element's volume toward `to` over `durationMs`.
 * Each element owns its fade timer so the outgoing fade-out and the incoming
 * fade-in run independently during a crossfade.
 */
function fadeVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  timers: Map<HTMLAudioElement, ReturnType<typeof setInterval>>,
  onDone?: () => void,
) {
  const existing = timers.get(audio);
  if (existing) clearInterval(existing);
  timers.delete(audio);
  if (durationMs <= 0) {
    audio.volume = to;
    onDone?.();
    return;
  }
  const start = performance.now();
  const timer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / durationMs);
    audio.volume = from + (to - from) * (1 - Math.pow(1 - t, 3));
    if (t >= 1) {
      audio.volume = to;
      const current = timers.get(audio);
      if (current === timer) timers.delete(audio);
      clearInterval(timer);
      onDone?.();
    }
  }, EASE_FADE_STEPS_MS);
  timers.set(audio, timer);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  // Two audio elements alternate so crossfade can overlap the outgoing and
  // incoming tracks. `activeAudioRef` points at the one the UI follows.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<NSong[]>([]);
  const indexRef = useRef(-1);
  const connectedRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const scrobbledRef = useRef<Set<string>>(new Set());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimersRef = useRef<Map<HTMLAudioElement, ReturnType<typeof setInterval>>>(new Map());
  // Guards the timeupdate-based early crossfade trigger so it fires once per track.
  const crossfadeTriggeredRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [queue, setQueue] = useState<NSong[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = window.localStorage.getItem(VOLUME_KEY);
      if (raw === null) return 1;
      const saved = Number(raw);
      return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 1;
    } catch {
      return 1;
    }
  });
  const volumeRef = useRef(1);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

  const current: NSong | null = index >= 0 && index < queue.length ? queue[index] : null;

  function commitQueue(list: NSong[], nextIndex: number) {
    queueRef.current = list;
    indexRef.current = nextIndex;
    setQueue(list);
    setIndex(nextIndex);
  }

  function schedulePersist() {
    if (!connectedRef.current) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);      persistTimerRef.current = setTimeout(() => {
        const list = queueRef.current;
        const idx = indexRef.current;
        void savePlayQueue({
          songIds: list.map((song) => song.id),
          current: idx >= 0 ? list[idx]?.id : undefined,
          position: Math.floor(activeAudioRef.current?.currentTime ?? 0),
        }).catch(() => {
        // Queue persistence is best-effort.
      });
    }, 1500);
  }

  const startPlayback = useCallback((list: NSong[], startIndex: number) => {
    if (!list.length) return;
    const outgoing = activeAudioRef.current;
    if (!outgoing && !audioRef.current) return;
    const safe = Math.min(Math.max(startIndex, 0), list.length - 1);
    const fresh = cloneSongList(list);
    commitQueue(fresh, safe);
    const song = fresh[safe];
    const url = streamUrl(song.id);
    const crossfade = Number(getSyncSetting("crossfade") ?? 0);
    const targetVolume = volumeRef.current;

    const beginOn = (audio: HTMLAudioElement) => {
      crossfadeTriggeredRef.current = false;
      if (audio.getAttribute("src") !== url) {
        audio.src = url;
        audio.load();
      }
      audio.currentTime = 0;
      setCurrentTime(0);
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      schedulePersist();
    };

    // True crossfade: the outgoing track keeps playing while fading out as the
    // incoming track fades in on the other element. Only when the outgoing
    // track is actually audible — otherwise an instant switch is cleaner.
    const canCrossfade =
      crossfade > 0 &&
      targetVolume > 0 &&
      outgoing !== null &&
      !outgoing.paused &&
      outgoing.getAttribute("src");
    if (canCrossfade && outgoing) {
      const incoming = outgoing === audioRef.current ? audioBRef.current : audioRef.current;
      if (!incoming) {
        beginOn(outgoing);
        return;
      }
      activeAudioRef.current = incoming;
      beginOn(incoming);
      incoming.volume = 0;
      fadeVolume(incoming, 0, targetVolume, crossfade * 1000, fadeTimersRef.current);
      fadeVolume(outgoing, outgoing.volume, 0, crossfade * 1000, fadeTimersRef.current, () => {
        outgoing.pause();
      });
      return;
    }

    // Instant switch: stop any element that is still sounding.
    for (const el of [audioRef.current, audioBRef.current]) {
      if (el && el !== outgoing) {
        const timer = fadeTimersRef.current.get(el);
        if (timer) clearInterval(timer);
        fadeTimersRef.current.delete(el);
        el.pause();
      }
    }
    const audio = outgoing ?? audioRef.current;
    if (!audio) return;
    activeAudioRef.current = audio;
    beginOn(audio);
    const timer = fadeTimersRef.current.get(audio);
    if (timer) clearInterval(timer);
    fadeTimersRef.current.delete(audio);
    audio.volume = targetVolume;
  }, []);

  const playSong = useCallback(
    (song: NSong, contextQueue?: NSong[]) => {
      const list = contextQueue && contextQueue.length ? contextQueue : [song];
      const position = Math.max(0, list.findIndex((entry) => entry.id === song.id));
      startPlayback(list, position);
    },
    [startPlayback],
  );

  const toggle = useCallback(() => {
    const audio = activeAudioRef.current;
    if (!audio || indexRef.current < 0) return;
    if (audio.paused) {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const next = useCallback(() => {
    const list = queueRef.current;
    if (!list.length) return;
    const currentIndex = indexRef.current;
    if (repeat === "one") {
      startPlayback(list, currentIndex);
      return;
    }
    let nextIndex: number;
    if (shuffle && list.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * list.length);
      } while (nextIndex === currentIndex);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= list.length) {
        if (repeat === "all") {
          nextIndex = 0;
        } else {
          audioRef.current?.pause();
          setIsPlaying(false);
          return;
        }
      }
    }
    startPlayback(list, nextIndex);
  }, [repeat, shuffle, startPlayback]);

  const previous = useCallback(() => {
    const list = queueRef.current;
    if (!list.length) return;
    const audio = activeAudioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const currentIndex = indexRef.current;
    if (repeat === "one") {
      startPlayback(list, currentIndex);
      return;
    }
    if (currentIndex <= 0) {
      startPlayback(list, 0);
      return;
    }
    startPlayback(list, currentIndex - 1);
  }, [repeat, startPlayback]);

  const seek = useCallback((position: number) => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    if (!Number.isFinite(position) || position < 0) return;
    audio.currentTime = position;
    setCurrentTime(position);
  }, []);

  const changeVolume = useCallback((nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume));
    setVolume(clamped);
    volumeRef.current = clamped;
    // A manual volume change cancels any in-flight fades and applies to both
    // elements; the fading one gets retargeted on its next tick via from/to.
    for (const [el, timer] of fadeTimersRef.current) {
      clearInterval(timer);
      fadeTimersRef.current.delete(el);
    }
    if (audioRef.current) audioRef.current.volume = clamped;
    if (audioBRef.current) audioBRef.current.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((value) => !value);
  }, []);

  const addToQueue = useCallback((song: NSong) => {
    const nextList = [...cloneSongList(queueRef.current), song];
    commitQueue(nextList, indexRef.current);
    schedulePersist();
  }, []);

  const playNext = useCallback((song: NSong) => {
    const list = cloneSongList(queueRef.current);
    const currentIndex = indexRef.current;
    const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
    list.splice(insertAt, 0, song);
    commitQueue(list, currentIndex);
    schedulePersist();
  }, []);

  const removeFromQueue = useCallback((removeIndex: number) => {
    const list = cloneSongList(queueRef.current);
    const currentIndex = indexRef.current;
    if (removeIndex < 0 || removeIndex >= list.length) return;
    list.splice(removeIndex, 1);
    let nextIndex = currentIndex;
    if (currentIndex === removeIndex) {
      nextIndex = Math.min(removeIndex, list.length - 1);
    } else if (removeIndex < currentIndex) {
      nextIndex = currentIndex - 1;
    }
    commitQueue(list, nextIndex);
    schedulePersist();
  }, []);

  const clearQueue = useCallback(() => {
    commitQueue([], -1);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    for (const el of [audioRef.current, audioBRef.current]) {
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    }
    schedulePersist();
  }, []);

  const moveInQueue = useCallback((from: number, to: number) => {
    const list = cloneSongList(queueRef.current);
    const currentIndex = indexRef.current;
    if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) {
      return;
    }
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    let nextIndex = currentIndex;
    if (from === currentIndex) {
      nextIndex = to;
    } else if (from < currentIndex && to >= currentIndex) {
      nextIndex = currentIndex - 1;
    } else if (from > currentIndex && to <= currentIndex) {
      nextIndex = currentIndex + 1;
    }
    commitQueue(list, nextIndex);
    schedulePersist();
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const timers = fadeTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearInterval(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    void getSessionInfo().then((info) => {
      connectedRef.current = info.connected;
      setConnected(info.connected);
    });
  }, []);

  useEffect(() => {
    if (!connected || restoredRef.current) return;
    restoredRef.current = true;
    void (async () => {
      try {
        const saved = await getPlayQueue();
        const entries = saved?.entry?.filter((song) => song && song.id) ?? [];
        if (!entries.length) {
          commitQueue([], -1);
          void savePlayQueue({ songIds: [] }).catch(() => {});
          return;
        }
        const currentSongId = saved?.current ?? entries[0].id;
        const startIndex = Math.max(
          0,
          entries.findIndex((song) => song.id === currentSongId),
        );
        const audio = audioRef.current;
        if (audio) {
          audio.src = streamUrl(entries[startIndex].id);
          audio.load();
          activeAudioRef.current = audio;
        }
        const savedPosition =
          typeof saved?.position === "number" ? saved.position : null;
        if (savedPosition !== null && savedPosition > 0) {
          pendingSeekRef.current = savedPosition;
        }
        commitQueue(entries, startIndex);
      } catch {
        // Not connected or queue restore failed; start empty.
      }
    })();
  }, [connected]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      connected,
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      repeat,
      shuffle,
      playSong,
      playQueueAt: startPlayback,
      toggle,
      next,
      previous,
      seek,
      setVolume: changeVolume,
      toggleRepeat,
      toggleShuffle,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
      moveInQueue,
    }),
    [
      connected,
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      repeat,
      shuffle,
      playSong,
      startPlayback,
      toggle,
      next,
      previous,
      seek,
      changeVolume,
      toggleRepeat,
      toggleShuffle,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
      moveInQueue,
    ],
  );

  const bindAudio = (key: "a" | "b") => (node: HTMLAudioElement | null) => {
    if (key === "a") {
      audioRef.current = node;
      activeAudioRef.current = activeAudioRef.current ?? node;
    } else {
      audioBRef.current = node;
    }
    if (node) node.volume = volume;
  };

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    // Ignore metadata from the inactive element (crossfade partner).
    if (event.currentTarget !== activeAudioRef.current) return;
    setDuration(event.currentTarget.duration || 0);
    if (pendingSeekRef.current !== null) {
      event.currentTarget.currentTime = pendingSeekRef.current;
      setCurrentTime(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== activeAudioRef.current) return;
    const audio = event.currentTarget;
    setCurrentTime(audio.currentTime);

    // Natural-end crossfade: start the next track while the current one is
    // still sounding, so the two genuinely overlap. `ended` fires too late for
    // that — the element is already silent — so the switch is scheduled during
    // the final `crossfade` seconds. Fires once per track.
    const crossfade = Number(getSyncSetting("crossfade") ?? 0);
    const duration = audio.duration;
    if (
      crossfade > 0 &&
      !crossfadeTriggeredRef.current &&
      !audio.paused &&
      Number.isFinite(duration) &&
      duration > crossfade + 2 &&
      audio.currentTime >= duration - crossfade
    ) {
      // Only pre-trigger when advancing will actually start a new track;
      // otherwise the current song would be cut short at end of queue.
      const list = queueRef.current;
      const idx = indexRef.current;
      const willAdvance =
        repeat !== "off" || shuffle || idx + 1 < list.length;
      if (!willAdvance) return;
      crossfadeTriggeredRef.current = true;
      const song = list[idx];
      if (song && !scrobbledRef.current.has(song.id)) {
        // The outgoing track's `ended` is ignored during crossfade (it is no
        // longer the active element), so scrobble at hand-off instead.
        scrobbledRef.current.add(song.id);
        void scrobble(song.id, true).catch(() => {});
      }
      next();
    }
  };

  const handleEnded = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== activeAudioRef.current) return;
    const song = queueRef.current[indexRef.current];
    if (song) {
      const id = song.id;
      if (!scrobbledRef.current.has(id)) {
        scrobbledRef.current.add(id);
        void scrobble(id, true).catch(() => {});
      }
    }
    // Autoplay controls whether the queue advances after a song ends.
    if (!getSyncSetting("autoplay")) {
      setIsPlaying(false);
      schedulePersist();
      return;
    }
    next();
  };

  const handleError = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== activeAudioRef.current) return;
    const audio = activeAudioRef.current;
    if (audio && audio.getAttribute("src") && queueRef.current.length > 1) {
      next();
    }
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={bindAudio("a")}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />
      <audio
        ref={bindAudio("b")}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider.");
  }
  return context;
}