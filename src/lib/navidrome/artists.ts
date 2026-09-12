import { subsonicFetch } from "@/lib/navidrome/client";
import type { NAlbum, NArtist, NSong } from "@/lib/navidrome/types";

interface ArtistIndex {
  name: string;
  artist?: NArtist[];
}

export async function getArtists(): Promise<NArtist[]> {
  const body = await subsonicFetch<{
    artists?: { index?: ArtistIndex[] };
  }>("getArtists");
  return (body.artists?.index ?? []).flatMap((entry) => entry.artist ?? []);
}

export interface ArtistDetail {
  artist: NArtist;
  albums: NAlbum[];
  songs: NSong[];
}

export async function getArtist(id: string): Promise<ArtistDetail> {
  const body = await subsonicFetch<{
    artist: NArtist & { album?: NAlbum[]; song?: NSong[] };
  }>("getArtist", { id });
  const raw = body.artist;
  const artist: NArtist = {
    id: raw.id,
    name: raw.name,
    albumCount: raw.albumCount,
    coverArt: raw.coverArt,
    artistImageUrl: raw.artistImageUrl,
  };
  return {
    artist,
    albums: raw.album ?? [],
    songs: raw.song ?? [],
  };
}