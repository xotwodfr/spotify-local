"use client";

import { useEffect, useRef } from "react";

import { Artwork } from "@/components/artwork";
import { IconChevronDown, IconPause, IconPlay } from "@/components/icons";
import { useOrganicGlow } from "@/components/organic-glow";
import { usePlayer } from "@/components/player-provider";
import { coverArtUrl } from "@/lib/navidrome/client";
import { cn } from "@/lib/utils";

export function QueueDrawer({ onClose }: { onClose: () => void }) {
  const player = usePlayer();
  const activeRef = useRef<HTMLDivElement | null>(null);
  const currentRow = player.index >= 0 ? player.queue[player.index] : undefined;
  const { glowRef, hostRef } = useOrganicGlow<HTMLDivElement>(Boolean(currentRow));
  const hostRefCallback = useRef<(node: HTMLDivElement | null) => void>(() => {});

  useEffect(() => {
    hostRefCallback.current = hostRef;
  }, [hostRef]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [player.index]);

  return (
    <section
      aria-label="Queue"
      className="fixed inset-x-4 bottom-[98px] top-24 z-50 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-(--panel)/[.985] shadow-[0_24px_70px_rgba(0,0,0,.6)] backdrop-blur-2xl max-[640px]:inset-x-2 max-[640px]:bottom-[124px] max-[640px]:top-20"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4 max-[640px]:px-4 max-[640px]:py-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-(--text-subdued)">Queue</p>
          <p className="mt-1 truncate text-sm font-bold text-(--fg-primary)">{player.queue.length} song{player.queue.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          {player.queue.length > 0 && (
            <button
              type="button"
              onClick={player.clearQueue}
              className="rounded-full border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] px-4 py-1.5 text-xs font-bold text-(--fg-primary) transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close queue" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--text-subdued) transition-colors hover:bg-white/10 hover:text-(--fg-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80">
            <IconChevronDown className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:thin] max-[640px]:px-3 max-[640px]:py-5">
        {currentRow && (
          <div
            ref={glowRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-0 h-[140px] w-[320px] opacity-70 blur-xl will-change-transform"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(30,215,96,0.32) 0%, rgba(30,215,96,0.14) 48%, rgba(30,215,96,0) 72%)",
            }}
          />
        )}

        {player.queue.length === 0 && (
          <p className="py-16 text-center text-base text-(--text-subdued)">Your queue is empty. Play something to build it.</p>
        )}

        <div className="flex flex-col">
          {player.queue.map((song, index) => {
            const isCurrent = index === player.index;
            return (
              <div
                key={`${song.id}-${index}`}
                ref={(node) => {
                  if (isCurrent) {
                    activeRef.current = node;
                    hostRefCallback.current(node);
                  }
                }}
                className={cn(
                  "group relative z-10 grid h-14 items-center gap-3 rounded-md px-3 transition-colors",
                  isCurrent ? "bg-(--surface-raised)/80" : "hover:bg-(--surface-hover)",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isCurrent) player.playQueueAt(player.queue, index);
                    else player.toggle();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
                >
                  <div className="relative shrink-0">
                    <Artwork src={coverArtUrl(song.coverArt, 96) ?? undefined} size="xs" />
                    <span className={cn("absolute inset-0 flex items-center justify-center rounded bg-black/60 opacity-0 transition-opacity group-hover:opacity-100", isCurrent && "opacity-100")}>
                      {isCurrent && player.isPlaying ? (
                        <IconPause className="h-4 w-4 fill-[#ffffff]" />
                      ) : (
                        <IconPlay className="h-4 w-4 fill-[#ffffff]" />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className={cn("truncate text-sm font-medium", isCurrent ? "text-(--accent)" : "text-(--fg-primary)")}>{song.title}</div>
                    <div className="truncate text-xs text-(--text-subdued)">{song.artist ?? song.album ?? ""}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => player.removeFromQueue(index)}
                  aria-label={`Remove ${song.title} from queue`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-(--text-subdued) opacity-0 transition-opacity hover:text-(--fg-primary) focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
