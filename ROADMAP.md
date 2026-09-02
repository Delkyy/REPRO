# REPRO

open-source emulator hub. one folder, every emulator, every game, every save. couch mode for the controller, desktop mode for the mouse, themes as folders.

## why another one

playnite, launchbox, es-de all exist. they're somebody else's opinion about how it should look, saves are an afterthought, and half of them make you configure every path by hand. REPRO:

- detects your emulators and roms on first run, asks once about anything it can't place
- drop anything on the window (exe, rom, folder, bios) and it works out what it is
- real save manager: slots, restore, rename, history, auto-snapshot before every launch
- portable by default. everything (config, art cache, saves, roms if you want) lives in the REPRO folder. move it, back it up, put it on a usb stick
- plain json on disk, no registry, no phone-home
- themes and emulator recipes are folders/files people can share and PR

## stack

electron + plain html/css/js. reason: the ui is css (theming, couch tiles, controller nav in a webview is easy), the backend is node (spawn exe, watch folders, sqlite for the library cache). hub sleeps while an emulator runs so it isn't eating ram behind your game.

## folder layout (portable)

```
REPRO/
  repro.exe
  config.json          # everything user-set, hand-editable
  library.db           # scan cache, rebuildable
  recipes/*.json       # per-emulator: exe patterns, systems, extensions, args, save paths
  themes/<name>/       # theme.json + theme.css
  art/                 # cached covers/screens
  saves/<game>/<slot>/ # save manager snapshots
  emulators/           # optional: put emulators here and it's fully self-contained
  roms/<system>/       # optional: same
```

## milestones

### M1 library + launch
- scan configured folders, guess system by extension, cache in sqlite
- cards with art (local first, scraper later), no-art state designed not ignored
- desktop mode: sidebar filters, grid, detail panel
- couch mode: rows per system, continue row, controller nav, kill-and-return hotkey
- launch with recipe args, track playtime + last played ourselves
- first-run wizard: detect emulators/roms, show what it found, go

### M2 saves
- per-game save location from recipe (memcard file, GC card, folder)
- snapshot / restore / rename / history, auto-snapshot before launch
- savestate browser using the emulator's own screenshots
- xbox (xemu): saves live inside xbox_hdd.qcow2, so slots = hdd snapshots. hard, do last
- pcsx2/duckstation: switch to per-game memory cards so slots are per game

### M3 themes + layouts
- theme = folder with css vars + json (name, author, fonts)
- card layout options: what shows on a card, grid size, row order
- ship 3: slate (default), crt, paper

### M4 add anything
- drag-drop exe / rom / folder / bios, detect via recipes, test-launch button
- unsorted bucket for things the scan couldn't place
- bios checker per system with the exact filename it wants
- recipes contributed as json PRs

### M5 the pile
- metadata scraping (igdb / screenscraper / thegamesdb), pscoverdl for ps1/ps2
- collections / tags / favorites / hide, multi-disc (.m3u)
- retroachievements badges, screenshot gallery, discord presence
- steam non-steam shortcut export
- import from playnite / launchbox / es-de
- emulator update checks
- cloud sync folder, controller profiles per game, linux/deck build, plugin api

## sketches

`sketches/001-repro/index.html`, open in a browser. `?mode=couch`, `?theme=crt|paper`, `?ov=1&focus=N` for screenshots.
