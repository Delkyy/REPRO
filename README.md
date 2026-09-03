# REPRO

an emulator hub that actually does what you want. one folder, every emulator, every game, every save.

![screenshot](docs/screenshot.png)

## what it does

- scans your whole PC for roms. finds them wherever they are, even if you move them later.
- detects your emulators automatically. dolphin, pcsx2, duckstation, xemu, xenia — just point and go.
- keeps saves organized. auto-snapshots before every launch, slot management, restore anytime.
- pulls box art and descriptions from IGDB so your library looks like a library.
- couch mode for the TV, desktop mode for the PC. controller-navigated with a guide overlay (like the xbox button).
- portable. the whole thing runs from one folder. copy it anywhere, it works.

## setup

download the latest portable exe from [releases](../../releases). drop it somewhere, run it.

on first launch it'll scan for emulators and ask where your roms are. or hit **File → Scan whole PC** and let it find everything itself.

for box art, grab a free Twitch developer key at [dev.twitch.tv](https://dev.twitch.tv) and paste it into Settings → Art scraper. takes about 2 minutes.

## emulators

works with any emulator via recipe files. ships with:

| system | emulator |
|--------|----------|
| GameCube / Wii | Dolphin |
| PS1 | DuckStation |
| PS2 | PCSX2 |
| Xbox | xemu |
| Xbox 360 | Xenia |

add more by dropping a `.json` recipe in the `recipes/` folder.

## adding your own emulator

copy any existing file in `recipes/` and fill in the exe name and launch args. that's it.

## themes

drop a folder into `themes/` with a `theme.css` and `theme.json`. three ship by default: billet, manual, crt.

## why

every existing launcher makes you configure everything by hand or locks you into their library format. REPRO just finds your stuff and gets out of the way.

## license

MIT
