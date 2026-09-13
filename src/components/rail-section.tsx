import Link from "next/link";

import { MediaCard } from "@/components/media-card";
import type { Rail } from "@/types";

export function RailSection({ rail }: { rail: Rail }) {
  return (
    <section className="relative mb-8 w-full last:mb-0 max-[640px]:mb-7">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-4">
        <h2 className="truncate text-2xl font-bold tracking-tight text-(--fg-primary) max-[640px]:text-xl">{rail.title}</h2>
        {rail.showAllHref && (
          <Link href={rail.showAllHref} className="shrink-0 rounded-md text-sm font-bold text-(--text-subdued) transition-colors hover:text-(--fg-primary) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80">
            Show all
          </Link>
        )}
      </div>
      <div className="-mx-10 overflow-hidden max-[640px]:-mx-6">
        <div className="grid grid-flow-col auto-cols-[196px] gap-0 overflow-x-auto px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[640px]:auto-cols-[164px] max-[640px]:px-5">
          {rail.items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}