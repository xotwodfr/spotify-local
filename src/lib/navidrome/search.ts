import { subsonicFetch } from "@/lib/navidrome/client";
import type { NAlbum, NArtist, NSong } from "@/lib/navidrome/types";

export interface SearchResults {
  songs: NSong[];
  artists: NArtist[];
  albums: NAlbum[];
}

export async function search3(query: string): Promise<SearchResults> {
  const body = await subsonicFetch<{
    searchResult3?: { song?: NSong[]; artist?: NArtist[]; album?: NAlbum[] };
  }>("search3", {
    query,
    artistCount: 12,
    albumCount: 12,
    songCount: 24,
  });
  return {
    songs: body.searchResult3?.song ?? [],
    artists: body.searchResult3?.artist ?? [],
    albums: body.searchResult3?.album ?? [],
  };
}