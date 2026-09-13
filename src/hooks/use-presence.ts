"use client";

import { useEffect, useRef, useState } from "react";

export type PresenceState = "entering" | "entered" | "exiting";

/**
 * Mount/unmount with an exit transition while keeping the shell mounted long
 * enough for CSS to render its compositor-only exit animation.
 */
export function usePresence(open: boolean, durationMs = 260): PresenceState | "closed" {
  const [state, setState] = useState<PresenceState | "closed">(open ? "entering" : "closed");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const secondRafRef = useRef<number | null>(null);

  useEffect(() => {
    const cancelFrames = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (secondRafRef.current !== null) cancelAnimationFrame(secondRafRef.current);
      rafRef.current = null;
      secondRafRef.current = null;
    };

    if (open) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (state === "closed" || state === "exiting") {
        rafRef.current = requestAnimationFrame(() => setState("entering"));
        return cancelFrames;
      }
      if (state === "entering") {
        rafRef.current = requestAnimationFrame(() => {
          secondRafRef.current = requestAnimationFrame(() => setState("entered"));
        });
        return cancelFrames;
      }
      return cancelFrames;
    }

    if (state === "entered" || state === "entering") {
      // Defer both transitions to the next frame. This avoids a synchronous
      // effect update while still starting the exit from the rendered state.
      rafRef.current = requestAnimationFrame(() => {
        setState("exiting");
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setState("closed");
        }, durationMs);
      });
      return cancelFrames;
    }

    return cancelFrames;
  }, [open, state, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (secondRafRef.current !== null) cancelAnimationFrame(secondRafRef.current);
    };
  }, []);

  return state;
}
