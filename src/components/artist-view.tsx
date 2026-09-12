"use client";

import { useEffect, useState } from "react";

import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { usePlayer } from "@/components/player-provider";
import { ConnectPrompt, ErrorPanel, LoadingCards } from "@/components/states";
import { TrackRow } from "@/components/track-row";
import { IconPlay } from "@/components/icons";
import { getAlbum } from "@/lib/navidrome/albums";
import { getArtist } from "@/lib/navidrome/artists";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import type { NAlbum, NSong } from "@/lib/navidrome/types";
import type { CardItem } from "@/types";

type LoadState = "loading" | "ready" | "error";

export function ArtistView({ id }: { id: string }) {
  const player = usePlayer();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [albums, setAlbums] = useState<NAlbum[]>([]);
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
    getArtist(id)
      .then((detail) => {
        if (cancelled) return;
        setName(detail.artist.name);
        setImage(
          detail.artist.artistImageUrl?.startsWith("http")
            ? detail.artist.artistImageUrl
            : (coverArtUrl(detail.artist.coverArt, 900) ?? undefined),
        );
        setAlbums(detail.albums);
        return Promise.all(
          detail.albums.map((album) => getAlbum(album.id).catch(() => null)),
        ).then((songLists) => {
          if (cancelled) return;
          setSongs(songLists.flatMap((entry) => (entry ? entry.songs : [])));
          setState("ready");
        });
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

  const albumCards: CardItem[] = albums.map((album) => ({
    id: album.id,
    title: album.name,
    subtitle: album.year ? String(album.year) : "Album",
    image: coverArtUrl(album.coverArt) ?? undefined,
    href: `/album/${album.id}`,
    kind: "album",
  }));

  return (
    <PageShell
      header={
        state === "ready" && connected ? (
          <ArtistHeader
            name={name}
            image={image}
            albumCount={albums.length}
            songCount={songs.length}
            onPlayAll={() => player.playQueueAt(songs, 0)}
            hasSongs={songs.length > 0}
          />
        ) : undefined
      }
    >
      {state === "loading" && <LoadingCards rows={2} />}
      {state === "error" && <ErrorPanel message={error} onRetry={retry} />}
      {state === "ready" && !connected && <ConnectPrompt />}
      {state === "ready" && connected && (
        <section className="px-10 pb-8">
          {songs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold text-white">Popular songs</h2>
              <div className="flex flex-col">
                {songs.slice(0, 12).map((song, index) => (
                  <TrackRow
                    key={song.id}
                    song={song}
                    index={index}
                    onPlay={() => player.playQueueAt(songs, index)}
                    isCurrent={player.current?.id === song.id}
                    isPlaying={player.isPlaying}
                    onAdd={() => player.addToQueue(song)}
                  />
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold text-white">Albums</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-2">
                {albumCards.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {songs.length === 0 && albums.length === 0 && (
            <p className="text-base text-[#b3b3b3]">No music found for this artist.</p>
          )}
        </section>
      )}
    </PageShell>
  );
}

function ArtistHeader({
  name,
  image,
  albumCount,
  songCount,
  onPlayAll,
  hasSongs,
}: {
  name: string;
  image?: string;
  albumCount: number;
  songCount: number;
  onPlayAll: () => void;
  hasSongs: boolean;
}) {
  return (
    <header className="flex items-end gap-6 px-10 pb-8 pt-24">
      {image ? (
        <img
          src={image}
          alt={name}
          className="h-40 w-40 rounded-full object-cover shadow-[0_4px_60px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#1f1f1f]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div className="text-sm font-bold uppercase tracking-widest text-white">Artist</div>
        <h1 className="mt-2 truncate text-6xl font-extrabold leading-none text-white">
          {name}
        </h1>
        <p className="mt-5 text-sm font-medium text-[#b3b3b3]">
          {albumCount} album{albumCount === 1 ? "" : "s"} · {songCount} song
          {songCount === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={onPlayAll}
          disabled={!hasSongs}
          aria-label={hasSongs ? `Play ${name}` : "No songs available"}
          className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#1ed760] text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#3e3e3e] disabled:text-[#b3b3b3]"
        >
          <IconPlay className="h-6 w-6 fill-current" />
        </button>
      </div>
    </header>
  );
}