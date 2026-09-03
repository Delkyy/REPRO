// REPRO main process: config, recipes, detect, scan, launch. plain node, no framework.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { scrapeLibrary, scrapeGame } = require('./scraper');

// ---------- portable root: everything lives next to the exe (or the repo when running from source)
const ROOT = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..', '..');
const P = {
  config: path.join(ROOT, 'config.json'),
  library: path.join(ROOT, 'library.json'),
  recipes: path.join(ROOT, 'recipes'),
  themes: path.join(ROOT, 'themes'),
  art: path.join(ROOT, 'art'),
};
for (const d of [P.art, P.themes]) fs.mkdirSync(d, { recursive: true });

const SYSDB = JSON.parse(fs.readFileSync(path.join(ROOT, 'systems.json'), 'utf8'));
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
function recipeForExe(exePath) {
  const base = path.basename(exePath);
  for (const r of Object.values(recipes)) if (r.exe.some(g => globToRe(g).test(base))) return r;
  return null;
}
function resolveDataDir(recipe, exePath) {
  const vars = { exe: path.dirname(exePath), docs: path.join(os.homedir(), 'Documents'), appdata: process.env.APPDATA || '' };
  const fill = s => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  for (const d of recipe.dataDirs || []) {
    // "marker?dir": only use dir if marker file exists (portable-mode detection)
    const [marker, dir] = d.includes('?') ? d.split('?') : [null, d];
    if (marker && !fs.existsSync(fill(marker))) continue;
    const p = fill(dir);
    if (fs.existsSync(p)) return p;
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
    } else if (e.isFile() && /\.exe$/i.test(e.name)) {
      const r = recipeForExe(p);
      if (r && !seen.has(r.id)) { seen.add(r.id); hits.push({ recipe: r.id, name: r.name, exe: p, dataDir: resolveDataDir(r, p) }); }
    }
  }
}
async function detectEmulators(extraDirs = []) {
  const home = os.homedir();
  const dirs = [
    path.join(home, 'Documents'), path.join(home, 'Desktop'), path.join(home, 'Downloads'),
    'C:\\Program Files', 'C:\\Program Files (x86)', path.join(home, 'AppData', 'Local', 'Programs'),
    path.join(ROOT, 'emulators'), ...extraDirs,
  ];
  const hits = [], seen = new Set();
  for (const d of dirs) await walk(d, 4, hits, seen);
  return hits;
}

// ---------- drive discovery (Windows: wmic logicaldisk)
async function getLocalDrives() {
  return new Promise(resolve => {
    const { exec } = require('child_process');
    exec('wmic logicaldisk get deviceid,drivetype', (err, out) => {
      if (err) { resolve(['C:\\']); return; }
      const drives = [];
      for (const line of out.split('\n')) {
        const m = line.match(/^([A-Z]:)\s+(\d)/);
        if (m && (m[2] === '3' || m[2] === '2')) drives.push(m[1] + '\\'); // local + removable
      }
      resolve(drives.length ? drives : ['C:\\']);
    });
  });
}

// ---------- deep rom scan: walks all drives for known rom extensions
// onProgress(found, scanned, currentPath) — called roughly every 500 files
const SKIP_DIRS = new Set(['Windows','$RECYCLE.BIN','System Volume Information','Program Files','Program Files (x86)',
  'ProgramData','node_modules','AppData','$Windows.~BT','$Windows.~WS','Boot','Recovery','Config.Msi']);
const ROM_EXTS = new Set(Object.keys(ALL_EXT)); // built from recipes + systems.json

