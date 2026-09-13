"use client";

import { IconChevronDown } from "@/components/icons";
import { useLyrics } from "@/components/lyrics-surface";
import { usePlayer } from "@/components/player-provider";
import { usePresence } from "@/hooks/use-presence";
import { useSettings } from "@/lib/settings";

/**
 * Centered, width-constrained lyrics card that rises above the Now Playing
 * bar. The shared `useLyrics` hook supplies data, engine, and content; this
 * shell only adds the centered chrome. Stays mounted through its exit
 * transition (presence-driven), then renders null.
 */
export function LyricsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useSettings();
  const player = usePlayer();
  const presence = usePresence(open, 220);
  const lyrics = useLyrics(undefined, presence !== "closed" && presence !== "exiting");
  const song = player.current;

  if (presence === "closed") return null;

  return (
    <div className="lyrics-overlay">
      <section aria-label="Lyrics" className="lyrics-popout" data-state={presence}>
        {/* Ambient artwork background: soft color fields from the app palette */}
        {settings.backgroundEffects && (
          <div aria-hidden className="lyrics-dynamic-bg">
            <div className="lyrics-dynamic-blob lyrics-dynamic-blob-a" />
            <div className="lyrics-dynamic-blob lyrics-dynamic-blob-b" />
          </div>
        )}
        <div aria-hidden className="lyrics-dynamic-scrim" />

        <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-6 pt-4 max-[640px]:px-5 max-[640px]:pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">Lyrics</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-white/85">
              {song ? `${song.title}${song.artist ? ` — ${song.artist}` : ""}` : "Nothing playing"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="max-[640px]:hidden">{lyrics.picker}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lyrics"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.07] text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <IconChevronDown className="h-4 w-4" />
            </button>
          </div>
        </header>

        {lyrics.content}

        {/* Mobile: provider chip floats at the bottom edge of the card */}
        <div className="absolute inset-x-0 bottom-3 z-20 hidden justify-center px-4 max-[640px]:flex">
          <div className="scale-110 origin-bottom">{lyrics.picker}</div>
        </div>
      </section>
    </div>
  );
}
