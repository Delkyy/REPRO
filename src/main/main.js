// REPRO main process: config, recipes, detect, scan, launch. plain node, no framework.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

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

let config = readJson(P.config, { emulators: {}, romDirs: [], mode: 'desktop', ui: 'desk', theme: 'billet', views: [], panels: { side: true, detail: true }, cardSize: 150, hubKey: 'Shift+F12' });
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
  return { games: Object.values(library.games), unsorted: library.unsorted || [], emulators: emus, systems: SYSTEMS, sysdb: SYSDB, root: ROOT, recipeArgs: Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, r.args])), config: { mode: config.mode, ui: config.ui, theme: config.theme, romDirs: config.romDirs, views: config.views || [], panels: config.panels || { side: true, detail: true }, cardSize: config.cardSize || 150, hubKey: config.hubKey || 'Shift+F12' } };
}
// duplicates: same title across different systems isn't a dupe, but same title+sys with a different path is
function findDuplicates() {
  const groups = {};
  for (const g of Object.values(library.games)) { const k = g.sys + '::' + g.title.toLowerCase(); (groups[k] ??= []).push(g); }
  return Object.values(groups).filter(l => l.length > 1);
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
  const argsTpl = g.args || emu.recipe.args[g.sys] || ['{rom}'];
  const args = argsTpl.map(a => a.replace('{rom}', g.path).replace('{dir}', path.dirname(emu.exe)));
  const started = Date.now();
  let child;
  try { child = spawn(emu.exe, args, { cwd: path.dirname(emu.exe), detached: false, stdio: 'ignore' }); }
  catch (e) { return { error: e.message }; }
  running = { gameId, pid: child.pid, started, child };
  win?.minimize();
  child.on('exit', () => {
    const secs = Math.round((Date.now() - started) / 1000);
    g.playtime = (g.playtime || 0) + secs; g.lastPlayed = Date.now(); saveLibrary();
    running = null;
    if (win && !win.isDestroyed()) { win.restore(); win.focus(); win.webContents.send('game-exited', { gameId, secs }); }
  });
  return { ok: true, exe: emu.exe, args };
}
function killRunning() {
  if (!running) return { error: 'nothing is running' };
  try {
    // taskkill /T also kills child processes some emulators spawn (helper/render processes)
    spawn('taskkill', ['/PID', String(running.pid), '/T', '/F']);
  } catch (e) { try { running.child.kill(); } catch {} }
  return { ok: true };
}

// ---------- window
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
      { label: `Close running game (${config.hubKey || 'Shift+F12'})`, click: () => { killRunning(); } },
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
    backgroundColor: '#0C0C0D', title: 'REPRO',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  buildMenu();
  registerHubKey();
}
function registerHubKey() {
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(config.hubKey || 'Shift+F12', () => {
      if (!running) { win?.show(); win?.focus(); return; }
      killRunning();
      send('menu', 'toast', `closed the game via ${config.hubKey || 'Shift+F12'}`);
    });
  } catch (e) { console.error('hub key registration failed', e); }
}
app.whenReady().then(() => { if (!process.argv.includes('--smoke')) createWindow(); });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
module.exports = { detectEmulators, scanLibrary, snapshot, config, saveConfig, recipes, resolveDataDir, ROOT };

// ---------- ipc
ipcMain.handle('snapshot', () => snapshot());
ipcMain.handle('detect', async () => detectEmulators());
ipcMain.handle('scan', async () => scanLibrary());
ipcMain.handle('launch', (_, id) => launch(id));
ipcMain.handle('setEmulator', (_, { id, exe }) => { config.emulators[id] = { exe, dataDir: resolveDataDir(recipes[id], exe) }; saveConfig(); buildMenu(); return snapshot(); });
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
ipcMain.handle('setHubKey', (_, key) => { config.hubKey = key; saveConfig(); registerHubKey(); buildMenu(); return config.hubKey; });
