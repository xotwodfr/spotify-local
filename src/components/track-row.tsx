"use client";

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

export function TrackRow({
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
        "group grid h-14 items-center gap-4 rounded-md px-3 text-[#b3b3b3] hover:bg-[#1f1f1f]",
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
            className="text-[#1ed760]"
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
              className="hidden group-hover:block"
            >
              <IconPlay className="h-4 w-4 fill-white" />
            </button>
          </>
        )}
      </div>

      <div className="min-w-0">
        <div className={cn("truncate text-base text-white", isCurrent && "text-[#1ed760]")}>
          {song.title}
        </div>
        {song.artist && (
          <div className="truncate text-sm text-[#b3b3b3]">{song.artist}</div>
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
            className="hidden text-[#b3b3b3] transition hover:text-white group-hover:block"
          >
            <IconCreate className="h-4 w-4 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}