"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IconCreate, IconPause, IconPlay, IconSettings } from "@/components/icons";
import { getAlbum, getAlbumList2 } from "@/lib/navidrome/albums";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import type { AlbumDetail } from "@/lib/navidrome/albums";
import { usePlayer } from "@/components/player-provider";
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
  titleClass,
}: {
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  onPlay: () => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
  titleClass?: string;
}) {
  return (
    <div className="group relative flex items-center gap-3 rounded-md p-2 hover:bg-[#1f1f1f]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        {image ? (
          <img src={image} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className={cn("h-10 w-10 rounded", titleClass ?? "bg-[#083868]")} />
        )}
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-sm font-medium",
              isCurrent ? "text-[#1ed760]" : "text-white",
            )}
          >
            {title}
          </div>
          <div className="truncate text-xs text-[#b3b3b3]">{subtitle}</div>
        </div>
      </Link>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onPlay();
        }}
        aria-label={`Play ${title}`}
        className="absolute right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#1ed760] opacity-0 shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition group-hover:opacity-100"
      >
        {isCurrent && isPlaying ? (
          <IconPause className="h-4 w-4 fill-black" />
        ) : (
          <IconPlay className="h-4 w-4 fill-black" />
        )}
      </button>
    </div>
  );
}

export function Sidebar() {
  const player = usePlayer();
  const [state, setState] = useState<LoadState>("loading");
  const [connected, setConnected] = useState(false);
  const [albums, setAlbums] = useState<AlbumDetail[]>([]);
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
    getAlbumList2("newest", 5)
      .then((list) =>
        Promise.all(list.map((album) => getAlbum(album.id).catch(() => null))),
      )
      .then((entries) => {
        if (cancelled) return;
        const loaded = entries.filter((entry): entry is AlbumDetail => entry !== null);
        setAlbums(loaded);
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

  const songs = albums.flatMap((entry) => entry.songs).slice(0, 15);

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-black">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg bg-[#121212]">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <span className="text-base font-bold text-white">Your Library</span>
          <button
            type="button"
            aria-label="Create"
            className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#1f1f1f] hover:bg-[#292929]"
          >
            <IconCreate className="h-4 w-4 fill-white" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto px-2 pb-2">
          {state === "loading" && (
            <div className="flex flex-col gap-2 px-2 pt-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md p-2">
                  <div className="h-10 w-10 animate-pulse rounded bg-[#1f1f1f]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#1f1f1f]" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-[#1f1f1f]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {state === "error" && (
            <p className="px-2 pt-2 text-sm text-[#f15e6c]">{error}</p>
          )}

          {state === "ready" && !connected && (
            <div className="flex flex-col gap-3 rounded-lg bg-[#1f1f1f] p-4">
              <span className="text-sm font-bold text-white">Connect your Navidrome</span>
              <p className="text-sm text-white">
                Add your server in Settings to see your library here.
              </p>
              <Link
                href="/settings"
                className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-105"
              >
                Open Settings
              </Link>
            </div>
          )}

          {state === "ready" && connected && (
            <>
              <div className="px-2 pt-1">
                <div className="text-xs font-bold uppercase tracking-widest text-[#b3b3b3]">
                  Recently added albums
                </div>
                <div className="mt-1 flex flex-col">
                  {albums.length === 0 && (
                    <p className="py-2 text-sm text-[#b3b3b3]">No albums yet.</p>
                  )}
                  {albums.map((entry) => (
                    <Row
                      key={entry.album.id}
                      title={entry.album.name}
                      subtitle={entry.album.artist ?? ""}
                      image={coverArtUrl(entry.album.coverArt, 48) ?? undefined}
                      href={`/album/${entry.album.id}`}
                      onPlay={() => player.playQueueAt(entry.songs, 0)}
                    />
                  ))}
                </div>
              </div>

              {songs.length > 0 && (
                <div className="px-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#b3b3b3]">
                    Recently added tracks
                  </div>
                  <div className="mt-1 flex flex-col">
                    {songs.map((song) => (
                      <Row
                        key={song.id}
                        title={song.title}
                        subtitle={song.artist ?? ""}
                        image={coverArtUrl(song.coverArt, 48) ?? undefined}
                        href={song.albumId ? `/album/${song.albumId}` : "/"}
                        onPlay={() => player.playSong(song)}
                        isCurrent={player.current?.id === song.id}
                        isPlaying={player.isPlaying}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3 px-4">
          <Link
            href="/settings"
            className="flex h-8 items-center gap-3 rounded-md px-1 text-sm font-medium text-[#b3b3b3] transition hover:text-white"
          >
            <IconSettings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-between gap-2 px-6 pb-4 pt-8">
          <button
            type="button"
            className="flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-white/70 px-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M1.5 8h13" />
              <path d="M8 1.5c2.4 2.6 2.4 10.4 0 13M8 1.5c-2.4 2.6-2.4 10.4 0 13" />
            </svg>
            English
          </button>
          <span className="text-sm text-[#b3b3b3]">&copy; 2026 Spotify AB</span>
        </div>
      </div>
    </div>
  );
}