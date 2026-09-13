"use client";

import { useEffect, useRef, useState } from "react";

export type PresenceState = "entering" | "entered" | "exiting";

/**
 * Mount/unmount with an exit transition.
 *
 * `open` rising mounts the content in the "entering" state; two frames later
 * it flips to "entered", letting a CSS transition play from the hidden
 * styles. `open` falling flips to "exiting" and keeps the content mounted
 * for `durationMs`, so the reverse transition plays before unmount.
 */
export function usePresence(open: boolean, durationMs = 260): PresenceState | "closed" {
  const [state, setState] = useState<PresenceState | "closed">(open ? "entering" : "closed");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Opening: cancel any pending unmount, then play the enter transition.
    if (open) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (state === "closed") setState("entering");
      if (state === "entering") {
        const raf = requestAnimationFrame(() => {
          requestAnimationFrame(() => setState("entered"));
        });
        return () => cancelAnimationFrame(raf);
      }
      return;
    }
    // Closing: schedule the unmount. Runs once (state is still entered/
    // entering); the state change to "exiting" re-runs this effect, which
    // must NOT clear the pending timer or the unmount never happens.
    if (state === "entered" || state === "entering") {
      setState("exiting");
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setState("closed");
      }, durationMs);
    }
  }, [open, state, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return state;
}
