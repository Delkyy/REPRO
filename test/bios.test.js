// bios checker. no real firmware in the repo: dumps are synthesized (right size + structure), and the md5 table
// gets one fake entry so the "known dump" path is exercised without shipping anyone's bios.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DB = require('../src/main/biosdb.json');
const fakePs1 = Buffer.alloc(0x80000, 7); fakePs1.write('FAKE SCPH-1001 FOR TESTS', 0x100);
DB.duckstation.push({ md5: crypto.createHash('md5').update(fakePs1).digest('hex'), desc: 'SCPH-1001 (test)', ver: '2.2', region: 'USA', prio: 10, kind: 'ps1' });
const B = require('../src/main/bios');

// pcsx2 romdir: RESET, ROMDIR, ROMVER entries; ROMVER's data sits after the bytes the earlier entries cover
function fakePs2(region = 'A') {
  const b = Buffer.alloc(0x400000);
  const ent = (o, name, size) => { b.write(name, o, 'latin1'); b.writeUInt32LE(size, o + 12); };
  ent(0x2700, 'RESET', 0x2700); ent(0x2710, 'ROMDIR', 0x30); ent(0x2720, 'ROMVER', 0x10);
  b.write(`0220${region}C20060905`, 0x2730, 'latin1');
  return b;
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'repro-bios-'));

test('identify: known PS1 dump by md5, unknown-but-right-size dump, PS2 by romdir, junk rejected', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'a.bin'), fakePs1);
  fs.writeFileSync(path.join(d, 'b.bin'), Buffer.alloc(0x80000, 1));
  fs.writeFileSync(path.join(d, 'c.bin'), fakePs2('A'));
  fs.writeFileSync(path.join(d, 'd.bin'), Buffer.alloc(1000, 1));
  const [a] = B.identify(path.join(d, 'a.bin'));
  assert.deepStrictEqual([a.emu, a.kind, a.region, a.known], ['duckstation', 'ps1', 'USA', true]);
  const [b] = B.identify(path.join(d, 'b.bin'));
  assert.deepStrictEqual([b.emu, b.known], ['duckstation', false]);
  const c = B.identify(path.join(d, 'c.bin'));
  assert.ok(c.some(x => x.emu === 'pcsx2' && x.region === 'USA' && /2\.20/.test(x.label)), JSON.stringify(c));
  assert.ok(c.some(x => x.emu === 'duckstation'), 'a 4MiB PS2 bios also boots PS1 games in DuckStation');
  assert.deepStrictEqual(B.identify(path.join(d, 'd.bin')), []);
  fs.rmSync(d, { recursive: true, force: true });
});

test('status reads the folder from the emulator config, says how many games are blocked', () => {
  const data = tmp();
  fs.writeFileSync(path.join(data, 'settings.ini'), '[BIOS]\nSearchDirectory = mybios\n');
  const empty = B.status('duckstation', { dataDir: data, home: os.homedir(), systems: { ps1: 31 } });
  assert.strictEqual(empty.dir, path.join(data, 'mybios'));
  assert.strictEqual(empty.ok, false);
  assert.match(empty.note, /31 games can't start/);
  fs.mkdirSync(path.join(data, 'mybios')); fs.writeFileSync(path.join(data, 'mybios', 'scph1001.bin'), fakePs1); fs.writeFileSync(path.join(data, 'mybios', 'notes.txt'), 'hi');
  const good = B.status('duckstation', { dataDir: data, home: os.homedir(), systems: { ps1: 31 } });
  assert.strictEqual(good.ok, true);
  assert.deepStrictEqual(good.files.map(f => [f.file, f.ok]).sort(), [['notes.txt', false], ['scph1001.bin', true]]);
  fs.rmSync(data, { recursive: true, force: true });
});

test('retroarch: only systems you have games for, exact filenames, optional', () => {
  const data = tmp();
  fs.writeFileSync(path.join(data, 'retroarch.cfg'), 'system_directory = ":/sys"\n');
  const s = B.status('retroarch', { dataDir: data, home: os.homedir(), systems: { gba: 2024, snes: 2168 } });
  assert.strictEqual(s.dir, path.join(data, 'sys'));
  assert.deepStrictEqual(s.files.map(f => f.file), ['gba_bios.bin']);
  assert.ok(s.ok && s.files[0].optional && !s.files[0].ok);
  fs.rmSync(data, { recursive: true, force: true });
});

test('install: copies to every emulator that can use it, never clobbers a different file', () => {
  const d = tmp(), ds = path.join(d, 'ds'), p2 = path.join(d, 'p2');
  const src = path.join(d, 'dump.bin'); fs.writeFileSync(src, fakePs2('E'));
  const r = B.install(src, { duckstation: ds, pcsx2: p2 });
  assert.strictEqual(r.recognized, true);
  assert.deepStrictEqual(r.done.map(x => x.emu).sort(), ['duckstation', 'pcsx2']);
  assert.ok(fs.existsSync(path.join(p2, 'dump.bin')));
  assert.ok(B.install(src, { pcsx2: p2 }).done.every(x => x.already), 'same file again: no copy');
  fs.writeFileSync(path.join(d, 'other', ) , ''); // keep tmp tidy check below
  const src2 = path.join(d, 'x', 'dump.bin'); fs.mkdirSync(path.dirname(src2)); fs.writeFileSync(src2, fakePs2('J'));
  const r2 = B.install(src2, { pcsx2: p2 });
  assert.ok(fs.existsSync(path.join(p2, 'dump-2.bin')), 'different dump with the same name gets a new name');
  assert.strictEqual(B.install(path.join(d, 'other'), { pcsx2: p2 }).recognized, false);
  fs.rmSync(d, { recursive: true, force: true });
});

test('db came from the emulators: every duckstation entry has an md5 and a region', () => {
  assert.ok(DB.duckstation.filter(e => e.kind === 'ps1').length >= 20);
  assert.ok(DB.duckstation.every(e => /^[0-9a-f]{32}$/.test(e.md5) && e.region));
  assert.ok(DB.retroarch['gba_bios.bin'][0].md5 === 'a860e8c0b6d573d191e4ec7db1b1e4f6');
});
