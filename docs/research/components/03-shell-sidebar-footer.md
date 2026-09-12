# Spec: Sidebar, NowPlayingBar (PreviewBanner), Footer, AppShell

Files:
- `src/components/sidebar.tsx` — `Sidebar` (server component)
- `src/components/now-playing-bar.tsx` — `NowPlayingBar` incl. `PreviewBanner`
- `src/components/footer.tsx` — `Footer`
- `src/components/mobile-nav.tsx` — `MobileNav` (mobile bottom tabs; client-lite, static)
- `src/app/page.tsx` — assemble: shell grid + `<TopBar/>` + `<Sidebar/>` + main scroll panel + `<NowPlayingBar/>` (+ `<MobileNav/>`)

## AppShell grid (page.tsx)
```
<div className="grid h-screen w-screen gap-2 p-2 grid-rows-[64px_1fr_82px] grid-cols-[320px_1fr_40px] bg-black">
  <TopBar />                  <!-- col 1/-1 row 1 -->
  <Sidebar />                 <!-- col 1 row 2 -->
  <main-panel />              <!-- col 2 row 2 -->
  <RightColumn />             <!-- col 3 row 2: 40px bg-[#121212] rounded-lg -->
  <NowPlayingBar />           <!-- col 1/-1 row 3 -->
</div>
```
Main panel: `rounded-lg bg-[#121212] overflow-hidden relative`; inside a scroll node `.overflow-y-auto` with:
```
<div className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
     style gradient → use arbitrary bg class: bg-[linear-gradient(rgba(0,0,0,0.6)_0%,rgb(18,18,18)_100%)] /> 
<!-- plus noise overlay: optional inline opacity layer -->
<div className="relative">
  <section className="px-10 pt-1 pb-8">    <!-- contentSpacing -->
    <h1 className="sr-only">Home</h1>
    {rails.map(r => <RailSection key rail={r} />)}
  </section>
  <Footer />
</div>
```
RightColumn: `<div className="hidden xl:block rounded-lg bg-[#121212]" />` (only shows ≥1280).

## Sidebar
Container: `flex flex-col gap-2 rounded-lg bg-black` (col 2 of shell = full height).
Preview Library panel: `flex flex-col gap-2 flex-1 bg-[#121212] rounded-lg overflow-hidden relative`.
- Header: `flex items-center justify-between px-4 pt-4 pb-2`:
  - `<span className="text-base font-bold text-white">Your Library</span>`
  - Create icon button: 35×35, `rounded-full bg-[#1f1f1f]`, aria-label "Create", icon `<IconCreate fill="#fff" width={16} height={16} />`. It has hover: bg #292929.
