export interface SessionInfo {
  connected: boolean;
  url: string;
  name: string;
  defaultUrl: string;
}

export async function getSessionInfo(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/navidrome/session", { cache: "no-store" });
    const data = (await res.json()) as Partial<SessionInfo>;
    return {
      connected: Boolean(data.connected),
      url: data.url ?? "",
      name: data.name ?? "",
      defaultUrl: data.defaultUrl ?? "",
    };
  } catch {
    return { connected: false, url: "", name: "", defaultUrl: "" };
  }
}

export interface ConnectResult {
  ok: boolean;
  name?: string;
  error?: string;
}

export async function connectToNavidrome(opts: {
  url: string;
  username: string;
  password: string;
}): Promise<ConnectResult> {
  try {
    const res = await fetch("/api/navidrome/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; name?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? `Verification failed (${res.status}).` };
    }
    return { ok: true, name: data.name };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export async function disconnectFromNavidrome(): Promise<void> {
  await fetch("/api/navidrome/session", { method: "DELETE" });
}