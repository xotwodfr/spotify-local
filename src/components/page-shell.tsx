import type { ReactNode } from "react";

import { MobileNav } from "@/components/mobile-nav";
import { NowPlayingBar } from "@/components/now-playing-bar";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

export function PageShell({
  header,
  children,
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid h-full w-full grid-cols-[320px_minmax(0,1fr)] grid-rows-[64px_minmax(0,1fr)_82px] gap-2 bg-[color-mix(in_oklab,var(--frame)_88%,transparent)] p-2 text-(--fg-primary) max-lg:grid-cols-1 max-lg:pb-[58px] max-[640px]:grid-rows-[64px_minmax(0,1fr)_0px] max-[640px]:gap-0 max-[640px]:p-0 max-[640px]:pt-0">
      <div className="col-span-full">
        <TopBar />
      </div>

      <div className="flex max-lg:hidden">
        <Sidebar />
      </div>

      <main className="relative min-w-0 overflow-hidden rounded-lg bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] [backdrop-filter:blur(0)] max-[640px]:rounded-none">
        <div className="relative h-full overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-tint)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--scrollbar-tint) hover:[&::-webkit-scrollbar-thumb]:bg-(--scrollbar-tint)">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-[420px]"
          >
            <div className="ambient-scrim" />
          </div>
          <div className="relative z-[1]">
            {header}
            {children}
          </div>
        </div>
      </main>

      <div className="col-span-full max-[640px]:hidden">
        <NowPlayingBar />
      </div>

      <div className="fixed inset-x-0 bottom-[58px] z-30 hidden max-[640px]:block">
        <NowPlayingBar />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 hidden max-lg:flex">
        <MobileNav />
      </div>
    </div>
  );
}