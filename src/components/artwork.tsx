import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-10 w-10",
  sm: "h-14 w-14",
  md: "h-14 w-14 max-[640px]:h-10 max-[640px]:w-10",
  lg: "h-40 w-40 max-[640px]:h-36 max-[640px]:w-36",
  xl: "h-44 w-44 max-[640px]:h-36 max-[640px]:w-36",
} as const;

const SHAPES = {
  square: "rounded-[8px]",
  round: "rounded-full",
  thumb: "rounded",
} as const;

export function Artwork({
  src,
  alt = "",
  size = "xs",
  shape = "thumb",
  className,
}: {
  src?: string | null;
  alt?: string;
  size?: keyof typeof SIZES;
  shape?: keyof typeof SHAPES;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className={cn("shrink-0 object-cover", SIZES[size], SHAPES[shape], className)}
    />
  ) : (
    <div aria-hidden className={cn("shrink-0 bg-(--border-color)", SIZES[size], SHAPES[shape], className)} />
  );
}
