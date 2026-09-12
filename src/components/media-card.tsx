"use client";

import { useRouter } from "next/navigation";

import { IconPlay } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { CardItem } from "@/types";

function Cover({ item, className }: { item: CardItem; className: string }) {
  return (
    <div className={className}>
      {item.image ? (
        <img
          src={item.image}
          width={172}
          height={172}
          alt=""
          className="object-cover"
        />
      ) : null}
    </div>
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
    <div className="group w-[196px] flex flex-col gap-2 rounded-[6px] bg-transparent p-3">
      <div className={cn("relative", isArtist && "h-[172px] w-[172px]")}>
        <a href={item.href} aria-label={item.title}>
          <Cover
            item={item}
            className={cn(
              "flex items-center justify-center overflow-hidden",
              isArtist
                ? "h-[172px] w-[172px] rounded-full bg-[#d83830]"
                : "aspect-square w-full rounded-[6px] bg-[#083868]",
            )}
          />
        </a>
        <div className="absolute bottom-2 right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#1ed760] shadow-[0_8px_8px_rgba(0,0,0,0.3)] translate-y-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Play ${item.title}`}
            onClick={playAction}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[#1ed760]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1ed760] transition-transform duration-150 ease-out hover:scale-105">
              <IconPlay className="h-6 w-6 fill-black" />
            </span>
          </button>
        </div>
        {item.explicit && (
          <div className="absolute bottom-2 left-2 z-10 rounded-[3px] bg-[#292929] px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            E
          </div>
        )}
      </div>
      <div>
        <a href={item.href} className="text-base text-white group-hover:underline" aria-label={item.title}>
          <span className="line-clamp-2">{item.title}</span>
        </a>
        <p className="mt-1 line-clamp-2 text-sm text-[#b3b3b3]">{item.subtitle}</p>
      </div>
    </div>
  );
}