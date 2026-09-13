"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { IconClose } from "@/components/icons";
import { useLyrics } from "@/components/lyrics-surface";
import { usePlayer } from "@/components/player-provider";
import { useSettings } from "@/lib/settings";

const POSITION_KEY = "spotify-local/floating-lyrics";
const MIN_WIDTH = 320;
const MIN_HEIGHT = 260;

interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampRect(rect: WindowRect): WindowRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(Math.max(rect.width, MIN_WIDTH), Math.max(MIN_WIDTH, vw - 24));
  const height = Math.min(Math.max(rect.height, MIN_HEIGHT), Math.max(MIN_HEIGHT, vh - 24));
  const x = Math.min(Math.max(rect.x, 8), Math.max(8, vw - width - 8));
  const y = Math.min(Math.max(rect.y, 8), Math.max(8, vh - height - 8));
  return { x, y, width, height };
}

function loadRect(): WindowRect {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return centered();
    const parsed = JSON.parse(raw) as Partial<WindowRect>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return centered();
    }
    return clampRect({ x: parsed.x, y: parsed.y, width: parsed.width, height: parsed.height });
  } catch {
    return centered();
  }
}

function centered(): WindowRect {
  const width = Math.min(640, Math.max(MIN_WIDTH, window.innerWidth - 48));
  const height = Math.min(520, Math.max(MIN_HEIGHT, window.innerHeight - 160));
  return {
    x: (window.innerWidth - width) / 2,
    y: Math.max(24, (window.innerHeight - height) / 2 - 40),
    width,
    height,
  };
}

/**
 * Floating in-app lyrics window: centered by default, dragged by its header,
 * resizable from its bottom-right corner, position/size persisted. Drag and
 * resize write transform/size styles directly during the gesture and commit
 * to React state (and storage) only on pointer-up, so the underlying app
 * never re-renders while the user is interacting.
 */
export function FloatingLyrics({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const player = usePlayer();
  const lyrics = useLyrics();
  const song = player.current;

  // Client-only component (opened by user interaction), so reading storage in
  // the initializer is SSR-safe and needs no post-mount hydration pass.
  const [rect, setRect] = useState<WindowRect>(() => loadRect());

  // Keep the window on-screen when the viewport shrinks.
  useEffect(() => {
    const onResize = () => setRect((current) => clampRect(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(rect));
    } catch {
      // storage unavailable
    }
  }, [rect]);

  const startDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.currentTarget.closest(".floating-lyrics") as HTMLElement | null;
    if (!target) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const base = target.getBoundingClientRect();
    const baseX = base.left;
    const baseY = base.top;
    let nextX = baseX;
    let nextY = baseY;

    const onMove = (moveEvent: PointerEvent) => {
      nextX = baseX + (moveEvent.clientX - startX);
      nextY = baseY + (moveEvent.clientY - startY);
      target.style.left = `${nextX}px`;
      target.style.top = `${nextY}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setRect((current) => clampRect({ ...current, x: nextX, y: nextY }));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget.closest(".floating-lyrics") as HTMLElement | null;
    if (!target) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const base = target.getBoundingClientRect();
    let nextWidth = base.width;
    let nextHeight = base.height;

    const onMove = (moveEvent: PointerEvent) => {
      nextWidth = Math.max(MIN_WIDTH, base.width + (moveEvent.clientX - startX));
      nextHeight = Math.max(MIN_HEIGHT, base.height + (moveEvent.clientY - startY));
      target.style.width = `${nextWidth}px`;
      target.style.height = `${nextHeight}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setRect((current) => clampRect({ ...current, width: nextWidth, height: nextHeight }));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // Escape closes; the header is the drag handle.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const style = useMemo<React.CSSProperties>(
    () => ({ left: rect.x, top: rect.y, width: rect.width, height: rect.height }),
    [rect],
  );

  return (
    <div
      className="floating-lyrics"
      role="dialog"
      aria-label="Floating lyrics"
      style={style}
    >
      {settings.backgroundEffects && (
        <div aria-hidden className="lyrics-dynamic-bg">
          <div className="lyrics-dynamic-blob lyrics-dynamic-blob-a" />
          <div className="lyrics-dynamic-blob lyrics-dynamic-blob-b" />
        </div>
      )}
      <div aria-hidden className="lyrics-dynamic-scrim" />

      <div
        onPointerDown={startDrag}
        onDoubleClick={onClose}
        className="relative z-20 flex shrink-0 cursor-grab items-center justify-between gap-2 rounded-t-[18px] px-4 py-3 active:cursor-grabbing"
      >
        <div className="pointer-events-none min-w-0 select-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">Lyrics</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white/85">
            {song ? `${song.title}${song.artist ? ` — ${song.artist}` : ""}` : "Nothing playing"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="pointer-events-auto">{lyrics.picker}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close floating lyrics"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.07] text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {lyrics.content}

      <div
        onPointerDown={startResize}
        role="separator"
        aria-label="Resize lyrics window"
        className="absolute bottom-0 right-0 z-30 flex h-6 w-6 cursor-nwse-resize items-end justify-end rounded-tl-md p-1 text-white/35 hover:text-white/70"
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden>
          <circle cx="8.5" cy="1.5" r="1" /><circle cx="8.5" cy="5" r="1" /><circle cx="5" cy="8.5" r="1" />
          <circle cx="8.5" cy="8.5" r="1" /><circle cx="5" cy="5" r="1" /><circle cx="1.5" cy="8.5" r="1" />
        </svg>
      </div>
    </div>
  );
}
