import { subsonicFetch } from "@/lib/navidrome/client";
import type { NPlaylist, NSong } from "@/lib/navidrome/types";

export async function getPlaylists(): Promise<NPlaylist[]> {
  const body = await subsonicFetch<{ playlists?: { playlist?: NPlaylist[] } }>(
    "getPlaylists",
  );
  return body.playlists?.playlist ?? [];
}

export interface PlaylistDetail {
  playlist: NPlaylist;
  songs: NSong[];
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  const body = await subsonicFetch<{
    playlist: NPlaylist & { entry?: NSong[] };
  }>("getPlaylist", { id });
  const raw = body.playlist;
  return { playlist: raw, songs: raw.entry ?? [] };
}