// REPRO main process: config, recipes, detect, scan, launch. plain node, no framework.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { scrapeLibrary, scrapeGame } = require('./scraper');
const plat = require('./platform');
const saves = require('./saves');

// ---------- two roots: BUNDLE (packed read-only assets) and ROOT (user data next to the exe)
// In dev both are the repo root. In the packaged portable exe they split:
//   BUNDLE = the asar (electron reads it transparently as a normal folder)
//   ROOT   = PORTABLE_EXECUTABLE_DIR — the folder the user put the .exe in
const BUNDLE = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..', '..');
// REPRO_ROOT overrides the user-data folder (tests point it at a temp dir so they never touch your real config/library)
//   (linux AppImage: the folder the .AppImage sits in, since the exe itself lives in a read-only mount)
const ROOT   = plat.userRoot({ isPackaged: app.isPackaged, devRoot: path.join(__dirname, '..', '..'), execPath: process.execPath });

const P = {
  config:  path.join(ROOT,   'config.json'),
  library: path.join(ROOT,   'library.json'),
  recipes: path.join(BUNDLE, 'recipes'),   // read-only, packed in asar
  themes:  path.join(BUNDLE, 'themes'),    // built-in themes; user themes go in ROOT/themes
  art:     path.join(ROOT,   'art'),
};
// ensure user-writable dirs exist on disk (can't mkdirSync inside asar)
for (const d of [P.art, path.join(ROOT, 'themes'), path.join(ROOT, 'saves')]) {
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
}

const SYSDB = JSON.parse(fs.readFileSync(path.join(BUNDLE, 'systems.json'), 'utf8'));
const SYSTEMS = Object.fromEntries(Object.entries(SYSDB).map(([k, v]) => [k, v.name]));

const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));

let config = readJson(P.config, { emulators: {}, romDirs: [], mode: 'desktop', ui: 'desk', theme: 'billet', views: [], panels: { side: true, detail: true }, cardSize: 150, hubKey: 'Ctrl+Alt+H', igdb: {} });
let library = readJson(P.library, { games: {} }); // keyed by rom path
const saveConfig = () => writeJson(P.config, config);
const saveLibrary = () => writeJson(P.library, library);

// ---------- recipes
function loadRecipes() {
  const out = {};
  for (const f of fs.readdirSync(P.recipes)) {
    if (!f.endsWith('.json')) continue;
    const r = readJson(path.join(P.recipes, f));
    if (r && r.id) out[r.id] = r;
  }
  return out;
}
let recipes = loadRecipes();

const globToRe = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
// exe is a file path or "flatpak:<app id>". osId lets tests match the other platform's names.
function recipeForExe(exePath, osId = plat.OS) {
  if (plat.isFlatpak(exePath)) return Object.values(recipes).find(r => r.flatpak === plat.flatpakId(exePath)) || null;
  const base = exePath.split(/[\\/]/).pop(); // either separator, so windows paths match from linux tests too
  for (const r of Object.values(recipes)) if (plat.perOs(r.exe, osId).some(g => globToRe(g).test(base))) return r;
  return null;
}
// any platform's emulator binary name: used to skip emulator program folders during rom scans
const isEmulatorFile = name => Object.values(recipes).some(r => plat.allOs(r.exe).some(g => globToRe(g).test(name)));
function resolveDataDir(recipe, exePath, { osId = plat.OS, env = process.env, home = os.homedir() } = {}) {
  if (!recipe) return null;
  const fp = plat.flatpakId(exePath);
  const vars = plat.pathVars({ osId, env, home, exe: fp ? null : path.dirname(exePath), flatpak: fp });
  for (const d of plat.perOs(recipe.dataDirs, osId)) {
    // a flatpak only ever uses its sandbox dirs ({var}); a native install never does
    if (!!fp !== d.includes('{var}')) continue;
    // "marker?dir": only use dir if marker file exists (portable-mode detection)
    const [marker, dir] = d.includes('?') ? d.split('?') : [null, d];
    if (marker) { const m = plat.fillVars(marker, vars); if (!m || !fs.existsSync(m)) continue; }
    const p = plat.fillVars(dir, vars);
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ---------- detect: walk likely folders for known exes
async function walk(dir, depth, hits, seen) {
  if (depth < 0) return;
  let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(node_modules|\$RECYCLE\.BIN|Windows|System Volume Information|\.git)$/i.test(e.name)) continue;
      await walk(p, depth - 1, hits, seen);
    } else if (e.isFile() || e.isSymbolicLink()) {
      const r = recipeForExe(p);
      if (r && !seen.has(r.id) && plat.isExecutable(p)) addHit(hits, seen, r, p);
    }
  }
}
function addHit(hits, seen, r, exe) { seen.add(r.id); hits.push({ recipe: r.id, name: r.name, exe, flatpak: plat.isFlatpak(exe), dataDir: resolveDataDir(r, exe) }); }
// order = preference: REPRO's own emulators/ folder, then what's on PATH, then common folders, then flatpaks
async function detectEmulators(extraDirs = []) {
  const hits = [], seen = new Set();
  await walk(path.join(ROOT, 'emulators'), 4, hits, seen);
  for (const r of Object.values(recipes)) {
    if (seen.has(r.id)) continue;
    for (const name of plat.perOs(r.exe).filter(g => !g.includes('*'))) {
      const p = plat.pathDirs().map(d => path.join(d, name)).find(plat.isExecutable);
      if (p) { addHit(hits, seen, r, p); break; }
    }
  }
  for (const d of [...plat.emulatorSearchDirs(), ...extraDirs]) await walk(d, 4, hits, seen);
  const flatpaks = await plat.listFlatpaks();
  for (const r of Object.values(recipes)) if (!seen.has(r.id) && r.flatpak && flatpaks.has(r.flatpak)) addHit(hits, seen, r, plat.FLATPAK_PREFIX + r.flatpak);
  return hits;
}

