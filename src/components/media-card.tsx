"use client";

import { useRouter } from "next/navigation";

import { Artwork } from "@/components/artwork";
import { IconPlay } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { CardItem } from "@/types";

function Cover({ item, className }: { item: CardItem; className: string }) {
  return (
    <Artwork src={item.image} alt="" size="xl" shape={item.kind === "artist" ? "round" : "square"} className={cn("h-full w-full", className)} />
  );
}

export function MediaCard({ item }: { item: CardItem }) {
  const router = useRouter();
  const isArtist = item.kind === "artist";

  const playAction =
    item.onPlay ??
    (() => {
      router.push(item.href);
    });

  return (
    <article className="group w-[196px] rounded-lg bg-transparent p-3 transition-colors hover:bg-(--surface-hover) max-[640px]:w-[164px] max-[640px]:p-2">
      <div className={cn("relative", isArtist ? "h-[172px] w-[172px] max-[640px]:h-[148px] max-[640px]:w-[148px]" : "")}>
        <a href={item.href} aria-label={item.title}>
          <Cover
            item={item}
            className={cn(
              "flex items-center justify-center overflow-hidden",
              isArtist
                ? "h-[172px] w-[172px] rounded-full bg-[#d83830] max-[640px]:h-[148px] max-[640px]:w-[148px]"
                : "aspect-square w-full rounded-[6px] bg-(--accent-deep)",
            )}
          />
        </a>
        <div className="absolute bottom-2 right-2 z-10 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-(--accent) opacity-0 shadow-[0_8px_8px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-[640px]:h-10 max-[640px]:w-10 max-[640px]:translate-y-0 max-[640px]:opacity-100">
          <button
            type="button"
            aria-label={`Play ${item.title}`}
            onClick={playAction}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-(--accent) transition-colors hover:bg-(--accent-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) max-[640px]:h-10 max-[640px]:w-10"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--accent) transition-transform duration-150 ease-out hover:scale-105 max-[640px]:h-10 max-[640px]:w-10">
              <IconPlay className="h-6 w-6 fill-black" />
            </span>
          </button>
        </div>
        {item.explicit && (
          <div className="absolute bottom-2 left-2 z-10 rounded-[3px] bg-(--border-color) px-1.5 py-0.5 text-[10px] font-bold text-(--fg-primary) opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            E
          </div>
        )}
      </div>
      <div>
        <a href={item.href} className="text-base text-(--fg-primary) group-hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--fg-primary)/80 max-[640px]:text-sm" aria-label={item.title}>
          <span className="line-clamp-2">{item.title}</span>
        </a>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-(--text-subdued) max-[640px]:text-xs">{item.subtitle}</p>
      </div>
    </article>
  );
}