async function deepScanDrive(drive, foundRoms, onProgress) {
  let scanned = 0;
  async function walkDeep(dir) {
    let ents;
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    // skip emulator program folders
    if (ents.some(e => e.isFile() && /\.exe$/i.test(e.name) && recipeForExe(e.name))) return;
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
    if (count >= 1 && !config.romDirs.some(r => r.path === d || d.startsWith(r.path))) {
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
  if (ents.some(e => e.isFile() && /\.exe$/i.test(e.name) && recipeForExe(e.name))) return;
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
  const out = [{ label: 'program', path: path.dirname(e.exe) }];
  if (e.dataDir) out.push({ label: 'config / data', path: e.dataDir });
  const fill = s => s.replace('{data}', e.dataDir || '').replace('{exe}', path.dirname(e.exe));
  for (const [sys, sv] of Object.entries(r.saves || {})) if (sv !== 'hdd-image') { const p = fill(sv); if (fs.existsSync(p)) out.push({ label: `saves (${SYSTEMS[sys] || sys})`, path: p }); }
  for (const [sys, st] of Object.entries(r.states || {})) { const p = fill(st); if (fs.existsSync(p)) out.push({ label: `save states (${SYSTEMS[sys] || sys})`, path: p }); }
  for (const b of r.bios || []) { const p = fill(b); if (fs.existsSync(p)) out.push({ label: 'bios', path: p }); }
  return out;
}
function snapshot() {
  const emus = {};
  for (const [id, e] of Object.entries(config.emulators)) emus[id] = { ...e, name: recipes[id]?.name || id, systems: recipes[id]?.systems || [], exeDir: e.exe ? path.dirname(e.exe) : null, folders: emuFolders(id, e) };
  return { games: Object.values(library.games), unsorted: library.unsorted || [], emulators: emus, systems: SYSTEMS, sysdb: SYSDB, root: ROOT, recipeArgs: Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, r.args])), config: { mode: config.mode, ui: config.ui, theme: config.theme, romDirs: config.romDirs, views: config.views || [], panels: config.panels || { side: true, detail: true }, cardSize: config.cardSize || 150, hubKey: config.hubKey || 'Ctrl+Alt+H', hubKeyOk: hubKeyOk } };
}
// duplicates: same title across different systems isn't a dupe, but same title+sys with a different path is
function findDuplicates() {
  const groups = {};
  for (const g of Object.values(library.games)) { const k = g.sys + '::' + g.title.toLowerCase(); (groups[k] ??= []).push(g); }
  return Object.values(groups).filter(l => l.length > 1);
}