// ---------- drive discovery: windows drive letters / linux home + mounted disks (see platform.listRoots)
const getLocalDrives = () => plat.listRoots();

// ---------- deep rom scan: walks all drives for known rom extensions
// onProgress(found, scanned, currentPath) — called roughly every 500 files
const SKIP_DIRS = plat.SKIP_DIRS;
// ROM_EXTS is built further down, right after ALL_EXT (const TDZ: referencing it here crashed at load)

async function deepScanDrive(drive, foundRoms, onProgress) {
  let scanned = 0;
  async function walkDeep(dir) {
    let ents;
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    // skip emulator program folders
    if (ents.some(e => e.isFile() && isEmulatorFile(e.name))) return;
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        await walkDeep(p);
      } else if (e.isFile()) {
        scanned++;
        const ext = path.extname(e.name).toLowerCase();
        if (ROM_EXTS.has(ext)) {
          foundRoms.push(p);
          if (onProgress && scanned % 500 === 0) onProgress(foundRoms.length, scanned, p);
        }
      }
    }
  }
  await walkDeep(drive);
}

// Group found roms into folder buckets, add any new ones as romDirs
async function autoScanRoms(onProgress) {
  const drives = await getLocalDrives();
  const foundRoms = [];
  for (const drive of drives) {
    if (onProgress) onProgress(foundRoms.length, 0, `scanning ${drive}…`);
    await deepScanDrive(drive, foundRoms, onProgress);
  }
  // group by parent folder
  const dirs = {};
  for (const p of foundRoms) { const d = path.dirname(p); dirs[d] = (dirs[d] || 0) + 1; }
  // add folders not already in romDirs (min 1 rom file)
  let added = 0;
  for (const [d, count] of Object.entries(dirs)) {
    if (count >= 1 && !config.romDirs.some(r => r.path === d || d.startsWith(r.path.replace(/[\\/]+$/, '') + path.sep))) {
      config.romDirs.push({ path: d, system: null });
      added++;
    }
  }
  if (added) saveConfig();
  return { drives: drives.length, romsFound: foundRoms.length, foldersAdded: added };
}

// ---------- smart path recovery: if a game's file no longer exists, find it by filename
async function recoverMissingPaths(onProgress) {
  const missing = Object.values(library.games).filter(g => !fs.existsSync(g.path));
  if (!missing.length) return { recovered: 0, stillMissing: 0 };
  const drives = await getLocalDrives();
  // build filename -> path index from a fresh deep scan
  const index = {}; // filename.lower -> full path
  let scanned = 0;
  for (const drive of drives) {
    async function indexWalk(dir) {
      let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) await indexWalk(p); }
        else { scanned++; index[e.name.toLowerCase()] = p; if (onProgress && scanned % 1000 === 0) onProgress(scanned, p); }
      }
    }
    await indexWalk(drive);
  }
  let recovered = 0;
  for (const g of missing) {
    const fn = path.basename(g.path).toLowerCase();
    if (index[fn]) {
      const oldPath = g.path;
      library.games[index[fn]] = { ...g, path: index[fn], id: index[fn] };
      delete library.games[oldPath];
      recovered++;
    }
  }
  if (recovered) saveLibrary();
  return { recovered, stillMissing: missing.length - recovered };
}

