"use client";

import Link from "next/link";
import { useState } from "react";

import { Artwork } from "@/components/artwork";
import { FloatingLyrics } from "@/components/floating-lyrics";
import { LyricsPanel } from "@/components/lyrics-panel";
import { QueueDrawer } from "@/components/queue-drawer";
import {
  IconDockLyrics,
  IconLyrics,
  IconNext,
  IconQueue,
  IconPause,
  IconPlay,
  IconPrevious,
  IconRepeat,
  IconShuffle,
  IconVolume,
} from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { usePlaybackClock } from "@/lib/audio/clock";
import { coverArtUrl } from "@/lib/navidrome/client";
import { formatDuration } from "@/lib/navidrome/format";
import { cn } from "@/lib/utils";

function ConnectBanner() {
  return (
    <div className="col-span-full h-[82px] bg-[color-mix(in_oklab,var(--frame)_92%2ctransparent)] p-2 max-[640px]:h-[58px] max-[640px]:p-1">
      <div className="flex h-[66px] items-center">
        <div className="relative flex flex-1 items-center justify-between gap-6 overflow-hidden rounded-lg bg-[linear-gradient(90deg,#af2896,#509bf5)] px-6 py-2.5 max-[640px]:rounded-md max-[640px]:px-3 max-[640px]:py-1.5">
          <div>
            <div className="text-sm font-bold text-white">Connect to your Navidrome server</div>
            <div className="text-base text-white max-[640px]:hidden">Open Settings and add your server to start listening.</div>
          </div>
          <Link href="/settings" className="shrink-0 rounded-full bg-white px-8 py-2 text-base font-bold text-black transition hover:scale-105">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function IdleBanner() {
  return (
    <div className="col-span-full h-[82px] bg-[color-mix(in_oklab,var(--frame)_92%2ctransparent)] p-2 max-[640px]:h-[58px] max-[640px]:p-1">
      <div className="flex h-[66px] items-center">
        <div className="relative flex flex-1 items-center justify-between gap-6 overflow-hidden rounded-lg bg-[linear-gradient(90deg,#af2896,#509bf5)] px-6 py-2.5 max-[640px]:rounded-md max-[640px]:px-3 max-[640px]:py-1.5">
          <div>
            <div className="text-sm font-bold text-white">Pick a song to start listening.</div>
            <div className="text-base text-white max-[640px]:hidden">Your music is waiting for you.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NowPlayingBar() {
  const player = usePlayer();
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);

  // Progress bar subscribes to the media element directly — its ~4 Hz ticks
  // no longer re-render the whole bar or any context consumer.
  const { time, duration: clockDuration } = usePlaybackClock();
  const safeDuration = clockDuration || player.duration;

  if (!player.connected) return <ConnectBanner />;
  if (!player.current) return <IdleBanner />;

  const song = player.current;
  const art = coverArtUrl(song.coverArt, 120);

  return (
    <>
      <div className="col-span-full h-[82px] bg-[color-mix(in_oklab,var(--frame)_92%2ctransparent)] p-2 max-[640px]:h-[58px] max-[640px]:p-1">
        <div className="grid h-[66px] grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4 text-(--fg-primary) max-lg:grid-cols-[auto_1fr_auto] max-lg:gap-3 max-lg:px-3 max-[640px]:h-[50px] max-[640px]:gap-2 max-[640px]:px-2">
          <div className="flex min-w-0 items-center gap-3">
            <Artwork src={art} size="md" shape="thumb" className="shadow" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-(--fg-primary)">{song.title}</div>
              <div className="truncate text-xs text-(--text-subdued)">{song.artist ?? song.album}</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-4 text-(--text-subdued) max-lg:gap-3">
              <button type="button" onClick={player.toggleShuffle} aria-label="Toggle shuffle" className={cn("transition hover:text-(--fg-primary)", player.shuffle && "text-(--accent)")}>
                <IconShuffle className="h-4 w-4 fill-current max-lg:hidden" />
              </button>
              <button type="button" onClick={player.previous} aria-label="Previous" className="transition hover:text-(--fg-primary)"><IconPrevious className="h-4 w-4 fill-current" /></button>
              <button type="button" onClick={player.toggle} aria-label={player.isPlaying ? "Pause" : "Play"} className="flex h-8 w-8 items-center justify-center rounded-full bg-(--fg-primary) text-(--frame) transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--frame) max-[640px]:h-7 max-[640px]:w-7">
                {player.isPlaying ? <IconPause className="h-4 w-4 fill-current" /> : <IconPlay className="h-4 w-4 fill-current" />}
              </button>
              <button type="button" onClick={player.next} aria-label="Next" className="transition hover:text-(--fg-primary)"><IconNext className="h-4 w-4 fill-current" /></button>
              <button type="button" onClick={player.toggleRepeat} aria-label="Toggle repeat" className={cn("transition hover:text-(--fg-primary)", player.repeat !== "off" && "text-(--accent)")}>
                <IconRepeat className="h-4 w-4 fill-current max-lg:hidden" />
              </button>
            </div>
            <div className="hidden items-center gap-2 text-xs text-(--text-subdued) lg:flex">
              <span className="w-10 text-right tabular-nums">{formatDuration(time)}</span>
              <input type="range" min={0} max={Math.floor(safeDuration || 0)} step={1} value={Math.min(time, safeDuration || 0)} onChange={(event) => player.seek(Number(event.currentTarget.value))} className="h-1 w-56 cursor-pointer accent-(--accent)" />
              <span className="w-10 tabular-nums">{formatDuration(safeDuration)}</span>
            </div>
          </div>          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setQueueOpen(false); setLyricsOpen((open) => !open); }} aria-label={lyricsOpen ? "Close lyrics" : "Open lyrics"} aria-pressed={lyricsOpen} title={lyricsOpen ? "Close lyrics" : "Lyrics panel"} className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80",
                lyricsOpen
                  ? "bg-(--accent) text-black hover:bg-(--accent-hover)"
                  : "text-(--text-subdued) hover:text-(--fg-primary)",
              )}>
              <IconLyrics className="h-4 w-4 fill-current" />
            </button>
            <button type="button" onClick={() => { setLyricsOpen(false); setFloatingOpen((open) => !open); }} aria-label={floatingOpen ? "Close floating lyrics" : "Open floating lyrics"} aria-pressed={floatingOpen} title="Floating lyrics window" className={cn(
                "hidden h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 lg:flex",
                floatingOpen
                  ? "bg-(--accent) text-black hover:bg-(--accent-hover)"
                  : "text-(--text-subdued) hover:text-(--fg-primary)",
              )}>
              <IconDockLyrics className="h-4 w-4 fill-current" />
            </button>
            <button type="button" onClick={() => { setLyricsOpen(false); setQueueOpen((open) => !open); }} aria-label={queueOpen ? "Close queue" : "Open queue"} aria-pressed={queueOpen} title={queueOpen ? "Close queue" : "Queue"} className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80",
                queueOpen
                  ? "bg-(--accent) text-black hover:bg-(--accent-hover)"
                  : "text-(--text-subdued) hover:text-(--fg-primary)",
              )}>
              <IconQueue className="h-4 w-4 fill-current" />
            </button>
            <div className="hidden items-center gap-2 max-lg:flex">
              <IconVolume className="h-4 w-4 fill-[#b3b3b3]" />
              <input type="range" min={0} max={1} step={0.01} value={player.volume} onChange={(event) => player.setVolume(Number(event.currentTarget.value))} className="h-1 w-24 cursor-pointer accent-(--accent)" />
            </div>
          </div>
        </div>
      </div>
      {lyricsOpen && <LyricsPanel onClose={() => setLyricsOpen(false)} />}
      {floatingOpen && <FloatingLyrics onClose={() => setFloatingOpen(false)} />}
      {queueOpen && <QueueDrawer onClose={() => setQueueOpen(false)} />}
    </>
  );
}
