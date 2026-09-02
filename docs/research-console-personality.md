# Console Personality Research — Couch Mode Row/Hero Treatments

Goal: give each of REPRO's 10 couch-mode system rows/heroes a distinct, era-accurate *feel* using only CSS/HTML (gradients, blend-modes, shapes, fonts, subtle motion) — no logos, no cloned UI chrome, no video assets. Every claim below is sourced.

---

## GameCube (2001)
**Dashboard:** GameCube has no true OS dashboard — boot goes straight to the disc's own menu after a minimalist spinning-cube logo animation on a black background (startup boot sequence, widely documented on fan compilations of the boot sequence). Source: https://www.pinterest.com/pin/nintendo-gamecube-boot-up-and-graphic-user-interface--422212533807228468/
**Industrial design:** Small cubic lunchbox-style case, translucent-indigo/purple ("Indigo") plastic with a black top handle, and a matching mini-disc format — compact, toylike, purple-dominant. Source (Wikipedia, official color/materials): https://en.wikipedia.org/wiki/GameCube
**CSS treatment ideas:**
- Subtle isometric cube-outline grid pattern (repeating-linear-gradient at two angles) faint over an indigo→near-black radial gradient hero background.
- Rounded-square tile chrome (large corner radius, thick "handle" top bar accent) echoing the console's blocky handle silhouette.
- Soft violet glow/vignette pulsing very slowly (4–6s ease) behind the hero art, evoking the cube logo's ambient glow without animating a logo.

## PS1 / PlayStation (1994)
**Dashboard:** The stock PS1 BIOS has no game-browser menu at all — only a Memory Card Manager (grey/blue block-grid utility) and CD Player; most "PS1 UI" nostalgia is really the grey memory-card block screen. Source: https://www.facebook.com/groups/3064720397111662/posts/3499934140256950/ ; https://en.wikipedia.org/wiki/PlayStation_(console)
**Industrial design:** Grey plastic box (later black PSone), simple geometric shapes logo (triangle/square/circle/X symbols in red/green/blue/pink), CD media — flat 90s grey-and-primary-color aesthetic era.
**CSS treatment ideas:**
- Low-fi dither/noise overlay (SVG feTurbulence or repeating dot pattern at low opacity) to evoke PS1-era low-res texture aliasing.
- Faint polygon-wobble: CSS `clip-path` or `transform` micro-jitter on hover to nod at PS1's affine-texture/vertex-snap wobble, kept extremely subtle.
- Grey/blue block-grid pattern (CSS grid of small squares, memory-card style) as the row background texture instead of a smooth gradient.

## PS2 (2000)
**Dashboard:** OSDSYS browser: a dark blue/black background with a horizontal row of large, glossy, chrome/glass-blue 3D icon "skyscrapers" (bevelled cube icons) and a central clock; often called "the most underrated Y2K UI." Source: https://www.psdevwiki.com/ps2/OSDSYS ; https://www.facebook.com/100068986951718/videos/the-ps2-ui-has-to-be-the-most-underrated-y2k-aesthetic-in-gaming-history-o-watch/1722456579026683/
**Industrial design:** Matte-black tower-style case, blue LED, silver/chrome accents — glossy Y2K chrome look.
**CSS treatment ideas:**
- Glossy vertical "skyscraper" tile chrome: linear-gradient glass highlight strip (white→transparent) across the top third of each tile, rounded top corners, deep blue-black background.
- Chrome bevel border (box-shadow inset light+dark) on tiles to mimic glassy 3D icon bevels.
- Slow horizontal specular sweep animation (a soft diagonal highlight band moving left-to-right every ~8s) over the hero panel, evoking glossy Y2K reflections.

## Xbox (original, 2001)
**Dashboard:** Dashboard main menu is mostly solid green with the Xbox logo at left and four tabs (Memory, Music, Xbox Live, Settings) to the right — flat, blocky, early-2000s green UI. Source: https://xbox.fandom.com/wiki/Xbox_Dashboard
**Industrial design:** Bulky black tower case (nicknamed for its size), green glowing logo, chunky duke controller — industrial, oversized, black-and-green.
**CSS treatment ideas:**
- Flat, high-contrast green-on-black gradient hero (radial green glow from a fixed point, not centered on the whole panel) referencing the glowing X logo without drawing it.
- Chunky rectangular tab-style row headers (bold, wide-lettered uppercase sans, thick underline bar) evoking the 4-tab dashboard layout.
- Subtle scanline/CRT flicker overlay at very low opacity to place it in its early-2000s green terminal-like read.

