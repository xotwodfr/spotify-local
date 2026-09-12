import Link from "next/link";

import { IconCreate, IconSettings } from "@/components/icons";

const LEGAL_LINKS = [
  "Legal",
  "Safety & Privacy Center",
  "Privacy Policy",
  "About Ads",
  "Accessibility",
  "Cookies",
];

export function Sidebar() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-black">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg bg-[#121212]">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <span className="text-base font-bold text-white">Your Library</span>
          <button
            type="button"
            aria-label="Create"
            className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#1f1f1f] hover:bg-[#292929]"
          >
            <IconCreate className="h-4 w-4 fill-white" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-2 pb-2">
          <div className="flex flex-col gap-5 rounded-lg bg-[#1f1f1f] p-5">
            <span className="text-base font-bold text-white">Create your first playlist</span>
            <p className="text-sm text-white">It&apos;s easy, we&apos;ll help you</p>
            <button
              type="button"
              className="w-fit rounded-full bg-white px-4 py-3 text-sm font-bold text-black transition hover:scale-105"
            >
              Create playlist
            </button>
          </div>

          <div className="flex flex-col gap-5 rounded-lg bg-[#1f1f1f] p-5">
            <span className="text-base font-bold text-white">
              Let&apos;s find some podcasts to follow
            </span>
            <p className="text-sm text-white">We&apos;ll keep you updated on new episodes</p>
            <button
              type="button"
              className="w-fit rounded-full border border-[#8a5cf6] bg-transparent px-4 py-3 text-sm font-bold text-[#8a5cf6] transition hover:bg-[#8a5cf61a]"
            >
              Browse podcasts
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-3 px-4">
          <Link
            href="/settings"
            className="flex h-8 items-center gap-3 rounded-md px-1 text-sm font-medium text-[#b3b3b3] transition hover:text-white"
          >
            <IconSettings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3 px-6 pb-4 pt-8">
          <div className="flex flex-wrap">
            {LEGAL_LINKS.map((label) => (
              <span
                key={label}
                className="mb-2 mr-4 text-sm text-[#b3b3b3] hover:text-white"
              >
                {label}
              </span>
            ))}
          </div>

          <button type="button" className="text-xs text-[#b3b3b3] hover:text-white">
            Cookie Settings
          </button>

          <button
            type="button"
            className="mt-2 flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-white/70 px-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M1.5 8h13" />
              <path d="M8 1.5c2.4 2.6 2.4 10.4 0 13M8 1.5c-2.4 2.6-2.4 10.4 0 13" />
            </svg>
            English
          </button>

          <span className="text-sm text-[#b3b3b3]">&copy; 2026 Spotify AB</span>
        </div>
      </div>
    </div>
  );
}