// ---------- scan roms
const ALL_EXT = {}; // ext -> [system]
// these are launchable but a scan should never pick them up (every emulator ships .exe/.bin/.elf files)
const NOSCAN = new Set(['.exe', '.lnk', '.bin', '.elf', '.gz']); // pc games get added on purpose (M4), not by scan
for (const r of Object.values(recipes)) for (const [sys, exts] of Object.entries(r.extensions)) for (const e of exts) if (!NOSCAN.has(e)) (ALL_EXT[e] ??= new Set()).add(sys);
// systems.json covers systems no recipe knows yet, so their roms land in the library (unlaunchable until an emulator is added)
for (const [sys, v] of Object.entries(SYSDB)) for (const e of v.ext) if (!NOSCAN.has(e) && !/\.(zip|iso|chd|cue|bin)$/.test(e)) (ALL_EXT[e] ??= new Set()).add(sys);
const ROM_EXTS = new Set(Object.keys(ALL_EXT)); // used by deepScanDrive; must come after ALL_EXT is filled

function titleFromFile(name) {
  // drop region/language tags like (USA) (En,Ja) [!] but keep edition tags like (Hall of Fame Edition) (Disc 1)
  return name.replace(/\.[^.]+$/, '').replace(/\.(nkit|xiso)$/i, '')
    .replace(/\s*[\(\[](USA|Europe|Japan|World|En|Ja|Fr|De|Es|It|Rev \d+|T-En|Canada|Australia|[A-Za-z]{2}(,[A-Za-z]{2})+|[!bh]|Fixed)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s+/g, ' ').trim();
}
function guessSystem(file, dirHint) {
  const ext = path.extname(file).toLowerCase();
  const cands = [...(ALL_EXT[ext] || [])];
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];
  const hint = dirHint.toLowerCase();
  for (const s of cands) if (hint.includes(s) || hint.includes(SYSTEMS[s].toLowerCase())) return s;
  if (/gamecube|\bgc\b/.test(hint)) return cands.includes('gc') ? 'gc' : cands[0];
  if (/\bps2\b|playstation 2/.test(hint)) return cands.includes('ps2') ? 'ps2' : cands[0];
  if (/\bps1\b|\bpsx\b/.test(hint)) return cands.includes('ps1') ? 'ps1' : cands[0];
  if (/xbox ?360/.test(hint)) return cands.includes('x360') ? 'x360' : cands[0];
  if (/xbox/.test(hint)) return cands.includes('xbox') ? 'xbox' : cands[0];
  return null; // ambiguous -> unsorted
}
async function scanDir(dir, out, unsorted, forcedSys) {
  let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  // a folder holding an emulator exe is an emulator, not a rom folder
  if (ents.some(e => e.isFile() && isEmulatorFile(e.name))) return;
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/bios|cover|firmware|^sys$|cache|shader|textures/i.test(e.name)) await scanDir(p, out, unsorted, forcedSys); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (!ALL_EXT[ext] && !/\.(7z|zip|rar)$/i.test(e.name)) continue;
    if (/\.(7z|zip|rar)$/i.test(e.name)) {
      // an archive next to an extracted copy of the same game is just clutter, skip it quietly
      const stem = e.name.replace(/\.(7z|zip|rar)$/i, '').toLowerCase();
      if (ents.some(x => x.name.toLowerCase().startsWith(stem) && x.name !== e.name)) continue;
      unsorted.push({ path: p, why: 'archive, extract it first' }); continue;
    }
    // .iso next to a .cue/.mds of the same name is the same disc
    if (ext === '.iso' && ents.some(x => /\.(cue|mds)$/i.test(x.name) && x.name.replace(/\.\w+$/, '').toLowerCase() === e.name.replace(/\.\w+$/, '').toLowerCase())) continue;
    if (ext === '.mds' && ents.some(x => /\.cue$/i.test(x.name))) continue;
    const sys = forcedSys || guessSystem(e.name, p);
    if (!sys) { unsorted.push({ path: p, why: 'could not tell which system' }); continue; }
    out.push({ path: p, sys, title: titleFromFile(e.name), file: e.name });
  }
}
async function scanLibrary() {
  // first: try to recover any games whose paths no longer exist
  await recoverMissingPaths().catch(() => {});
  const found = [], unsorted = [];
  for (const rd of config.romDirs) await scanDir(rd.path, found, unsorted, rd.system || null);
  // merge: keep playtime etc for games we already knew
  const games = {};
  for (const f of found) {
    // same title+system twice (e.g. .iso and .xiso.iso of one game): keep the first
    if (Object.values(games).some(g => g.sys === f.sys && g.title.toLowerCase() === f.title.toLowerCase())) continue;
    const old = library.games[f.path] || {};
    games[f.path] = { ...old, ...f, id: f.path, playtime: old.playtime || 0, lastPlayed: old.lastPlayed || null, fav: !!old.fav, art: old.art || findLocalArt(f) };
  }
  library.games = games; library.unsorted = unsorted; saveLibrary();
  return snapshot();
}
function findLocalArt(g) {
  // art/<system>/<title>.(png|jpg) if the user (or scraper) put it there
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const p = path.join(P.art, g.sys, g.title + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
// where an emulator keeps things, for the 'files' panel
function emuFolders(id, e) {
  const r = recipes[id]; if (!r || !e.exe) return [];
  const out = [{ label: plat.isFlatpak(e.exe) ? 'flatpak sandbox' : 'program', path: plat.programDir(e.exe) }];
  if (e.dataDir) out.push({ label: 'config / data', path: e.dataDir });
  const fill = s => s.replace('{data}', e.dataDir || '').replace('{exe}', plat.programDir(e.exe));
  for (const [sys, sv] of Object.entries(r.saves || {})) if (sv !== 'hdd-image') { const p = fill(sv); if (fs.existsSync(p)) out.push({ label: `saves (${SYSTEMS[sys] || sys})`, path: p }); }
  for (const [sys, st] of Object.entries(r.states || {})) { const p = fill(st); if (fs.existsSync(p)) out.push({ label: `save states (${SYSTEMS[sys] || sys})`, path: p }); }
  for (const b of r.bios || []) { const p = fill(b); if (fs.existsSync(p)) out.push({ label: 'bios', path: p }); }
  return out;
}
function snapshot() {
  const emus = {};
  for (const [id, e] of Object.entries(config.emulators)) emus[id] = { ...e, name: recipes[id]?.name || id, systems: recipes[id]?.systems || [], exeDir: plat.programDir(e.exe), flatpak: plat.isFlatpak(e.exe), folders: emuFolders(id, e) };
  function readThemeDir(base) { try { return fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'theme.json'))).map(d => ({ id: d, ...readJson(path.join(base, d, 'theme.json'), {}), base })); } catch { return []; } }
  const themes = [...readThemeDir(P.themes), ...(ROOT !== BUNDLE ? readThemeDir(path.join(ROOT, 'themes')) : [])].reduce((a, t) => { a[t.id] = t; return a; }, {});
  return { games: Object.values(library.games), unsorted: library.unsorted || [], emulators: emus, systems: SYSTEMS, sysdb: SYSDB, root: ROOT, bundle: BUNDLE, themes: Object.values(themes), recipeArgs: Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, r.args])), os: plat.OS, config: { mode: config.mode, ui: config.ui, theme: config.theme, romDirs: config.romDirs, views: config.views || [], panels: config.panels || { side: true, detail: true }, cardSize: config.cardSize || 150, hubKey: config.hubKey || 'Ctrl+Alt+H', hubKeyOk: hubKeyOk } };
}
// duplicates: same title across different systems isn't a dupe, but same title+sys with a different path is
function findDuplicates() {
  const groups = {};
  for (const g of Object.values(library.games)) { const k = g.sys + '::' + g.title.toLowerCase(); (groups[k] ??= []).push(g); }
  return Object.values(groups).filter(l => l.length > 1);
}