## Xbox 360 (2005 / Blades era)
**Dashboard:** "Blades" UI — vertical sliding panel/tabs ("blades") each a distinct colored vertical slab, widely called one of the best console UIs ever for its sleek, futuristic panel navigation. Source: https://www.reddit.com/r/xbox360/comments/19bzqmb/the_xbox_blades_dashboard_was_all_about_that/ ; https://xbox.fandom.com/wiki/Xbox_360_Dashboard
**Industrial design:** Glossy white/black curved case, chrome ring, later NXE brought flatter dark-green/black panel UI.
**CSS treatment ideas:**
- Diagonal "blade" panel motion: rows built from angled (skewed) panel segments that slide/settle into place on focus, echoing blade-to-blade transitions.
- Vertical color-blade gradient bands (each row tinted with a slightly different diagonal gradient slab) rather than one flat background.
- Glossy curved highlight (radial white gradient arc top-left) referencing the glossy white 360 shell.

## Nintendo 64 (1996)
**Dashboard:** No OS menu — cartridge boots straight to game; the console itself (charcoal-gray "Control Deck") is the visual identity rather than any UI. Source: https://en.wikipedia.org/wiki/Nintendo_64
**Industrial design/box art:** Bold, saturated primary-color box art (reds, yellows, blues, greens), chunky "trapezoid" three-pronged controller shape, charcoal-gray plastic — playful, toy-bright 90s Nintendo palette. Source: https://creamerscinemacraze.wordpress.com/2016/04/26/my-top-10-favorite-n64-video-game-box-art/
**CSS treatment ideas:**
- Chunky trapezoidal tile shapes (clip-path trapezoid) referencing the 3-pronged controller silhouette, in place of plain rounded rectangles.
- Bright primary-color gradient blocks (rotating red/yellow/blue accent chips in tile corners) rather than a single brand hue, mirroring box-art color riot.
- Coarse pixel/dither texture overlay at very low opacity nodding to blocky N64-era textures.

## SNES (1990/91)
**Dashboard:** No menu system — cartridge-based, instant boot to game. UI personality instead comes from hardware branding.
**Industrial design:** Two-tone lavender-grey (US) or grey/wine-purple (JP Super Famicom) case, purple/gray four-button-icon logo (the four slanted controller-button shapes), rounded, boxy 90s home-electronics look. Source: https://www.reddit.com/r/snes/comments/162cqcv/what_are_the_four_slanted_circles_made_of_grey/ ; https://en.wikipedia.org/wiki/Super_Nintendo_Entertainment_System
**CSS treatment ideas:**
- Two-tone lavender-grey / purple gradient split background (diagonal hard-edge split, not smooth blend) referencing the SNES case's two-tone shell.
- Slanted rounded-square accent chips (small rotated squares like the SNES button-logo glyphs) as row-label decoration.
- Soft "Mode 7" parallax: two background layers scrolling at slightly different speeds on row focus, referencing the SNES's signature rotate/scale graphics mode.

## Dreamcast (1998/99)
**Dashboard:** Boot animation is the iconic swirl — an orange (NA/JP) or blue (PAL) spiral logo animation on black, one of the most recognized console boot idents. Source: https://www.dreamcast-talk.com/forum/viewtopic.php?t=6014 ; https://en.wikipedia.org/wiki/Dreamcast
**Industrial design:** White/grey console with orange branding accent, futuristic swoosh logo, VMU accessory with its own small LCD — playful late-90s "internet console" aesthetic.
**CSS treatment ideas:**
- Animated conic-gradient spiral (CSS `conic-gradient` rotating slowly) in orange-on-black behind the hero panel — a swirl motif, not the logo itself.
- Thin curved swoosh accent lines (SVG or border-radius arcs) tracing across row backgrounds.
- Light grain/scanline texture plus a warm orange rim-light glow to evoke the GD-ROM/VMU-era warm plastic look.

