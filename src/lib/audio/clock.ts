"use client";

import { useSyncExternalStore } from "react";

/**
 * Module-level playback clock backed by the active <audio> element.
 *
 * High-frequency consumers (progress bar, lyrics engine) read `getTime()` in
 * their own rAF loop or subscribe here directly, instead of receiving
 * `currentTime` through React context — which re-rendered every context
 * consumer several times per second during playback.
 */
class PlaybackClock {
  private element: HTMLAudioElement | null = null;
  private readonly listeners = new Set<ClockListener>();
  private readonly boundElements = new WeakSet<HTMLAudioElement>();

  getElement(): HTMLAudioElement | null {
    return this.element;
  }

  /** Continuous playback position, straight from the media element. */
  getTime(): number {
    return this.element?.currentTime ?? 0;
  }

  /** Duration of the loaded track (0 while unknown). */
  getDuration(): number {
    const value = this.element?.duration;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  /**
   * Point the clock at the element the UI should follow. Called by the player
   * when the active element changes (initial mount, crossfade hand-off).
   */
  setElement(element: HTMLAudioElement | null) {
    if (this.element === element) return;
    this.element = element;
    if (element && this.listeners.size > 0) this.bindElement(element);
    this.emit();
  }

  subscribe = (listener: ClockListener): (() => void) => {
    this.listeners.add(listener);
    if (this.element) this.bindElement(this.element);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Forward the element's time-related events to subscribers. */
  private bindElement(element: HTMLAudioElement) {
    if (this.boundElements.has(element)) return;
    this.boundElements.add(element);
    const forward = () => this.emit();
    for (const event of ["timeupdate", "seeked", "durationchange", "loadedmetadata", "play", "pause", "ended"] as const) {
      element.addEventListener(event, forward);
    }
  }

  private emit() {
    snapshot = { time: this.getTime(), duration: this.getDuration() };
    for (const listener of this.listeners) listener();
  }
}

export const playbackClock = new PlaybackClock();

type ClockListener = () => void;

interface ClockSnapshot {
  time: number;
  duration: number;
}

// Stable snapshot object: getSnapshot must return the same reference until a
// notification produces a new one (a fresh object per call would loop React).
let snapshot: ClockSnapshot = { time: 0, duration: 0 };
const ZERO_SNAPSHOT: ClockSnapshot = { time: 0, duration: 0 };

function getSnapshot(): ClockSnapshot {
  return snapshot;
}

function getServerSnapshot(): ClockSnapshot {
  return ZERO_SNAPSHOT;
}

/**
 * Subscribe to playback time + duration at the media element's own cadence
 * (~4 Hz via `timeupdate`, plus seeks/metadata). Only the calling component
 * re-renders — the rest of the context tree is untouched.
 */
export function usePlaybackClock(): ClockSnapshot {
  return useSyncExternalStore(playbackClock.subscribe, getSnapshot, getServerSnapshot);
}
