# Spotify Web Player — Behaviors

## Scroll behavior
- Top bar, Now Playing bar, Sidebar: fixed positions in the grid; do NOT scroll.
- Main content panel: internal scroll (`.main-view-container__scroll-node` via OverlayScrollbars).
- The decorative 256px gradient is `position:absolute; top:0; left:0; width:100%; height:256px; background: linear-gradient(rgba(0,0,0,0.6) 0%, rgb(18,18,18) 100%), url("data:image/svg+xml;base64,...")` with `pointer-events:none`. It's inside the scroll container so it scrolls with content. Underneath the content padding, it's visible as the content scrolls behind it. This is exactly the Spotify "hero gradient" effect.
- No sticky/parallax. No ResizeObserver triggers.

## Hover states
- **Global nav buttons** (Home, nav links): color goes #b3b3b3 → #fff on hover.
- **Top bar icon buttons** (Home, Search, etc): bg unchanged; text or icon brightens.
- **Card**: NO background change on hover (verified). Play button overlay slides up (translateY(8px) → 0, opacity 0 → 1). Title link gets `text-decoration: underline` on hover. No color change.
- **"Show all" link**: text underlines on hover; no color change.
- **Rail section header**: not clickable, no hover.

## Play button reveal (cards)
- `.Lfmlz1SNgfjwWukLZU5x`:
  - Default: `transform: translateY(8px); opacity: 0; box-shadow: 0 8px 8px rgba(0,0,0,0.3)`.
  - On card hover: `transform: translateY(0); opacity: 1` (transition `transform 0.2s ease-out, opacity 0.2s ease-out`).
  - Inner `<button>`: bg rgb(30,215,96)=#1ed760, radius 50%, width/height 48px; contains a `<span>` inner ring 48×48, border-radius 50%, bg #1ed760, `display:flex; align-items:center; justify-content:center; transition: background-color 0.15s cubic-bezier(0.3,0,0,1), transform 0.15s cubic-bezier(0.3,0,0,1)`. On hover of button: inner bg stays #1ed760 (no change on play), but there's a subtle transform scale (1.06) on button hover (play button inner radius transform). Play icon SVG fill black.
- Artists cards: same behavior but artwork radius 50%.

## Rail horizontal scroll
- Each rail grid wrapper: `margin: 0 -40px; overflow: hidden`.
- The grid itself has `padding-left: 28px` (extends the first card 28px before the grid start, overlapping the section header).
- Grids wider than viewport scroll horizontally; scrollbar auto-hidden by default (OverlayScrollbars `.os-theme-spotify`), appears on hover/scroll.

## Kbd hint styling (search bar)
- `<kbd>` chips: font 16px SpotifyMixUI, padding 2px 6px, radius 4px, border: 1px solid rgba(255,255,255,0.1)? actually background transparent, border appears none — text is `#b3b3b3`, spacing between chips is 4px.

## Preview banner (NowPlayingBar)
- Signed-out state: gradient banner across full bar: `background: linear-gradient(90deg, rgb(175,40,150), rgb(80,155,245))`, padding `11px 24px 7px 15px`.
  - Left: "Preview of Spotify" (14px/700 #fff), subtitle "Sign up to get unlimited songs and podcasts with occasional ads. No credit card needed." (16px/400 #fff).
  - Right: "Sign up free" button — white pill bg, black text, 16px/700, padding 8px 32px, radius 9999px.

## Sidebar "Your Library" (signed out)
- Header: "Your Library" (span 16px/700 #fff) + "Create" icon button (35×35, bg #1f1f1f, radius 9999px).
- Empty state cards (bg #1f1f1f, radius 8px, padding 16px 20px, flex column gap 20px):
  1. "Create your first playlist" (16px/700 #fff) + "It's easy, we'll help you" (14px/400 #fff) + "Create playlist" white pill button (bg #fff, text #000, 14px/700, padding ~12px 16px).
  2. "Let's find some podcasts to follow" (16px/700 #fff) + "We'll keep you updated on new episodes" (14px/400 #fff) + "Browse podcasts" button — indigo pill (bg #6d28d9 or closer to #8a5cf6? actually border + text #8a5cf6 but bg ~#1f1f1f; button text color #8a5cf6 with bg transparent + border 1px #8a5cf6 radius 9999px).
- Grid list section: empty (hides when nothing to list).
- Footer area (below scroll): links list (Legal, Safety & Privacy Center, Privacy Policy, About Ads, Accessibility, Cookies) in 14px #b3b3b3 + Cookie Settings (11px tertiary) + language button "English" (globe icon) + © 2026 Spotify AB (14px #b3b3b3).

## Footer (main content)
- `<nav class="footer">`: bg #121212, padding `8px 24px 40px`.
- Top section: `margin: 32px 0 0`.
  - Left: 4 link columns (flex row, gap 24px between, margin-right 24px per column, margin-bottom 32px). Each column: header (16px/700 #fff), links list (block, margin-bottom 10px, 16px/400 #b3b3b3, hover #fff).
    1. "Company": About, Jobs, For the Record.
    2. "Communities": For Artists, For Creators, For Authors, Developers, Advertising, Investors, Vendors.
    3. "Useful links": Support, Free Mobile App, Popular by Country, Top Song Lyrics, Import your music.
    4. "Spotify Plans": Premium Individual, Premium Duo, Premium Family, Premium Student, Spotify Free.
  - Right: social icons container (w152, flex row, gap 16px, margin-bottom 40px). Three circles: 40×40, bg #292929, radius 50%, fill white. Icons: Instagram, X/Twitter, Facebook.
- HR divider (1px, border #292929, margin-bottom 24px).
- Bottom row: grid, gap 24px. "© 2026 Spotify AB" (14px/400 #b3b3b3). Language link (English) if present; in main footer absent in anon logged out state.

## Responsive behavior notes
- TopBar search form: hides on mobile (viewport < 930px approximately). Home/Search icons in bottom bar appear.
- Sidebar: hidden on mobile (< 805px). "Your Library" moves to bottom bar icon.
- Footer link columns: collapse into 2-column grid, then single column on small screens.
- Social icons: align to center below link columns on mobile.