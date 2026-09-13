# Lyrics Providers — Research & Implementation

Multi-provider lyrics system for this Navidrome client, prioritizing **coverage first**, then
word/syllable synchronization quality. All numbers below are measured on a 26-track sample
(The Weeknd ×12, Lana Del Rey ×6, Drake ×2, Kanye West ×2, Phoebe Bridgers ×2,
Cigarettes After Sex ×2), tested 2026-09-12. No lyric text was stored in this document —
only structural metadata.

---

## Summary table

| Provider | Word sync | Syllable sync | Coverage (sample) | Free | API key | Matching | Format | Terms/license | Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LRCLIB | line only* | no | **25/26 (96%)** | yes | no | title+artist+album+duration | LRC (+Lyricsfile YAML) | open, community contributions, CC-friendly API | ✅ (primary fallback) |
| Musixmatch official | yes (richsync) | char-offset (near-syllable) | not testable w/o key | paid ($49+/mo for richsync) | **required** | q_track/q_artist, commontrack_id | JSON richsync | fully licensed commercial API | ✅ (key-gated) |
| Karalyr | yes (enhanced LRC) | no | **0/26 (0%)** — DB ≈ 45 tracks | yes | no | artist+track (+duration ±2s) | Enhanced LRC | open API, PoW-gated publishing | ❌ rejected (no coverage) |
| NetEase Cloud Music | yes (YRC) | yes | ~0% western (CJK-focused) | yes (anonymous API) | no | NetEase song ID (no ISRC/Spotify) | YRC/LRC | no official public API for YRC; encrypted search responses | ❌ rejected |
| QQ Music | yes (QRC) | yes | ~0% western | yes | no | QQ song ID (no ISRC/Spotify) | QRC (encrypted) | encrypted payload + desktop client delivery | ❌ rejected |
| Kugou | yes (KRC) | yes | ~0% western in probes | yes | no | keyword+hash | KRC (encrypted) | client endpoints; search returned 0 candidates for western probes | ❌ rejected |
| Spotify (internal gateway) | yes (Musixmatch-powered) | no | n/a | no | sp_dc cookie | Spotify track ID | JSON | private endpoint, auth via user cookie — not a public API | ❌ rejected (ToS) |

\* LRCLIB's new `lyricsfile` field supports a word-sync YAML format, but our probes found
**0 records with word timing** for the sample (e.g. Blinding Lights: 40 lines, 0 with word data).

---

## Providers investigated

### LRCLIB (kept — line-synced fallback)

- **What it provides:** line-synced LRC and plain text for a very large catalog. The API now
  returns a `lyricsfile` (YAML) field with `start_ms`/`end_ms` per line; word timing keys exist
  in the format spec but no probed record had `words` populated.
- **Measured coverage:** 25/26 sample tracks (only miss: The Weeknd — House of Balloons).
  Average response 60–80 ms exact-match.
- **Matching:** `artist_name` + `track_name` + optional `album_name` + `duration` (±2 s tolerance).
- **Access:** fully public, CORS enabled, no key, no published rate limit (be polite).
- **Legitimacy:** open-source project; lyrics are community-provided; API is explicitly public.
- **Role in this app:** primary broad-coverage line-synced provider and final fallback.

### AMLL TTML Database (removed by user request)

- **What it provides:** community-curated TTML with genuine word/syllable timing for a
  small catalog (~12–14k tracks). Measured 2/26 (8%) coverage on the sample, both word-timed.
- **Access:** public JSON API (`api.amll.dev`), no key, ~50 req/s per IP limit.
- **Verdict:** legitimate and technically sound, but removed from this app per user request
  (not worth the extra provider surface at 8% coverage). Was implemented as word-sync
  primary until removal; if re-added, `src/lib/lyrics/providers/amll.ts` plus a registry
  entry and a TTML parser is the full surface required.

### Musixmatch (implemented, key-gated — off without a key)

- **What it provides:** `track.richsync.get` returns genuine **word-level timing**:
  per-line `ts`/`te` bounds with per-token `c` (content) + `o` (character offset) entries —
  verified against their live docs example. `track.subtitle.get` returns line-synced LRC.
