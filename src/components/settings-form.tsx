"use client";

import { FormEvent, useEffect, useState } from "react";

import { IconSettings } from "@/components/icons";

export interface NavidromeConnection {
  url: string;
  name: string;
  token: string;
  subsonicToken: string;
}

const STORAGE_KEY = "spotify-local/navidrome";

function loadConnection(): NavidromeConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as NavidromeConnection;
  } catch {
    return null;
  }
}

const inputClass =
  "h-10 w-full rounded-md border border-[#727272] bg-[#3e3e3e] px-3 text-sm text-white placeholder:text-[#a7a7a7] outline-none transition focus:border-white";

export function SettingsForm() {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<NavidromeConnection | null>(null);

  useEffect(() => {
    const saved = loadConnection();
    if (saved) {
      setUrl(saved.url);
      setConnection(saved);
    }
  }, []);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/navidrome/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Connection failed.");
        return;
      }
      const next: NavidromeConnection = {
        url,
        name: data.name,
        token: data.token,
        subsonicToken: data.subsonicToken,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setConnection(next);
      setPassword("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    window.localStorage.removeItem(STORAGE_KEY);
    setConnection(null);
    setPassword("");
    setError("");
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-black px-4 py-16">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 flex items-center gap-3 text-2xl font-bold text-white">
          <IconSettings className="h-7 w-7" />
          Settings
        </h1>

        <div className="rounded-xl bg-[#282828] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Navidrome Server</h2>
            {connection && (
              <span className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1ed760]" />
                Connected
              </span>
            )}
          </div>

          {connection ? (
            <div className="flex flex-col gap-6">
              <p className="text-sm text-white">
                Connected as <span className="font-bold">{connection.name}</span> to{" "}
                <span className="font-bold">{connection.url}</span>
              </p>
              <div className="flex flex-col items-start gap-6">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="rounded-full border border-[#727272] px-6 py-2 text-sm font-bold text-white transition hover:scale-105 hover:border-white"
                >
                  Disconnect
                </button>
                <p className="text-xs text-[#a7a7a7]">
                  Your music library will be fetched from this server. Navidrome must be running
                  for playback to work.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="flex flex-col gap-5">
              <div>
                <label htmlFor="nd-url" className="mb-2 block text-sm font-bold text-white">
                  Server URL
                </label>
                <input
                  id="nd-url"
                  type="text"
                  autoComplete="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="http://localhost:4533"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="nd-username" className="mb-2 block text-sm font-bold text-white">
                  Username
                </label>
                <input
                  id="nd-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="nd-password" className="mb-2 block text-sm font-bold text-white">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="nd-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className={`${inputClass} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#b3b3b3] transition hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-md border border-[#f15e6c33] bg-[#f15e6c1a] px-3 py-2 text-sm text-[#f15e6c]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#1ed760] py-3 text-base font-bold text-black transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Connecting…" : "Connect"}
              </button>

              <p className="text-xs text-[#a7a7a7]">
                The connection is verified against the server and only your auth token is stored in
                this browser.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}