# Desktop game launchers — screen-by-screen interaction research

_Research for REPRO desktop mode (sidebar + grid + detail panel). Companion to `research-frontends.md` (themes/visuals). Compiled 2026-09-01 from official docs, vendor help pages, changelogs and reviews. Every claim carries a URL; where a page was blocked or a detail could not be sourced it says so explicitly._

Method note: `web_search` + `web_extract` only. Blocked/failed pages: Xbox Support "game installation issues" and "What's new" pages returned a loading shell / timeout; Reddit is not supported by the extractor; GOG's own changelog is reported as access-denied to automated requests (per shattered.io); Heroic's FAQ page returned only a skip-link. Everything below comes from pages that did return content.

---

## 1. Steam desktop library (2019 redesign)

**Sources:** Valve's launch page https://store.steampowered.com/libraryupdate · GamingLinkMedia review (Sep 2019) https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee · Time to Loot hands-on https://www.timetoloot.com/gaming/steam-library-update-is-here/ · Time to Loot follow-up on dynamic collections https://www.timetoloot.com/gaming/reorganising-my-steam-library/ · Steam Client Beta feedback thread https://steamcommunity.com/groups/SteamClientBeta/discussions/3/2552901289739843520/

**(1) Top-level chrome.** Steam keeps a classic text menu bar: users reach settings by clicking "'Steam' in the top left corner and click 'Settings'" (https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee). Beneath it are Store / Library / Community / Profile navigation buttons (Valve's beta notes mention making those "navigation buttons respond better", https://store.steampowered.com/libraryupdate). During the beta Valve "Replaced Home and Collections navigation buttons with Library menu options" and shipped "slimmer Home and Collections buttons" for small windows (https://store.steampowered.com/libraryupdate).

**(2) Sidebar.** Left column is a searchable game list. At the top: a large Home button (returns to the shelves home) and a grid button that shows only collections (https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee). Below Home: a "Filtered List" dropdown to show/hide games, software, videos, tools; a "Sort By Recent Activity" toggle; a "Show Only Ready To Play Games" toggle (installed or streamable); then the search box and a Filter button (https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee). The list is grouped by collections; on first launch the sidebar is "pre-populated with categories of any games you've categorized in the past" (same source). Empty collections are hidden from the list, and Linux/macOS get a "filter by platform" button (https://store.steampowered.com/libraryupdate). No per-platform logos in the sidebar — grouping is by user collections, not systems.

Collections: drag-and-drop games between collections, multi-select supported, with visual feedback ("the border in the visual display on the right turning solid to indicate the currently hovered category"); "you can even drag a game up to the collections button to start a new one" (https://www.timetoloot.com/gaming/steam-library-update-is-here/ ; https://store.steampowered.com/libraryupdate). **Dynamic collections** are built from the Filter panel using built-in toggles plus store tags; new purchases matching the rule auto-join (https://www.timetoloot.com/gaming/steam-library-update-is-here/). Known weakness: filters are always AND, no OR, and store tags are inconsistent, so users abandon dynamic collections (https://www.timetoloot.com/gaming/reorganising-my-steam-library/).

**Home page / shelves.** Home shows "What's New" (developer updates) and "Recent Games" rows at the top, then "All games" below; user-added shelves are per-collection rows that can be sorted by name, playtime, friends playing, release date or Metacritic, toggled between one row and full expansion, reordered by dragging the shelf header and deleted with a trash icon on the header (https://www.timetoloot.com/gaming/steam-library-update-is-here/ ; https://store.steampowered.com/libraryupdate). Steam added a "Scroll To Top" button just above the downloads tab (https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee). Cover art: grid defaults to portrait 2:3 boxes; games with only 16:9 capsules get letter-boxed, which reviewers called "Not a good look" (same source).

**(3) Game detail page.** Header is a wide hero banner with the game logo overlaid; users can set custom header and logo artwork and position the logo "by right clicking in the header area of a game details page" (https://store.steampowered.com/libraryupdate). Immediately under the hero is the "play bar": the Play button on the left, followed by last played, play time and achievements earned; then a links bar (Store page, Community Hub, Groups, Discussions, Guides, Support) (https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee). The body has an activity/news feed with community content; a right sidebar lists achievements, trading cards, screenshots and your review (same source). A "Post Game Summary" shows achievements/screenshots/cards from the last session at the top (https://store.steampowered.com/libraryupdate). "Show more details" lets you zoom the cover art (same). Non-Steam games get a screenshots section too (same). Per-game actions live in the right-click context menu: Manage → Remove From Library, uninstall (new UI), screenshot delete/manage (https://store.steampowered.com/libraryupdate). Steam's Properties dialog (Local Files / Updates / Language / Betas tabs) is referenced by community threads but the help page for it did not load — treat as unsourced here.

**(4) Settings.** Reached via the Steam menu → Settings; a "disable community content" toggle was added during the beta (https://store.steampowered.com/libraryupdate). Skin selection was reset once at launch to avoid broken skins (same).

**(5) Emulator/BIOS/saves access.** Not applicable (no emulation).

**(6) Empty/first-run.** Sidebar pre-seeded from old categories; Recent Friend Activity shelf no longer disappears when empty (https://store.steampowered.com/libraryupdate). Beta feedback: some users found the new library "overwhelming" and asked for the old minimal list view back (https://steamcommunity.com/groups/SteamClientBeta/discussions/3/2552901289739843520/).

**Screenshots:** home https://miro.medium.com/v2/resize:fit:1920/1*A6kPNabLR-Y2kuUlunbsIA.png · collections https://miro.medium.com/v2/resize:fit:1920/1*1qY9mUNU72sgPWd22UdM9g.png · game page https://miro.medium.com/v2/resize:fit:1920/1*mxTLq8FYgYmSONoxz3rkow.png · drag-and-drop https://www.timetoloot.com/wp-content/uploads/2019/09/Steam-Library-Beta-Collections-Drag-and-Drop-1024x555.jpg · filter panel https://www.timetoloot.com/wp-content/uploads/2019/09/Steam-Library-Beta-Filtered-List-1024x555.jpg

---

## 2. Playnite (desktop mode)

**Sources:** official manual — desktop mode https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html · configuring https://api.playnite.link/docs/manual/gettingStarted/configuringPlaynite.html · filters https://api.playnite.link/docs/manual/features/filtersAndFiltersPresets.html · library manager https://api.playnite.link/docs/manual/library/libraryManager.html · adding emulators https://api.playnite.link/docs/manual/features/emulationSupport/addingNewEmulators.html · adding emulated games https://api.playnite.link/docs/manual/features/emulationSupport/addingEmulatedGames.html · themes https://api.playnite.link/docs/manual/features/themesSupport/installingThemes.html · setup guide https://shattered.io/playnite-setup-guide/ · sidebar issue https://github.com/JosefNemec/Playnite/issues/3537

**(1) Top-level chrome.** No File/Edit menu bar. A single "Playnite icon" opens the **Main menu** (https://api.playnite.link/docs/manual/gettingStarted/configuringPlaynite.html). Documented Main-menu entries: `Library` (→ `Configure emulators…`, `Library manager…`), `Add Game` (→ `Emulated Game`), `Update game library` (→ `Update emulated folders`), `Add-ons…`, `Settings…`, `View` (→ `Sidebar` on/off) (https://api.playnite.link/docs/manual/features/emulationSupport/addingNewEmulators.html ; https://api.playnite.link/docs/manual/features/emulationSupport/addingEmulatedGames.html ; https://api.playnite.link/docs/manual/library/libraryManager.html ; https://github.com/JosefNemec/Playnite/issues/3537). Above the library is a **Top panel** for "game filtering, panel toggling, view switching, and various actions", including Grouping and Sorting buttons and a Filter Presets button (https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html ; https://api.playnite.link/docs/manual/features/filtersAndFiltersPresets.html).

**(2) Sidebar.** Desktop mode is five panels: (1) Sidebar "Quickly switch views or launch software added to Playnite", (2) Top panel, (3) Explorer panel "Quickly filter your game library by any property", (4) Library panel, (5) Filter panel (https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html). The Sidebar is a narrow icon rail (views + extension buttons); the Explorer panel is the property browser — selecting an item there applies it to the Filter panel (https://api.playnite.link/docs/manual/features/filtersAndFiltersPresets.html). Hiding the sidebar requires Main menu → View → Sidebar; a user asked for a quick toggle or hover-reveal (https://github.com/JosefNemec/Playnite/issues/3537). Keyboard: `CTRL-G` toggles Filter panel, `CTRL-E` toggles Explorer panel, `CTRL-F` focuses search, `F11` opens Fullscreen mode, `F5` refreshes library, `CTRL-D` opens metadata download (https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html). Platform icons/covers/backgrounds are assignable per platform in Library Manager and used as fallback art for games missing images (https://api.playnite.link/docs/manual/library/libraryManager.html).

**(3) Game detail.** Three library views: **Details** = "compact vertical list view with a panel on the right displaying game details and media"; **Grid** = covers, where hovering and clicking an ℹ️ button opens "a compact panel with game details"; **List** = sortable table with right-click column chooser (https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html). Right-click on a game offers Download Metadata for a single entry; manual edits are preserved if "only missing fields" is chosen in bulk downloads (https://shattered.io/playnite-setup-guide/). Multi-disc games are grouped and can be split/merged via right-click (https://api.playnite.link/docs/manual/features/emulationSupport/addingEmulatedGames.html).

**(4) Settings.** Main menu → Settings…; sections documented: **General** (start in Fullscreen, minimize behaviour), **Appearance** (element visibility, font, panel placement, cover height, spacing; `Appearance > General > Theme` dropdown; `Appearance > Advanced` "Missing game * source" options), **Updating** ("Scan emulation folders"), playtime import, **Auto Close Clients**, **Backups**, **Add-ons** (https://api.playnite.link/docs/manual/gettingStarted/configuringPlaynite.html ; https://api.playnite.link/docs/manual/features/themesSupport/installingThemes.html ; https://api.playnite.link/docs/manual/library/libraryManager.html). Desktop and Fullscreen modes have separate settings and themes; the theme dropdown lives at `Settings > Appearance > General` (desktop) and `Settings > Visuals` (fullscreen), and a restart is prompted (https://api.playnite.link/docs/manual/features/themesSupport/installingThemes.html). Themes install from `Add-ons… > Browse > Themes Desktop / Themes Fullscreen` with an Install button on the right, then Save (same). Playnite has no native theme-options UI; a community ThemeModifier extension fills that gap (same).

**Emulator configuration (dedicated window, not settings).** `Main menu > Library > Configure emulators…` opens a window with tabs for Emulators and **Auto-scan configurations**. Emulators: `Import` runs a wizard — `Scan folder`, verify list, `Import` — auto-detecting known emulators; or `Add` manually with Name, Installation Folder, Emulator specification, then Add a profile (built-in or Custom) (https://api.playnite.link/docs/manual/features/emulationSupport/addingNewEmulators.html). Auto-scan: `Add` → Name, `Scan folder`, `Scan with the emulator` + Profile → Save; then scans run automatically during library update (toggle per-scanner or globally) or via `Add Game > Emulated Game` (https://api.playnite.link/docs/manual/features/emulationSupport/addingEmulatedGames.html). Pitfall: the emulator picker needs the .exe not a folder (https://shattered.io/playnite-setup-guide/).

**(5) BIOS/saves.** No BIOS or save-file UI documented; Playnite delegates to the emulator.

**(6) First-run / add-game.** First launch opens a wizard asking which storefronts you use, offers to detect existing installs, lets you skip to an empty library, and asks whether to enable automatic metadata downloads (https://shattered.io/playnite-setup-guide/). Filter presets ship pre-configured and users save more via a 💾 button on the Filter panel (https://api.playnite.link/docs/manual/features/filtersAndFiltersPresets.html).

**Screenshots:** panel map https://api.playnite.link/docs/manual/gettingStarted/images/playniteDesktopMode_UI.jpg · details view https://api.playnite.link/docs/manual/gettingStarted/images/playniteDesktopMode_DetailsView.jpg · grid https://api.playnite.link/docs/manual/gettingStarted/images/playniteDesktopMode_GridView.jpg · list https://api.playnite.link/docs/manual/gettingStarted/images/playniteDesktopMode_ListView.jpg · emulator import https://api.playnite.link/docs/manual/features/emulationSupport/images/Emulation_EmulatorImport.jpg · manual emulator https://api.playnite.link/docs/manual/features/emulationSupport/images/Emulation_ManualEmulatorImport.jpg · scanner https://api.playnite.link/docs/manual/features/emulationSupport/images/Emulation_ScannerConfig.jpg · settings appearance https://api.playnite.link/docs/manual/gettingStarted/images/gettingStarted_SettingsAppearance.png · library manager https://api.playnite.link/docs/manual/library/images/libraryManager_window.jpg · filters https://api.playnite.link/docs/manual/features/images/filtersAndFiltersPresets_Filters.jpg

---

## 3. GOG Galaxy 2.0

**Sources:** GOG news "6 cool things" https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed · Brit Gamer review (2020) https://medium.com/brit-gamer/why-you-should-check-out-gog-galaxy-2-0-d708a7469a4c · shattered.io setup guide https://shattered.io/gog-galaxy-setup-guide/

**(1) Chrome.** Custom window with a top navbar. Global search opens with Ctrl+F/Cmd+F "or by clicking on the search icon in the top-left corner"; a bookmark icon appears in the top navbar once a filtered/sorted view is active (https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed). No File/Edit menu bar is described in any source.

**(2) Sidebar.** Left sidebar lists platforms — "If you prefer to see just games on a particular launcher, it's right there on the side of the screen" (https://medium.com/brit-gamer/why-you-should-check-out-gog-galaxy-2-0-d708a7469a4c). Saved views ("bookmarks") pin to the sidebar, can be renamed and reordered by dragging, and auto-include new games matching their filters (https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed). A subscriptions section groups Game Pass/Uplay+/Origin Access games (same). A cross-platform friends list docks on the right "just make sure the window of the app is wider than 1500 px" (same). Filter sidebar covers platform, installed/not-installed, genre, tag; tags via right-click → Manage Tags (https://shattered.io/gog-galaxy-setup-guide/).

**(3) Game page.** Clicking a game shows a preview page merging public metadata with your own play data — playtime, achievements, images, description, friend progress (https://medium.com/brit-gamer/why-you-should-check-out-gog-galaxy-2-0-d708a7469a4c). Right-click → Hide game (https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed). Cloud-save support is shown per game in "the individual game's store page or in-client details panel" (https://shattered.io/gog-galaxy-setup-guide/). No source describes a "browse local files" action; not claimed.

**(4) Settings.** `Settings → Integrations` (official Epic/Xbox + community plugins appear here after install; disconnect here), `Settings → Cloud Saves`, `Settings → In-game` (overlay) (https://shattered.io/gog-galaxy-setup-guide/). Community plugins are dropped into `plugins\installed\` on disk, and a search box inside the app looks up integrations from trusted repos (https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed ; https://shattered.io/gog-galaxy-setup-guide/).

**(5) Emulator/BIOS.** N/A.

**(6) Add-game flow.** Global search returns "basically any game that ever existed"; click a result, mark it as owned, then link an executable to launch it and track playtime (https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed).

**Screenshots:** bookmarks gif https://items.gog.com/news/bookmarks.gif · friends list https://items.gog.com/news/GLX-friendslist.jpg · global search https://items.gog.com/news/globalsearch2.png · library 2020 https://miro.medium.com/v2/resize:fit:1000/1*driyWVlu6VJ3gZhMV7oItw.jpeg · game page https://miro.medium.com/v2/resize:fit:700/1*ZLWRhJpwzR7EpkVCnNHnTg.jpeg · integrations list https://miro.medium.com/v2/resize:fit:700/1*-RJ7dBg1s3La1hd5ioiSqQ.jpeg

---

## 4. Heroic Games Launcher

**Sources:** Boiling Steam review https://boilingsteam.com/a-look-at-heroic-games-launcher/ · official site https://heroicgameslauncher.com/ · shattered.io guide https://shattered.io/heroic-games-launcher-setup-guide/ · GitHub issue on game-settings cloud-saves tab https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/5003

**(1) Chrome.** Electron app, no menu bar described. Navigation is a left sidebar; a top filter dropdown selects installed/uninstalled/recent (https://boilingsteam.com/a-look-at-heroic-games-launcher/).

**(2) Sidebar.** "On the left-hand sidebar, click the Login (or Add Account) button for each store" — Epic, GOG, Amazon are independent (https://shattered.io/heroic-games-launcher-setup-guide/). Sidebar also gives access to the Library tab, store browsers (Epic/GOG/Amazon in-app), a download queue, Wine Manager, Settings, and the Wiki (https://heroicgameslauncher.com/ ; https://boilingsteam.com/a-look-at-heroic-games-launcher/). Tiles: installed games are in colour, uninstalled are black-and-white (https://boilingsteam.com/a-look-at-heroic-games-launcher/).

**(3) Game page.** Clicking a tile opens a page with description, download and install size, links to the store page and ProtonDB, install-location picker, system requirements, and a big INSTALL button (https://boilingsteam.com/a-look-at-heroic-games-launcher/). Official site: "description, publisher, download and install size, time played and more" (https://heroicgameslauncher.com/). A small download icon on a tile's lower-right opens a brief dialog to INSTALL or IMPORT an existing install (https://boilingsteam.com/a-look-at-heroic-games-launcher/). Per-game settings are opened from "the cog icon in the thumbnail of the game or by clicking 'Settings' on the right pane" of the game page, and include: Wine/Proton version, Wine prefix path, verify/repair files, FSR/esync/fsync, run winecfg/winetricks, FPS counter, GameMode, game arguments (same). Later versions add a Cloud Saves tab in game settings with a "Trying to detect the correct save folder" step and an editable path + Sync button (https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/5003). Custom artwork: "Rename a game and pick custom cover and square art straight from SteamGridDB" (https://heroicgameslauncher.com/). GOG achievements on the game page were added in v2.21 (https://shattered.io/heroic-games-launcher-setup-guide/).

**(4) Settings.** Global Settings: language, default install path, tray icon, custom Wine/Proton paths, Discord RPC, desktop/Start-menu shortcuts, NVIDIA prime (https://boilingsteam.com/a-look-at-heroic-games-launcher/). `Settings → Wine/Proton Manager` downloads and version-manages Wine-GE/Proton-GE (Linux) or Wine-Crossover/Staging/GPTK (macOS) (https://shattered.io/heroic-games-launcher-setup-guide/ ; https://heroicgameslauncher.com/). Settings also has "add Heroic to Steam as a non-Steam game" (https://shattered.io/heroic-games-launcher-setup-guide/). Themes: "Custom themes, including the famous Dracula theme" (https://heroicgameslauncher.com/).

**(5) Files/saves.** Prefix path and save-folder path are editable text fields in per-game settings (see above). Runtimes downloaded via Wine Manager live in isolated prefixes (https://shattered.io/heroic-games-launcher-setup-guide/).

**(6) First run / empty.** First launch asks you to log in; the Epic flow originally required pasting an SID from a browser (https://boilingsteam.com/a-look-at-heroic-games-launcher/). Install flow: "open the Library tab, click a game's tile, choose an install location and language if prompted, then click Install" (https://shattered.io/heroic-games-launcher-setup-guide/). Download queue shows live download/disk speed, pause/resume (https://heroicgameslauncher.com/). Also ships a controller "Console Mode" (same).

**Screenshots:** library https://i.imgur.com/DFeRmYd.png · first run https://i.imgur.com/joQC1SQ.png · global settings https://i.imgur.com/sMbVNEj.png · game page https://i.imgur.com/QET2VQN.png · quick install dialog https://i.imgur.com/I65fp95.png · prefix setting https://i.imgur.com/dBP4GWx.png · official: game page https://heroicgameslauncher.com/_next/static/images/02-gamepage-188c2fb188e037831a07e430af872a70.webp · downloads https://heroicgameslauncher.com/_next/static/images/03-downloads-767f10f0a009d4fb7702b91574221db2.webp · edit game https://heroicgameslauncher.com/_next/static/images/06-edit-game-c4ca00f52e5a03f513dbf5c58d064887.webp · wine manager https://heroicgameslauncher.com/_next/static/images/05-wine-manager-d3478cb814cd3cb03ab9b116880b6410.webp · wine settings https://heroicgameslauncher.com/_next/static/images/09-wine-settings-20a3176b7871831be74a7324890a4940.webp

---

## 5. Lutris

**Sources:** v0.5.18 release notes https://github.com/lutris/lutris/releases/tag/v0.5.18 · v0.5.20 release notes https://github.com/lutris/lutris/releases/tag/v0.5.20 · v0.5.21 notes via GamingOnLinux https://www.gamingonlinux.com/2026/02/lutris-v0-5-21-and-v0-5-22-arrive-with-valves-sniper-runtime-support-and-new-game-runners/ · shattered.io guide https://shattered.io/lutris-setup-guide/ · remove-game issue https://github.com/lutris/lutris/issues/3416 · installer docs https://github.com/lutris/lutris/blob/master/docs/installers.rst · FAQ https://lutris.net/faq

**(1) Chrome.** GTK app (https://lutris.net/faq). Games are added with "the plus button in the corner"; the redundant "Add Games" menu item was removed in 0.5.20 (https://github.com/lutris/lutris/releases/tag/v0.5.20). Search box supports "fancy tags like 'installed:yes' or 'source:gog', with explanatory tool-tip", and "A new filter button on the search box can build many of these fancy tags for you" (https://github.com/lutris/lutris/releases/tag/v0.5.18). No traditional menu bar is described in the sources.

**(2) Sidebar.** Lists every supported source (Steam, GOG, Epic, Battle.net, EA, Ubisoft, Humble, Amazon…) plus runners and platforms; clicking a source opens that service's login (https://shattered.io/lutris-setup-guide/). 0.5.18 added an "Uncategorized" view to the sidebar; 0.5.21 added "collapsible sidebar sections" and "Fallback icons for sidebar buttons when icon theme is missing them" (https://github.com/lutris/lutris/releases/tag/v0.5.18 ; https://www.gamingonlinux.com/2026/02/lutris-v0-5-21-and-v0-5-22-arrive-with-valves-sniper-runtime-support-and-new-game-runners/). Library shows cover-art rather than banners by default since 0.5.18, and dark theme by default (https://github.com/lutris/lutris/releases/tag/v0.5.18). 0.5.20 added an "Option to hide a source's games from also appearing in the Games view" (https://github.com/lutris/lutris/releases/tag/v0.5.20).

**(3) Game detail / actions.** Per-game **Configure** dialog has Game options / Runner options / System options tabs; the exe path is under "Configure > Game options" and DXVK/env toggles under "System options tab" (https://shattered.io/lutris-setup-guide/). 0.5.20 added "little buttons to select cover-art, banner and icons via URL in game configuration" (https://github.com/lutris/lutris/releases/tag/v0.5.20). Context menu has "Manual Script" and "Create Steam Big Picture shortcut" (same). Uninstalled games keep a library entry for playtime; "Remove" fully deletes an uninstalled game (https://github.com/lutris/lutris/issues/3416).

**(4) Settings (Preferences).** Preferences has a **Runners** tab listing Wine, GE-Proton (via umu), DOSBox, ScummVM, MAME, Dolphin etc., each with a version manager (https://shattered.io/lutris-setup-guide/). A **System** tab includes the Lutris log (https://github.com/lutris/lutris/releases/tag/v0.5.18). Options that don't work on Wayland are hidden on Wayland (same).

**(5) BIOS/saves.** "Emulator BIOS file location (used by libretro) may be set in Preferences" as of 0.5.20 (https://github.com/lutris/lutris/releases/tag/v0.5.20). All library data, prefixes and scripts live under `~/.local/share/lutris` (https://shattered.io/lutris-setup-guide/). No save-manager UI.

**(6) First run / add game.** "Open Lutris for the first time and you land on an empty library with a sidebar listing every supported source" (https://shattered.io/lutris-setup-guide/). Community YAML install scripts from lutris.net run in-app; local `.lutris` files open via double-click file association (https://github.com/lutris/lutris/blob/master/docs/installers.rst ; https://github.com/lutris/lutris/releases/tag/v0.5.20).

**Screenshot:** https://uploads.golmedia.net/uploads/articles/article_media/13536460301772013734gol2.webp

---

## 6. Xbox app for PC

**Sources:** gHacks sidebar redesign https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/ · Dovetail support guide https://support.dovetailgames.com/hc/en-us/articles/28572822413458-How-to-Manage-Your-Games-Add-ons-on-the-Xbox-App-for-PC · Microsoft Q&A https://learn.microsoft.com/en-us/answers/questions/5222627/does-xbox-app-pc-has-verify-game-files-feature (Xbox Support pages blocked/timed out).

**(1) Chrome.** No menu bar. Gamertag in the top-left opens a menu with Settings, profile, Insider options; a bell icon opens a notification panel on the right; a persistent search bar stays at the top while scrolling (https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/).

**(2) Sidebar.** Four sections — Game Pass, My Library, Community, Store — with installed games listed below and active downloads (size, speed) shown in the sidebar; "There is no option to collapse the side panel" (https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/). A "Queue"/"Downloading" item sits at the bottom of the side panel (https://support.dovetailgames.com/hc/en-us/articles/28572822413458-How-to-Manage-Your-Games-Add-ons-on-the-Xbox-App-for-PC).

**(3) Game page / actions.** My Library → "All games" grid with a "GAMES I OWN" filter chip; Install picks a location; game page has an "Add-ons for this game" section with Show All (https://support.dovetailgames.com/hc/en-us/articles/28572822413458-How-to-Manage-Your-Games-Add-ons-on-the-Xbox-App-for-PC). Right-click → **Manage** opens a dialog with **General** (Uninstall) and **Add-ons** (checkbox list + Apply Changes) tabs, and a **Files** tab with "Verify and repair" (same ; https://learn.microsoft.com/en-us/answers/questions/5222627/does-xbox-app-pc-has-verify-game-files-feature). Note the Manage dialog can make the app "unresponsive" while loading (Dovetail). Moving an install is done from Windows Apps & Features, not the app (Dovetail).

**(4)–(6).** Settings accessed via the gamertag menu; install-folder choice added 2022 (https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/). No emulator/BIOS relevance.

**Screenshots:** https://www.ghacks.net/wp-content/uploads/2022/03/Xbox-PC-app-update-brings-a-redesigned-sidebar.jpg · https://www.ghacks.net/wp-content/uploads/2022/03/Xbox-PC-app-new-sidebar.jpg · library https://support.dovetailgames.com/hc/article_attachments/28572821966738 · filters https://support.dovetailgames.com/hc/article_attachments/28572850105490

---

## 7. EA app

**Source:** EA Help https://help.ea.com/en/articles/platforms/download-and-play-ea-app-games/

**(1) Chrome.** Hamburger: "select the menu icon (three horizontal lines) in the top-left corner of the app and choose Application settings"; the same menu has "Go offline". On Mac the native menu bar is used instead (https://help.ea.com/en/articles/platforms/download-and-play-ea-app-games/).

**(2) Sidebar.** Left panel has Home / Browse / Library pages and an "Installed games" list (same).

**(3) Game page.** Selecting a game opens the **Game Hub**, "a page where you can download or buy the game and find out more about it" (same). On a library tile: an arrow in the bottom-right starts install (choose Install location + Language → Next → accept terms → Download); a three-dot menu in the top-right offers **Manage add-ons**, **Repair**, and **View Properties** (which exposes "Advanced launch options") (same). Cancel download via an X.

**(4) Settings.** Application settings has a **Download** tab with an **Updates** section: "Update games automatically" and "Enable background downloads" toggles (same).

**(5)–(6).** N/A / not documented.

**Screenshot:** https://help.ea.com/_images/seegk6e7ypwi/4CEA5GeVzSGJ6cJ7Z2lxBv/b409efae73830193a80d9765c9a294bd/ea-app-auto-updates.webp

---

## 8. Epic Games Launcher

**Sources:** verify files https://www.epicgames.com/help/technical-support-c90/general-support-c91/how-do-i-verify-game-files-in-the-epic-games-launcher-a3638 · cloud saves filter https://www.epicgames.com/help/epic-games-store-c-202300000001639/launcher-support-c-202300000001735/how-to-check-if-a-game-on-the-epic-games-store-supports-cloud-saves-a202300000014638

**(2)/(3).** Library is a grid/list; each game line has a three-dot menu → **Manage** → **Verify** button; verification "will not affect" saved data (https://www.epicgames.com/help/technical-support-c90/general-support-c91/how-do-i-verify-game-files-in-the-epic-games-launcher-a3638). Library has a **Filters** panel with a **Features** dropdown (e.g. Cloud Saves) that narrows the grid; store pages carry feature tags (https://www.epicgames.com/help/epic-games-store-c-202300000001639/launcher-support-c-202300000001735/how-to-check-if-a-game-on-the-epic-games-store-supports-cloud-saves-a202300000014638). Chrome/settings/first-run were not covered by any page that returned content; not claimed.

**Screenshot:** filters https://static-assets-help-prod.epicgames.com/help/img/7a9939cfcf9e863618555c1a1a9f9f82b8cf131e4422947d94751ed01a535da2.png

---

## 9. ES-DE (game details, metadata editor, first run)

**Source:** ES-DE USERGUIDE.md (master) https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md (raw: https://gitlab.com/es-de/emulationstation-de/-/raw/master/USERGUIDE.md)

**(1) Chrome.** Fullscreen controller UI with no window chrome; a **Main menu** (Scraper, UI settings, Sound, Input device, Game collection settings, Other settings, Utilities, Quit) and a per-list **Gamelist options menu** (Jump to, Sort, Filter, collection editing, Edit this game's metadata) (USERGUIDE sections "Main menu" and "Gamelist options menu").

**(2) System view.** Starts on the System view: a carousel of systems sorted by full name (custom sorting via `es_systems_sorting.xml`); the Gamelist view shows a per-system game counter "total and favorites", replaced by "filtered / total" (e.g. "19 / 77") when filters apply, and a folder icon when inside a folder (USERGUIDE "System view", "Gamelist view").

**(3) Game details.** Theme-driven layout, with **badges** for favorite, completed, kidgame, broken, collection, folder, manual, controller and alternative-emulator (only shown for per-game overrides) (USERGUIDE "Gamelist view"). Theme "variant triggers" switch to a simplified layout when no scraped media exists (same). Pressing X opens the Game media viewer (videos, images, PDF manuals). The **Metadata editor** edits Name, Sortname, Description, Rating, Release date, Developer, Publisher, Genre, Players, Favorite, Completed, Kidgame, Hidden, Broken, Exclude from game counter, Exclude from multi-scraper, Hide metadata fields, Times played, Play time, Controller, **Alternative emulator** (per-game override of the system default, with the system-wide choice "clearly marked in the selection screen"), Folder link; manual edits turn blue, scraper changes turn red; buttons are Scrape, Save, Cancel, Clear (removes media + gamelist entry, keeps file), Delete (removes the ROM file, with confirmation) (USERGUIDE "Metadata editor").

**(4) Settings.** Menu-tree settings; themes chosen in UI Settings with `Theme`, `Theme variant`, `Theme color scheme`, `Theme font size`; themes install via the built-in Theme downloader (git-based) or by dropping folders into `ES-DE/themes/` (USERGUIDE "Themes", "Theme downloader"). Alternative emulators per system are chosen under Other settings (USERGUIDE "Metadata editor").

**(5) Emulator/BIOS files.** Emulator locations are resolved by `es_find_rules.xml`; systems by `es_systems.xml`; both live in the app's resources with overrides in `ES-DE/custom_systems/` (USERGUIDE "Installation and first startup"). Utilities menu has **Orphaned data cleanup**, **Create/update system directories** (writes a `systeminfo.txt` per system listing extensions and launch commands, plus a root `systems.txt`), and **Rescan ROM directory** (USERGUIDE "Utilities").

**(6) First run / empty state.** If no games are found, a dialog explains you need games in the ROM directory and offers: import games with the built-in importer, change the ROM directory path, or generate the full system directory structure (USERGUIDE "Installation and first startup"; screenshot `images/es-de_ui_easy_setup.png` in the repo). UI modes Full/Kiosk/Kid restrict menus (USERGUIDE "UI modes").

**Screenshots (repo-relative under the GitLab tree):** `images/es-de_system_view.png`, `images/es-de_gamelist_view.png`, `images/es-de_metadata_editor.png`, `images/es-de_main_menu.png`, `images/es-de_ui_easy_setup.png` — browse at https://gitlab.com/es-de/emulationstation-de/-/tree/master/images

---

## 10. LaunchBox (desktop)

**Sources:** LaunchBox help — editing game details https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches · changelog https://www.launchbox-app.com/about/changelog · forum answer on emulator/platform linking https://forums.launchbox-app.com/topic/63816-re-linking-emulators-to-platforms/ · about page https://www.launchbox-app.com/about

**(1) Chrome.** Traditional Windows menu bar. Documented menus: **Tools > Manage > Platforms…**, **Tools > Manage Emulators**, **Tools > Manage > LaunchBox Themes & Media…**, **Tools > File Management > Create Data Backup…**, **Game** menu ("Open Game Folder…", "Game Manual"), **View** menu (box-art list fields) (https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches ; https://www.launchbox-app.com/about/changelog ; https://forums.launchbox-app.com/topic/63816-re-linking-emulators-to-platforms/). Options pages are searchable as of 14.0 (changelog).

**(2) Sidebar.** Left sidebar of platforms / playlists / platform categories with a platform details panel; platform documents appear "in the platform details panel and sidebar context menu"; a changelog entry fixes "the left sidebar could fail to show or hide" (https://www.launchbox-app.com/about/changelog). Arrange/filter by genre, platform, ESRB, developer, publisher, custom status/source fields (https://www.launchbox-app.com/about). 14.0 added an "Arrange By scrollbar" with group markers and hover labels, and a "Default Image Group" setting (changelog).

**(3) Game details / edit.** Game Details panel shows metadata, media carousels and RetroAchievements (changelog). Right-click → **Edit > Edit Metadata/Media…** (Ctrl+E) opens an editor with three sections: **Metadata** (title, platform, DB match, notes, custom fields, Additional Versions, Additional Apps), **Media** (images by type, videos, docs, links, music), **Launching** (primary file; "Use an Emulator" flips the label to "ROM File (Emulation is enabled)"; per-game emulator choice and "Use Custom Command-line Parameters" which *replace* rather than append platform defaults) (https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches). "Search for Metadata" shows Best Match then Other Possible Matches; "Download Media…" per media page; **Remove Image deletes the file from disk on OK** (same). Multi-select → Bulk Edit Wizard (same). Badges: Progress badge etc. under Badges > Game Attributes (changelog).

**(4) Settings / emulators.** Emulators are linked to platforms via the **Associated Platforms** tab in Manage Emulators; "Scrape As" is a platform-level setting in Manage Platforms (https://forums.launchbox-app.com/topic/63816-re-linking-emulators-to-platforms/ ; https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches). Manage Emulators has an "Update All" button and an "Open Emulator" context item (https://www.launchbox-app.com/about/changelog). Themes and media packs (clear logos, badges, platform icons) are managed in Tools > Manage > LaunchBox Themes & Media (changelog).

**(5) Files.** Game > Open Game Folder opens Explorer at the game path (changelog v1.1). No BIOS/save UI documented.

**(6) First run.** A **Welcome Wizard** handles first-time imports with staged progress, media download limits, and sets the platform Game Folder to the imported folder (https://www.launchbox-app.com/about/changelog).

**Screenshots:** https://www.launchbox-app.com/Resources/Images/Screenshots/LaunchBox-Screenshot.jpg · edit game https://www.launchbox-app.com/Resources/Images/Screenshots/LaunchBox-Edit-Game.png · download media https://www.launchbox-app.com/Resources/Images/Screenshots/LaunchBox-Download-Images-Media.png

---

## Cross-app comparison

| App | Chrome | Sidebar content | Detail layout | Per-game actions | Emulator/paths | First run |
|---|---|---|---|---|---|---|
| Steam | Text menu bar + Store/Library/Community tabs | Collections list, search, filters, Home | Hero + logo, play bar under hero, links bar, feed, right rail | Right-click menu; Properties; custom header/logo | n/a | Sidebar seeded from old categories |
| Playnite | Single icon menu + top panel | Icon rail + Explorer + Filter panels | Details/Grid/List; right panel | Right-click; metadata download | Dedicated "Configure emulators…" window with Import wizard + auto-scan | Storefront wizard |
| GOG 2.0 | Custom navbar, Ctrl+F search | Platforms, bookmarks, subscriptions | Hero page with stats/achievements | Right-click hide/tags | n/a (Settings→Integrations) | Login |
| Heroic | Sidebar-only | Store logins, Library, Stores, Downloads, Wine Mgr | Description, sizes, links, INSTALL | Cog → per-game settings tabs | Wine Manager; prefix/save paths per game | Login screen |
| Lutris | + button, search with tags | Sources/runners/platforms, collapsible, Uncategorized | Configure dialog (3 tabs) | Context menu | Preferences → Runners; BIOS dir in Preferences | Empty library + sources |
| Xbox | Gamertag menu + persistent search | Game Pass/Library/Community/Store + installed + downloads | Store-style page | Right-click Manage: General/Files/Add-ons | n/a | — |
| EA | Hamburger | Home/Browse/Library + Installed | Game Hub | Tile ⋯: Manage add-ons/Repair/Properties | n/a | — |
| Epic | — | Library filters (Features) | — | ⋯ → Manage → Verify | n/a | — |
| ES-DE | Fullscreen menus | System carousel with counts | Theme-driven + badges | Metadata editor (per-game alt emulator) | es_find_rules/es_systems; Utilities | "No games" dialog: import / change ROM dir / create dirs |
| LaunchBox | Full Windows menu bar | Platforms/playlists + details panel | Details panel + Edit dialog (Metadata/Media/Launching) | Right-click Edit, Open Game Folder | Manage Emulators ↔ Associated Platforms | Welcome Wizard |

---

## Top 10 patterns REPRO should copy (ranked)

1. **Playnite's five-panel desktop layout (icon rail + explorer/filter side panels + library + detail panel) with keyboard toggles (Ctrl-E/Ctrl-G/Ctrl-F).** It is the closest proven match to REPRO's sidebar+grid+detail plan and lets users collapse noise without a settings trip. https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html
2. **Steam's play bar directly under the hero: Play button + last played + playtime + achievements, then a links row.** One glance answers "can I play, when did I, how much" before any scrolling. https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee
3. **ES-DE's per-game "alternative emulator" override with the system default clearly marked, surfaced as a badge only when overridden.** Exactly the emulator-hub need: sane defaults, visible exceptions. https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md
4. **ES-DE's "no games found" dialog: Import games / Change ROM directory / Create system directories.** Best-in-class emulator empty state; also write a `systeminfo.txt`-style helper in each folder. https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md
5. **Playnite's emulator Import wizard (scan a folder, auto-detect known emulators, confirm) plus auto-scan configurations that re-run on library update.** Removes the "point at the .exe" failure mode that setup guides warn about. https://api.playnite.link/docs/manual/features/emulationSupport/addingNewEmulators.html
6. **Heroic's per-game settings opened from a cog on the tile *and* from the detail page, with tabs for runtime, prefix/save paths, verify/repair, launch args.** Gives REPRO a home for "configure emulator / manage saves / open folder" per title. https://boilingsteam.com/a-look-at-heroic-games-launcher/
7. **GOG Galaxy's saved-view bookmarks: filter + sort, click bookmark, it pins to the sidebar, renameable, reorderable, auto-updating.** Cheaper than Steam's dynamic collections and avoids the AND-only trap. https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed
8. **ES-DE's gamelist counter ("19 / 77", favorites count) and Lutris's collapsible sidebar sections with fallback icons.** Sidebar entries with counts and collapsibility scale to 50+ systems. https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md ; https://www.gamingonlinux.com/2026/02/lutris-v0-5-21-and-v0-5-22-arrive-with-valves-sniper-runtime-support-and-new-game-runners/
9. **Lutris's search tags (`installed:yes`, `source:gog`) with a filter button that builds them, plus tooltip help.** Power-user filtering that stays discoverable. https://github.com/lutris/lutris/releases/tag/v0.5.18
10. **LaunchBox's three-section game editor (Metadata / Media / Launching) with "Search for Metadata → Best Match / Other Matches" and per-media-type Download Media.** A clean model for REPRO's scrape/edit dialog. https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches

## 5 things to avoid

1. **Letterboxing mixed cover aspect ratios in the grid** — Steam's 2:3 boxes with 16:9 capsules were called "Not a good look"; pick one aspect per row/system and crop or use platform fallback art (Playnite's approach). https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee ; https://api.playnite.link/docs/manual/library/libraryManager.html
2. **Un-collapsible sidebars and settings-buried toggles** — Xbox has "no option to collapse the side panel"; Playnite users had to dig into Main menu → View → Sidebar. Give a one-click/keyboard collapse. https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/ ; https://github.com/JosefNemec/Playnite/issues/3537
3. **Destructive actions hiding behind "OK"** — LaunchBox's Remove Image deletes the file from disk when you press OK; ES-DE's Delete removes the ROM. Confirm explicitly and separate "remove from library" from "delete files". https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches ; https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md
4. **AND-only, tag-dependent auto-collections** — Steam's dynamic collections can't do OR and rely on inconsistent tags, so users deleted them. Support OR/NOT or keep it to simple saved views. https://www.timetoloot.com/gaming/reorganising-my-steam-library/
5. **Forced, always-on feed/news rows on the home screen and a heavy modal "Manage" dialog** — Steam's Updates row "can't be toggled" and reviewers found the library "overwhelming"; Xbox's Manage window "may become unresponsive" while loading. Keep home rows optional and load management panels inline/asynchronously. https://www.timetoloot.com/gaming/steam-library-update-is-here/ ; https://steamcommunity.com/groups/SteamClientBeta/discussions/3/2552901289739843520/ ; https://support.dovetailgames.com/hc/en-us/articles/28572822413458-How-to-Manage-Your-Games-Add-ons-on-the-Xbox-App-for-PC

---

## Sources

1. https://store.steampowered.com/libraryupdate
2. https://medium.com/gaminglinkmedia/new-steam-overhaul-it-looks-gorgeous-35937e1c71ee
3. https://www.timetoloot.com/gaming/steam-library-update-is-here/
4. https://www.timetoloot.com/gaming/reorganising-my-steam-library/
5. https://steamcommunity.com/groups/SteamClientBeta/discussions/3/2552901289739843520/
6. https://api.playnite.link/docs/manual/gettingStarted/playniteDesktopMode.html
7. https://api.playnite.link/docs/manual/gettingStarted/configuringPlaynite.html
8. https://api.playnite.link/docs/manual/features/filtersAndFiltersPresets.html
9. https://api.playnite.link/docs/manual/library/libraryManager.html
10. https://api.playnite.link/docs/manual/features/emulationSupport/addingNewEmulators.html
11. https://api.playnite.link/docs/manual/features/emulationSupport/addingEmulatedGames.html
12. https://api.playnite.link/docs/manual/features/themesSupport/installingThemes.html
13. https://shattered.io/playnite-setup-guide/
14. https://github.com/JosefNemec/Playnite/issues/3537
15. https://www.gog.com/en/news/6_cool_things_you_can_do_in_gog_galaxy_20_that_you_might_have_missed
16. https://medium.com/brit-gamer/why-you-should-check-out-gog-galaxy-2-0-d708a7469a4c
17. https://shattered.io/gog-galaxy-setup-guide/
18. https://boilingsteam.com/a-look-at-heroic-games-launcher/
19. https://heroicgameslauncher.com/
20. https://shattered.io/heroic-games-launcher-setup-guide/
21. https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/5003
22. https://github.com/lutris/lutris/releases/tag/v0.5.18
23. https://github.com/lutris/lutris/releases/tag/v0.5.20
24. https://www.gamingonlinux.com/2026/02/lutris-v0-5-21-and-v0-5-22-arrive-with-valves-sniper-runtime-support-and-new-game-runners/
25. https://shattered.io/lutris-setup-guide/
26. https://github.com/lutris/lutris/issues/3416
27. https://github.com/lutris/lutris/blob/master/docs/installers.rst
28. https://lutris.net/faq
29. https://www.ghacks.net/2022/03/11/xbox-pc-app-update-for-insiders-brings-a-new-sidebar/
30. https://support.dovetailgames.com/hc/en-us/articles/28572822413458-How-to-Manage-Your-Games-Add-ons-on-the-Xbox-App-for-PC
31. https://learn.microsoft.com/en-us/answers/questions/5222627/does-xbox-app-pc-has-verify-game-files-feature
32. https://help.ea.com/en/articles/platforms/download-and-play-ea-app-games/
33. https://www.epicgames.com/help/technical-support-c90/general-support-c91/how-do-i-verify-game-files-in-the-epic-games-launcher-a3638
34. https://www.epicgames.com/help/epic-games-store-c-202300000001639/launcher-support-c-202300000001735/how-to-check-if-a-game-on-the-epic-games-store-supports-cloud-saves-a202300000014638
35. https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md
36. https://feedback.launchbox-app.com/en/help/articles/6470204-editing-game-details-and-fixing-incorrect-matches
37. https://www.launchbox-app.com/about/changelog
38. https://forums.launchbox-app.com/topic/63816-re-linking-emulators-to-platforms/
39. https://www.launchbox-app.com/about
