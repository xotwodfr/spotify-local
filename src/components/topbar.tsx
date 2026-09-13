"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef } from "react";

import { IconSearch, IconSettings, SpotifyLogo } from "@/components/icons";

function SearchForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = (inputRef.current?.value ?? "").trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="group relative flex h-12 w-[min(474px,40vw)] items-center rounded-full bg-(--surface-hover) transition-colors hover:bg-(--surface-raised) focus-within:bg-(--surface-raised) focus-within:ring-2 focus-within:ring-(--fg-primary)/80"
    >
      <button
        type="submit"
        aria-label="Search"
        className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-(--text-subdued) transition-colors hover:text-(--fg-primary) focus-visible:outline-none"
      >
        <IconSearch width={24} height={24} fill="#fff" />
      </button>
      <input
        ref={inputRef}
        type="text"
        placeholder="What do you want to play?"
        className="h-full w-full rounded-full border-0 bg-transparent pl-12 pr-4 text-base text-(--fg-primary) outline-none placeholder:text-(--text-subdued)"
      />
    </form>
  );
}

export function TopBar() {
  return (
    <header className="col-span-full flex h-16 items-center justify-between gap-2 bg-[color-mix(in_oklab,var(--frame)_90%2ctransparent)] p-2">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Home" className="flex w-[72px] shrink-0 items-center">
          <SpotifyLogo width={32} height={32} fill="#fff" />
        </Link>
        <SearchForm />
      </div>
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface-hover) text-(--text-subdued) transition-colors hover:bg-(--surface-raised) hover:text-(--fg-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80"
      >
        <IconSettings width={20} height={20} />
      </Link>
    </header>
  );
}
