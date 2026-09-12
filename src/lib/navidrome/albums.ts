import { subsonicFetch } from "@/lib/navidrome/client";
import type { NAlbum, NSong } from "@/lib/navidrome/types";

export type AlbumListType =
  | "random"
  | "newest"
  | "highest"
  | "frequent"
  | "recent"
  | "starred"
  | "alphabeticalByName"
  | "alphabeticalByArtist";

export async function getAlbumList2(
  type: AlbumListType = "newest",
  size = 20,
  offset = 0,
): Promise<NAlbum[]> {
  const body = await subsonicFetch<{ albumList2?: { album?: NAlbum[] } }>(
    "getAlbumList2",
    { type, size, offset },
  );
  return body.albumList2?.album ?? [];
}

export interface AlbumDetail {
  album: NAlbum;
  songs: NSong[];
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const body = await subsonicFetch<{
    album: NAlbum & { song?: NSong[] };
  }>("getAlbum", { id });
  const raw = body.album;
  const album: NAlbum = {
    id: raw.id,
    name: raw.name,
    artist: raw.artist,
    artistId: raw.artistId,
    coverArt: raw.coverArt,
    songCount: raw.songCount,
    duration: raw.duration,
    year: raw.year,
    genre: raw.genre,
    created: raw.created,
    playCount: raw.playCount,
    starred: raw.starred,
  };
  return { album, songs: raw.song ?? [] };
}