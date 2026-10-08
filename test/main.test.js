// plain `node --test`, no electron binary needed: electron is stubbed so main.js loads headless.
// catches load-time crashes (like the ALL_EXT TDZ one) and checks scan + bundled assets.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const REPO = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-test-'));
process.env.REPRO_ROOT = TMP;

// minimal electron stub: just enough surface for main.js to load and register its handlers
const noop = () => {};
const electronStub = {
  app: { isPackaged: false, whenReady: () => new Promise(noop), on: noop, getAppPath: () => REPO, getVersion: () => '0.0.0', quit: noop, commandLine: { appendSwitch: noop } },
  BrowserWindow: function () {},
  ipcMain: { handle: noop, on: noop },
  dialog: {}, shell: { openPath: noop }, Menu: { setApplicationMenu: noop, buildFromTemplate: () => ({}) },
  globalShortcut: { register: () => true, unregisterAll: noop },
  nativeImage: { createFromBuffer: () => ({ isEmpty: () => true }) },
};
const origLoad = Module._load;
Module._load = function (req, ...rest) { return req === 'electron' ? electronStub : origLoad.call(this, req, ...rest); };

let M;
test('main.js loads without throwing', () => {
  M = require('../src/main/main.js');
  assert.ok(M.snapshot, 'exports snapshot()');
});

test('user data goes to REPRO_ROOT, not the repo', () => {
  assert.strictEqual(M.ROOT, path.resolve(TMP));
  for (const d of ['art', 'saves', 'themes']) assert.ok(fs.existsSync(path.join(TMP, d)), `${d}/ created`);
});

test('snapshot exposes systems, recipes and built-in themes', () => {
  const s = M.snapshot();
  assert.ok(Object.keys(s.systems).length > 10);
  for (const id of ['dolphin', 'duckstation', 'pcsx2', 'xemu', 'xenia']) assert.ok(M.recipes[id], `recipe ${id}`);
  assert.ok(s.themes.some(t => t.id === 'billet'), 'billet theme found');
});