- Scroll body `overflow-hidden overflow-y-auto px-2 pb-2 flex flex-col gap-2` (OverlayScrollbars not required):
  1. Empty-state card (create playlist): `flex flex-col gap-5 rounded-lg bg-[#1f1f1f] p-5`:
     - `<h2>Aance class=(span) text-white text-base font-bold>` Create your first playlist
     - `<p className="text-sm text-white">It's easy, we'll help you</p>`
     - `<button className="max-w-max rounded-full bg-white px-4 py-3 text-sm font-bold text-black hover:scale-105 transition">Create playlist</button>` (padding: 3px 15px; border-radius 9999)
  2. Empty-state card (podcasts): same bg/padding/gap:
     - `Let's find some podcasts to follow` (text-white 16px/700) + `We'll keep you updated on new episodes` (14px #fff)
     - `<button className="max-w-max rounded-full border border-[#1ed760]? no— bg-transparent text-[#8a5cf6] hover:bg-white/10 ... px-4 py-3 text-sm font-bold">Browse podcasts</button>`
       Actual: text #8a5cf6, border 1px #8a5cf6, radius 9999px, bg transparent, hover bg #8a5cf61A (hex ~10%).
- Footer (below scroll): `px-6 pt-8 pb-4 mt-8 flex flex-col gap-2`:
  - Legal links: grid 2-col or flex wrap: Legal, Safety & Privacy Center, Privacy Policy, About Ads, Accessibility, Cookies — `text-sm text-[#b3b3b3] hover:text-white`, each `mr-4 mb-2`.
  - `<button className="text-xs text-[#b3b3b3] hover:text-white flex items-center gap-2">Cookie Settings</button>`
  - Language button: `<button className="mt-3 flex items-center h-8 gap-2 rounded-full border border-white/70 px-3 text-sm text-white hover:bg-white/10">` globe icon + "English" `</button>` → fills Footer area.
  - `© 2026 Spotify AB` — `text-sm text-[#b3b3b3]`.

## NowPlayingBar (PreviewBanner)
Container: `grid-column:1/-1; height:82px; padding:8px; background:#000`.
Inner (h66): `flex h-[66px] items-center` →
PreviewBanner: `relative flex flex-1 items-center justify-between gap-6 px-6 py-2.5` height 66px;
`background: linear-gradient(90deg,#af2896,#509bf5)`:
- Left block: `<div>`:
  - `Preview of Spotify` — 14px/700 #fff
  - `Sign up to get unlimited songs and podcasts with occasional ads. No credit card needed.` — 16px/400 #fff
- Right: `<a href="https://accounts.spotify.com/en/login" className="rounded-full bg-white text-black text-base font-bold px-8 py-2 hover:scale-105 transition">`Sign up free`</a>` (padding 8px 32px).

For mobile: banner text smaller / hidden subtitle at <640.

## Footer
`<nav className="bg-[#121212] px-6 pb-10 pt-2">` (padding:8px 24px 40px; page margin-bottom offset) →
- Top: `flex justify-between mt-8` (margin-top 32px) flex-wrap.
  - Link columns container `flex flex-wrap gap-x-6` (columns), each column `mr-6 mb-8 w-[170px]`:
    - `<div className="text-base font-bold text-white mb-4">Company|Communities|Useful links|Spotify Plans</div>`
    - links: `<ul className="space-y-2"><li><a className="text-base text-[#b3b3b3] hover:text-white">…</a></li></ul>` (line-height ~1.5em; margin-bottom 10px per item)
  - Social container `flex flex-row gap-4` (w152, mb-10): 3 anchors each:
    `<a href class="flex h-10 w-10 items-center justify-center rounded-full bg-[#292929] hover:bg-[#3e3e3e]"><IconInstagram className="h-4 w-4 fill-white" /></a>` (icon 16×16).
- `<hr className="my-0 mb-6 border-t border-[#292929]" />` (footer-line: border-top 1px #292929, margin 0 0 24px; width 100%).
- Bottom: `flex gap-6 pt-4` → `<span className="text-sm text-[#b3b3b3]">© 2026 Spotify AB</span>` (14px).
Data: import labels from `@/lib/catalog` (footerCompany etc.) and social links local constants.

## MobileNav
Appears under 700px (replaces TopBar desktop right cluster; persists on ALL pages):
- Fixed above NowPlayingBar at bottom (within grid? simpler: `md:hidden` absolute row in shell with height 58px, bg #000, border-t 1px #292929).
- 5 tabs space-around: Home (active #fff icon + text 10px), Search, Your Library, Premium. Icons 24px; labels `text-[10px] font-semibold`; inactive #b3b3b3.
- Grid rows become `[64px_1fr_82px]` + mobile nav as part of row-3 col stack: make row 3 auto with `grid-rows-[64px_1fr_auto_82px]` on mobile? Simplest: NowPlayingBar row stays 82px and MobileNav rendered immediately above it inside row3 via a wrapper `flex flex-col` — set row 3 to `auto`. Keep desktop identical: row3 fixed 82px; MobileNav `md:hidden`.

## Verification
`npx tsc --noEmit` clean; `npm run build` success. No client side effect needed except nothing.