// ============================
// SAVES: real per-emulator adapters live in saves.js. REPRO reads where each emulator actually keeps its saves
// and snapshots those files; it does NOT rewrite emulator configs (the old ini patching did, and pointed PCSX2 at
// an empty folder, hiding the user's existing memory cards).
// ============================
const SAVE_DIR = path.join(ROOT, 'saves');
// which emulator would run this game: per-game override first, then the system default
function emuIdFor(g) { if (g.emulator && config.emulators[g.emulator]?.exe) return g.emulator; for (const [id, e] of Object.entries(config.emulators)) if (recipes[id]?.systems.includes(g.sys) && e.exe) return id; return null; }
function saveCtx(g) {
  const emulator = emuIdFor(g);
  const e = emulator ? config.emulators[emulator] : null;
  // dataDir can appear after setup (emulator first run creates it), so re-resolve when it's missing
  let dataDir = e?.dataDir || null;
  if (e && (!dataDir || !fs.existsSync(dataDir))) { dataDir = resolveDataDir(recipes[emulator], e.exe); if (dataDir) { e.dataDir = dataDir; saveConfig(); } }
  return { game: g, emulator, dataDir };
}
function safeSnapshot(g, opts) { try { return saves.snapshot(ROOT, saveCtx(g), opts); } catch (e) { console.warn('[saves]', g.title, e.message); return { error: e.message }; } }

