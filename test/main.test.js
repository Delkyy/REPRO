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
  app: { isPackaged: false, whenReady: () => new Promise(noop), on: noop, getAppPath: () => REPO, getVersion: () => '0.0.0', quit: noop },
  BrowserWindow: function () {},
  ipcMain: { handle: noop, on: noop },
  dialog: {}, shell: { openPath: noop }, Menu: { setApplicationMenu: noop, buildFromTemplate: () => ({}) },
  globalShortcut: { register: () => true, unregisterAll: noop },
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

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));
