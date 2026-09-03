# REPRO — 4 Visual Identity Proposals

All four are dark-first, none are navy+red or purple-gradient. All `fg`-on-`bg` ratios pass **WCAG AAA (≥7:1)**; computed with the WCAG 2.x relative-luminance formula in Python (not estimated). Type rule for every identity: headlines ≥600 weight, body ≥400 weight, no hairline/light cuts — 10ft-safe. Minimum TV body size recommended: 24–28px at 1080p.

---

## 1. PHOSPHOR — "CRT afterglow, not neon"
**Vibe:** Green-on-black terminal glow, but tightened into a modern grid — a Trinitron that got a UX designer.

| Token | Hex | Contrast on bg |
|---|---|---|
| bg | `#070B08` | — |
| bg2 / panel | `#0F1712` | — |
| line | `#1E2B22` | 1.34 (decorative) |
| fg | `#E6F5E9` | **17.54 : 1** (AAA) |
| muted | `#8FB59B` | 8.72 : 1 |
| accent | `#3DFF7A` | 14.88 : 1 |
| accent2 (opt) | `#FFB000` amber | 10.81 : 1 |

- **Headline:** Space Grotesk (Bold 700) — https://fonts.google.com/specimen/Space+Grotesk — OFL (Florian Karsten, https://github.com/floriankarsten/space-grotesk)
- **Body:** JetBrains Mono (Regular/Medium) — https://fonts.google.com/specimen/JetBrains+Mono — OFL 1.1 (https://www.jetbrains.com/lp/mono/#license)
- **Reference:** ES-DE frontend / "shinretro" dark themes — https://es-de.org/ and https://gitlab.com/es-de/themes/themes-list
- **Why:** The phosphor green reads as "the machine is on" — the exact moment a retro collection is about, and it's the highest-contrast accent in the set (14.9:1) so focus states are unmissable from a couch. Mono body text gives the file-manager honesty an open-source hub should have while Space Grotesk keeps the wordmark REPRO from looking like a BIOS screen.

---

## 2. MANUAL — "90s instruction booklet, ink on cream"
**Vibe:** Warm near-black with cream type and a hot safety-orange — the inside of a SNES box, inverted for night.

| Token | Hex | Contrast on bg |
|---|---|---|
| bg | `#151311` | — |
| bg2 / panel | `#211E1A` | — |
| line | `#3A342D` | 1.51 |
| fg | `#F4EBD9` cream | **15.65 : 1** (AAA) |
| muted | `#B5A88F` | 7.91 : 1 |
| accent | `#FF5A1F` orange | 5.94 : 1 (AA; use ≥18px bold on bg — fine for labels/focus) |
| accent2 (opt) | `#FFD23F` yellow | 12.83 : 1 |

- **Headline:** Archivo Black — https://fonts.google.com/specimen/Archivo+Black — OFL
- **Body:** IBM Plex Sans (Regular/SemiBold) — https://fonts.google.com/specimen/IBM+Plex+Sans — OFL
- **Reference:** teenage.engineering (warm off-white/black editorial, dark mode) — https://teenage.engineering/designs ; token breakdown https://fontofweb.com/tokens/teenage.engineering
- **Why:** Cream-on-warm-black is literally the manual/box-art palette of the 16-bit era, so cover art sits in a frame that feels period-correct instead of clinical. Archivo Black gives REPRO a stamped, cartridge-label wordmark; the light variant is trivial (just flip to cream bg, black ink) which fits the "light variant later" plan best of the four.

---

## 3. BILLET — "machined console hardware, one hot accent"
**Vibe:** Brushed-aluminium/jet-black neutrals with a single hot-pink signal — Analogue-hardware sleekness, zero fluff.

| Token | Hex | Contrast on bg |
|---|---|---|
| bg | `#0C0C0D` | — |
| bg2 / panel | `#18191B` | — |
| line | `#2C2E31` | 1.44 |
| fg | `#F2F2F2` | **17.47 : 1** (AAA) |
| muted | `#9A9DA3` | 7.19 : 1 |
| accent | `#FF2D6F` hot pink | 5.45 : 1 (AA large; use for focus rings/badges, white text on it) |
| accent2 (opt) | `#00E5FF` cyan | 12.71 : 1 |

- **Headline:** Space Grotesk (Bold 700) — https://fonts.google.com/specimen/Space+Grotesk — OFL. *(was Unbounded; swapped 2026-09-02 after an in-app comparison of 8 pairings, sketches/type-sheet.png — Unbounded wrapped titles and shouted.)*
- **Body:** Inter (Regular/SemiBold) — https://fonts.google.com/specimen/Inter — OFL. *(was Sora.)*
- **Reference:** Analogue Pocket / Aluminum Editions pages — https://www.analogue.co/pocket , https://www.analogue.co/editions/pocket-aluminum
- **Why:** True neutrals let each system's own accent color (list below) carry the color, so the library grid becomes a rainbow of consoles on a black shelf — the most "customizable" of the four. Unbounded's wide, chunky caps make REPRO look like something laser-etched on a faceplate, which is the "better than Playnite" premium cue.