// ---------- launch
let running = null;
function launchBare(exe) { const c = plat.spawnEmu(exe, [], { spawn: { detached: true } }); c.on('error', err => send('menu', 'toast', 'launch failed: ' + err.message)); c.unref(); }
function emulatorFor(sys) {
  for (const [id, e] of Object.entries(config.emulators)) if (recipes[id]?.systems.includes(sys) && e.exe) return { id, ...e, recipe: recipes[id] };
  return null;
}
function launch(gameId) {
  const g = library.games[gameId]; if (!g) return { error: 'no such game' };
  if (running) return { error: 'something is already running' };
  const emu = g.emulator ? { id: g.emulator, ...config.emulators[g.emulator], recipe: recipes[g.emulator] } : emulatorFor(g.sys);
  if (!emu || !emu.exe) return { error: `no emulator set up for ${SYSTEMS[g.sys]}` };
  // snapshot whatever saves exist right now, so this session can always be rolled back (skipped if unchanged)
  const before = safeSnapshot(g, { reason: 'before-play' });
  const argsTpl = g.args || emu.recipe.args[g.sys] || ['{rom}'];
  const args = argsTpl.map(a => a.replace('{rom}', g.path).replace('{dir}', plat.programDir(emu.exe)));
  const started = Date.now();
  let child;
  // flatpak emulators get the rom folder punched into their sandbox (read-only)
  try { child = plat.spawnEmu(emu.exe, args, { roDirs: [path.dirname(g.path)] }); }
  catch (e) { return { error: e.message }; }
  child.on('error', err => { running = null; send('menu', 'toast', `couldn't start ${emu.recipe?.name || emu.id}: ${err.message}`); win?.restore(); });
  running = { gameId, pid: child.pid, started, child, exe: emu.exe };
  win?.minimize();
  child.on('exit', () => {
    const secs = Math.round((Date.now() - started) / 1000);
    g.playtime = (g.playtime || 0) + secs; g.lastPlayed = Date.now(); saveLibrary();
    // capture what this session saved. first-ever play of a per-game card only exists now. dedupes if nothing changed.
    const after = secs > 5 ? safeSnapshot(g, { reason: 'after-play' }) : { skipped: 'too-short' };
    running = null;
    if (win && !win.isDestroyed()) { win.restore(); win.focus(); win.webContents.send('game-exited', { gameId, secs, saved: !!after.ok }); }
  });
  return { ok: true, exe: emu.exe, args, snapshot: before.ok ? before.slot.id : (before.skipped || before.error) };
}
function killRunning() {
  if (!running) return { error: 'nothing is running' };
  // whole tree: some emulators spawn helper/render processes (taskkill /T on windows, process group on linux)
  try { plat.killTree(running.pid, running.exe); } catch (e) { try { running.child.kill(); } catch {} }
  return { ok: true };
}

// ---------- controller Guide/Home button hook (xinput-ffi, no node-gyp)
// XInputGetStateEx (ordinal 100) exposes the Guide button which standard XInputGetState hides.
// Source: https://github.com/xan105/node-xinput-ffi
let guidePoller = null, guideStop = null;
async function startGuideHook() {
  if (process.argv.includes('--smoke')) return; // skip in test mode
  if (plat.OS === 'linux') { guideStop = plat.startLinuxGuideHook(onGuidePress); return; } // evdev BTN_MODE, no native module
  if (plat.OS !== 'win') return;
  let xif;
  try { xif = await import('xinput-ffi'); } catch (e) { console.warn('xinput-ffi not available, Guide hook disabled:', e.message); return; }
  const { getStateEx, listConnected } = xif;
  const GUIDE = 0x0400;
  const prev = [false, false, false, false];
  guidePoller = setInterval(async () => {
    try {
      const connected = await listConnected();
      for (let i = 0; i < 4; i++) {
        if (!connected[i]) { prev[i] = false; continue; }
        const s = await getStateEx({ dwUserIndex: i, translate: false });
        const down = (s.gamepad.wButtons & GUIDE) !== 0;
        if (down && !prev[i]) onGuidePress();
        prev[i] = down;
      }
    } catch {}
  }, 50); // 20hz — low enough not to burn CPU, responsive enough for a UI button
}
function stopGuideHook() { if (guidePoller) { clearInterval(guidePoller); guidePoller = null; } if (guideStop) { guideStop(); guideStop = null; } }
function onGuidePress() {
  if (!running) { win?.show(); win?.focus(); return; }
  killRunning();
  send('menu', 'toast', 'closed the game via Guide button');
}