- **Coverage:** the world's largest licensed catalog (powers Spotify/Instagram lyrics), so
  effectively the best possible coverage *if you have access*.
- **Access:** **official API key required.** Free developer tier: ~2k calls/day but **30% lyric
  previews, no richsync**. Richsync requires paid plans (Starter $49/mo, 500 lyrics calls/day).
- **Matching:** `track.search` (q_track/q_artist/q_album) → `commontrack_id`; the API also
  supports `track_isrc` matching for exact-recording lookup.
- **Legitimacy:** fully licensed commercial API — the *only* legal route to their data.
  Unofficial wrappers (desktop-token reuse, browser scraping) violate ToS and are excluded.
- **Role in this app:** implemented behind `MUSIXMATCH_API_KEY`. Without the key it is hidden
  from the UI and skipped in automatic mode. With a paid key it provides word timing at
  catalog scale — the only word-timed provider in the current lineup.

### Karalyr (rejected)

- **Claimed:** "open karaoke lyrics database, word-level timed lyrics, free open lyrics API,
  LRCLIB-compatible."
- **Measured:** API is real, CORS-enabled, no key, documented 600 req/5 min limit. But the
  database is **effectively empty**: sequential track IDs 2–46; fuzzy search returns 0–6
  results for common queries; **0/26 sample tracks found**; "weeknd", "lana", "drake",
  "kanye", "heart", "hello" all return `[]`. Even their own documentation example
  (`Neon Practice — Refactor My Heart`) returns 404.
- **Verdict:** technically legitimate, practically useless for a large library today. Worth
  re-checking in the future given the clean API shape (LRCLIB-compatible base-URL swap).

### NetEase Cloud Music (rejected)

- **What it provides:** YRC (word-level) for a large CJK catalog; LRC for much more.
- **Western coverage:** negligible for this sample's artists; catalog and licensing are
  China-focused. Matching requires NetEase song IDs — no Spotify/ISRC bridge.
- **Access problems:** the legacy anonymous search endpoint now returns **encrypted payloads**
  (`result: "35b17…"`) and the old lyric endpoint returns empty without auth. Modern clients
  use session cookies/weapi encryption — reverse-engineered territory.
- **Legitimacy:** no official public API for lyrics; open-source wrappers rely on
  reverse-engineered private endpoints.
- **Verdict:** rejected — no legitimate stable access, no meaningful western coverage.

### QQ Music (rejected)

- **What it provides:** QRC (word/syllable-level) for CJK catalog, some western.
- **Access:** lyric payloads are **encrypted** (QRC format requires decryption keys derived
  from the desktop client); delivery tied to client ecosystem; no public API.
- **Matching:** QQ IDs only; no ISRC/Spotify matching for our library.
- **Verdict:** rejected — encrypted private delivery, no legitimate public path.

### Kugou (rejected)

- **What it provides:** KRC (word-level, decrypted via XOR/zlib in open-source tools).
- **Probed:** their lyric search (`krcs.kugou.com`) returned **0 candidates** for
  "Blinding Lights The Weeknd" while a Chinese artist probe worked (and KRC download for it
  succeeded, encrypted payload). Western coverage in the lyrics DB is thin.
- **Verdict:** rejected — client-scoped endpoints, encrypted payloads, ~no western coverage.

### Spotify internal lyrics endpoint (rejected)

- Powers Spotify's word lyrics (Musixmatch-sourced) and is wrapped by many GitHub tools.
- Access requires a logged-in user cookie (`sp_dc`); it is a **private, unauthenticated-client
  endpoint**, explicitly against Spotify ToS to use externally. Also single-source dependent.
- **Verdict:** rejected — ToS violation, not a legitimate provider.

### Others surveyed (no viable word-timing API found)

- **Lyricify Lyrics Helper** (Apache-2.0): excellent parser library for QRC/KRC/YRC/TTML/
  Lyricify Syllable — but its *providers* are exactly the encrypted CJK endpoints rejected
  above (plus Apple Music with a paid token and Musixmatch with user tokens). Confirms the
  ecosystem reality: word timing sources are closed platforms.
