"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { usePlayer } from "@/components/player-provider";
import { ConnectPrompt, ErrorPanel, LoadingCards } from "@/components/states";
import { TrackRow } from "@/components/track-row";
import { IconPlay } from "@/components/icons";
import { getAlbum } from "@/lib/navidrome/albums";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import { formatFullDuration } from "@/lib/navidrome/format";
import type { NAlbum, NSong } from "@/lib/navidrome/types";

type LoadState = "loading" | "ready" | "error";

export function AlbumView({ id }: { id: string }) {
  const player = usePlayer();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [album, setAlbum] = useState<NAlbum | null>(null);
  const [songs, setSongs] = useState<NSong[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void getSessionInfo().then((info) => {
      setConnected(info.connected);
      if (!info.connected) setState("ready");
    });
  }, []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    getAlbum(id)
      .then((detail) => {
        if (cancelled) return;
        setAlbum(detail.album);
        setSongs(detail.songs);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [connected, id, attempt]);

  function retry() {
    setState("loading");
    setError("");
    setAttempt((v) => v + 1);
  }

  const totalDuration = songs.reduce((sum, song) => sum + (song.duration ?? 0), 0);

  return (
    <PageShell
      header={
        state === "ready" && connected && album ? (
          <AlbumHeader
            album={album}
            songCount={songs.length}
            duration={totalDuration}
            onPlayAll={() => player.playQueueAt(songs, 0)}
            hasSongs={songs.length > 0}
          />
        ) : undefined
      }
    >
      {state === "loading" && <LoadingCards rows={1} />}
      {state === "error" && <ErrorPanel message={error} onRetry={retry} />}
      {state === "ready" && !connected && <ConnectPrompt />}
      {state === "ready" && connected && (
        <section className="px-10 pb-8">
          {songs.length > 0 ? (
            <div className="flex flex-col">
              {songs.map((song, index) => (
                <TrackRow
                  key={song.id}
                  song={song}
                  index={index}
                  onPlay={() => player.playQueueAt(songs, index)}
                  isCurrent={player.current?.id === song.id}
                  isPlaying={player.isPlaying}
                  showAlbum={false}
                  onAdd={() => player.addToQueue(song)}
                />
              ))}
            </div>
          ) : (
            <p className="text-base text-[#b3b3b3]">No tracks in this album.</p>
          )}
        </section>
      )}
    </PageShell>
  );
}

function AlbumHeader({
  album,
  songCount,
  duration,
  onPlayAll,
  hasSongs,
}: {
  album: NAlbum;
  songCount: number;
  duration: number;
  onPlayAll: () => void;
  hasSongs: boolean;
}) {
  const art = coverArtUrl(album.coverArt, 480);
  const meta = [
    album.year ? String(album.year) : "",
    `${songCount} song${songCount === 1 ? "" : "s"}`,
    duration > 0 ? formatFullDuration(duration) : "",
  ].filter(Boolean);

  return (
    <header className="flex items-end gap-6 px-10 pb-8 pt-24">
      {art ? (
        <img
          src={art}
          alt={album.name}
          className="h-44 w-44 rounded-[8px] object-cover shadow-[0_4px_60px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <div className="h-44 w-44 rounded-[8px] bg-[#083868]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div className="text-sm font-bold uppercase tracking-widest text-white">Album</div>
        <h1 className="mt-2 truncate text-5xl font-extrabold leading-none text-white">
          {album.name}
        </h1>
        {album.artist && (
          <div className="mt-5 text-base font-bold text-white">
            <Link href={`/artist/${album.artistId}`} className="hover:underline">
              {album.artist}
            </Link>
            {meta.length > 0 && (
              <span className="ml-1 hidden font-medium text-[#b3b3b3] md:inline">
                · {meta.join(" · ")}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onPlayAll}
          disabled={!hasSongs}
          aria-label={hasSongs ? `Play ${album.name}` : "No tracks available"}
          className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#1ed760] text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#3e3e3e] disabled:text-[#b3b3b3]"
        >
          <IconPlay className="h-7 w-7 fill-current" />
        </button>
      </div>
    </header>
  );
}