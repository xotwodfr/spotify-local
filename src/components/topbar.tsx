import Link from "next/link";
import {
  IconBrowse,
  IconClear,
  IconHome,
  IconSearch,
  SpotifyLogo,
} from "@/components/icons";

function SearchForm() {
  return (
    <form
      role="search"
      className="relative flex h-12 w-[min(474px,40vw)] items-center rounded-full bg-[#1f1f1f]"
    >
      <button
        type="button"
        aria-label="Search"
        className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white"
      >
        <IconSearch width={24} height={24} fill="#fff" />
      </button>
      <input
        type="text"
        placeholder="What do you want to play?"
        className="h-full w-full rounded-full border-0 bg-transparent pl-12 pr-14 text-base text-white outline-none placeholder:text-[#b3b3b3]"
      />
      <div className="absolute right-0 top-0 flex h-12 items-center gap-1 pr-1">
        <kbd className="hidden items-center rounded border-0 px-1.5 py-0.5 text-base text-[#b3b3b3] lg:flex">
          Ctrl
        </kbd>
        <kbd className="hidden items-center rounded border-0 px-1.5 py-0.5 text-base text-[#b3b3b3] lg:flex">
          Shift
        </kbd>
        <kbd className="hidden items-center rounded border-0 px-1.5 py-0.5 text-base text-[#b3b3b3] lg:flex">
          L
        </kbd>
        <button
          type="button"
          aria-label="Browse"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white"
        >
          <IconBrowse width={24} height={24} fill="#fff" />
        </button>
        <button type="button" aria-label="Clear search field" className="hidden">
          <IconClear width={16} height={16} fill="#fff" />
        </button>
      </div>
    </form>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-[#b3b3b3] transition group-hover:fill-white">
      <path d="M8 .75a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V1.5A.75.75 0 0 1 8 .75Z" />
      <path d="M1.5 10.25a.75.75 0 0 1 .75.75v2.5a.5.5 0 0 0 .5.5h10.5a.5.5 0 0 0 .5-.5V11a.75.75 0 0 1 1.5 0v2.5a2 2 0 0 1-2 2H2.75a2 2 0 0 1-2-2V11a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

export function TopBar() {
  return (
    <header className="col-span-full flex h-16 items-center justify-end gap-2 bg-black p-2 md:justify-between">
      <div className="hidden items-center gap-2 md:flex">
        <Link href="/" aria-label="Home" className="flex w-[72px] shrink-0 items-center">
          <SpotifyLogo width={32} height={32} fill="#fff" />
        </Link>
        <button
          type="button"
          aria-label="Home"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f1f1f] text-white"
        >
          <IconHome width={24} height={24} fill="#fff" />
        </button>
        <SearchForm />
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <div className="hidden items-center gap-2 min-[1200px]:flex">
          <button
            type="button"
            className="py-2 text-base font-bold text-[#b3b3b3] transition hover:text-white"
          >
            Premium
          </button>
          <button
            type="button"
            className="py-2 text-base font-bold text-[#b3b3b3] transition hover:text-white"
          >
            Support
          </button>
          <button
            type="button"
            className="py-2 text-base font-bold text-[#b3b3b3] transition hover:text-white"
          >
            Download
          </button>
          <span aria-hidden className="mx-4 h-[25px] w-px bg-white" />
          <a
            href="#"
            className="group flex h-8 items-center rounded-full py-1 pl-9 pr-4 text-sm font-bold text-[#b3b3b3] transition hover:text-white"
          >
            <DownloadIcon />
            Install App
          </a>
        </div>
        <button
          type="button"
          className="py-1 pl-2 pr-4 text-sm font-bold text-[#b3b3b3] transition hover:text-white"
        >
          Sign up
        </button>
        <a
          href="#"
          className="rounded-full bg-white px-8 py-2 text-base font-bold text-black transition hover:scale-[1.04]"
        >
          Log in
        </a>
      </div>
      <div aria-hidden className="h-10 w-10 rounded-full bg-[#e8e6e3] md:hidden" />
    </header>
  );
}