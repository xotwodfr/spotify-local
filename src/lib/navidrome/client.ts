import type { SubsonicResponse } from "@/lib/navidrome/types";

export class NavidromeError extends Error {
  status?: number;
  code?: string;
  connected?: boolean;
}

export type SubsonicParams = Record<string, string | number | boolean | undefined>;

function buildQuery(params: SubsonicParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  return search.toString();
}

export function subsonicUrl(endpoint: string, params: SubsonicParams = {}): string {
  const query = buildQuery(params);
  return `/api/navidrome/rest/${endpoint}${query ? `?${query}` : ""}`;
}

export function coverArtUrl(coverArt?: string | null, size = 600): string | null {
  if (!coverArt) return null;
  return subsonicUrl("getCoverArt", { id: coverArt, size });
}

export async function subsonicFetch<T>(
  endpoint: string,
  params: SubsonicParams = {},
): Promise<T> {
  const query = buildQuery(params);
  const res = await fetch(
    `/api/navidrome/rest/${endpoint}${query ? `?${query}` : ""}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: string; code?: string; connected?: boolean }
      | null;
    const err = new NavidromeError(
      payload?.error ?? `Navidrome server error (${res.status}).`,
    );
    err.status = res.status;
    err.code = payload?.code;
    err.connected = payload?.connected;
    throw err;
  }

  const envelope = (await res.json()) as SubsonicResponse<T>;
  const body = envelope["subsonic-response"];
  if (!body || body.status !== "ok") {
    throw new NavidromeError(
      body?.error?.message ?? "Navidrome request failed.",
    );
  }
  return body;
}