let win;
const send = (ch, ...a) => win?.webContents.send(ch, ...a);
function buildMenu() {
  const themes = fs.readdirSync(P.themes).filter(d => fs.existsSync(path.join(P.themes, d, 'theme.json')));
  const tpl = [
    { label: 'File', submenu: [
      { label: 'Add rom folder…', accelerator: 'CmdOrCtrl+O', click: () => send('menu', 'addRomDir') },
      { label: 'Add emulator…', click: () => send('menu', 'addExe') },
      { label: 'Rescan library', accelerator: 'F5', click: () => send('menu', 'rescan') },
      { label: 'Find duplicates…', click: () => send('menu', 'duplicates') },
      { label: 'Scan whole PC for roms…', click: () => send('menu', 'autoScan') },
      { type: 'separator' },
      { label: 'Open REPRO folder', click: () => shell.openPath(ROOT) },
      { label: 'Open config.json', click: () => shell.openPath(P.config) },
      { type: 'separator' },
      { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => send('menu', 'setup') },
      { type: 'separator' }, { role: 'quit' } ] },
    { label: 'Edit', submenu: [ { role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }, { type: 'separator' },
      { label: 'Find game', accelerator: 'CmdOrCtrl+F', click: () => send('menu', 'search') } ] },
    { label: 'View', submenu: [
      { label: 'Desktop mode', accelerator: 'CmdOrCtrl+1', click: () => send('menu', 'mode', 'desktop') },
      { label: 'Couch mode', accelerator: 'CmdOrCtrl+2', click: () => send('menu', 'mode', 'couch') },
      { type: 'separator' },
      { label: `Close running game (${config.hubKey || 'Ctrl+Alt+H'}${hubKeyOk ? '' : ' — NOT REGISTERED'})`, click: () => { killRunning(); } },
      { label: 'Change hub key…', click: () => send('menu', 'hubkey') },
      { type: 'separator' },
      { label: 'Theme', submenu: themes.map(t => ({ label: readJson(path.join(P.themes, t, 'theme.json'), {}).name || t, click: () => send('menu', 'theme', t) })) },
      { label: 'Scale', submenu: [ { label: 'Desk', click: () => send('menu', 'ui', 'desk') }, { label: 'TV', click: () => send('menu', 'ui', 'tv') } ] },
      { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'reload' }, { role: 'toggleDevTools' } ] },
    { label: 'Emulators', submenu: Object.keys(config.emulators).length ? Object.entries(config.emulators).map(([id, e]) => ({ label: recipes[id]?.name || id, submenu: [
        { label: 'Launch (no game)', click: () => launchBare(e.exe) },
        { type: 'separator' },
        ...emuFolders(id, e).map(f => ({ label: 'Open ' + f.label, click: () => shell.openPath(f.path) })),
      ] })) : [{ label: 'none set up yet', enabled: false }] },
    { label: 'Help', submenu: [
      { label: 'Roadmap', click: () => shell.openPath(path.join(ROOT, 'ROADMAP.md')) },
      { label: 'Recipes folder', click: () => shell.openPath(P.recipes) },
      { label: 'Themes folder', click: () => shell.openPath(P.themes) },
      { label: 'Art folder', click: () => shell.openPath(P.art) },
      { type: 'separator' },
      { label: 'GitHub', click: () => shell.openExternal('https://github.com/Delkyy/repro') },
      { label: 'About REPRO', click: () => dialog.showMessageBox(win, { title: 'REPRO', message: 'REPRO ' + app.getVersion(), detail: 'open-source emulator hub. one folder, every emulator, every game, every save.\n\nroot: ' + ROOT }) } ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}
function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 860, minWidth: 700, minHeight: 500,
    backgroundColor: '#0C0C0D', title: 'REPRO', icon: path.join(BUNDLE, 'assets', 'brand', plat.OS === 'win' ? 'icon.ico' : 'ico/icon-256.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  buildMenu();
  registerHubKey();
}
let hubKeyOk = false;
function registerHubKey() {
  globalShortcut.unregisterAll();
  const key = config.hubKey || 'Ctrl+Alt+H';
  try {
    hubKeyOk = globalShortcut.register(key, () => {
      if (!running) { win?.show(); win?.focus(); return; }
      killRunning();
      send('menu', 'toast', `closed the game via ${key}`);
    });
  } catch (e) { hubKeyOk = false; }
  if (!hubKeyOk) console.error(`hub key "${key}" is already claimed by another app (Steam, Nvidia overlay, Windows itself, etc). pick a different combo.`);
  buildMenu();
  return hubKeyOk;
}
// wayland: global shortcuts only work through the xdg GlobalShortcuts portal (KDE/GNOME ask the user once)
if (plat.OS === 'linux') app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
app.whenReady().then(() => { if (!process.argv.includes('--smoke')) { createWindow(); startGuideHook(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopGuideHook(); });
module.exports = { library, saveCtx, launch, detectEmulators, scanLibrary, snapshot, config, saveConfig, recipes, resolveDataDir, recipeForExe, isEmulatorFile, ROOT };

// ---------- ipc
ipcMain.handle('snapshot', () => snapshot());
ipcMain.handle('detect', async () => detectEmulators());
ipcMain.handle('scan', async () => scanLibrary());
ipcMain.handle('launch', (_, id) => launch(id));
ipcMain.handle('setEmulator', (_, { id, exe }) => { config.emulators[id] = { exe, dataDir: resolveDataDir(recipes[id], exe) }; saveConfig(); buildMenu(); return snapshot(); });
ipcMain.handle('openPath', (_, p) => shell.openPath(p));
ipcMain.handle('launchEmu', (_, id) => { const e = config.emulators[id]; if (!e?.exe) return; launchBare(e.exe); });
ipcMain.handle('addRomDir', async (_, { dir, system }) => { config.romDirs.push({ path: dir, system: system || null }); saveConfig(); return scanLibrary(); });
ipcMain.handle('removeRomDir', async (_, dir) => { config.romDirs = config.romDirs.filter(r => r.path !== dir); saveConfig(); return scanLibrary(); });
ipcMain.handle('setPref', (_, kv) => { Object.assign(config, kv); saveConfig(); });
ipcMain.handle('setGame', (_, { id, patch }) => { Object.assign(library.games[id], patch); saveLibrary(); return library.games[id]; });
ipcMain.handle('pickFolder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('pickExe', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: plat.OS === 'win' ? [{ name: 'Programs', extensions: ['exe'] }] : [] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('showInFolder', (_, p) => shell.showItemInFolder(p));
ipcMain.handle('fullscreen', (_, on) => win.setFullScreen(on));
ipcMain.handle('root', () => ROOT);
ipcMain.handle('bundle', () => BUNDLE);
ipcMain.handle('themes', () => {
  // built-in themes (asar) + user themes (next to exe) merged; user themes override built-in
  function readThemeDir(base) {
    try { return fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'theme.json'))).map(d => ({ id: d, ...readJson(path.join(base, d, 'theme.json'), {}), base })); } catch { return []; }
  }
  const builtin = readThemeDir(P.themes);
  const userDir = path.join(ROOT, 'themes');
  const user = ROOT !== BUNDLE ? readThemeDir(userDir) : [];
  const merged = [...builtin];
  for (const t of user) { const i = merged.findIndex(x => x.id === t.id); if (i >= 0) merged[i] = t; else merged.push(t); }
  return merged;
});
ipcMain.handle('detectOne', (_, exe) => { const r = recipeForExe(exe); return r ? { recipe: r.id, name: r.name, exe } : null; });
ipcMain.handle('duplicates', () => findDuplicates());
ipcMain.handle('saveView', (_, view) => { config.views = config.views || []; const i = config.views.findIndex(v => v.id === view.id); if (i >= 0) config.views[i] = view; else config.views.push(view); saveConfig(); return snapshot(); });
ipcMain.handle('removeView', (_, id) => { config.views = (config.views || []).filter(v => v.id !== id); saveConfig(); return snapshot(); });
ipcMain.handle('createSystemFolder', (_, sys) => { const p = path.join(ROOT, 'roms', sys); fs.mkdirSync(p, { recursive: true }); if (!config.romDirs.some(r => r.path === p)) { config.romDirs.push({ path: p, system: sys }); saveConfig(); } shell.openPath(p); return snapshot(); });
ipcMain.handle('killRunning', () => killRunning());
ipcMain.handle('isRunning', () => !!running);
ipcMain.handle('setHubKey', (_, key) => { const prev = config.hubKey; config.hubKey = key; const ok = registerHubKey(); if (!ok) config.hubKey = prev; saveConfig(); return { ok, key: config.hubKey }; });
// saves
const withGame = fn => (_, arg) => { const id = typeof arg === 'string' ? arg : arg?.id; const g = library.games[id]; if (!g) return { error: 'no such game' }; try { return fn(g, arg); } catch (e) { return { error: e.message }; } };
ipcMain.handle('saveInfo', withGame(g => saves.info(ROOT, saveCtx(g))));
ipcMain.handle('snapshotSave', withGame((g, a) => { if (running?.gameId === g.id) return { error: 'close the game first, the emulator may be mid-write' }; return saves.snapshot(ROOT, saveCtx(g), { kind: 'manual', reason: 'manual', name: a?.name || null }); }));
ipcMain.handle('restoreSave', withGame((g, { slot }) => { if (running) return { error: 'close the game before restoring a save' }; return saves.restore(ROOT, saveCtx(g), slot); }));
ipcMain.handle('renameSlot', withGame((g, { slot, name }) => saves.rename(ROOT, g, slot, name)));
ipcMain.handle('deleteSlot', withGame((g, { slot }) => saves.remove(ROOT, g, slot)));
ipcMain.handle('openSaveFolder', withGame((g, a) => { const d = a?.live ? saves.info(ROOT, saveCtx(g)).base : saves.gameDir(ROOT, g); if (!d) return { error: 'no save folder' }; fs.mkdirSync(d, { recursive: true }); shell.openPath(d); return { ok: true }; }));
ipcMain.on('quit', () => app.quit());

// ---- multi-disc: generate .m3u for disc sets ----
// Groups games by title similarity (strips "Disc N" suffix), writes a .m3u next to the discs
function generateM3u() {
  const games = Object.values(library.games);
  const groups = {};
  for (const g of games) {
    const key = g.sys + '::' + g.title.replace(/\s*[\(\[,]\s*Disc\s*\d+[^\)\]]*[\)\]]?\s*/i, '').replace(/\s*-\s*Disc\s*\d+\s*/i, '').toLowerCase().trim();
    (groups[key] ??= []).push(g);
  }
  let created = 0;
  for (const grp of Object.values(groups)) {
    if (grp.length < 2) continue;
    grp.sort((a, b) => a.title.localeCompare(b.title));
    const baseTitle = grp[0].title.replace(/\s*[\(\[,]\s*Disc\s*\d+[^\)\]]*[\)\]]?\s*/i, '').replace(/\s*-\s*Disc\s*\d+\s*/i, '').trim();
    const dir = path.dirname(grp[0].path);
    const m3uPath = path.join(dir, baseTitle + '.m3u');
    const content = grp.map(g => path.basename(g.path)).join('\n') + '\n';
    if (!fs.existsSync(m3uPath)) { fs.writeFileSync(m3uPath, content); created++; }
  }
  return created;
}

