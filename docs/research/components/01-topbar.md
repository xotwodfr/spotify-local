# Spec: TopBar (global navigation) — desktop + mobile

File: `src/components/topbar.tsx` — named export `TopBar`. Server component (static).

## Container
- `display:flex; align-items:center; justify-content:space-between; padding:8px; height:64px; background:#000; grid-column:1/-1`.
- Left cluster (aligned by 8px gap): logo link + Home button + Search form.
  - Logo: `<a href="/">` 32×32 `<SpotifyLogo width={32} height={32} fill="#fff" />`; wrapper 72px wide flex row.
  - Home button: 48×48, `border-radius:50%; background:#1f1f1f`, `<IconHome width=24 height=24 fill="#fff">`. aria-label="Home".
  - Search form: `<form role="search">`, `width:474px; height:48px; background:#1f1f1f; border-radius:500px; position:relative` (flex, align center).
- Right cluster (flex, align center, gap 8px... use padding gaps): tertiary links Premium / Support / Download, 16px/700 text #b3b3b3 hover #fff, padding `8px 0`; divider; Install App; Sign up; Log in.

## Search form (desktop only per breakpoint)
- Leading: `<button type="button" aria-label="Search">` 48×48 round, `<IconSearch width=24 height=24 fill="#fff">`.
- Input zone (flex stretch): `<input>` translucent (bg transparent, outline none, border none), font 16px, color #fff, placeholder "What do you want to play?" (placeholder color #b3b3b3). The input is 16px; left padding covers the icon (icon floats overlay on left; input has padding-left 16px since container has its own 48px left padding for the leading button — simpler: leading button absolute left 0; input width 100%).
- Trailing (right side inside pill): kbd hint "Ctrl Shift L" → 3 `<kbd>` chips: 16px font, color #b3b3b3, padding 2px 6px, radius 4px, border 0, gap 4px — shown ≥ lg. Then Browse icon button aria-label "Browse" (transparent 48px round with `<IconBrowse fill="#fff">`), plus a "Clear search field" `<IconClear>` button (hidden unless value).

## Right cluster buttons
- `NavTertiary` text-only buttons: `font-size:16px; font-weight:700; color:#b3b3b3;` hover `#fff`; padding `8px 0`. No radius/bg.
- Divider: `<span className="h-[25px] w-px bg-white" />` margin-inline 16px.
- "Install App": `<a>` 14px/700 #b3b3b3 hover #fff, padding `4px 16px 4px 36px`, radius 9999px, with leading download icon (16×16, any plausible arrow-into-tray path, fill #b3b3b3 group-hover #fff).
- "Sign up": 14px/700 #b3b3b3 hover #fff, padding `4px 16px 4px 8px`.
- "Log in": white pill `background:#fff; color:#000; font-size:16px; font-weight:700; padding:8px 32px; border-radius:9999px;` hover: scale(1.04) via transform with transition.

## Breakpoints / mobile
- `@media (max-width: 1200px)`: hide Premium/Support/Download tertiary links, hide divider (keep Install App hidden too). Search form `width: min(474px, 40vw)`.
- `@media (max-width: 700px)` (mobile): TopBar hides logo left cluster + search entirely. Show only a compact top row with hamburger-less: avatar circle (40×40 grey) right. The search moves to the mobile bottom bar (`Home | Search | Your Library | Premium` tabs) rendered by AppShell/MobileNav. When hidden, keep DOM minimal: `hidden md:flex` style classes.

## Classes/tokens
- Use Tailwind arbitrary values or `@layer components` class names, NOT inline styles (project rule). Reference tokens from globals (bg colors `#1f1f1f` etc directly as `bg-[#1f1f1f]` ok).
- Reuse `cn()` utility. import icons from `@/components/icons`.

## Verification
`npx tsc --noEmit` clean. Component renders without data props.