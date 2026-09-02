# What people actually want (and hate) in emulator frontends — 2024-2026

Research date: 2026-09-01. Sources: GitHub/GitLab issue trackers (sorted by 👍 reactions via API), LaunchBox forums, GBAtemp, RetroGameTalk, ResetEra, libretro forums, GamingOnLinux, blog comparisons, and transcripts of two 2025 "best frontend" YouTube videos. Reddit was skipped (blocked). Every claim has a URL. Reaction counts were pulled 2026-09-01 and are exact for GitHub/GitLab; forum "frequency" is a judgement from thread counts and quotes.

Frontends covered: Playnite, ES-DE, Pegasus, RetroBat, Batocera-ES, LaunchBox/BigBox, EmuDeck, RetroDECK, Daijisho, RomM (server-side library, but its issue tracker is the most active 2025-26 signal of what emulation-library users want).

---

## 1. Top 15 most-requested features (ranked by frequency across trackers + forums)

Method: took the top-30-by-👍 issues from 9 trackers (Playnite 3,819 issues, RomM 2,022, RetroDECK 899, EmuDeck 884, Daijisho 683, Pegasus 549, Batocera-ES 386, RetroBat 101, ES-DE GitLab by popularity), then grouped by theme. "Reactions" = 👍 on the top issue for that theme.

