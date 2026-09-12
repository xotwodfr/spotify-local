"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { usePlayer } from "@/components/player-provider";
import { RailSection } from "@/components/rail-section";
import { ConnectPrompt, EmptyLibrary, ErrorPanel, LoadingCards } from "@/components/states";
import { getAlbumList2 } from "@/lib/navidrome/albums";
import { getArtists } from "@/lib/navidrome/artists";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import { getPlaylists } from "@/lib/navidrome/playlists";
import { getStarred2 } from "@/lib/navidrome/songs";
import type { NAlbum, NArtist, NPlaylist, NSong } from "@/lib/navidrome/types";
import type { Rail } from "@/types";

type LoadState = "loading" | "ready" | "error";

export function HomeContent() {
  const player = usePlayer();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [albums, setAlbums] = useState<NAlbum[]>([]);
  const [artists, setArtists] = useState<NArtist[]>([]);
  const [songs, setSongs] = useState<NSong[]>([]);
  const [playlists, setPlaylists] = useState<NPlaylist[]>([]);
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
    Promise.all([
      getAlbumList2("newest", 17),
      getArtists(),
      getStarred2(),
      getPlaylists(),
    ])
      .then(([nextAlbums, nextArtists, starred, nextPlaylists]) => {
        if (cancelled) return;
        setAlbums(nextAlbums);
        setArtists(nextArtists);
        setSongs(starred.songs);
        setPlaylists(nextPlaylists);
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
  }, [connected, attempt]);

  const rails: Rail[] = [];
  if (albums.length) {
    rails.push({
      id: "recently-added",
      title: "Recently added",
      kind: "album",
      showAllHref: "/search",
      items: albums.map((album) => ({
        id: album.id,
        title: album.name,
        subtitle: album.artist ?? "Album",
        image: coverArtUrl(album.coverArt) ?? undefined,
        href: `/album/${album.id}`,
        kind: "album" as const,
      })),
    });
  }
  if (songs.length) {
    rails.push({
      id: "favorites",
      title: "Favorite songs",
      kind: "track",
      items: songs.map((song) => ({
        id: song.id,
        title: song.title,
        subtitle: song.artist ?? "",
        image: coverArtUrl(song.coverArt) ?? undefined,
        href: song.albumId ? `/album/${song.albumId}` : "/",
        kind: "track" as const,
        onPlay: () => player.playSong(song),
      })),
    });
  }
  if (artists.length) {
    const top = [...artists]
      .sort((a, b) => (b.albumCount ?? 0) - (a.albumCount ?? 0))
      .slice(0, 17);
    rails.push({
      id: "artists",
      title: "Popular artists",
      kind: "artist",
      items: top.map((artist) => ({
        id: artist.id,
        title: artist.name,
        subtitle: "Artist",
        image:
          artist.artistImageUrl?.startsWith("http")
            ? artist.artistImageUrl
            : (coverArtUrl(artist.coverArt, 900) ?? undefined),
        href: `/artist/${artist.id}`,
        kind: "artist" as const,
      })),
    });
  }
  if (playlists.length) {
    rails.push({
      id: "playlists",
      title: "Playlists",
      kind: "playlist",
      items: playlists.map((playlist) => ({
        id: playlist.id,
        title: playlist.name,
        subtitle: `${playlist.songCount ?? 0} songs`,
        image: coverArtUrl(playlist.coverArt) ?? undefined,
        href: `/playlist/${playlist.id}`,
        kind: "playlist" as const,
      })),
    });
  }

  return (
    <PageShell>
      {state === "loading" && <LoadingCards />}
      {state === "error" && (
        <ErrorPanel
          message={error}
          onRetry={() => {
            setState("loading");
            setError("");
            setAttempt((value) => value + 1);
          }}
        />
      )}
      {state === "ready" && !connected && <ConnectPrompt />}
      {state === "ready" && connected && (
        <section className="px-10 pb-8 pt-1">
          <h1 className="sr-only">Home</h1>
          {rails.map((rail) => (
            <RailSection key={rail.id} rail={rail} />
          ))}
          {rails.length === 0 && <EmptyLibrary />}
        </section>
      )}
    </PageShell>
  );
}