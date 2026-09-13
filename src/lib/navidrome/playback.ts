import { subsonicFetch } from "@/lib/navidrome/client";
import type { NPlayQueue } from "@/lib/navidrome/types";

// Quality-aware stream URLs live in client.ts (they honor the playback
// quality setting); re-expose here so player code keeps its import path.
export { streamUrl } from "@/lib/navidrome/client";

export async function getPlayQueue(): Promise<NPlayQueue | null> {
  const body = await subsonicFetch<{ playQueue?: NPlayQueue }>("getPlayQueue");
  return body.playQueue ?? null;
}

export interface QueueSave {
  songIds: string[];
  current?: string;
  position?: number;
}

export async function savePlayQueue(opts: QueueSave): Promise<void> {
  const params: Record<string, string | number | undefined> = {
    songIds: opts.songIds.join(","),
    position: opts.position ?? 0,
  };
  if (opts.current) params.id = opts.current;
  await subsonicFetch("savePlayQueue", params);
}

export async function scrobble(
  id: string,
  submission = true,
  time?: number,
): Promise<void> {
  await subsonicFetch("scrobble", {
    id,
    submission: String(submission),
    time: time ?? Math.floor(Date.now() / 1000),
  });
}

export interface NowPlayingEntry {
  id?: string;
  username?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

export async function getNowPlaying(): Promise<NowPlayingEntry[]> {
  const body = await subsonicFetch<{ nowPlaying?: { entry?: NowPlayingEntry[] } }>(
    "getNowPlaying",
  );
  return body.nowPlaying?.entry ?? [];
}