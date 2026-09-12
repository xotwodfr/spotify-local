import { cookies } from "next/headers";

export const SESSION_COOKIE = "nd-session";

export interface ServerSession {
  url: string;
  username: string;
  name: string;
  subsonicToken: string;
  subsonicSalt: string;
}

const SESSION_TTL = 60 * 60 * 24 * 365;

export async function getServerSession(): Promise<ServerSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<ServerSession>;
    if (
      typeof parsed.url === "string" &&
      typeof parsed.username === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.subsonicToken === "string" &&
      typeof parsed.subsonicSalt === "string"
    ) {
      return parsed as ServerSession;
    }
  } catch {
    // Invalid cookie value, treat as unauthenticated.
  }
  return null;
}

export async function setServerSession(session: ServerSession): Promise<void> {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  store.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function clearServerSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}