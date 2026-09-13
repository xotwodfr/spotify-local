"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Artwork } from "@/components/artwork";
import { IconPause, IconPlay, IconSettings } from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { getAlbum, getAlbumList2 } from "@/lib/navidrome/albums";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import type { NAlbum } from "@/lib/navidrome/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

function Row({
  title,
  subtitle,
  image,
  href,
  onPlay,
  isCurrent,
  isPlaying,
}: {
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  onPlay: () => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
}) {
  return (
    <div className="group relative flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-(--surface-hover)">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80">
        <Artwork src={image} size="xs" shape="thumb" />
        <div className="min-w-0">
          <div className={cn("truncate text-sm font-medium", isCurrent ? "text-(--accent)" : "text-(--fg-primary)")}>{title}</div>
          <div className="truncate text-xs text-(--text-subdued)">{subtitle}</div>
        </div>
      </Link>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onPlay();
        }}
        aria-label={`Play ${title}`}
        className="absolute right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-(--accent) opacity-0 shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
      >
        {isCurrent && isPlaying ? <IconPause className="h-4 w-4 fill-black" /> : <IconPlay className="h-4 w-4 fill-black" />}
      </button>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div className="px-2 text-xs font-bold uppercase tracking-widest text-(--text-subdued)">{children}</div>
  );
}

export function Sidebar() {
  const player = usePlayer();
  const [state, setState] = useState<LoadState>("loading");
  const [connected, setConnected] = useState(false);
  const [recent, setRecent] = useState<NAlbum[]>([]);
  const [recommended, setRecommended] = useState<NAlbum[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSessionInfo().then((info) => {
      setConnected(info.connected);
      if (!info.connected) setState("ready");
    });
  }, []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    Promise.all([getAlbumList2("newest", 3), getAlbumList2("random", 3)])
      .then(([newest, random]) => {
        if (cancelled) return;
        setRecent(newest);
        setRecommended(random.filter((album) => !newest.some((entry) => entry.id === album.id)));
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load your library.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);

  function playAlbum(album: NAlbum) {
    void getAlbum(album.id)
      .then((detail) => {
        if (detail.songs.length) player.playQueueAt(detail.songs, 0);
      })
      .catch(() => {
        // The recommendation remains navigable if playback cannot start.
      });
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-[color-mix(in_oklab,var(--frame)_90%2ctransparent)]">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg bg-(--surface)">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <span className="text-base font-bold text-(--fg-primary)">Your Library</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-2 pb-2">
          {state === "loading" && (
            <div className="flex flex-col gap-2 px-2 pt-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md p-2">
                  <div className="h-10 w-10 animate-pulse rounded bg-(--surface-hover)" />
                  <div className="flex flex-1 flex-col gap-2"><div className="h-3 w-2/3 animate-pulse rounded bg-(--surface-hover)" /><div className="h-3 w-1/3 animate-pulse rounded bg-(--surface-hover)" /></div>
                </div>
              ))}
            </div>
          )}

          {state === "error" && <p className="px-2 pt-2 text-sm text-[#f15e6c]">{error}</p>}

          {state === "ready" && !connected && (
            <div className="flex flex-col gap-3 rounded-lg bg-(--surface-hover) p-4">
              <span className="text-sm font-bold text-(--fg-primary)">Connect your Navidrome</span>
              <p className="text-sm text-(--fg-primary)">Add your server in Settings to see your library here.</p>
              <Link href="/settings" className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-105">Open Settings</Link>
            </div>
          )}

          {state === "ready" && connected && (
            <>
              <div className="px-2 pt-1">
                <SectionHeading>Recently added</SectionHeading>
                <div className="mt-1 flex flex-col">
                  {recent.length === 0 && <p className="py-2 text-sm text-(--text-subdued)">No albums yet.</p>}
                  {recent.map((album) => (
                    <Row
                      key={album.id}
                      title={album.name}
                      subtitle={album.artist ?? "Album"}
                      image={coverArtUrl(album.coverArt, 48) ?? undefined}
                      href={`/album/${album.id}`}
                      onPlay={() => playAlbum(album)}
                      isCurrent={player.current?.albumId === album.id}
                      isPlaying={player.isPlaying}
                    />
                  ))}
                </div>
              </div>

              <div className="px-2">
                <SectionHeading>Recommended</SectionHeading>
                <div className="mt-1 flex flex-col">
                  {recommended.length === 0 && <p className="py-2 text-sm text-(--text-subdued)">Nothing to recommend yet.</p>}
                  {recommended.map((album) => (
                    <Row
                      key={album.id}
                      title={album.name}
                      subtitle={album.artist ?? "Album"}
                      image={coverArtUrl(album.coverArt, 48) ?? undefined}
                      href={`/album/${album.id}`}
                      onPlay={() => playAlbum(album)}
                      isCurrent={player.current?.albumId === album.id}
                      isPlaying={player.isPlaying}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3 px-4">
          <Link href="/settings" className="flex h-8 items-center gap-3 rounded-md px-1 text-sm font-medium text-(--text-subdued) transition-colors hover:text-(--fg-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80">
            <IconSettings className="h-5 w-5 shrink-0" /> Settings
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-between gap-2 px-6 pb-4 pt-8">
          <span className="text-xs text-(--text-subdued)">Navidrome client</span>
        </div>
      </div>
    </div>
  );
}
