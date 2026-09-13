"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";

import { IconSettings } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import {
  connectToNavidrome,
  disconnectFromNavidrome,
  getSessionInfo,
} from "@/lib/navidrome/auth";
import { clearLyricsClientCache } from "@/lib/lyrics/client-cache";
import {
  bumpArtVersion,
  useSettings,
  type AnimationMode,
  type BackgroundIntensity,
  type LyricsFontSize,
  type PlaybackQuality,
  type ThemeMode,
} from "@/lib/settings";

const inputClass =
  "h-10 w-full rounded-md border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] bg-(--input-color) px-3 text-sm text-(--fg-primary) placeholder:text-(--text-subdued) outline-none transition focus:border-(--fg-primary)";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-(--border-color) bg-(--surface-raised) p-5">
      <h2 className="mb-4 text-base font-bold text-(--fg-primary)">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 max-sm:flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-4 sm:max-w-[340px]">
        <p className="text-sm font-semibold text-(--fg-primary)">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-(--text-subdued)">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 ${
        checked ? "bg-(--accent)" : "bg-(--input-color)"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-black/70 transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  getLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly T[];
  getLabel: (option: T) => string;
}) {
  return (
    <div className="flex rounded-full border border-(--border-color) bg-(--input-color) p-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 ${
            value === option
              ? "bg-(--accent) text-black"
              : "text-(--text-subdued) hover:text-(--fg-primary)"
          }`}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-36 accent-(--accent)"
      />
      <span className="w-12 text-right text-sm tabular-nums text-(--text-subdued)">
        {value}
        {max <= 16 ? "s" : ""}
      </span>
    </label>
  );
}

export function SettingsForm() {
  const { settings, update } = useSettings();

  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [connectedUrl, setConnectedUrl] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void getSessionInfo().then((info) => {
      if (info.connected) {
        setUrl(info.url);
        setName(info.name);
        setConnectedUrl(info.url);
      } else if (info.defaultUrl) {
        setUrl(info.defaultUrl);
      }
    });
  }, []);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusyText("Connecting…");
    const result = await connectToNavidrome({ url, username, password });
    setBusyText("");
    if (!result.ok) {
      setError(result.error ?? "Connection failed.");
      return;
    }
    setName(result.name ?? username);
    setConnectedUrl(url.trim().replace(/\/+$/, ""));
    setUsername("");
    setPassword("");
  }

  async function handleDisconnect() {
    setBusyText("");
    setError("");
    setNotice("");
    await disconnectFromNavidrome();
    setName(null);
    setConnectedUrl("");
    setPassword("");
  }

  async function handleRecheck() {
    setChecking(true);
    setNotice("");
    setError("");
    const info = await getSessionInfo();
    setChecking(false);
    if (info.connected && info.name) {
      setName(info.name);
      setConnectedUrl(info.url);
      setNotice(`Connection verified — connected as ${info.name}.`);
    } else {
      setError("The saved connection is no longer valid. Please reconnect.");
      await disconnectFromNavidrome();
      setName(null);
      setConnectedUrl("");
    }
  }

  async function handleClearLyrics() {
    setNotice("");
    setError("");
    const clearedClient = clearLyricsClientCache();
    let clearedServer = 0;
    try {
      const res = await fetch("/api/lyrics/cache", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { cleared?: number } | null;
      clearedServer = data?.cleared ?? 0;
    } catch {
      clearedServer = 0;
    }
    setNotice(
      `Cached lyrics cleared: ${clearedClient} in this browser${clearedServer > 0 ? `, ${clearedServer} tracked on the server` : ""}.`,
    );
  }

  function handleClearArtwork() {
    setNotice("");
    setError("");
    bumpArtVersion();
    setNotice("Artwork cache cleared — cover images will refresh.");
  }

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8 max-[640px]:px-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-(--fg-primary)">
          <IconSettings className="h-7 w-7" />
          Settings
        </h1>

        <Section title="Appearance">
          <Row label="Theme" description="Dynamic tints the whole app from the current album artwork. System follows your OS theme.">
            <Segmented<ThemeMode>
              value={settings.theme}
              onChange={(next) => update({ theme: next })}
              options={["dynamic", "dark", "light", "system"] as const}
              getLabel={(option) =>
                option === "dynamic" ? "Dynamic" : option[0].toUpperCase() + option.slice(1)
              }
            />
          </Row>

          <Row label="Dynamic colors" description="Derive accent and background tones from the playing album's artwork.">
            <Toggle
              checked={settings.dynamicColors}
              onChange={(next) => update({ dynamicColors: next })}
              label="Dynamic colors"
            />
          </Row>

          <Row label="Ambient background" description="Subtle color field reacting to the artwork behind the whole app.">
            <Toggle
              checked={settings.backgroundEffects}
              onChange={(next) => update({ backgroundEffects: next })}
              label="Ambient background"
            />
          </Row>

          <Row label="Background strength" description="How much the artwork-driven ambient field saturates the background.">
            <Segmented<BackgroundIntensity>
              value={settings.backgroundIntensity}
              onChange={(next) => update({ backgroundIntensity: next })}
              options={["subtle", "balanced", "strong"] as const}
              getLabel={(option) => option[0].toUpperCase() + option.slice(1)}
            />
          </Row>

          <Row label="Animations" description="Full keeps smooth motion effects; reduced respects small-motion screens; off disables them.">
            <Segmented<AnimationMode>
              value={settings.animations}
              onChange={(next) => update({ animations: next })}
              options={["full", "reduced", "off"] as const}
              getLabel={(option) =>
                option === "full" ? "Full" : option === "reduced" ? "Reduced" : "Off"
              }
            />
          </Row>
        </Section>

        <Section title="Playback">
          <Row label="Playback quality" description="Straight from the server. High = up to 320 kbps, low = up to 128 kbps; original uses the stored file untouched.">
            <Segmented<PlaybackQuality>
              value={settings.playbackQuality}
              onChange={(next) => update({ playbackQuality: next })}
              options={["original", "high", "medium", "low"] as const}
              getLabel={(option) => option[0].toUpperCase() + option.slice(1)}
            />
          </Row>

          <Row label="Crossfade" description="Seconds of fade between tracks during playback (0 disables it).">
            <Slider
              value={settings.crossfade}
              min={0}
              max={8}
              step={0.5}
              onChange={(next) => update({ crossfade: next })}
              label="Crossfade seconds"
            />
          </Row>

          <Row label="Autoplay" description="Automatically advance to the next track when one finishes.">
            <Toggle
              checked={settings.autoplay}
              onChange={(next) => update({ autoplay: next })}
              label="Autoplay"
            />
          </Row>
        </Section>

        <Section title="Lyrics">
          <Row label="Word-synced lyrics" description="Show per-word highlighting when the provider supplies real word timing.">
            <Toggle
              checked={settings.wordSyncedLyrics}
              onChange={(next) => update({ wordSyncedLyrics: next })}
              label="Word-synced lyrics"
            />
          </Row>

          <Row label="Word highlighting" description="Karaoke-style fill animation on the active line (needs word-synced music).">
            <Toggle
              checked={settings.wordHighlighting}
              onChange={(next) => update({ wordHighlighting: next })}
              label="Word highlighting"
            />
          </Row>

          <Row label="Auto-scroll" description="Follow the singing line automatically. Turn off to browse lyrics freely.">
            <Toggle
              checked={settings.autoScrollLyrics}
              onChange={(next) => update({ autoScrollLyrics: next })}
              label="Auto-scroll lyrics"
            />
          </Row>

          <Row label="Center active lyric" description="Off keeps the active line around the upper third so incoming lines are visible.">
            <Toggle
              checked={settings.centerActiveLyric}
              onChange={(next) => update({ centerActiveLyric: next })}
              label="Center active lyric"
            />
          </Row>

          <Row label="Font size" description="Size of the lyrics text.">
            <Segmented<LyricsFontSize>
              value={settings.lyricsFontSize}
              onChange={(next) => update({ lyricsFontSize: next })}
              options={["sm", "md", "lg", "xl"] as const}
              getLabel={(option) => option.toUpperCase()}
            />
          </Row>

          <Row label="Translations" description="Show translation undertitles when the selected provider includes them.">
            <Toggle
              checked={settings.showTranslation}
              onChange={(next) => update({ showTranslation: next })}
              label="Translations"
            />
          </Row>
        </Section>

        <Section title="Connection">
          {name ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-(--fg-primary)">
                Connected as <span className="font-bold">{name}</span> to{" "}
                <span className="font-bold">{connectedUrl}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleRecheck()}
                  disabled={checking}
                  className="rounded-full border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] px-6 py-2 text-sm font-bold text-(--fg-primary) transition hover:scale-105 hover:border-white disabled:opacity-50"
                >
                  {checking ? "Checking…" : "Re-verify connection"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  className="rounded-full border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] px-6 py-2 text-sm font-bold text-(--fg-primary) transition hover:scale-105 hover:border-white"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="flex flex-col gap-5">
              <div>
                <label htmlFor="nd-url" className="mb-2 block text-sm font-bold text-(--fg-primary)">
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

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="nd-username" className="mb-2 block text-sm font-bold text-(--fg-primary)">
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
                  <label htmlFor="nd-password" className="mb-2 block text-sm font-bold text-(--fg-primary)">
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
                      className={`${inputClass} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-(--text-subdued) transition hover:text-(--fg-primary)"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={busyText !== ""}
                className="rounded-full bg-(--accent) py-3 text-base font-bold text-black transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {busyText || "Connect"}
              </button>

              <p className="text-xs text-(--text-subdued)">
                Your credentials never leave this browser. They are stored as a secured token
                that only talks to your Navidrome server.
              </p>
            </form>
          )}
        </Section>

        <Section title="Cache">
          <Row label="Clear cached lyrics" description="Removes every lyric lookup stored in this browser and on the server. Lyrics re-download on demand.">
            <button
              type="button"
              onClick={() => void handleClearLyrics()}
              className="rounded-full border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] px-5 py-2 text-sm font-bold text-(--fg-primary) transition hover:scale-105 hover:border-white"
            >
              Clear cached lyrics
            </button>
          </Row>

          <Row label="Clear cached artwork" description="Forces cover images to re-download from your server instead of using the cached files.">
            <button
              type="button"
              onClick={handleClearArtwork}
              className="rounded-full border border-[color-mix(in_oklab,var(--fg-primary)_45%,transparent)] px-5 py-2 text-sm font-bold text-(--fg-primary) transition hover:scale-105 hover:border-white"
            >
              Clear cached artwork
            </button>
          </Row>

          {notice && (
            <p role="status" className="rounded-md border border-[#f15e6c33] bg-[#1ed7601a] px-3 py-2 text-sm text-(--fg-primary)/90">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-md border border-[#f15e6c33] bg-[#f15e6c1a] px-3 py-2 text-sm text-[#f15e6c]">
              {error}
            </p>
          )}
        </Section>
      </div>
    </PageShell>
  );
}