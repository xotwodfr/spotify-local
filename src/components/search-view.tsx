"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { usePlayer } from "@/components/player-provider";
import { ConnectPrompt, ErrorPanel, LoadingCards } from "@/components/states";
import { TrackRow } from "@/components/track-row";
import { getSessionInfo } from "@/lib/navidrome/auth";
import { coverArtUrl } from "@/lib/navidrome/client";
import { search3, type SearchResults } from "@/lib/navidrome/search";
import type { CardItem } from "@/types";

export function SearchView() {
  const player = usePlayer();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const term = query.trim();

  const [connected, setConnected] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loadedFor, setLoadedFor] = useState("");
  const [errorFor, setErrorFor] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void getSessionInfo().then((info) => setConnected(info.connected));
  }, []);

  useEffect(() => {
    if (!connected || !term) return;
    let cancelled = false;
    search3(term)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setLoadedFor(term);
        setErrorFor("");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Search failed.");
        setErrorFor(term);
        setResults(null);
      });
    return () => {
      cancelled = true;
    };
  }, [term, connected, attempt]);

  const loading = connected && term !== "" && loadedFor !== term && errorFor !== term;
  const searching = connected && term !== "";

  return (
    <PageShell>
      <section className="px-10 pb-8 pt-4">
        <h1 className="mb-6 text-3xl font-extrabold text-white">Search</h1>

        {!connected && <ConnectPrompt />}

        {connected && !term && (
          <p className="text-base text-[#b3b3b3]">
            Search your Navidrome library for artists, albums and songs.
          </p>
        )}

        {searching && loading && <LoadingCards rows={2} />}

        {searching && errorFor === term && (
          <ErrorPanel
            message={error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}

        {searching && loadedFor === term && results && (
          <>
            {results.songs.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-2xl font-bold text-white">Songs</h2>
                <div className="flex flex-col">
                  {results.songs.map((song, index) => (
                    <TrackRow
                      key={song.id}
                      song={song}
                      index={index}
                      onPlay={() => player.playQueueAt(results.songs, index)}
                      isCurrent={player.current?.id === song.id}
                      isPlaying={player.isPlaying}
                      onAdd={() => player.addToQueue(song)}
                    />
                  ))}
                </div>
              </section>
            )}

            {results.artists.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-2xl font-bold text-white">Artists</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-2">
                  {results.artists.map((artist) => {
                    const item: CardItem = {
                      id: artist.id,
                      title: artist.name,
                      subtitle: "Artist",
                      image: coverArtUrl(artist.coverArt, 900) ?? undefined,
                      href: `/artist/${artist.id}`,
                      kind: "artist",
                    };
                    return <MediaCard key={artist.id} item={item} />;
                  })}
                </div>
              </section>
            )}

            {results.albums.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-2xl font-bold text-white">Albums</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-2">
                  {results.albums.map((album) => {
                    const item: CardItem = {
                      id: album.id,
                      title: album.name,
                      subtitle: album.artist ?? "",
                      image: coverArtUrl(album.coverArt) ?? undefined,
                      href: `/album/${album.id}`,
                      kind: "album",
                    };
                    return <MediaCard key={album.id} item={item} />;
                  })}
                </div>
              </section>
            )}

            {results.songs.length === 0 &&
              results.artists.length === 0 &&
              results.albums.length === 0 && (
                <p className="text-base text-[#b3b3b3]">
                  No results for &ldquo;{term}&rdquo;.
                </p>
              )}
          </>
        )}
      </section>
    </PageShell>
  );
}