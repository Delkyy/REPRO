# system logos

one svg per system, `<id>.svg`, ids from `systems.json`. single color on transparent, any viewBox: the app masks them (`mask-image`), so they take whatever color the system is. same folder for emulator logos (`dolphin`, `pcsx2`, `duckstation`, `xemu`, `xenia`, `retroarch`).

**console marks** are the real ones, pulled from wikimedia commons and flattened to one color (`scripts/flatten-svg.js`): nes, snes, n64, gc, wii, wiiu, switch, gba, ds, 3ds, ps1, ps2, ps3, ps4, ps5, psp, vita, xbox, x360, dc, saturn. logos are trademarks of their owners; the files carry a source comment. `xone` and `xsx` reuse the 2001 xbox mark on purpose — the newer sphere reads as a blob at 36×18 and Delk wanted the OG one.

**simple-icons** (CC0, https://github.com/simple-icons/simple-icons): pc, dolphin, retroarch.

**drawn badges** (gb, genesis, arcade, pcsx2, duckstation, xemu, xenia): `node scripts/make-badges.js` from a small path-glyph set on the REPRO wordmark grid. gb and genesis stay drawn because the commons files are a raster-in-svg (gb) and a white-on-black plate whose counters don't survive flattening (genesis). drop a better svg with the same name to replace either.

**add or replace a mark:** put the source svg in a folder, then `npx electron scripts/flatten-svg.js <folder> <id>`. it recolors every shape to #000, drops whites/gradients/clip junk, keeps evenodd holes, tightens the viewBox to the ink. if the source draws the mark in white on a colored plate, add `--keep-white`. then look at it:

**proof sheet:** `npx electron test/logosheet.js` → `sketches/logo-sheet.png`. every logo at the three sizes the app uses (sidebar 36×18, banner 70×22, couch hero 50×16) in its system color.

add a system: `systems.json` in the repo root + a `<id>.svg` here.
