# Spec: MediaCard + RailSection (hom.. rails)

Files:
- `src/components/media-card.tsx` — `MediaCard({ item }: { item: CardItem })` (server component)
- `src/components/rail-section.tsx` — `RailSection({ rail }: { rail: Rail })`

## MediaCard
Card width: 196px. Padding 12px. `border-radius:6px`. Background: transparent. NO hover background change.
Structure (flex column, gap 8px):
```
<div className="w-[196px] flex flex-col gap-2 p-3 rounded-[6px] group">
  <div className="relative">          <!-- artwork wrapper -->
    <img                       /* w-full h-full object-cover aspect-square; radius 6px (artist: rounded-full over a w-[172px] h-[172px] wrapper) */
      src={item.image} width={172} height={172} alt={item.title}
      className={cn(round6, item.kind === "artist" && "rounded-full")} />
    <div className="absolute right-2 bottom-2 ..." >  <!-- play button -->
      <button aria-label="Play {item.title}">
        <span className="...">    <!-- inner circle bg #1ed760 -->
          <IconPlay className="fill-black" width={24} height={24} />
        </span>
      </button>
    </div>
    {item.explicit && <ExplicitBadge />}  <!-- bottom-left pill (see behaviors) -->
  </div>
  <div>  <!-- text block -->
    <a href={item.href} className="text text-white text-base group-hover:underline">
      <span className="line-clamp-2">{item.title}</span>
    </a>
    <p className="text-[#b3b3b3] text-sm line-clamp-2">{item.subtitle}</p>
  </div>
</div>
```

### Play button exact styles
Wrapper: `absolute right-2 bottom-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#1ed760] shadow-[0_8px_8px_rgba(0,0,0,0.3)] opacity-0 translate-y-2 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0`.
Button inner span: `flex h-12 w-12 items-center justify-center rounded-full bg-[#1ed760] transition duration-150 ease-out group-hover:scale-105` (encore: transform 0.15s). Icon `<IconPlay className="h-6 w-6 fill-black" />`.

### Explicit badge
`absolute left-2 bottom-2` small pill: `bg-[#292929] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] opacity-0 group-hover:opacity-100 transition` content "E".

### Image layout per kind
- artist: wrapper `h-[172px] w-[172px]` + img `rounded-full object-cover`.
- others: img `aspect-square w-full rounded-[6px] object-cover`.
- Loading placeholder bg: tracks/albums `#083868`, artists `#d83830` — add `bg-[#083868]` / `bg-[#d83830]` on the image element so pre-load looks right.

## RailSection
Section container: `display:grid; row-gap:24px` (per-rail spacing), `margin: 0`.
Header row: `display:flex; align-items:center; justify-content:space-between; height:48px; margin-bottom:8px` (uses `flex` + `mb-2`).
- `<h2 className="text-2xl font-bold text-white">` rail title (SpotifyMixUI bold, 24px/700). Truncate? Keep simple.
- Show all: `<Link>` 14px/700 text #b3b3b3 hover underline — justify-self end. Href = rail.showAllHref.
Body:
```
<div className="relative -mx-10 overflow-hidden">   <!-- margin-inline:-40px -->
  <div className="scroll-smooth overflow-x-auto px-7 grid" style grid: 196px cards → use `grid-flow-col grid-auto-cols-[196px]` with horizontal scroll, gap 0 (padding-left 28px).
```
- Grid rail uses `display:grid; grid-auto-flow:column; grid-auto-columns:196px; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none; &::-webkit-scrollbar{display:none}` + custom OverlayScrollbars-like styling is NICE-TO-HAVE only — default hidden scrollbar acceptable.
- `padding-left:28px` (the 28px = 40px wrapper negative margin cancels contentPadding such that grid origin aligns with contentPadding).
- Each card participates in gap: implict `gap:0; column-gap` — cards should touch edge-to-edge; add `-mr` none. Keep plain.

Heights per rail (fixed grid container height in reference page):
- track: 295px, artist: 250px, album: 292px, radio: 248px, chart: 248px — but these wrap content automatically; set only on the grid wrapper when matching 1440. Provide optional `className` on RailSection? Simpler: don't force heights; rely on natural card height (artwork 172 + 8 gap + text lines). Natural height ≈ 172+8+~46 = 226 for tracks; reference shows 295 due to two text lines + padding in a 196 container. It's fine. (QA can aim.)

## Verification
`npx tsc --noEmit` clean. No client directive needed (pure presentational).