| # | Feature | Evidence (reactions / count) | Links |
|---|---------|------------------------------|-------|
| 1 | **Cross-platform (Linux/macOS) — one frontend everywhere** | Playnite #59: **116👍, 62 comments, open since 2017** — #1 issue in the whole tracker. Playnite #4070 "Migrate to DotNetCore to support Linux" (5👍, 2025). LaunchBox forum "It's time to seriously consider LaunchBox on Linux" 12 likes, plus "Any plans to a Linux version" thread. GamingOnLinux user building his own tool because "Leaving LaunchBox behind was the thing that hurt the most when I left Windows." | https://github.com/JosefNemec/Playnite/issues/59 · https://forums.launchbox-app.com/topic/92516-it%E2%80%99s-time-to-seriously-consider-launchbox-on-linux/ · https://www.gamingonlinux.com/forum/topic/6572/ |
| 2 | **Cloud sync of library + saves** | Playnite #108 "Library cloud sync" 21👍/30 comments, open since 2017. RetroDECK #27 "Cloud Sync – Ludusavi" open since 2022, still on 0.11 milestone. RetroDECK #195 "Steam Sync" 4👍. EmuDeck ships CloudSync but **Patreon-only**. | https://github.com/JosefNemec/Playnite/issues/108 · https://github.com/RetroDECK/RetroDECK/issues/27 · https://manual.emudeck.com/using-app/10_cloud_saves/ |
| 3 | **Merge duplicate/multi-version/multi-disc entries into one game** | Playnite #408 "Linking duplicate copies" 33👍 (2nd highest), #1270 "Merge items" 18👍; ES-DE #995 "Group multiple versions of the same game" 5👍; Daijisho #50 "merge game discs/sets"; RomM #1528 "default primary rom region" 21👍. | https://github.com/JosefNemec/Playnite/issues/408 · https://gitlab.com/es-de/emulationstation-de/-/work_items/995 · https://github.com/rommapp/romm/issues/1528 |
| 4 | **RetroAchievements integration (login that actually works)** | ES-DE #876 "Add support for RetroAchievements" — **top-voted ES-DE issue, 14👍, open since 2022**. Daijisho #590 "RA login not working" 14👍 (top Daijisho issue). RomM #683 20👍. EmuDeck #1388 Duckstation RA token bug. Batocera-ES #777 show RA points. | https://gitlab.com/es-de/emulationstation-de/-/work_items/876 · https://github.com/TapiocaFox/Daijishou/issues/590 · https://github.com/rommapp/romm/issues/683 |
| 5 | **Subfolders / multiple ROM directories / network storage** | RomM #2050 "platform level subfolders" 24👍 (top 2025 RomM issue); Daijisho #622 subdirs, #626 network storage; Pegasus #579 NFS; ES-DE doesn't support multiple ROM dirs natively (Facebook group workaround thread). | https://github.com/rommapp/romm/issues/2050 · https://github.com/TapiocaFox/Daijishou/issues/626 · https://github.com/mmatyas/pegasus-frontend/issues/579 |
| 6 | **Animated media / video snaps / GIF covers** | Playnite #1442 "animated media types" 31👍/23 comments; Pegasus #1166 GIF support (2025); LaunchBox users complain video takes 3-5s to appear. | https://github.com/JosefNemec/Playnite/issues/1442 · https://github.com/mmatyas/pegasus-frontend/issues/1166 |
| 7 | **More/better scraper sources + lock/merge metadata** | RomM #212 "additional scrapers (ScreenScraper, TGDB, SteamGridDB)" 27👍; RomM #2776 "Lock metadata" 11👍; Playnite #2615 "merge list fields from multiple sources" 12👍; Daijisho #623 screenscraper 5👍, #501 custom scraper; ES-DE #1980 Steam scraper backend, #2046 RomM as provider. | https://github.com/rommapp/romm/issues/212 · https://github.com/rommapp/romm/issues/2776 · https://github.com/JosefNemec/Playnite/issues/2615 |
| 8 | **HowLongToBeat / playtime / completion tracking** | Playnite #880 HLTB 29👍; RomM #1881 HLTB 12👍 + #1231 11👍; ES-DE #901 playtime (shipped 3.4.0); Daijisho #664 hours played, #476 mark complete 6👍; Batocera-ES #1795 most-played by time. | https://github.com/JosefNemec/Playnite/issues/880 · https://github.com/rommapp/romm/issues/1881 · https://github.com/TapiocaFox/Daijishou/issues/476 |
| 9 | **Collections / favourites / tags that behave like Steam** | Playnite #207 "Steam-like favorites" 24👍; #2538 "Filtering rework" 18👍; #590 filter presets 12👍; Daijisho #722 collections 5👍, #685 favourites on top 4👍; ES-DE #1613 add-to-collection from menu; Batocera-ES #1592 tags. | https://github.com/JosefNemec/Playnite/issues/207 · https://github.com/JosefNemec/Playnite/issues/2538 · https://github.com/TapiocaFox/Daijishou/issues/722 |
| 10 | **Game manuals & PDF viewer** | RomM #553 11👍 + #1786 9👍 + #2096 special folders 10👍; ES-DE #1392; Pegasus #447; Batocera-ES #1144. | https://github.com/rommapp/romm/issues/553 · https://gitlab.com/es-de/emulationstation-de/-/work_items/1392 |
| 11 | **Frontend-managed install/download of games (NAS/RomM → local)** | Playnite #1135 "Support for downloads" 26👍; #4106 install script; #3364 long "What Playnite could be" essay on NAS/multi-user; RetroDECK #867 RomM integration 7👍 (top RetroDECK issue); RomM #1050 RetroDECK integration 8👍. | https://github.com/JosefNemec/Playnite/issues/1135 · https://github.com/RetroDECK/RetroDECK/issues/867 |
| 12 | **Multi-user / profiles / parental control** | EmuDeck #1559 "multiple users on same Deck" 4👍 (2025); RomM #2013 parental control 10👍; Playnite #3364 multi-user. | https://github.com/dragoonDorise/EmuDeck/issues/1559 · https://github.com/rommapp/romm/issues/2013 |
| 13 | **Faster/parallel scraping, respecting paid ScreenScraper threads** | ES-DE #1967 + #1953 + #2066 (three separate reports, all "Not implemented" — dev says use Skraper instead); RomM #3733 ScreenScraper API failure 10👍/35 comments (2026). | https://gitlab.com/es-de/emulationstation-de/-/issues/1967 · https://github.com/rommapp/romm/issues/3733 |
| 14 | **Steam Input / overlay for all launched games** | Playnite #760 10👍/16 comments; RetroDECK #716 Steam Input issues; #194 Controller Unification Project. | https://github.com/JosefNemec/Playnite/issues/760 · https://github.com/RetroDECK/RetroDECK/issues/716 |
| 15 | **Per-game/per-folder alternative emulator + per-game settings** | Playnite #801 per-game plugin settings 14👍; ES-DE #1705 per-game alt emulator in gamelist, #1556 per-folder emulator; RetroBat #371 (15 comments). | https://github.com/JosefNemec/Playnite/issues/801 · https://gitlab.com/es-de/emulationstation-de/-/work_items/1556 |

