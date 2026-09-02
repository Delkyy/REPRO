# recipes

one json per emulator. REPRO reads every file in this folder at startup. to add an emulator we don't know, copy one, change the fields, PR it.

fields:

- `id` short name, unique
- `name` what the ui shows
- `systems` list of system ids this emulator runs (`gc`, `ps2`, `ps1`, `xbox`, `x360`, ...)
- `exe` list of exe filename patterns (case-insensitive, `*` wildcard). used by auto-detect
- `extensions` per system, which rom file extensions belong to it
- `args` per system, the launch args. tokens: `{rom}` full rom path, `{dir}` folder of the exe
- `saves` per system, where saves live, relative to the emulator's data dir. `{serial}` = game serial where known. `{data}` is filled by REPRO from `dataDirs`
- `dataDirs` where the emulator keeps its config/saves. checked in order, first that exists wins. `{exe}` = folder the exe is in, `{docs}` = user Documents, `{appdata}` = Roaming AppData
- `source` url + date where the args were verified. no recipe without one.

every flag in the shipped recipes was read from the emulator's own source, not a forum post. keep it that way.
