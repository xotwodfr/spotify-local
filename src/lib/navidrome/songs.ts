import { subsonicFetch } from "@/lib/navidrome/client";
import type { NAlbum, NArtist, NSong } from "@/lib/navidrome/types";

export interface StarredContent {
  songs: NSong[];
  albums: NAlbum[];
  artists: NArtist[];
}

export async function getStarred2(): Promise<StarredContent> {
  const body = await subsonicFetch<{
    starred2?: { song?: NSong[]; album?: NAlbum[]; artist?: NArtist[] };
  }>("getStarred2");
  return {
    songs: body.starred2?.song ?? [],
    albums: body.starred2?.album ?? [],
    artists: body.starred2?.artist ?? [],
  };
}

export async function getSong(id: string): Promise<NSong | null> {
  const body = await subsonicFetch<{ song?: NSong }>("getSong", { id });
  return body.song ?? null;
}