test('scanLibrary picks systems by extension/folder and cleans titles', async () => {
  const roms = path.join(TMP, 'roms');
  const files = {
    'ps1/Crash Bandicoot (USA).cue': 'ps1',
    'gamecube/Super Mario Sunshine (USA).rvz': 'gc',
    'n64/Super Mario 64 (USA).z64': 'n64',
  };
  for (const f of Object.keys(files)) { fs.mkdirSync(path.join(roms, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(roms, f), ''); }
  fs.writeFileSync(path.join(roms, 'junk.7z'), '');
  M.config.romDirs = [{ path: roms, system: null }];
  const s = await M.scanLibrary();
  const bySys = Object.fromEntries(s.games.map(g => [g.sys, g.title]));
  assert.strictEqual(bySys.ps1, 'Crash Bandicoot');
  assert.strictEqual(bySys.gc, 'Super Mario Sunshine');
  assert.strictEqual(bySys.n64, 'Super Mario 64');
  assert.ok(s.unsorted.some(u => u.path.endsWith('junk.7z')), 'archive lands in unsorted');
});

test('every system and recipe has a logo in assets/systems', () => {
  const systems = Object.keys(JSON.parse(fs.readFileSync(path.join(REPO, 'systems.json'), 'utf8')));
  const recipes = fs.readdirSync(path.join(REPO, 'recipes')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
  const missing = [...systems, ...recipes].filter(id => !fs.existsSync(path.join(REPO, 'assets', 'systems', id + '.svg')));
  assert.deepStrictEqual(missing, []);
});

test('recipes match emulator binaries on both oses, and flatpak handles', () => {
  assert.strictEqual(M.recipeForExe('C:\\Emu\\Dolphin.exe', 'win')?.id, 'dolphin');
  assert.strictEqual(M.recipeForExe('/usr/bin/dolphin-emu', 'linux')?.id, 'dolphin');
  assert.strictEqual(M.recipeForExe('/home/d/Applications/DuckStation-x64.AppImage', 'linux')?.id, 'duckstation');
  assert.strictEqual(M.recipeForExe('/usr/bin/pcsx2-qt', 'linux')?.id, 'pcsx2');
  assert.strictEqual(M.recipeForExe('/usr/bin/dolphin-emu', 'win'), null, 'linux names do not match on windows');
  assert.strictEqual(M.recipeForExe('flatpak:net.pcsx2.PCSX2')?.id, 'pcsx2');
  assert.ok(M.isEmulatorFile('xemu.exe') && M.isEmulatorFile('xemu'), 'rom scan skips emulator folders from either os');
});

test('data dirs resolve per os: native xdg vs flatpak sandbox, never mixed', () => {
  const home = path.join(TMP, 'fakehome');
  const mk = p => { fs.mkdirSync(path.join(home, p), { recursive: true }); return path.join(home, p); };
  const native = mk('.local/share/duckstation');
  const sandbox = mk('.var/app/org.duckstation.DuckStation/config/duckstation');
  const opts = { osId: 'linux', env: {}, home };
  assert.strictEqual(M.resolveDataDir(M.recipes.duckstation, '/usr/bin/duckstation-qt', opts), native);
  assert.strictEqual(M.resolveDataDir(M.recipes.duckstation, 'flatpak:org.duckstation.DuckStation', opts), sandbox);
  // dolphin prefers legacy ~/.dolphin-emu when it exists (UICommon.cpp), else XDG
  const xdgDolphin = mk('.local/share/dolphin-emu');
  assert.strictEqual(M.resolveDataDir(M.recipes.dolphin, '/usr/bin/dolphin-emu', opts), xdgDolphin);
  const legacy = mk('.dolphin-emu');
  assert.strictEqual(M.resolveDataDir(M.recipes.dolphin, '/usr/bin/dolphin-emu', opts), legacy);
  // windows: {appdata} from env
  const appdata = mk('AppData/Roaming');
  const xemuWin = mk('AppData/Roaming/xemu/xemu');
  assert.strictEqual(M.resolveDataDir(M.recipes.xemu, 'C:\\xemu\\xemu.exe', { osId: 'win', env: { APPDATA: appdata }, home }), xemuWin);
});

test('every source file parses (renderer included: a syntax error there blanks the whole UI)', () => {
  const { execFileSync } = require('child_process');
  const files = ['src/main', 'src/renderer'].flatMap(d => fs.readdirSync(path.join(REPO, d)).filter(f => f.endsWith('.js')).map(f => path.join(REPO, d, f)));
  for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  assert.ok(files.some(f => f.endsWith('app.js')));
});

test('archived carts: .7z in a system folder scans for retroarch systems; nes no longer matches snes/genesis folders', async () => {
  const lib = path.join(TMP, 'carts');
  for (const [d, f] of [['snes', 'Super Metroid (Japan, USA) (En,Ja).7z'], ['genesis', 'Sonic the Hedgehog (USA, Europe).7z'], ['nes', 'Metroid (USA).zip'], ['nes', 'Metroid (USA) (Virtual Console).zip'], ['snes', 'Chrono Trigger (USA).7z'], ['snes', 'Chrono Trigger (USA).sfc'], ['gba', 'Advance Wars (USA).7z'], ['ps2', 'Devil May Cry (USA).zip'], ['misc', 'Mystery.7z']]) {
    fs.mkdirSync(path.join(lib, d), { recursive: true }); fs.writeFileSync(path.join(lib, d, f), 'x');
  }
  M.config.romDirs = [{ path: lib, system: null }];
  const s = await M.scanLibrary();
  const sysOf = t => Object.values(M.library.games).find(g => g.title === t)?.sys;
  assert.strictEqual(sysOf('Super Metroid'), 'snes');
  assert.strictEqual(sysOf('Sonic the Hedgehog'), 'genesis');
  assert.strictEqual(sysOf('Metroid'), 'nes');
  assert.strictEqual(sysOf('Advance Wars'), 'gba');
  const metroids = Object.values(M.library.games).filter(g => g.title.startsWith('Metroid'));
  assert.strictEqual(metroids.length, 2, 'a longer variant name must not hide the original release');
  const chrono = Object.values(M.library.games).filter(g => g.title === 'Chrono Trigger');
  assert.deepStrictEqual(chrono.map(g => g.file), ['Chrono Trigger (USA).sfc'], 'extracted copy wins over its archive');
  assert.strictEqual(sysOf('Devil May Cry'), undefined, 'ps2 zip still needs extracting (pcsx2 cannot read zip)');
  assert.ok((s.unsorted || []).some(u => /Mystery/.test(u.path)) || !sysOf('Mystery'));
});

test('regions merge into one card: USA preferred over Europe/Japan, others kept as variants, played copy sticks', async () => {
  const lib = path.join(TMP, 'regions', 'snes');
  fs.mkdirSync(lib, { recursive: true });
  for (const f of ['Super Metroid (Europe) (En,Fr,De).7z', 'Super Metroid (Japan, USA) (En,Ja).7z', 'Zelda (Japan).7z', 'Zelda (Beta) (USA).7z']) fs.writeFileSync(path.join(lib, f), 'x');
  M.config.romDirs = [{ path: path.dirname(lib), system: null }];
  await M.scanLibrary();
  const sm = Object.values(M.library.games).filter(g => g.title === 'Super Metroid');
  assert.strictEqual(sm.length, 1);
  assert.strictEqual(sm[0].file, 'Super Metroid (Japan, USA) (En,Ja).7z');
  assert.strictEqual(sm[0].variants.length, 1);
  assert.strictEqual(Object.values(M.library.games).find(g => g.title === 'Zelda').file, 'Zelda (Japan).7z', 'a real japan release beats a USA beta');
  // the european copy has playtime: it stays the card after a rescan
  const eu = path.join(lib, 'Super Metroid (Europe) (En,Fr,De).7z');
  M.library.games[eu] = { ...sm[0], path: eu, id: eu, playtime: 3600 };
  await M.scanLibrary();
  assert.strictEqual(Object.values(M.library.games).find(g => g.title === 'Super Metroid').path, eu);
});

test('retroarch launch args: core per system, bare core filename', () => {
  const r = M.recipes.retroarch;
  assert.deepStrictEqual(r.args['*'], ['-f', '-L', '{core}', '{rom}']);
  for (const sys of r.systems) assert.ok(r.cores[sys], 'core for ' + sys);
});

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));
