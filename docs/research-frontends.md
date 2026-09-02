# Emulator frontend / launcher UI research (for REPRO) — Sept 2026

Method: web_search + web_extract + direct inspection of official screenshots. Reddit blocks scraping (Firecrawl "not supported", JSON API 403, redlib mirrors dead/PoW-walled), so Reddit evidence below is limited to what the search index exposed for each thread URL. Marked "(snippet)" where so.

## 1. Frontend-by-frontend

### ES-DE
- Default theme since 3.0 (Feb 2024) is **Linear**, bundled with the app; Slate/Modern remain as downloadable themes with medium/large font sizes. https://www.gamingonlinux.com/2024/02/emulationstation-desktop-edition-es-de-gets-new-default-look-and-different-font-sizes/ ; https://gitlab.com/es-de/emulationstation-de/-/blob/master/CHANGELOG.md
- Could not find an official Linear screenshot outside the app bundle (it is not in the themes-list repo). Slate (the previous default) is documented with 1080p screenshots: https://gitlab.com/es-de/themes/themes-list#slate
- Slate gamelist (inspected https://gitlab.com/es-de/themes/themes-list/-/raw/master/screenshots/slate-es-de/slate-es-de_02.jpg): flat dark-grey background, light-grey panels, bold uppercase condensed sans text; left column = text list with star/folder glyphs; selected row = solid dark highlight bar with white text (no animation, no card); right column = box art + screenshot ("miximage"), star rating, metadata (released/dev/publisher/genre/players/last played) and square badges (Folder/Favorite/Completed/Controller); top-right console logo with a vertical per-system color stripe; bottom controller-hint bar (Options/Menu/Select/Back/View media/Favorites/System).
- Theme system: each theme exposes variants (list/grid/carousel), color schemes, font sizes, aspect ratios and transitions, chosen from UI Settings; built-in theme downloader. https://gitlab.com/es-de/themes/themes-list
- Users praise: theme ecosystem ("Art Book Next is the GOAT", "Iconic", "Cathode is awesome", "lots of consistent dev … on Discord"). https://www.reddit.com/r/retroid/comments/1hrs7l1/what_is_your_favorite_esde_theme/ (snippet); https://www.reddit.com/r/retroid/comments/1i7p5rd/the_new_esde_theme_cathode_is_awesome/ (snippet)
- Users complain: setup effort — "Daijisho and Beacon are MUCH easier to get up and running. But ES-DE is on a whole other level once you have gone through the trouble of setting it up." https://www.reddit.com/r/retroid/comments/1fexm1z/daijish%C5%8D_beacon_or_esde/ (snippet)

### Pegasus Frontend
- Default is the **grid theme** ("The default grid theme of Pegasus"; a small-display variant exists). https://pegasus-frontend.org/tools/themes/
- Themes are QML; the gallery lists ~60 community themes with screenshot URLs. https://pegasus-frontend.org/tools/themes/ ; API: https://pegasus-frontend.org/docs/themes/api/
- Most used community theme is **gameOS** (151 stars, 50 forks, many derivatives: gameOS-Fire, Fire & sKye, XboxOS, XboxOS-V2, clearOS). https://github.com/PlayingKarrde/gameOS
- gameOS layout (inspected https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/PlayingKarrde/gameOS/YXNzZXRzL2ltYWdlcy9zY3JlZW5zaG90LnBuZw==.png): navy/dark-blue background (~#1a2540), full-width hero banner with game key art + logo and pagination dots, row of system-logo tiles (monochrome logos on rounded dark tiles), then a "Continue Playing" row of 16:9 screenshot cards; button hints bottom-right ("Select", "Settings"); magenta wordmark. README states goal: "a modern game launcher that can fit in alongside other tvOS-like apps (10 foot UI)"; adds video previews on details, favorites via X/Y buttons, "remembers last game played".

### Playnite
- Two fully separate UIs: Desktop (mouse/keyboard) and Fullscreen (gamepad), WPF/XAML themes. https://api.playnite.link/docs/tutorials/themes/introduction.html
- Users complain the default fullscreen theme hides background art: "wanted to push the info in the details view down a bit so that more of background art is [visible]". https://www.reddit.com/r/playnite/comments/192d64f/editing_the_default_fullscreen_theme/ (snippet)
- Popular fullscreen themes 2025-26: **Aniki Remake**, **Solaris**, **Hero**, ReMIX, "Ps5ish slim remake". Praise: "Hero … just shows my games in a nice layout" (less clutter); "Aniki Remake is so feature rich and beautiful"; "Solaris has been literally perfect". Complaint: "the lag is on Aniki Remake". Sources (snippets): https://www.reddit.com/r/playnite/comments/1idp81u/any_full_screen_theme_suggestions/ ; https://www.reddit.com/r/playnite/comments/1slcdf3/fullscreen_theme_recommendation_for_showing/ ; https://www.reddit.com/r/playnite/comments/1pus203/my_customised_solaris_theme_fullscreen/ ; https://www.reddit.com/r/playnite/comments/1m5fx9s/installed_playnite_today_suggest_some_themes_for/ ; Solaris video: https://www.youtube.com/watch?v=TYXSNOffSL4

### LaunchBox / Big Box
- Big Box got a new default theme in 12.14 (Aug 2022): platform wheel, full-screen CoverFlow with floor reflections, wheel view with box art + video snap + clear logos, and a bottom "recently played" strip you can launch from without entering a platform. https://www.youtube.com/watch?v=l8LY7U3qnQU
- Default entry view is now "Game Discovery Center"; many themes don't support it. https://www.reddit.com/r/launchbox/comments/1mnmlvh/cannot_get_off_default_theme/ (snippet)
- Praise: scraped data + themes "look great", easy to switch. https://www.reddit.com/r/emulation/comments/9jua9h/my_review_of_launchbox_bigbox_after_2_years/ (snippet)
- Complaint: animation-heavy themes are slow — "More modern themes rely on less animation, which is what slows down BigBox." https://www.reddit.com/r/launchbox/comments/vxyab7/my_opinions_on_launchbox/ (snippet)
- Popular community themes: COLORFUL (relies on fanart backgrounds + clear logos, per-platform color media set), Unified Redux, VisioN (4.9/5, Jun 2025). https://forums.launchbox-app.com/topic/51590-colorful-bigbox-theme/page/20/ ; https://forums.launchbox-app.com/files/file/5260-details/ ; https://forums.launchbox-app.com/files/file/4041-vision/

### RetroBat
- Default theme is **ES-THEME-CARBON** (Batocera-style EmulationStation): horizontal system carousel with logo + console art, textlist gamelist, quick search, navigation bar sorted by manufacturer, SELECT quick-access menu; systems grouped (Amiga, MSX, MESS…). https://wiki.retrobat.org/navigation/system-view-and-game-view
- Themes installed via content downloader into a themes folder. https://wiki.retrobat.org/get-started/retrobat-folder-structure
- No substantial UI praise/complaint threads found beyond how-to posts (e.g. editing video position in theme.xml: https://www.facebook.com/groups/retrobat/posts/1939085473583596/).

### Daijisho (Android)
- Material Design, "Android-first layout", grid/list layouts, theme adjustments; 4.8★ on Google Play (7.9k ratings). https://daijisho.com/ ; https://play.google.com/store/apps/details?id=com.magneticchen.daijishou
- Praise: "super snappy", "easily the best available for most Android devices", "super easy to set up". https://www.youtube.com/watch?v=l-AhfEGuMao ; https://www.reddit.com/r/retroid/comments/1tp52sb/hot_take_i_hate_retroarch/ (snippet)
- Complaint: "definitely falling behind pretty quickly" vs ES-DE/Beacon (Dec 2024). https://www.reddit.com/r/SBCGaming/comments/1hbqcqo/anyone_still_running_daijisho_as_their_frontend/ (snippet); Beacon described as "a great middle ground between Daijisho and ES-DE". https://www.reddit.com/r/SBCGaming/comments/1nayimf/beacon_launcher_guide_retro_game_corps/ (snippet)

### Steam Big Picture (new UI, beta Oct 2022, default Feb 2023)
- It is the Steam Deck UI with button prompts swapped per controller; replaced the "very blue" 2012 UI. https://www.theverge.com/2022/10/27/23426994/valve-steam-deck-big-picture-mode-ui-test-beta ; https://www.kitguru.net/gaming/mustafa-mahmoud/steam-deck-ui-finally-comes-to-big-picture-mode-on-pc/ ; https://www.neogaf.com/threads/latest-steam-update-adds-the-new-big-picture-mode-and-makes-it-the-default.1651285/
- Home = recent-games row on a dark background, library filtered by tabs such as "Great on Deck"; reviewer: "clean modern aesthetics… easily beats the Big Picture Mode it's replacing". https://pixelrater.com/steam-deck-ui-walkthrough/
- Complaints: "everything in this new interface is dedicated to the Steam Deck", missing old features, bugs; controller config gaps. https://www.reddit.com/r/Steam/comments/18l3u4v/anyone_else_feels_like_the_big_picture_experience/ (snippet); https://steamcommunity.com/groups/SteamClientBeta/discussions/3/3461605794225770351/

### Xbox Home (2023 redesign)
- "Jump back in" row at top (recently played), system-app tiles beneath, curated rows below; dropped the larger tile for the most recent game; more room for custom backgrounds; tile count adjustable 4-9. https://www.theverge.com/2022/9/8/23328667/microsoft-xbox-home-user-interface-update-changes-dashboard-2023 ; https://www.trueachievements.com/n51070/new-xbox-home-ui-2023 ; https://www.techcityng.com/xbox-home-ui-gives-more-room-for-backgrounds-and-customization/
- Complaints: ads/clutter ("yet another homescreen redesign – full of ads"), extra tiles under recently played. https://www.flatpanelshd.com/news.php?subaction=showfull&id=1662710305 ; https://www.reddit.com/r/xbox/comments/15agfza/new_xbox_dashboardhome_ui_discussion_megathread/ (snippet)

### PS5
- Horizontal row of game tiles, separate Games/Media tabs, Control Center overlay with "activity cards" (jump to level, estimated time to finish), Game Hub per game; "designed for 4K". https://medium.com/technology-explained/some-thoughts-on-ps5-user-interface-5dc445f2b39f ; https://www.playstationlifestyle.net/2020/10/15/daily-reaction-analyzing-the-ps5-ui-reveal/ ; official video https://www.youtube.com/watch?v=7TBPrYJDoDE
- Complaint: things that were 1-2 clicks now buried. https://www.reddit.com/r/PS5/comments/k7ll5g/so_many_things_i_only_needed_one_or_two_clicks/ (snippet)
- Both consoles get cloned as emulator themes: ES-DE "PS5 Menu" and Pegasus "prosperoOS"/"XboxOS". https://gitlab.com/es-de/themes/themes-list#ps5-menu ; https://github.com/PlayingKarrde/prosperoOS

## 2. Most popular community themes

### ES-DE (all screenshots: https://gitlab.com/es-de/themes/themes-list)
| Theme | Why liked | Screenshot |
|---|---|---|
| Art Book Next (anthonycaccese) | "the GOAT" / "best theme for ESDE"; huge variant set (list/grid, boxart/miximage/screenshot), Dark/OLED/Light × Screenshots/Noir/Circuit/Outline color schemes, per-system custom images | https://gitlab.com/es-de/themes/themes-list/-/raw/master/screenshots/art-book-next-es-de/art-book-next-es-de_02.webp — https://www.reddit.com/r/retroid/comments/1mtvh24/art_book_next_is_the_best_theme_for_esde/ |
| Iconic (Siddy212) | grid-based, "modern appearance while highlighting famous characters from each system"; users customise it to show favourite games | https://gitlab.com/es-de/themes/themes-list/-/raw/master/screenshots/iconic-es-de/iconic-es-de_01.jpg — https://github.com/Siddy212/iconic-es-de |
| Cathode | CRT-in-a-dark-room look: 3D box-art carousel, neon red glow, console shown on a CRT, per-console color schemes ("Classic Red", "Xbox Live") | https://gitlab.com/es-de/themes/themes-list/-/raw/master/screenshots/cathode-es-de/cathode-es-de_01.jpg — https://www.reddit.com/r/retroid/comments/1i7p5rd/ |
| CodyWheel | wheel + carousel gamelist, several color schemes | https://gitlab.com/es-de/themes/themes-list/-/raw/master/screenshots/codywheel-es-de/codywheel-es-de_04.jpg — https://www.reddit.com/r/retroid/comments/1o3c73h/best_theme_for_esde/ |
| Console clones (PS5 Menu, XMB, NSO, Analogue OS, MinUI) | familiarity | https://gitlab.com/es-de/themes/themes-list |

### Pegasus (all: https://pegasus-frontend.org/tools/themes/)
| Theme | Why liked | Screenshot |
|---|---|---|
| gameOS | tvOS-style hero + rows + "Continue Playing"; most forked | https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/PlayingKarrde/gameOS/YXNzZXRzL2ltYWdlcy9zY3JlZW5zaG90LnBuZw==.png |
| Colorful (port of Big Box COLORFUL) | per-system colored backgrounds + clear logos | https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/RobZombie9043/COLORFUL/Lm1ldGEvc2NyZWVuc2hvdHMvQ29sbGVjdGlvbnNEZXRhaWxzLnBuZw==.png |
| Clean Covers | cover-focused, blurred backdrop, has a desktop mouse-scroll variant | https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/mlumeau/pegasus-theme-clean-covers/c2NyZWVuc2hvdHMvc2NyZWVuc2hvdDEud2VicA==.webp |
| Flixnet / FlatFlix | Netflix-style rows | https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/mmatyas/pegasus-theme-flixnet/Lm1ldGEvc2NyZWVuc2hvdC5qcGc=.jpg |
| BigScreenFE | Big Picture library clone | https://pegasus-frontend.org/tools/themes/img/screenshots/github.com/ZagonAb/BigScreenFE/Lm1ldGEvc2NyZWVuc2hvdHMvMC5wbmc=.png |
| Retro Mega / Retro Mega Next, prosperoOS (PS5), switchOS | console nostalgia | gallery page |

## 3. Ranked design ideas to steal

1. **"Continue Playing" / "Jump back in" row on home, launchable without entering a system** — every 10-ft UI converged on it (gameOS, Big Box 12.14, Xbox 2023, Steam Deck home). https://www.theverge.com/2022/9/8/23328667/microsoft-xbox-home-user-interface-update-changes-dashboard-2023
2. **Per-system color accent + clear logo as the system identity** (Slate's vertical color stripe, COLORFUL's media set, Cathode's per-console schemes) — gives instant orientation without reading. https://forums.launchbox-app.com/topic/51590-colorful-bigbox-theme/page/20/
3. **Hero banner from fanart/key art of the focused game, with the rest of the UI dimmed underneath** — gameOS/Netflix pattern; Playnite users literally edit the default theme to show more background art. https://www.reddit.com/r/playnite/comments/192d64f/editing_the_default_fullscreen_theme/
4. **Video/screenshot preview on focus after a short dwell, off by default for perf** — gameOS turned thumbnails off then re-enabled after optimisation; Big Box users blame animation for slowness. https://github.com/PlayingKarrde/gameOS ; https://www.reddit.com/r/launchbox/comments/vxyab7/my_opinions_on_launchbox/
5. **Persistent controller hint bar with glyphs matching the connected pad** — ES-DE bottom bar; Big Picture swaps prompts per controller. https://www.neogaf.com/threads/latest-steam-update-adds-the-new-big-picture-mode-and-makes-it-the-default.1651285/
6. **Metadata badges (favorite/completed/controller/players) as a compact icon row** — Slate's badge grid; make status scannable. https://gitlab.com/es-de/themes/themes-list#slate
7. **Variants + color schemes + font sizes as first-class settings (incl. OLED/true-black and Light)** — the reason Art Book Next wins; ES-DE 3.0 added font sizes for readability. https://www.gamingonlinux.com/2024/02/emulationstation-desktop-edition-es-de-gets-new-default-look-and-different-font-sizes/
8. **System-logo tile strip instead of a wheel** — gameOS uses monochrome logos on rounded tiles; scales to desktop mouse use, unlike Big Box wheels. https://pegasus-frontend.org/tools/themes/
9. **Activity-card-style quick actions for a game (Resume save state, last played slot, playtime)** — PS5 control center pattern users cite as genuinely useful. https://medium.com/technology-explained/some-thoughts-on-ps5-user-interface-5dc445f2b39f
10. **3D box art / physical-media carousel as an optional variant, not the default** — Cathode and Analogue-3D themes offer "Carts/Caps/Covers" variants; loved as eye-candy but heavier. https://gitlab.com/es-de/themes/themes-list#cathode
11. **Characters-per-system art (Iconic) as an optional pack** — strong emotional hook, but needs curated assets. https://github.com/Siddy212/iconic-es-de
12. **Keep a "simple" mode that shows less** — Playnite users prefer Hero because "every other theme has too many unnecessary bells and whistles"; Beacon is praised as a middle ground. https://www.reddit.com/r/playnite/comments/1idp81u/any_full_screen_theme_suggestions/

## 4. Comparison table

| Frontend | Default look | Focus treatment | Palette | Strengths (users) | Complaints (users) |
|---|---|---|---|---|---|
| ES-DE (Linear/Slate) | system carousel → textlist + miximage + metadata | solid highlight bar | grey/dark, per-system stripe | theme ecosystem, variants/color schemes | setup effort |
| Pegasus (grid / gameOS) | hero + system tiles + rows | scaled card | dark navy (gameOS) | tvOS feel, QML flexibility | small community, theme-dependent |
| Playnite Fullscreen | grid + details over art | border/scale | dark | Aniki/Solaris/Hero themes | default hides art; theme lag |
| Big Box | wheel + CoverFlow + video | CoverFlow center | dark, video-heavy | polish, recently-played strip | animation slowness, paid |
| RetroBat (Carbon) | ES carousel + textlist | highlight row | dark grey | Windows all-in-one | little UI discussion |
| Daijisho | Material grid/list | Material ripple/outline | Material dark/light | fast, easy | "falling behind" |
| Big Picture 2023 | Deck UI: recent row + library tabs | scaled tile + glow | dark blue-grey | modern, controller glyphs | Deck-centric, missing features |
| Xbox Home 2023 | Jump-back-in row + app tiles | scaled tile | dark + wallpaper | wallpaper room | ads/clutter |
| PS5 | horizontal tiles, Games/Media tabs, control center | scaled tile + hero | dark, 4K art | activity cards, speed | actions buried |

## Gaps / honesty notes
- No official screenshot URL found for ES-DE's Linear default theme; description of Slate is from the inspected screenshot.
- Reddit thread contents are from search snippets only (site blocked all fetch paths); vote counts unavailable.
- No 2025-26 UI critique found for RetroBat beyond wiki/how-to.