---

## 4. TUBE — "muted teal + amber, warm-lit den"
**Vibe:** Deep teal-black with amber highlights — the glow of a tube TV in a dim living room, calm at 10ft, rich at a desk.

| Token | Hex | Contrast on bg |
|---|---|---|
| bg | `#0E1A1C` | — |
| bg2 / panel | `#16262A` | — |
| line | `#254045` | 1.60 |
| fg | `#EAF3F1` | **15.71 : 1** (AAA) |
| muted | `#8FB0AC` | 7.58 : 1 |
| accent | `#F2A93B` amber | 8.89 : 1 |
| accent2 (opt) | `#3ED2C5` teal | 9.49 : 1 |

- **Headline:** Bricolage Grotesque (Bold/ExtraBold, opsz 96) — https://fonts.google.com/specimen/Bricolage+Grotesque — OFL (https://github.com/ateliertriay/bricolage)
- **Body:** Instrument Serif for eyebrows/quotes + IBM Plex Sans body (Serif is single-weight so keep it ≥28px) — https://fonts.google.com/specimen/Instrument+Serif — OFL
- **Reference:** Xbox 360 "Blades" dashboard (colour-blocked, warm, big-type) — https://en.wikipedia.org/wiki/Xbox_system_software
- **Why:** Amber is the "power LED" color of the Dreamcast, N64 carts and half the CRTs ever sold; teal is its natural complement and doesn't compete with box art. It's the least "gamer" of the four while still being unmistakably not-boring, and both accents clear 8.8:1 so it survives a bright living room and TV overscan.

---

## Per-system accent colors (from real hardware/branding)

Contrast measured against Billet bg `#0C0C0D`. "Lifted" = same hue, luminance raised so it passes ≥4.5:1 on dark bg for text; use the original for swatches/chips.

| System | Hex (source-true) | Lifted for dark-bg text | Basis & source |
|---|---|---|---|
| GameCube | `#6A5FA8` (3.55) | `#8F82D6` (5.90) | "Indigo" launch color, primary in advertising & logo — https://en.wikipedia.org/wiki/GameCube |
| PS1 | `#B9B9B9` grey (9.97) + `#3B7BD6` (4.65) | — | Grey console shell + PS logo blue — https://en.wikipedia.org/wiki/PlayStation_(console) |
| PS2 | `#0E4B99` (2.31) | `#3D8BF2` (5.75) | PS2 logo/startup blue (PlayStation blue `#006FCD` ref) — https://www.schemecolor.com/playstation-blue-color-code.php ; https://en.wikipedia.org/wiki/PlayStation_2 |
| Xbox | `#107C10` (3.64) | `#3FB43F` (7.27) | Official Xbox brand green R16 G124 B16, PMS 362 — https://relayto.com/explore/microsoft-xbox-brand-book-r6a70wdfnph2a/QIx2OUyP15 |
| Xbox 360 | `#92C83E` (9.83) | — | 360-era lime, Pantone 7488 C — https://www.brandcolorcode.com/xbox-360 |
| Wii | `#2BB7E8` (8.42) | — | Wii Menu light-blue UI on white console — https://en.wikipedia.org/wiki/Wii_system_software |
| N64 | `#F5B201` (10.48) | — | N64 logo yellow (with `#01009A` blue, red, green) — https://www.color-hex.com/color-palette/59775 |
| SNES | `#6F5FBF` (3.78) | `#9A8CE8` (6.79) | US SNES purple buttons/sliders (Super Famicom logo colours) — https://en.wikipedia.org/wiki/Super_Nintendo_Entertainment_System |
| Dreamcast | `#FF9900` (9.13) | — | NTSC swirl / power-LED orange, Sega site 1999 — https://sega.fandom.com/wiki/Dreamcast ; https://en.wikipedia.org/wiki/Dreamcast |

---

## Summary
- **Did:** Web-verified 8 fonts (all OFL / Google Fonts), 4 UI references, 9 console color sources; computed all WCAG ratios in Python using the actual luminance formula.
- **Result:** 4 divergent identities — Phosphor (green CRT), Manual (cream/orange), Billet (neutral + hot pink), Tube (teal/amber). All fg/bg ≥15.6:1 (AAA); accents 5.4–14.9:1.
- **Recommendation:** Billet if per-system colors should dominate; Manual if the light variant matters most; Phosphor/Tube if REPRO's own color should be memorable.
- **Files:** none created (markdown returned inline).
- **Caveats:** Console hexes are picked from branding/press sources, not official Nintendo/Sony brand guides (only Xbox has a public guide). Orange/pink accents in Manual/Billet are AA-large only — use them for focus rings, chips and ≥18px bold text, not small body copy.