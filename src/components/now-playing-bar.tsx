"use client";

import Link from "next/link";

import {
  IconNext,
  IconPause,
  IconPlay,
  IconPrevious,
  IconRepeat,
  IconShuffle,
  IconVolume,
} from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { coverArtUrl } from "@/lib/navidrome/client";
import { formatDuration } from "@/lib/navidrome/format";
import { cn } from "@/lib/utils";

function ConnectBanner() {
  return (
    <div className="col-span-full h-[82px] bg-black p-2">
      <div className="flex h-[66px] items-center">
        <div className="relative flex flex-1 items-center justify-between gap-6 overflow-hidden rounded-lg bg-[linear-gradient(90deg,#af2896,#509bf5)] px-6 py-2.5">
          <div>
            <div className="text-sm font-bold text-white">
              Connect to your Navidrome server
            </div>
            <div className="text-base text-white max-[640px]:hidden">
              Open Settings and add your server to start listening.
            </div>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-full bg-white px-8 py-2 text-base font-bold text-black transition hover:scale-105"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function IdleBanner() {
  return (
    <div className="col-span-full h-[82px] bg-black p-2">
      <div className="flex h-[66px] items-center">
        <div className="relative flex flex-1 items-center justify-between gap-6 overflow-hidden rounded-lg bg-[linear-gradient(90deg,#af2896,#509bf5)] px-6 py-2.5">
          <div>
            <div className="text-sm font-bold text-white">Pick a song to start listening.</div>
            <div className="text-base text-white max-[640px]:hidden">
              Your music is waiting for you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NowPlayingBar() {
  const player = usePlayer();

  if (!player.connected) {
    return <ConnectBanner />;
  }

  if (!player.current) {
    return <IdleBanner />;
  }

  const song = player.current;
  const art = coverArtUrl(song.coverArt, 120);

  return (
    <div className="col-span-full h-[82px] bg-black p-2">
      <div className="grid h-[66px] grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4 text-white max-lg:grid-cols-[auto_1fr_auto] max-lg:gap-3 max-lg:px-3">
        <div className="flex min-w-0 items-center gap-3">
          {art ? (
            <img src={art} alt="" className="h-14 w-14 rounded object-cover shadow" />
          ) : (
            <div className="h-14 w-14 rounded bg-[#292929]" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{song.title}</div>
            <div className="truncate text-xs text-[#b3b3b3]">{song.artist ?? song.album}</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4 text-[#b3b3b3] max-lg:gap-3">
            <button
              type="button"
              onClick={player.toggleShuffle}
              aria-label="Toggle shuffle"
              className={cn(
                "transition hover:text-white",
                player.shuffle && "text-[#1ed760]",
              )}
            >
              <IconShuffle className="h-4 w-4 fill-current max-lg:hidden" />
            </button>
            <button type="button" onClick={player.previous} aria-label="Previous" className="transition hover:text-white">
              <IconPrevious className="h-4 w-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={player.isPlaying ? "Pause" : "Play"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
            >
              {player.isPlaying ? (
                <IconPause className="h-4 w-4 fill-black" />
              ) : (
                <IconPlay className="h-4 w-4 fill-black" />
              )}
            </button>
            <button type="button" onClick={player.next} aria-label="Next" className="transition hover:text-white">
              <IconNext className="h-4 w-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={player.toggleRepeat}
              aria-label="Toggle repeat"
              className={cn(
                "transition hover:text-white",
                player.repeat !== "off" && "text-[#1ed760]",
              )}
            >
              <IconRepeat className="h-4 w-4 fill-current max-lg:hidden" />
            </button>
          </div>

          <div className="hidden items-center gap-2 text-xs text-[#b3b3b3] lg:flex">
            <span className="w-10 text-right tabular-nums">{formatDuration(player.currentTime)}</span>
            <input
              type="range"
              min={0}
              max={Math.floor(player.duration || 0)}
              step={1}
              value={Math.min(player.currentTime, player.duration || 0)}
              onChange={(event) => player.seek(Number(event.currentTarget.value))}
              className="h-1 w-56 cursor-pointer accent-[#1ed760]"
            />
            <span className="w-10 tabular-nums">{formatDuration(player.duration)}</span>
          </div>
        </div>

        <div className="hidden items-center justify-end gap-2 max-lg:hidden">
          <IconVolume className="h-4 w-4 fill-[#b3b3b3]" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(event) => player.setVolume(Number(event.currentTarget.value))}
            className="h-1 w-24 cursor-pointer accent-[#1ed760]"
          />
        </div>
      </div>
    </div>
  );
}