// ---- scraper IPC ----
let scrapeActive = false;
ipcMain.handle('scrapeAll', async (_, { clientId, clientSecret } = {}) => {
  if (scrapeActive) return { error: 'already scraping' };
  scrapeActive = true;
  const creds = clientId ? { clientId, clientSecret } : (config.igdb?.clientId ? config.igdb : null);
  const games = Object.values(library.games);
  let done = 0, found = 0, errors = 0;
  try {
    const results = await scrapeLibrary(games, P.art, creds, (i, total, g, r) => {
      done = i;
      if (r.artPath) { library.games[g.id].art = r.artPath; found++; }
      if (r.desc) library.games[g.id].desc = r.desc;
      if (r.year) library.games[g.id].year = r.year;
      if (r.genres?.length) library.games[g.id].genres = r.genres;
      if (r.igdbId) library.games[g.id].igdbId = r.igdbId;
      if (r.error) errors++;
      if (i % 5 === 0 || i === total) saveLibrary();
      send('scrape-progress', { i, total, title: g.title, found: !!r.artPath });
    });
    saveLibrary();
    const m3uCount = generateM3u();
    return { ok: true, done, found, errors, m3u: m3uCount };
  } finally { scrapeActive = false; }
});
ipcMain.handle('scrapeOne', async (_, gameId) => {
  const g = library.games[gameId]; if (!g) return { error: 'no such game' };
  const artDir = path.join(P.art, g.sys);
  const creds = config.igdb?.clientId ? config.igdb : null;
  const r = await scrapeGame(g, artDir, creds);
  if (r.artPath) library.games[g.id].art = r.artPath;
  if (r.desc) library.games[g.id].desc = r.desc;
  if (r.year) library.games[g.id].year = r.year;
  if (r.genres?.length) library.games[g.id].genres = r.genres;
  if (r.igdbId) library.games[g.id].igdbId = r.igdbId;
  saveLibrary();
  return { ok: true, ...r };
});
ipcMain.handle('setIgdb', (_, { clientId, clientSecret }) => { config.igdb = { clientId, clientSecret }; saveConfig(); return { ok: true }; });
ipcMain.handle('generateM3u', () => { const n = generateM3u(); return { created: n }; });
ipcMain.handle('scrapeStatus', () => ({ active: scrapeActive, hasCredentials: !!(config.igdb?.clientId) }));

// ---------- auto-scan / path recovery IPC
let deepScanActive = false;
ipcMain.handle('autoScanRoms', async () => {
  if (deepScanActive) return { error: 'scan already running' };
  deepScanActive = true;
  try {
    const result = await autoScanRoms((found, scanned, cur) => {
      send('scan-progress', { found, scanned, cur: path.basename(cur) });
    });
    if (result.foldersAdded > 0) {
      const scan = await scanLibrary();
      return { ...result, games: scan.games.length };
    }
    return result;
  } finally { deepScanActive = false; }
});
ipcMain.handle('recoverPaths', async () => {
  const r = await recoverMissingPaths();
  if (r.recovered) await scanLibrary();
  return r;
});
