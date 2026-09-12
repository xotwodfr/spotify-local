"use client";

import Link from "next/link";

import { IconSettings } from "@/components/icons";

export function ConnectPrompt() {
  return (
    <section className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#1f1f1f]">
        <IconSettings className="h-9 w-9 fill-none stroke-current text-[#b3b3b3]" />
      </div>
      <h2 className="text-3xl font-bold text-white">Connect your Navidrome server</h2>
      <p className="mt-3 max-w-sm text-base text-[#b3b3b3]">
        Add your server in Settings and we&apos;ll load your library — albums, artists,
        playlists and favorites — right here.
      </p>
      <Link
        href="/settings"
        className="mt-7 rounded-full bg-[#1ed760] px-8 py-3 text-base font-bold text-black transition hover:scale-105"
      >
        Open Settings
      </Link>
    </section>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="text-3xl font-bold text-white">Could not reach Navidrome</h2>
      <p className="mt-3 max-w-md text-base text-[#b3b3b3]">{message}</p>
      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-[#1ed760] px-8 py-3 text-base font-bold text-black transition hover:scale-105"
        >
          Retry
        </button>
        <Link
          href="/settings"
          className="rounded-full border border-[#727272] px-8 py-3 text-base font-bold text-white transition hover:scale-105 hover:border-white"
        >
          Settings
        </Link>
      </div>
    </section>
  );
}

export function EmptyLibrary() {
  return (
    <section className="flex h-full min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="text-2xl font-bold text-white">Your library is empty</h2>
      <p className="mt-2 max-w-md text-[#b3b3b3]">
        Add music to Navidrome and it will show up here. Star tracks or create playlists
        in Navidrome to see them.
      </p>
    </section>
  );
}

export function LoadingCards({ rows = 3 }: { rows?: number }) {
  return (
    <section className="px-10 pb-8 pt-1" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="mb-6 last:mb-0">
          <div className="mb-2 h-8 w-52 animate-pulse rounded bg-[#292929]" />
          <div className="-mx-10 overflow-hidden">
            <div className="flex gap-0 overflow-x-auto px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 6 }, (_, col) => (
                <div
                  key={col}
                  className="h-40 w-40 shrink-0 animate-pulse rounded-md bg-[#292929]"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}