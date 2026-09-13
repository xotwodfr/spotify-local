"use client";

import { memo } from "react";

import { IconCreate, IconPause, IconPlay } from "@/components/icons";
import { formatDuration } from "@/lib/navidrome/format";
import type { NSong } from "@/lib/navidrome/types";
import { cn } from "@/lib/utils";

interface TrackRowProps {
  song: NSong;
  index: number;
  onPlay: () => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
  showAlbum?: boolean;
  onAdd?: () => void;
}

// Memoized: long album/playlist/queue lists render many rows; rows only need
// to re-render when their own props change.
export const TrackRow = memo(function TrackRow({
  song,
  index,
  onPlay,
  isCurrent = false,
  isPlaying = false,
  showAlbum = true,
  onAdd,
}: TrackRowProps) {
  return (
    <div
      className={cn(
        "group grid h-14 items-center gap-4 rounded-md px-3 text-(--text-subdued) transition-colors hover:bg-(--surface-raised) focus-within:bg-(--surface-raised)",
        showAlbum
          ? "grid-cols-[24px_minmax(0,4fr)_minmax(0,3fr)_64px_32px]"
          : "grid-cols-[24px_minmax(0,1fr)_64px_32px]",
      )}
    >
      <div className="flex items-center justify-center">
        {isCurrent ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
            className="rounded-sm text-(--accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
          >
            {isPlaying ? (
              <IconPause className="h-4 w-4 fill-current" />
            ) : (
              <IconPlay className="h-4 w-4 fill-current" />
            )}
          </button>
        ) : (
          <>
            <span className="w-4 text-center text-base tabular-nums group-hover:hidden">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={onPlay}
              aria-label={`Play ${song.title}`}
              className="hidden rounded-sm group-hover:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
            >
              <IconPlay className="h-4 w-4 fill-[#ffffff]" />
            </button>
          </>
        )}
      </div>

      <div className="min-w-0">
        <div className={cn("truncate text-sm text-(--fg-primary)", isCurrent && "text-(--accent)")}>
          {song.title}
        </div>
        {song.artist && (
          <div className="truncate text-xs text-(--text-subdued)">{song.artist}</div>
        )}
      </div>

      {showAlbum && <div className="truncate text-sm">{song.album}</div>}

      <div className="text-sm tabular-nums">{formatDuration(song.duration)}</div>

      <div className="flex items-center justify-end">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${song.title} to queue`}
            className="hidden rounded-sm text-(--text-subdued) transition-colors hover:text-(--fg-primary) group-hover:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
          >
            <IconCreate className="h-4 w-4 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
});