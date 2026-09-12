import { setServerSession } from "@/lib/navidrome/server-session";

interface NavidromeLoginResponse {
  token: string;
  subsonicToken: string;
  subsonicSalt: string;
  name: string;
  username: string;
  isAdmin?: boolean;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!url || !username || !password) {
    return Response.json(
      { ok: false, error: "Server URL, username, and password are required." },
      { status: 400 },
    );
  }

  let baseUrl: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return Response.json(
        { ok: false, error: "Server URL must use http or https." },
        { status: 400 },
      );
    }
    baseUrl = parsed.toString().replace(/\/+$/, "");
  } catch {
    return Response.json(
      { ok: false, error: 'Invalid server URL. Use the format "http://localhost:4533".' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json(
        { ok: false, error: text.slice(0, 300) || `Server responded with status ${res.status}.` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as NavidromeLoginResponse;
    if (!data.token || !data.subsonicToken) {
      return Response.json(
        { ok: false, error: "Server did not return a valid auth session." },
        { status: 502 },
      );
    }

    await setServerSession({
      url: baseUrl,
      username,
      name: data.name || data.username,
      subsonicToken: data.subsonicToken,
      subsonicSalt: data.subsonicSalt ?? "",
    });

    return Response.json({
      ok: true,
      name: data.name || data.username,
      url: baseUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Connection timed out. Check the server URL and that Navidrome is running."
        : "Could not connect to the Navidrome server.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}