Honourable mentions: random-game button (Playnite #121), companion mobile app (#323, 12👍), "streaming" system for Moonlight (ES-DE #1651), 64-bit/.NET modern port (Playnite #1199, #1141), screensaver (Pegasus #526), Heroic as a source (Pegasus #1094 — its top issue, 13👍).

---

## 2. Top 10 complaints / reasons people abandon a frontend

Ranked by how often it shows up across forums, trackers, and video reviews.

1. **Slow — UI lag, seconds to show media, slow boot with big libraries.** LaunchBox: "takes between 3 and 5 seconds to show a video of a game… With each update it gets worse… if it were not for other features I would move on to another gaming frontend." (i9-13900K/RTX 3080). Another: "Having 2s to 5s between each key press is terrible, who can find it acceptable at this point? It's just a GUI… 30 bucks for a feature I can't use is not acceptable." A 2024 thread: "launchbox and bigbox have started to slow down a lot in both opening speeds and system-game navigation." 2015 thread still relevant: options menu 15s, launching a game 30s. Pegasus #839 "Improve startup time" has 49 comments. GBAtemp on Playnite: "it didn't agree with how big my library is and it was kinda clunky no matter what theme i used… i don't think it was meant to handle 2000+ games."
   https://forums.launchbox-app.com/topic/75851-why-is-launchbox-so-slow/ · https://forums.launchbox-app.com/topic/88070-launchbox-1317-high-cpu-usage-slow-boot-times-and-sluggish-speeds/ · https://forums.launchbox-app.com/topic/29591-large-library-slow-performance/ · https://github.com/mmatyas/pegasus-frontend/issues/839 · https://gbatemp.net/threads/best-emulator-front-ends.649137/

2. **Setup hell — BYO emulators, cores, BIOS, text-file editing.** ES-DE review (2025 video): "we need to download RetroArch with other emulators separately… open up RetroArch to download particular cores and then open up ES-DE and point them to the correct cores… there are much easier front-end solutions out there here in 2025." EmuDeck on Windows: "a very confusing experience, especially for newcomers… download Python… a terminal pops up… took the longest in this video by far… After around 30 minutes… it will say the front end is about to boot up, but it doesn't." ArcadeSystems: ES-DE standalone "30+ minutes" vs RetroBat "5 minutes"; "You could build the same thing yourself with ES-DE + manual emulator installs, but it would take 30+ hours." Facebook: "I've tried Retrobat but it's give a hard time bc it hides most emulators configs."
   https://www.youtube.com/watch?v=OXX9EV2cPUU · https://arcadesystems.co.uk/blog/post/retrobat-vs-es-de · https://www.facebook.com/groups/895399034653585/posts/1385338095659674/

3. **Scraping pain — slow, rate-limited, wrong matches, overwrites your edits.** ScreenScraper: 20k-50k req/day caps, ~4 requests/game, paid tiers for threads; ES-DE refuses to use paid threads ("ES-DE is using an interactive scraper which scrapes one game at a time, so this is not something that will get implemented") — reported 3 times; user notes ArkOS ES is "6x+ faster". Petrockblock: "it took 3 hours to scrape 100 roms". Batocera-ES #1457 "Scrape without overwriting the game name or description". RomM #2776 "Lock metadata" 11👍. RomM #3733 ScreenScraper API failure 35 comments. Facebook: "Why does ES-DE rom scraping require manual skipping…"
   https://gitlab.com/es-de/emulationstation-de/-/issues/1967 · https://retropie.org.uk/forum/topic/26516/what-s-the-deal-with-scraping-right-now · https://www.petrockblock.com/forums/topic/es-scraper-slow-as-hell/ · https://github.com/batocera-linux/batocera-emulationstation/issues/1457

4. **Controller navigation breaks / not 100% controller-driven.** Playnite #4068 "Controller not working in full screen after a lengthy session" (15 comments, 2025), #4117 controller stops being detected, #684 DirectInput 23👍; Playnite's own troubleshooting page has 3 controller sections. GBAtemp: Playnite "wasn't made with 100% controller support in mind." ES-DE #1961 disconnecting controller crashes macOS. RetroDECK #1295 A/B swap has no effect (5👍, 2026), #807 same bug 2024. Daijisho #686 "Too many clicks!" — extra taps to launch a pinned game, double-back in settings.
   https://github.com/JosefNemec/Playnite/issues/4068 · https://playnite.link/adminfaq · https://github.com/TapiocaFox/Daijishou/issues/686 · https://github.com/RetroDECK/RetroDECK/issues/1295

5. **Paywall / licence / email-gate / subscription.** LaunchBox: "requires us to send an email address in order to get a download link… they do tend to send out marketing emails"; BigBox £40 or £20/yr; "Used to have BigBox too but the licenses only last like a year or two." Android LaunchBox: "not free more than 100 games"; "Licence lasts a year only… stuck to the version unless you renew." ES-DE Android is paid; EmuDeck CloudSync + EmuDeck Cloud are Patreon-only; Nostlan cloud saves Patreon-only. "There was no trial, I wouldn't be posting here."
   https://www.youtube.com/watch?v=OXX9EV2cPUU · https://retrogametalk.com/threads/what-frontend-do-you-prefer.9982/ · https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 · https://manual.emudeck.com/using-app/10_cloud_saves/ · https://github.com/rommapp/romm/discussions/1665

6. **Bloat / heavy / dependency stack.** "It also seems to be a bit on the bloated side" (LaunchBox, chose Playnite instead). "Launchbox android is crappy, not free and too heavy." "I don't know which technology is used… (I think it's .NET) but developers definitely don't have a good mindset… should be built almost from scratch without dependencies and focus on performance." Playnite theme/extension slowness is the first item in its own troubleshooting FAQ.
   https://www.octopusoverlords.com/forum/viewtopic.php?t=95921 · https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 · https://forums.launchbox-app.com/topic/75851-why-is-launchbox-so-slow/ · https://playnite.link/adminfaq

7. **Rigid folder structure / forced file moves.** Facebook Playnite group: "Previously, I used EmulationStation, but I didn't like it because it forced me to move game files or ROMs to a specified folder." Reddit snippet (via search): Pegasus has "absolutely bizarre information architecture… to manage roms." ES-DE only reads gamelist.xml from its own dir unless a hidden setting is flipped. EmuDeck #483: saves are symlinks scattered across flatpak dirs, so "people backing up their saves by just copying the save folder will be missing data without realizing it."
   https://www.facebook.com/groups/556912946287139/posts/1255351913109902/ · https://gitlab.com/es-de/emulationstation-de/-/blob/master/FAQ.md · https://github.com/dragoonDorise/EmuDeck/issues/483

8. **Windows-only (Linux migration pressure).** See feature #1. "Windows no longer makes sense as a platform, and the only thing keeping people like me tied to it is LaunchBox." "I have started looking at Linux, but launchbox is the Achilles heel." Reddit: "I love launchbox but I'm so sick of windows. Switched to Linux + emudeck with ES-DE."
   https://forums.launchbox-app.com/topic/92516-it%E2%80%99s-time-to-seriously-consider-launchbox-on-linux/ · https://forums.launchbox-app.com/topic/75457-any-plans-to-a-linux-version-of-launchbox/

9. **No save management / saves lost or scattered.** "I got spoiled with cloud saves on Steam and Xbox consoles. It's just so seamless." Most replies: "Start over on each device", "That's the neat part, I don't", or Syncthing/USB stick. EmuDeck #483 (open since 2022, "Planned for 3.x"); RetroDECK #1041 ryujinx save location wrong, #173 ScummVM saves couldn't be moved, #191 PSP core saving issue; RomM #2319 save states inconsistently saved. Android LaunchBox thread: "seems to have gone away, may have been user error… ES-DE does it with an addon."
   https://www.resetera.com/threads/for-those-big-on-emulation-whats-your-workflow-for-syncing-saves-across-devices.1211769/ · https://github.com/dragoonDorise/EmuDeck/issues/483 · https://github.com/rommapp/romm/issues/2319

10. **Dev says no / stale requests / abandonment risk.** Playnite's top 3 issues are 7-9 years old and open; dev closed the multi-feature essay with "You are free to start your own fork." ES-DE labels scraper threading "Not implemented" ×3. Pegasus has 549 issues, its Qt 6 port is a 2025 request, and the last real activity is sparse. Daijisho #860 "Update GitHub releases" (5👍, 2026) — users can't find current builds. Reddit thread title: "Anyone else find this product to be incredibly frustrating?" (LaunchBox).
    https://github.com/JosefNemec/Playnite/issues/3364 · https://github.com/TapiocaFox/Daijishou/issues/860 · https://github.com/mmatyas/pegasus-frontend/issues/1167

---

## 3. What people love about their favourite (quotes)

- **ES-DE — lightweight, fast, portable, cross-platform.** "ESDE is in my view the best its simple, easy to setup and can be set as a portable installation." — https://gbatemp.net/threads/best-emulator-front-ends.649137/ · "it feels extremely lightweight when loading it up for the first time. And it doesn't really matter if you have thousands of games installed either. It is by far one of the quickest loaders on this list." — https://www.youtube.com/watch?v=OXX9EV2cPUU · "I use Retrobat on Windows and ES-DE on Android, they are basically the same." — https://retrogametalk.com/threads/what-frontend-do-you-prefer.9982/
- **Playnite — one library for everything, playtime tracking, desktop+fullscreen.** "I quite like the playtime tracking on games, and it having both a desktop and full-screen controller mode makes it ideal for moving between a larger screen and your regular setup." — https://gbatemp.net/threads/best-emulator-front-ends.649137/ · "It's completely free and open source… takes all of your games from Steam, Origin, GOG, Battle.net and Uplay and displays them all in one place… plenty of search and filtering… The author is also pretty active." — https://www.octopusoverlords.com/forum/viewtopic.php?t=95921 · "Playnite is fully open source under the MIT license, and no feature… is locked behind a paywall." — https://shattered.io/playnite-setup-guide/
- **RetroBat — drag ROMs in, it just works; frequent updates; built-in downloaders.** "dragging ROM files into the designated folders will in most cases have your game library appear in the user interface… RetroArch… automatically set up for you without having the annoyance of configuring it. And let's face it, most people either hate RetroArch or simply think it's over complicated." — https://www.youtube.com/watch?v=OXX9EV2cPUU · "I just switched over from Launchbox/Bigbox to Retrobat… Retrobat just works so much better… This that Launchbox struggles A LOT with, just works in Retrobat." — https://www.facebook.com/groups/retrobat/posts/1483464565812358/
- **LaunchBox — best importer + scraping + polish.** "drop a folder of mixed ROMs and the importer sorts by platform, fetches metadata, configures emulators in one step." — https://arcadesystems.co.uk/blog/post/best-emulator-frontend-2026 · "We can specifically choose from a list of different artworks… probably one of the best on this list." — https://www.youtube.com/watch?v=OXX9EV2cPUU · "LaunchBox is really good & easy to use." — https://retrogametalk.com/threads/what-frontend-do-you-prefer.9982/
- **Daijisho — snappy, free, console-like on Android.** "It is super snappy" — https://www.youtube.com/watch?v=l-AhfEGuMao · "Daijisho is better than anything right now." — https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 · "I'm new to Daijishou and I love it!" (then lists too-many-clicks) — https://github.com/TapiocaFox/Daijishou/issues/686
- **Beacon — simple and uncluttered.** "Beacon Launcher replaced Daijisho for me. It looks so clean and simple." — https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 · "I love the simple and intuitive design" — https://retrohandheldguides.com/best-android-emulator-frontend/
- **Batocera — fast, lightweight, one-stop downloader for themes/shaders/bezels.** "very quick to respond… very lightweight compared with some in this video which are running Windows in the background… customization with Batocera is fairly endless." — https://www.youtube.com/watch?v=OXX9EV2cPUU

Pattern: **speed + "just works" + no paywall** beats polish. Nobody says they love a frontend for its theme engine; they love it for launching fast and not making them configure RetroArch.

---

## 4. Save management deep dive

### What people want
- **Seamless cross-device sync like Steam/Xbox.** "I got spoiled with cloud saves on Steam and Xbox consoles. It's just so seamless." Playnite #108 (21👍, open 8 yrs); RetroDECK #27 (open 4 yrs). https://www.resetera.com/threads/for-those-big-on-emulation-whats-your-workflow-for-syncing-saves-across-devices.1211769/
- **One predictable saves folder** so Syncthing/rclone/backup just works: "Are there any plans to adjust these paths so all the save data is truly under Emulation/saves? Doing so would make syncing emulator saves with tools like SyncThing much easier." https://github.com/dragoonDorise/EmuDeck/issues/483
- **Save-state browser with screenshots, multiple slots.** LaunchBox forum "Save state manager" asks for a UI "where you pick through multiple save states, or show the state screenshot." LaunchBox's answer was a premium Pause Screen. https://forums.launchbox-app.com/topic/76032-save-state-manager/ · https://www.facebook.com/launchboxapp/posts/1426169969537615/
- **Versioned backups / rollback.** Playnite #3830 "More auto backup frequency options"; Decky Ludusavi plugin: "keep multiple versions of your save files." https://github.com/JosefNemec/Playnite/issues/3830 · https://plugins.deckbrew.xyz/
- **Import saves from other setups.** RetroDECK #392 "Save Importer". https://github.com/RetroDECK/RetroDECK/issues/392
- **Server-side saves/states via RomM** (mobile: "sync saves back up to the server (harder)"). https://github.com/rommapp/romm/discussions/1665

### What exists today and where it falls short
| Tool | What it does | Gap |
|------|--------------|-----|
| EmuDeck CloudSync/CloudBackup | rclone to Dropbox/GDrive/OneDrive/Nextcloud/SFTP, download-on-launch, upload in background, conflict warning | **Patreon-only**; needs Chrome on Linux; saves still symlinked into flatpak dirs (#483 open since 2022). https://manual.emudeck.com/using-app/10_cloud_saves/ |
| RetroArch cloud sync (WebDAV) + Steam Cloud on Steam build | game saves + states | RetroArch only; Steam version "missing certain cores… manually copy over". https://www.resetera.com/threads/for-those-big-on-emulation-whats-your-workflow-for-syncing-saves-across-devices.1211769/ |
| Ludusavi (+ Playnite plugin, 298★; Decky plugin) | on-demand backup/restore of PC game saves, cloud via rclone | Generic PC-game tool; emulator paths need manual entries; no state browser; needs rclone config; per RetroDECK, CLI confirmation issues. https://github.com/mtkennerly/ludusavi-playnite · https://github.com/RetroDECK/RetroDECK/issues/27 |
| Syncthing | folder sync | doesn't follow symlinks; conflicts are manual; "pretty intense" for average users. https://github.com/dragoonDorise/EmuDeck/issues/483 |
| RomM | server stores saves/states per user | "Save states are inconsistently saved and fail to load" (#2319, 5👍); requires a self-hosted server. https://github.com/rommapp/romm/issues/2319 |
| LaunchBox Pause Screen | save/load states, screenshots in-game overlay | Premium; RetroArch/MAME-centric; no cross-device. https://www.facebook.com/launchboxapp/posts/1426169969537615/ |
| ES-DE, Pegasus, Daijisho, Batocera-ES, RetroBat | **nothing** — saves are the emulator's problem | ArcadeSystems: "Save states don't travel between front ends." https://arcadesystems.co.uk/blog/post/best-emulator-frontend-2026 |

Bottom line: no frontend owns saves. The only two that try (EmuDeck, LaunchBox) put it behind a paywall, and neither gives you a per-game "here are your 6 states with thumbnails, restore/duplicate/export" view.

---

## 5. Switching posts — why people moved

| From → To | Why (quote) | Link |
|-----------|-------------|------|
| LaunchBox → Playnite | "Launchbox… seems to be a bit on the bloated side… I went with Playnite instead." / "Switched from Launchbox to Playnite since I don't need emulation and big picture stuff." | https://www.octopusoverlords.com/forum/viewtopic.php?t=95921 · https://www.reddit.com/r/pcgaming/comments/q8jrm6/ (snippet via search) |
| LaunchBox/BigBox → RetroBat | "Retrobat just works so much better… This that Launchbox struggles A LOT with, just works in Retrobat." | https://www.facebook.com/groups/retrobat/posts/1483464565812358/ |
| LaunchBox (Windows) → ES-DE / EmuDeck (Linux) | "I love launchbox but I'm so sick of windows. Switched to Linux + emudeck with ES-DE." / "I've started using the AppImage distribution of ES-DE" / "converted launchbox databases to ES-DE format and work fine." | https://www.reddit.com/r/launchbox/comments/1pxgh5r/ (snippet) · https://forums.launchbox-app.com/topic/75457-any-plans-to-a-linux-version-of-launchbox/ |
| LaunchBox → nothing on Linux → wrote own (Retromind) | "There are alternatives on Linux, but they all miss something for me or are not really maintained anymore." | https://www.gamingonlinux.com/forum/topic/6572/ |
| Hyperspin → LaunchBox/BigBox | "It was so bad I couldn't even use it in my cab but now I have it in place of Hyperspin." (LaunchBox got fast enough) | https://forums.launchbox-app.com/topic/75851-why-is-launchbox-so-slow/ |
| EmulationStation → Playnite | "it forced me to move game files or ROMs to a specified folder." | https://www.facebook.com/groups/556912946287139/posts/1255351913109902/ |
| Daijisho → Beacon | "It looks so clean and simple." | https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 |
| Daijisho → ES-DE (Android) | "Daijisho a try for about 2 weeks and did not explore its best capability. EsDe made my experience better." | https://www.facebook.com/groups/1538411606995698/posts/1966875270815994/ |
| LaunchBox Android → Daijisho | "Launchbox android is crappy, not free and too heavy. Licence lasts a year only." | https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 |
| Playnite → (abandoned) | "it didn't agree with how big my library is and it was kinda clunky no matter what theme i used." | https://gbatemp.net/threads/best-emulator-front-ends.649137/ |

Direction of travel 2024-26: **away from paid/Windows-locked (LaunchBox) toward free + fast + portable (ES-DE, RetroBat, Playnite)**, and on Android away from busy UIs toward simple ones (Beacon). Most "switch" posts cite one of: speed, price/licence, OS lock-in, or forced folder layout — not missing features.

---

## 6. Ten things REPRO should do differently (ranked)

1. **Own the saves.** Per-game save/state browser with thumbnails + timestamps, versioned local backups, one canonical `saves/` tree (no symlink maze), and free cloud/LAN sync via user's own storage (WebDAV/S3/folder). Nobody does this for free; EmuDeck paywalls it, EmuDeck #483 has been open since 2022.
   https://github.com/dragoonDorise/EmuDeck/issues/483 · https://manual.emudeck.com/using-app/10_cloud_saves/
2. **Be fast at 5,000 games, and prove it.** Virtualised lists, thumbnail cache, <1s cold start, media appears on the same frame you select. Speed is complaint #1 and the reason people leave LaunchBox and Playnite.
   https://forums.launchbox-app.com/topic/75851-why-is-launchbox-so-slow/ · https://gbatemp.net/threads/best-emulator-front-ends.649137/
3. **Zero-config first run: detect emulators, download RetroArch cores, sort ROMs by extension/hash, offline metadata for the first 10k titles.** RetroBat wins 2025/26 rankings purely on "5 minutes vs 30+ minutes."
   https://arcadesystems.co.uk/blog/post/retrobat-vs-es-de · https://www.youtube.com/watch?v=OXX9EV2cPUU
4. **Scrape smart: hash-match first, batch/parallel, honour paid ScreenScraper threads, never overwrite user edits (per-field lock).** ES-DE refuses to do threads; Batocera-ES/RomM users beg for "don't overwrite my names."
   https://gitlab.com/es-de/emulationstation-de/-/issues/1967 · https://github.com/rommapp/romm/issues/2776
5. **Ship Linux + macOS + Windows from day one (Electron makes this cheap).** The single most-upvoted frontend issue anywhere is Playnite's cross-platform request (116👍, 9 yrs).
   https://github.com/JosefNemec/Playnite/issues/59 · https://forums.launchbox-app.com/topic/92516-it%E2%80%99s-time-to-seriously-consider-launchbox-on-linux/
6. **Leave ROMs where they are: multiple roots, arbitrary subfolders, NAS/SMB, no forced moves.** Forced folder layout drove people from ES to Playnite; subfolders is RomM's top 2025 issue.
   https://github.com/rommapp/romm/issues/2050 · https://www.facebook.com/groups/556912946287139/posts/1255351913109902/
7. **Controller navigation that is exhaustive and click-minimal: select = launch, single back, wake-from-idle safe, per-controller glyphs.** Playnite loses controllers after long sessions; Daijisho users filed "Too many clicks!".
   https://github.com/JosefNemec/Playnite/issues/4068 · https://github.com/TapiocaFox/Daijishou/issues/686
8. **Free, no email gate, no Patreon-locked features, no yearly licence.** Every paid frontend gets the same complaint; RetroBat/ES-DE win on "free" as much as anything.
   https://forums.libretro.com/t/i-need-help-for-best-front-end-libretro-for-android/44960 · https://retrogametalk.com/threads/what-frontend-do-you-prefer.9982/
9. **Merge variants into one game (regions, revisions, discs, hacks) with a primary pick — natively, not as a plugin.** Playnite's #2 issue (33👍), ES-DE #995, RomM #1528 (21👍).
   https://github.com/JosefNemec/Playnite/issues/408 · https://github.com/rommapp/romm/issues/1528
10. **RetroAchievements + playtime + completion as first-class, working out of the box.** ES-DE's top-voted issue, Daijisho's top issue (broken login), RomM 20👍; users track backlogs and want HLTB.
    https://gitlab.com/es-de/emulationstation-de/-/work_items/876 · https://github.com/TapiocaFox/Daijishou/issues/590

Bonus (do NOT do): don't build a theme engine before items 1-4. Nobody left a frontend for lack of themes; many left for speed, setup, and paywalls.

---

## Appendix: raw issue-tracker pulls
Top-30-by-👍 lists for all 9 trackers and the 2024+ filtered pulls are in `C:\Users\mabbo\AppData\Local\Temp\ghissues.md` and `ghissues2.md` (generated 2026-09-01 from the GitHub/GitLab search APIs). Transcripts: Just Jamie "Top 5 Best Emulator Frontends 2025" (https://www.youtube.com/watch?v=OXX9EV2cPUU) and UrCasualGamer "The ONLY 5 Emulator Frontends You Need" (https://www.youtube.com/watch?v=84xCcD841fI).
