# recipes

one json per emulator. REPRO reads every file in this folder at startup. to add an emulator we don't know, copy one, change the fields, PR it.

fields:

- `id` short name, unique
- `name` what the ui shows
- `systems` list of system ids this emulator runs (`gc`, `ps2`, `ps1`, `xbox`, `x360`, ...)
- `exe` binary filename patterns per os, `{ "win": [...], "linux": [...] }` (case-insensitive, `*` wildcard). used by auto-detect. a plain list still works and means windows-only
- `flatpak` flathub app id (linux). detected via `flatpak list`, launched with `flatpak run`
- `extensions` per system, which rom file extensions belong to it
- `args` per system, the launch args. tokens: `{rom}` full rom path, `{dir}` folder of the exe
- `saves` per system, where saves live, relative to the emulator's data dir. `{serial}` = game serial where known. `{data}` is filled by REPRO from `dataDirs`
- `dataDirs` per os, where the emulator keeps its config/saves. checked in order, first that exists wins. vars: `{exe}` folder the binary is in, `{home}`, `{docs}` = ~/Documents, windows `{appdata}` / `{localappdata}`, linux `{xdg_config}` / `{xdg_data}`, and `{var}` = the flatpak sandbox (`~/.var/app/<id>`), only used when the emulator is the flatpak. a path whose variable doesn't exist on this os is skipped
- `source` url + date where the args were verified. no recipe without one.

every flag in the shipped recipes was read from the emulator's own source, not a forum post. keep it that way.
