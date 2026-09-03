# system logos

one svg per system, `<id>.svg`, ids from `systems.json`. single color on transparent, any viewBox: the app masks them (`mask-image`), so they take whatever color the system is. same folder for emulator logos, matched to `recipes/<id>.json`.

## consoles

real marks, pulled from wikimedia commons and flattened to one color (`scripts/flatten-svg.js`): nes, snes, n64, gc, wii, wiiu, switch, gb, gba, ds, 3ds, ps1, ps2, ps3, ps4, ps5, psp, vita, xbox, xone, xsx, x360, dc, genesis, sms, gg, segacd, 32x, saturn, atari2600, tg16. logos are trademarks of their owners; the files carry a source comment.

notable calls:
- `xbox` is the 2001 X blades (Commons "Xbox 2001 Symbol", `--only=2,3,8,9` keeps the four ink blades, drops the gloss/shadow layers). `xone` is the sphere-X, `xsx` is the Series X|S lockup — three different marks on purpose, told apart by their `color` in `systems.json`.
- `genesis` is the SEGA tag + wordmark with the outer plate dropped (`--only=2..16`); reads better at 36×18 without the box.
- `segacd` is the wordmark strip only (`--only=0,2,3`), the plate drops for the same reason.
- `32x` had a black-outline copy stacked under a red-fill copy in the source; kept only the red set (`--only=12..23`).
- `ps4`/`ps5`/`xone`/`xsx` have no working emulator or use folder-dump installs (see the `note` field in `systems.json`) — they're in the library picker but a scan won't try to match rom files to them.

**simple-icons** (CC0, https://github.com/simple-icons/simple-icons): pc, dolphin, retroarch.

**drawn** (arcade only): `node scripts/make-badges.js`, path-glyphs on the REPRO wordmark grid, unbranded on purpose.

## emulators

real marks where the project ships one, one color, same folder: dolphin, pcsx2, duckstation, xemu, xenia, retroarch, ppsspp, rpcs3, cemu, vita3k, melonds, azahar, flycast, shadps4.

- `pcsx2` from the project's own `AppBanner.svg`, `--keep-white` (their icon is white ink on a colored plate).
- `xemu`, `azahar`, `shadps4`, `vita3k` had vector marks in-repo, flattened directly.
- `duckstation`, `cemu`, `xenia`, `flycast` ship **no vector mark**, only a shaded app-icon png. traced to a silhouette with `scripts/trace-png.py` (see below) instead of drawing a fake one.

## workflow

**add or replace a mark from an svg source:** put the source in a folder, then

```
npx electron scripts/flatten-svg.js <folder> <id>
```

recolors every shape to #000, drops whites/gradients/clip junk, keeps evenodd holes, tightens the viewBox to the ink.
- source draws the mark in white on a colored plate → add `--keep-white`.
- source stacks gloss/shadow/plate layers on top of the ink → `npx electron scripts/svg-explode.js <file>` renders every element numbered (also written as `<file>-explode.png`) so you can pick with `--only=2,3,8,9`. `--only` keeps exactly what you list, whites included — it doesn't apply the white/dark drop logic.

**add or replace a mark from a png-only source** (a shaded app icon, no vector anywhere): rasterize any svg source to a png first with `npx electron scripts/svg-to-png.js <in.svg> <out.png>`, then

```
python scripts/trace-png.py <icon.png> <id> --mode=<alpha|dark|light|hue:H-H>
```

potrace-traces the icon into a single-color silhouette svg. `--mode` picks what counts as ink: `alpha` (whole-icon silhouette), `dark`/`light` (thresholded on luminance, `--threshold=`), `hue:200-260` (pull one colored element out of a multicolor icon by hue range, `--turd=` to raise the speckle-removal size if noise survives). `--drop-outer=N` throws away the N largest-bbox traced curves — for icons where the recognizable glyph sits inside a rounded-rect plate or ring that traces as its own curve(s). needs `pip install potracer numpy pillow` (already on this machine).

**proof sheet:** `npx electron test/logosheet.js` → `sketches/logo-sheet.png`. every logo at the three sizes the app uses (sidebar 36×18, banner 70×22, couch hero 50×16) in its system color, plus a note on where each one came from (commons / simple-icons / traced / drawn / project svg).

add a system: `systems.json` in the repo root + a `<id>.svg` here. add an emulator: `recipes/<id>.json` (Tyler's side) + a `<id>.svg` here.
