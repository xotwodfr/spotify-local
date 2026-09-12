# Spotify Web Player — Home Page Topology

Target: https://open.spotify.com/ (logged out, Sweden region, Norwegian-ish content). Viewport reference: 1440×900. Cloned layout must match at 1440 and collapse per responsive rules at 390.

## Viewport / App shell
- Root `.zXqmJUq4Orp0Adt90GGA`: `display:block; padding:8px; background:#000; width:100vw; height:100vh; overflow:hidden` (whole app is `grid` — NOT flex):
  - Grid template: `grid-template-rows: 64px 1fr 82px; grid-template-columns: 320px 1fr 40px; column-gap:8px; row-gap:8px`.
  - Wait — measured values at 1440: rows 64 / 754 / 82, cols 320 / 1056 / 40 with 8px column gap. The 40px right column hosts a collapsed now-playing/right panel with an inner 40px-wide element (bg #121212 radius 8px). Render it; on hover it expands (out of scope for static).
- Body: `overflow:hidden; background:#000`. All scrolling happens in per-panel scroll nodes (OverlayScrollbars, `.os-theme-spotify`).
- Top bar row 1, middle row 2 (sidebar | main | right panel), bottom row 3 = Now Playing bar.

## Row 1 — TopBar (`.bQetA_KiP9n0DQVcGa7m`)
- `display:flex; align-items:center; justify-content:space-between; padding:8px; margin:-8px 0 0 -8px; background:#000; grid-column: 1 / -1; height:64px; padding-left:8px`.
- Contents left→right:
  1. Logo link → `https://open.spotify.com/` (32×32 white Spotify logo SVG), wrapped in 72px-wide flex row (centers against padding).
  2. "Home" icon button (48×48 circle, bg `#1f1f1f`, radius 50%). Icon 24×24.
  3. Search form: `width:474px; height:48px; background:#1f1f1f; border-radius:500px; display:flex; align-items:center; padding:12px 96px 12px 48px; position:relative`. Contains:
     - Leading Search icon button (aria-label "Search"), 48×48 round, transparent.
     - Input wrapper spans full width: input text 16px, placeholder "What do you want to play?"; kbd hint right "Ctrl Shift L" split into 3 `<kbd>` chips + trailing Browse icon button (aria-label "Browse").
  4. Right group (`.encore-text` links): "Premium", "Support", "Download" — tertiary buttons, 16px/700, color #b3b3b3, padding 8px 0, hover #fff.
  5. Vertical 1px divider (height 25px, margin 0 16px, bg white).
  6. "Install App" (14px bold #b3b3b3, padding 4px 16px 4px 36px, radius 9999px, has download icon on left).
  7. "Sign up" (14px bold #b3b3b3, padding 4px 16px 4px 8px).
  8. "Log in" — primary pill: bg #fff, color #000, radius 9999px, padding 8px 32px, font 16px bold.

## Row 2 — Middle
- **Sidebar** `.PIP22o58Crv8RXY4wB2o` (col 1): `width:320px; height:100%; padding:0; display:flex; flex-direction:column; gap:8px; background:#000; border-radius:8px; position:relative; z-index:4`. Contains `<nav>` with 2 panels stacked:
  1. Main library panel: bg #121212, radius 8px, flex-grow 1 (see SIDEBAR spec).
  2. This panel stretches full column height; content scrolls inside (`overflow:hidden auto`).
- **Main** `.nIxkUlXD1B9kghGyVJ6y` (col 2): `width:100%; height:100%; background:rgb(18,18,18); border-radius:8px; overflow:hidden; position:relative`. Internal scroll node: `.main-view-container__scroll-node` with OverlayScrollbars (`.os-theme-spotify`).
  - Background decorative element (absolutely positioned, behind content): `.dqwQhIudKoD98eWJzj5E` 256px tall at top; `background: linear-gradient(rgba(0,0,0,0.6) 0%, rgb(18,18,18) 100%), url("data:image/svg+xml;base64,...")` (turbulence noise, opacity 0.05), pointer-events none.
- **Right panel** (col 3): collapsed 40px-wide column bg #121212 radius 8px (renders as inner 40px element; the grid col is 40px).

## Row 3 — NowPlayingBar (`.itzKVxWhS4n59fp_KIVc`)
- `grid-column: 1 / -1; height:82px; padding:8px; margin:-8px 0 -8px -8px; background:#000; display:flex; align-items:center`. Root covers to viewport edge.
- Inner aside `.iSRS94_cCqyXK6cTi_X0` (w1424 h66, flex column) with two slots:
  1. **PreviewBanner** (logged-out state): `flex:1`, see NOW-PLAYING-BAR spec.
  2. Player block (hidden when logged out — renders `height:0`).

## Main scroll content
- `<main>` > homepage `<section>` (padding 4px 0 32px) > `.contentSpacing` (`padding: 0 40px`):
  - Visually-hidden H1 "Home" (sr-only).
  - Five rails (see RAIL spec), each wrapped in its own `<section>`:
    1. Trending songs — 17 track cards (grid height 295px)
    2. Popular artists — 10 cards (grid height 250px)
    3. Popular albums and singles — 10 cards (grid height 292px)
    4. Popular radio — 10 cards (grid height 248px)
    5. Featured Charts — 4 cards (grid height 248px)
  - Rails separated by 24px vertical grid gap.
- Footer NAV `.footer` (bg #121212) after content, padding `8px 24px 40px`, margin 0 (see FOOTER spec).

## Responsive (mobile 390px)
- Breakpoint ~ when viewport < ~805px: middle column collapses to single column (sidebar hidden), bottom nav appears with 5 tabs: Home (active), Search, Your Library, Premium. TopBar hides logo + search collapses into tabs. Only `.contentSpacing` remains 32px padding side.
- To replicate at minimum: treat rails as full-width horizontal scrollers with 16px side padding and same 40px content padding reduced to 32px; hide sidebar/right panel; show mobile bottom bar (Home/Search/Your Library/Premium) sticky above NowPlayingBar; hide global search + "Log in", show avatar.

## Fonts
- Primary font-family (all text): `SpotifyMixUI` (we self-host via `next/font/local`), fallback `CircularSp-Arab,...,"Helvetica Neue", helvetica, arial,sans-serif`.
- Headings optionally `SpotifyMixUITitleVariable` (we self-host).
- Mono: `SpotifyMixMono` (used in progress timestamps).

## Color tokens (Encore dark theme)
- Background app: #000000. Panels: rgb(18,18,18)=#121212. Elevated: #242424. Search/nav: #1f1f1f (#242424 hover). Text: #ffffff. Text subdued: #b3b3b3. Text submissive: #7a7a7a. Positive/accent (buttons): #1ed760. Divider: rgba(255,255,255,0.1).
- Encore aliases: `--background-tinted-base: #1f1f1f`, `--background-tinted-highlight: #292929`, `--background-base: #121212`, `--background-highlight: #1a1a1a`, `--text-base:#ffffff`, `--text-subdued:#b3b3b3`, `--decorative-base:#ffffff`, `--essential-positive:#1ed760`, `--essential-bright-accent:#1ed760`, `--essential-normal:#b3b3b3`, `--essential-subdued:#7a7a7a`, `--essential-subtle:#d9d9d9` etc.
- Sponsor colors: indigo `#8a5cf6`/`#a462ff` for playlist CTA; violet `#6d28d9`-ish for podcast CTA; Preview banner gradient `linear-gradient(90deg, #af2896, #509bf5)`.
- Track placeholder art (loading): rgb(8,56,104); Artist placeholder: rgb(216,56,48).

## Radii
- Panels 8px; cards 6px; buttons/pills 9999px; kbd chips 4px.

## Scrollbars
- OverlayScrollbars `.os-theme-spotify`: 8px rails, track transparent, thumb rgba(255,255,255,0.1), hover 0.2, active 0.3, radius 4px, auto-hide default hidden → show on hover/scroll.