// ============================
// SAVES (M2) — shared save folder, per-game organisation
// saves/<sys>/<safeTitle>/active.<ext>  — live card, emulator always points here
// saves/<sys>/<safeTitle>/auto-<date>.<ext> — snapshot before each launch (kept: last 10)
// saves/<sys>/<safeTitle>/slot-<name>.<ext> — user-named slots
// xemu is special: its hdd is a 4GB qcow2; we snapshot it only if newer on exit
// ============================
const SAVE_EXT = { gc:'raw', wii:'raw', ps1:'mcd', ps2:'ps2', ps3:'ps3', xbox:'qcow2', x360:'sav', psp:'mcd', psp2:'vmc', generic:'sav' };
const SAVE_DIR = path.join(ROOT, 'saves');
function safeName(s){ return s.replace(/[<>:"/\|?* -]/g,'_').replace(/\.+$/,'').slice(0,60); }
function getSaveDir(g){ return path.join(SAVE_DIR, g.sys, safeName(g.title)); }
function getSaveExt(g){ return SAVE_EXT[g.sys] || SAVE_EXT.generic; }
function activeSave(g){ return path.join(getSaveDir(g), 'active.' + getSaveExt(g)); }

// xemu HDD path from config
function xemuHddPath(){ const e = config.emulators.xemu; if (!e?.dataDir) return null; const tf = path.join(e.dataDir,'xemu.toml'); if (!fs.existsSync(tf)) return null; try { const t=fs.readFileSync(tf,'utf8'); const m=t.match(/hdd_path\s*=\s*"([^"]+)"/); return m?m[1]:null; } catch{ return null; } }

// snapshot: copy active save to a dated slot (trim older than 10)
function snapshotSave(g) {
  const dir = getSaveDir(g);
  if (g.sys === 'xbox') { return snapshotXemu(g); }  // handled separately
  const src = activeSave(g);
  if (!fs.existsSync(src)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
  const dst = path.join(dir, 'auto-' + stamp + '.' + getSaveExt(g));
  fs.copyFileSync(src, dst);
  // trim to 10 auto snapshots
  const autos = fs.readdirSync(dir).filter(f=>f.startsWith('auto-')).sort();
  for (const f of autos.slice(0, Math.max(0, autos.length - 10))) fs.unlinkSync(path.join(dir, f));
  return dst;
}
function snapshotXemu(g) {
  const hdd = xemuHddPath(); if (!hdd || !fs.existsSync(hdd)) return null;
  const dir = getSaveDir(g); fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
  const dst = path.join(dir, 'auto-' + stamp + '.qcow2');
  try { fs.copyFileSync(hdd, dst); } catch(e){ return null; }
  const autos = fs.readdirSync(dir).filter(f=>f.startsWith('auto-')).sort();
  for (const f of autos.slice(0, Math.max(0, autos.length - 5))) fs.unlinkSync(path.join(dir, f)); // 5 for xemu, they're huge
  return dst;
}

// restore: copy a named slot back to active
function restoreSave(g, slotFile) {
  const dir = getSaveDir(g);
  const src = path.join(dir, slotFile);
  if (!fs.existsSync(src)) return { error: 'slot file not found' };
  if (g.sys === 'xbox') { const hdd = xemuHddPath(); if (!hdd) return { error: 'xemu hdd path not found' }; fs.copyFileSync(src, hdd); return { ok: true }; }
  // backup active before restoring
  const act = activeSave(g);
  if (fs.existsSync(act)) { fs.copyFileSync(act, act + '.bak'); }
  fs.copyFileSync(src, act);
  return { ok: true };
}

// list slots for a game
function listSlots(g) {
  const dir = getSaveDir(g);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => !f.endsWith('.bak'));
  return files.map(f => {
    const st = fs.statSync(path.join(dir, f));
    return { file: f, size: st.size, mtime: st.mtimeMs, isActive: f.startsWith('active.'), isAuto: f.startsWith('auto-') };
  }).sort((a,b) => b.mtime - a.mtime);
}

// rename a slot
function renameSlot(g, from, to) {
  const dir = getSaveDir(g);
  const ext = path.extname(from);
  const newName = to.replace(/[<>:"/\|?* -]/g,'_') + ext;
  if (from === newName) return { ok: true };
  fs.renameSync(path.join(dir, from), path.join(dir, newName));
  return { ok: true, newFile: newName };
}

// delete a slot
function deleteSlot(g, file) {
  if (file.startsWith('active.')) return { error: "can't delete the active save" };
  const p = path.join(getSaveDir(g), file);
  if (!fs.existsSync(p)) return { error: 'not found' };
  fs.unlinkSync(p);
  return { ok: true };
}

// prepare: point the emulator at our managed save dir.
// For ps1/ps2: overwrite the emulator's memcard path with active.mcd / active.ps2
// For gc: overwrite the Dolphin GC card path with active.raw
// For xemu: we DON'T move the HDD — it's already in place; we just snapshot before launch
// For other systems: no managed card yet, fallback to emulator's own default
function prepareSave(g) {
  const dir = getSaveDir(g); fs.mkdirSync(dir, { recursive: true });
  const act = activeSave(g);
  // if no active save yet, create a blank one so the emulator doesn't start confused
  if (!fs.existsSync(act) && g.sys !== 'xbox') { fs.writeFileSync(act, Buffer.alloc(128*1024)); } // 128KB blank
  return { saveDir: dir, activePath: act };
}


// ---- configure emulator memcard dirs to point at REPRO saves folder ----
// Called once when an emulator is added/configured, and on first launch.
// Sources:
//   DuckStation ini keys: github.com/stenzek/duckstation/blob/master/src/core/settings.cpp
//   PCSX2 ini keys: Documents/PCSX2/inis/PCSX2.ini [Folders] MemoryCards, [EmuCore] McdFolderAutoManage
function patchEmulatorMemcardDir(id, e) {
  const r = recipes[id]; if (!r || !e?.dataDir) return;
  if (id === 'duckstation') {
    const ini = path.join(e.dataDir, 'settings.ini');
    if (!fs.existsSync(ini)) return;
    let s = fs.readFileSync(ini, 'utf8');
    const saveDir = path.join(SAVE_DIR, 'ps1');
    fs.mkdirSync(saveDir, { recursive: true });
    // Set Card1Type to PerGameTitle so each game gets its own card named <Title>_1.mcd
    s = s.replace(/^Card1Type\s*=.*/m, 'Card1Type = PerGameTitle');
    // Set the directory to our saves/ps1 folder — use absolute path (safest)
    const absDir = saveDir.split(path.sep).join('\\');
    // Directory key is in [MemoryCards] section; replace it or add it
    if (s.includes('[MemoryCards]')) {
      s = s.replace(/^(Directory\s*=.*)$/m, `Directory = ${absDir}`);
      if (!s.match(/^Directory\s*=/m)) {
        s = s.replace('[MemoryCards]', `[MemoryCards]\nDirectory = ${absDir}`);
      }
    }
    // Remove hardcoded Card1Path
    s = s.replace(/^Card1Path\s*=.*/m, '');
    // Remove any hardcoded Card1Path so the auto-named file is used
    s = s.replace(/^Card1Path\s*=.*/m, '');
    fs.writeFileSync(ini, s);
    console.log('[saves] DuckStation memcard dir →', saveDir);
  }
  if (id === 'pcsx2') {
    const ini = path.join(e.dataDir, 'inis', 'PCSX2.ini');
    if (!fs.existsSync(ini)) return;
    let s = fs.readFileSync(ini, 'utf8');
    const saveDir = path.join(SAVE_DIR, 'ps2');
    fs.mkdirSync(saveDir, { recursive: true });
    // PCSX2 uses an absolute or relative path; absolute is safest here
    s = s.replace(/^MemoryCards\s*=.*/m, `MemoryCards = ${saveDir.split(path.sep).join('\\')}`);
    // McdFolderAutoManage already true from user's ini — ensure it stays
    if (!/McdFolderAutoManage/.test(s)) {
      s = s.replace(/(\[EmuCore\])/, '$1\nMcdFolderAutoManage = true');
    }
    fs.writeFileSync(ini, s);
    console.log('[saves] PCSX2 memcard dir →', saveDir);
  }
}
function patchAllEmulatorMemcardDirs() {
  for (const [id, e] of Object.entries(config.emulators)) {
    try { patchEmulatorMemcardDir(id, e); } catch(err) { console.warn('[saves] memcard patch failed for', id, err.message); }
  }
}
// ---------- launch
let running = null;
function emulatorFor(sys) {
  for (const [id, e] of Object.entries(config.emulators)) if (recipes[id]?.systems.includes(sys) && e.exe) return { id, ...e, recipe: recipes[id] };
  return null;
}
function launch(gameId) {
  const g = library.games[gameId]; if (!g) return { error: 'no such game' };
  if (running) return { error: 'something is already running' };
  const emu = g.emulator ? { id: g.emulator, ...config.emulators[g.emulator], recipe: recipes[g.emulator] } : emulatorFor(g.sys);
  if (!emu || !emu.exe) return { error: `no emulator set up for ${SYSTEMS[g.sys]}` };
  // prepare managed save dir and snapshot active save before launch
  let saveInfo = null;
  try { saveInfo = prepareSave(g); snapshotSave(g); } catch(e) { console.warn('save prep failed:', e.message); }
  const argsTpl = g.args || emu.recipe.args[g.sys] || ['{rom}'];
  const savePath = saveInfo?.activePath || '';
  const args = argsTpl.map(a => a.replace('{rom}', g.path).replace('{dir}', path.dirname(emu.exe)).replace('{save}', savePath));
  const started = Date.now();
  let child;
  try { child = spawn(emu.exe, args, { cwd: path.dirname(emu.exe), detached: false, stdio: 'ignore' }); }
  catch (e) { return { error: e.message }; }
  running = { gameId, pid: child.pid, started, child };
  win?.minimize();
  child.on('exit', () => {
    const secs = Math.round((Date.now() - started) / 1000);
    g.playtime = (g.playtime || 0) + secs; g.lastPlayed = Date.now(); saveLibrary();
    // for xemu, copy back the HDD as a post-play snapshot (mtime check would be nice but is unreliable on qcow2)
    if (g.sys === 'xbox' && secs > 10) try { snapshotXemu(g); } catch {}
    running = null;
    if (win && !win.isDestroyed()) { win.restore(); win.focus(); win.webContents.send('game-exited', { gameId, secs }); }
  });
  return { ok: true, exe: emu.exe, args, saveDir: saveInfo?.saveDir };
}
function killRunning() {
  if (!running) return { error: 'nothing is running' };
  try {
    // taskkill /T also kills child processes some emulators spawn (helper/render processes)
    spawn('taskkill', ['/PID', String(running.pid), '/T', '/F']);
  } catch (e) { try { running.child.kill(); } catch {} }
  return { ok: true };
}

// ---------- controller Guide/Home button hook (xinput-ffi, no node-gyp)
// XInputGetStateEx (ordinal 100) exposes the Guide button which standard XInputGetState hides.
// Source: https://github.com/xan105/node-xinput-ffi
let guidePoller = null;
async function startGuideHook() {
  if (process.argv.includes('--smoke')) return; // skip in test mode
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
function stopGuideHook() { if (guidePoller) { clearInterval(guidePoller); guidePoller = null; } }
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
        { label: 'Launch (no game)', click: () => spawn(e.exe, [], { cwd: path.dirname(e.exe), detached: true, stdio: 'ignore' }).unref() },
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
    backgroundColor: '#0C0C0D', title: 'REPRO', icon: path.join(ROOT, 'assets', 'brand', 'icon.ico'),
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
app.whenReady().then(() => { if (!process.argv.includes('--smoke')) { createWindow(); startGuideHook(); patchAllEmulatorMemcardDirs(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopGuideHook(); });
module.exports = { detectEmulators, scanLibrary, snapshot, config, saveConfig, recipes, resolveDataDir, ROOT };

// ---------- ipc
ipcMain.handle('snapshot', () => snapshot());
ipcMain.handle('detect', async () => detectEmulators());
ipcMain.handle('scan', async () => scanLibrary());
ipcMain.handle('launch', (_, id) => launch(id));
ipcMain.handle('setEmulator', (_, { id, exe }) => { config.emulators[id] = { exe, dataDir: resolveDataDir(recipes[id], exe) }; saveConfig(); buildMenu(); try { patchEmulatorMemcardDir(id, config.emulators[id]); } catch {} return snapshot(); });
ipcMain.handle('openPath', (_, p) => shell.openPath(p));
ipcMain.handle('launchEmu', (_, id) => { const e = config.emulators[id]; if (!e?.exe) return; spawn(e.exe, [], { cwd: path.dirname(e.exe), detached: true, stdio: 'ignore' }).unref(); });
ipcMain.handle('addRomDir', async (_, { dir, system }) => { config.romDirs.push({ path: dir, system: system || null }); saveConfig(); return scanLibrary(); });
ipcMain.handle('removeRomDir', async (_, dir) => { config.romDirs = config.romDirs.filter(r => r.path !== dir); saveConfig(); return scanLibrary(); });
ipcMain.handle('setPref', (_, kv) => { Object.assign(config, kv); saveConfig(); });
ipcMain.handle('setGame', (_, { id, patch }) => { Object.assign(library.games[id], patch); saveLibrary(); return library.games[id]; });
ipcMain.handle('pickFolder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('pickExe', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Programs', extensions: ['exe'] }] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('showInFolder', (_, p) => shell.showItemInFolder(p));
ipcMain.handle('fullscreen', (_, on) => win.setFullScreen(on));
ipcMain.handle('root', () => ROOT);
ipcMain.handle('themes', () => fs.readdirSync(P.themes).filter(d => fs.existsSync(path.join(P.themes, d, 'theme.json'))).map(d => ({ id: d, ...readJson(path.join(P.themes, d, 'theme.json'), {}) })));
ipcMain.handle('detectOne', (_, exe) => { const r = recipeForExe(exe); return r ? { recipe: r.id, name: r.name, exe } : null; });
ipcMain.handle('duplicates', () => findDuplicates());
ipcMain.handle('saveView', (_, view) => { config.views = config.views || []; const i = config.views.findIndex(v => v.id === view.id); if (i >= 0) config.views[i] = view; else config.views.push(view); saveConfig(); return snapshot(); });
ipcMain.handle('removeView', (_, id) => { config.views = (config.views || []).filter(v => v.id !== id); saveConfig(); return snapshot(); });
ipcMain.handle('createSystemFolder', (_, sys) => { const p = path.join(ROOT, 'roms', sys); fs.mkdirSync(p, { recursive: true }); if (!config.romDirs.some(r => r.path === p)) { config.romDirs.push({ path: p, system: sys }); saveConfig(); } shell.openPath(p); return snapshot(); });
ipcMain.handle('killRunning', () => killRunning());
ipcMain.handle('isRunning', () => !!running);
ipcMain.handle('setHubKey', (_, key) => { const prev = config.hubKey; config.hubKey = key; const ok = registerHubKey(); if (!ok) config.hubKey = prev; saveConfig(); return { ok, key: config.hubKey }; });
// M2: saves
ipcMain.handle('listSlots', (_, id) => { const g = library.games[id]; if (!g) return []; return listSlots(g); });
ipcMain.handle('snapshotSave', (_, id) => { const g = library.games[id]; if (!g) return { error: 'no such game' }; try { const f = snapshotSave(g); return { ok: true, file: f }; } catch(e) { return { error: e.message }; } });
ipcMain.handle('restoreSave', (_, { id, file }) => { const g = library.games[id]; if (!g) return { error: 'no such game' }; return restoreSave(g, file); });
ipcMain.handle('renameSlot', (_, { id, from, to }) => { const g = library.games[id]; if (!g) return { error: 'no such game' }; return renameSlot(g, from, to); });
ipcMain.handle('deleteSlot', (_, { id, file }) => { const g = library.games[id]; if (!g) return { error: 'no such game' }; return deleteSlot(g, file); });
ipcMain.handle('openSaveFolder', (_, id) => { const g = library.games[id]; if (!g) return; const d = getSaveDir(g); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); });
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