- **Apple Music (TTML):** requires an Apple Music developer token **and** Media User Token
  (personal account); ToS-restricted to Apple platform clients. Rejected.
- **textyl.co / misc "free lyrics APIs":** dead or line-only, undocumented, no SLA.
- **Genius:** public API but text-only (no timing). Not applicable.
- **Enhanced LRC / local files:** supported indirectly — LRCLIB's enhanced-LRC parsing already
  yields word timing if such records appear.

---

## Measured sample results

26-track sample; per-provider found-rate and timing granularity (no lyric text recorded):

```text
Provider   Found   Word-synced   Notes
lrclib     25/26   0             only "House of Balloons" missed; all hits line-synced
amll        2/26   2             removed from the app (8% coverage); was word-timed
karalyr     0/26   0             DB effectively empty (IDs 2–46)
musixmatch  n/a    (richsync confirmed via docs; requires paid key)
```

Combined automatic coverage in this app: **25/26 (96%)** line-synced via LRCLIB, with word
timing only when a paid Musixmatch key is configured.

---

## Implementation

### Architecture

```text
Browser (LyricsPanel)
   ↓  /api/lyrics?title&artist&album&duration&provider
Next.js route (cache + provenance)
   ↓  resolveLyrics(selection)
Provider registry (auto-priority or manual pin)
   ├── musixmatch  — only when MUSIXMATCH_API_KEY is set
   └── lrclib      — exact get → fuzzy search → line timing
```

- `src/lib/lyrics/model.ts` — normalized model (lines, words, roles, provenance).
  Word timing is **never fabricated**: providers that only expose line timing produce
  line-only results.
- `src/lib/lyrics/parse.ts` — LRC + Enhanced LRC + Musixmatch richsync.
- `src/lib/lyrics/match.ts` — metadata normalization (feat./remix/deluxe stripping,
  unicode folds) and exact/strong/weak/none scoring with duration tolerance.
- `src/lib/lyrics/providers/` — provider interface, registry, automatic resolution
  (word-timed result wins; first synced result is the fallback; manual mode never
  silently falls back).
- `src/app/api/lyrics/route.ts` — caching, provider pinning, provenance in responses.
- `src/app/api/lyrics/providers/route.ts` — provider list for the selector UI.
- `src/components/lyrics-panel.tsx` — provider selector (persistent in localStorage),
  resolved-provider display in automatic mode, word-level karaoke rendering driven by
  the existing rAF loop (`--word-progress` per word; no extra React state per frame).

### Provider mode

The selector offers exactly the implemented providers:

- **Automatic** — best available; with the current lineup this resolves to LRCLIB
  (or Musixmatch when a key is configured); the header shows which provider actually
  supplied the lyrics.
- **LRCLIB** — line synchronized.
- **Musixmatch** — appears only with `MUSIXMATCH_API_KEY` configured; manual selection
  that finds nothing shows "No lyrics found from Musixmatch" instead of falling back.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MUSIXMATCH_API_KEY` | no | Enables the Musixmatch provider (official API key). Without it the provider is hidden and skipped. A free key enables metadata + 30% previews only; richsync word timing needs a paid tier. |

### Tests

```bash
node --experimental-strip-types --test tests/*.test.mts
```

13 tests covering LRC/enhanced-LRC/richsync parsing, metadata normalization and
scoring, best-candidate selection, automatic-mode priority (word-over-line, fallback,
exhaustion, no fabricated timing).

Playwright verification (production server, real provider chain): selector visibility,
automatic resolution display, manual pin + persistence across reload, switch-back to
automatic, unavailable-provider handling, zero console errors.

---

## Recommended configuration

1. Run with no keys: Automatic = LRCLIB (line timing, 96% coverage).
2. Optional: buy Musixmatch Starter ($49/mo) and set `MUSIXMATCH_API_KEY` for word timing
   at Musixmatch's catalog scale — it then automatically outranks LRCLIB in automatic mode.
3. Re-evaluate Karalyr periodically: the API shape is ideal (LRCLIB-compatible base-URL
   swap) if its database grows.
