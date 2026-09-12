import Link from "next/link";

import { MediaCard } from "@/components/media-card";
import type { Rail } from "@/types";

export function RailSection({ rail }: { rail: Rail }) {
  return (
    <section className="my-0 relative w-full">
      <div className="mb-2 flex h-12 items-center justify-between">
        <h2 className="truncate text-2xl font-bold text-white">{rail.title}</h2>
        <Link href={rail.showAllHref} className="text-sm font-bold text-[#b3b3b3] hover:underline">
          Show all
        </Link>
      </div>
      <div className="-mx-10 overflow-hidden">
        <div className="grid grid-flow-col auto-cols-[196px] gap-0 overflow-x-auto px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rail.items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}