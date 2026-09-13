"use client";

import { useEffect, useRef } from "react";

import { usePlayer } from "@/components/player-provider";

/**
 * Global player keyboard shortcuts, Spotify-style:
 *   Space   play/pause (when not typing)
 *   ←/→     seek ∓/±5s
 *   J / L   previous / next track
 */
export function useKeyboardShortcuts() {
  const player = usePlayer();
  const playerRef = useRef(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      const player = playerRef.current;
      switch (event.key) {
        case " ":
          event.preventDefault();
          player.toggle();
          break;
        case "ArrowRight": {
          event.preventDefault();
          player.seek(Math.min(player.getTime() + 5, player.duration || Infinity));
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          player.seek(Math.max(player.getTime() - 5, 0));
          break;
        }
        case "l":
        case "L":
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          player.next();
          break;
        case "j":
        case "J":
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          player.previous();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