## Nintendo Switch (2017–present)
**Dashboard:** HOME Menu — flat, minimal grid of rounded-rectangle game icons on a plain white/light background, extremely clean and uncluttered, little chrome. Source: https://en-americas-support.nintendo.com/app/answers/detail/a_id/22308/~/nintendo-switch-home-menu-overview ; https://www.reddit.com/r/NintendoSwitch2/comments/1hpsw8n/nintendo_switch_2_home_menu_ui_concept/
**Industrial design:** Neutral black/grey tablet body with red/blue Joy-Con accent colors, minimalist, modern consumer-tech aesthetic (contrast to older consoles' bold branding).
**CSS treatment ideas:**
- Minimal flat rounded-rectangle tiles with generous whitespace/padding and a soft drop-shadow only — deliberately the *least* decorated row, for contrast.
- Dual accent-color sliver (thin red + thin blue vertical bars, like left/right Joy-Con colors) as a subtle tile-corner or row-label accent.
- Very light neutral-grey gradient background with no pattern, reinforcing the "clean slate" minimalism against the busier retro rows.

## Wii (2006)
**Dashboard:** Wii Menu — 4×3 grid of channels per page across 4 pages, flat colorful square "Channel" icons on white/light-blue background, pointer-driven, cheerful "TV channel" grid metaphor. Source: https://wii.fandom.com/wiki/Wii_Menu ; https://www.youtube.com/watch?v=W0rCdJqtVcU (UI Spy)
**Industrial design:** Glossy white vertical/horizontal slim case, blue Wii logo, friendly rounded rectangle branding — soft, approachable mid-2000s white consumer electronics look.
**CSS treatment ideas:**
- Flat pastel-blue/white grid-of-squares background pattern (CSS grid of soft rounded squares at low opacity) referencing the Channel grid metaphor.
- Glossy white curved highlight band (diagonal linear-gradient white sheen) across the hero panel evoking the glossy white shell.
- Gentle "channel hover" bounce/scale micro-animation on tile focus (small ease-out scale pulse), echoing the Wii Menu's soft pointer-hover wiggle.

---

## Summary Table

| System | 1-line visual signature | Primary technique | Source URL |
|---|---|---|---|
| GameCube | Compact indigo cube, spinning-logo boot on black | gradient + pattern | https://en.wikipedia.org/wiki/GameCube |
| PS1 | Grey memory-card block-grid, low-res dither aesthetic | texture/pattern | https://en.wikipedia.org/wiki/PlayStation_(console) |
| PS2 | Glossy chrome-blue "skyscraper" icons on Y2K black | gradient (glossy sheen) | https://www.psdevwiki.com/ps2/OSDSYS |
| Xbox (OG) | Flat glowing green logo dashboard, chunky black tower | gradient (radial glow) | https://xbox.fandom.com/wiki/Xbox_Dashboard |
| Xbox 360 | Sliding vertical color "blades" panels | motion (diagonal/panel slide) | https://xbox.fandom.com/wiki/Xbox_360_Dashboard |
| N64 | Bold primary-color box art, charcoal trapezoid controller | pattern (trapezoid shapes) | https://en.wikipedia.org/wiki/Nintendo_64 |
| SNES | Two-tone lavender-grey shell, purple button-glyph logo | gradient (two-tone split) | https://en.wikipedia.org/wiki/Super_Nintendo_Entertainment_System |
| Dreamcast | Orange/blue spinning swirl boot logo on black | motion (conic-gradient swirl) | https://en.wikipedia.org/wiki/Dreamcast |
| Nintendo Switch | Minimal flat rounded-icon grid on white | gradient (flat, minimal) | https://en-americas-support.nintendo.com/app/answers/detail/a_id/22308/~/nintendo-switch-home-menu-overview |
| Wii | Cheerful 4×3 pastel Channel grid, glossy white shell | pattern (grid of squares) + gradient (sheen) | https://wii.fandom.com/wiki/Wii_Menu |
