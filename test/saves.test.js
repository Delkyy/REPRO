// save adapters + snapshot store. fake save trees are laid out exactly like each emulator's source says.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const saves = require('../src/main/saves');

const T = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-saves-'));
test.after(() => fs.rmSync(T, { recursive: true, force: true }));
let n = 0;
const fresh = () => { const d = path.join(T, String(n++)); fs.mkdirSync(d, { recursive: true }); return d; };
const put = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); return p; };
const at = (s) => new Date(Date.UTC(2026, 9, 7, 12, 0, s));

const crash = { sys: 'ps1', title: 'Crash Bandicoot', file: 'Crash Bandicoot (USA).cue', path: '/roms/ps1/Crash Bandicoot (USA).cue' };

test('duckstation: default PerGameTitle card is found by title, other games ignored', () => {
  const data = fresh();
  put(path.join(data, 'memcards', 'Crash Bandicoot_1.mcd'), 'crash');
  put(path.join(data, 'memcards', 'Spyro the Dragon_1.mcd'), 'spyro');
  const loc = saves.locate({ emulator: 'duckstation', dataDir: data, game: crash });
  assert.deepStrictEqual(loc.rels, ['Crash Bandicoot_1.mcd']);
  assert.ok(loc.perGame);
});

test('duckstation: multi-disc title matches the disc-set card, custom Directory is honoured', () => {
  const data = fresh(), cards = path.join(fresh(), 'cards');
  put(path.join(data, 'settings.ini'), `[MemoryCards]\nDirectory = ${cards}\nCard1Type = PerGameTitle\nCard2Type = Shared\n`);
  put(path.join(cards, 'Final Fantasy VII_1.mcd'), 'ff7');
  put(path.join(cards, 'shared_card_2.mcd'), 'shared');
  const ff7 = { sys: 'ps1', title: 'Final Fantasy VII (Disc 2)', file: 'Final Fantasy VII (USA) (Disc 2).cue' };
  const loc = saves.locate({ emulator: 'duckstation', dataDir: data, game: ff7 });
  assert.strictEqual(loc.base, cards);
  assert.deepStrictEqual(loc.rels.sort(), ['Final Fantasy VII_1.mcd', 'shared_card_2.mcd']);
});

test('pcsx2: shared Mcd001.ps2 by default, folder memcards copy as directories, disabled slots skipped', () => {
  const data = fresh();
  put(path.join(data, 'memcards', 'Mcd001.ps2'), 'card1');
  put(path.join(data, 'memcards', 'Mcd002.ps2'), 'card2');
  const g = { sys: 'ps2', title: 'Kingdom Hearts' };
  assert.deepStrictEqual(saves.locate({ emulator: 'pcsx2', dataDir: data, game: g }).rels, ['Mcd001.ps2', 'Mcd002.ps2']);
  put(path.join(data, 'inis', 'PCSX2.ini'), '[MemoryCards]\nSlot1_Filename = KH.ps2\nSlot2_Enable = false\n');
  put(path.join(data, 'memcards', 'KH.ps2', '_pcsx2_superblock'), 'folder card');
  const loc = saves.locate({ emulator: 'pcsx2', dataDir: data, game: g });
  assert.deepStrictEqual(loc.rels, ['KH.ps2']);
  const r = saves.snapshot(fresh(), { emulator: 'pcsx2', dataDir: data, game: g });
  assert.deepStrictEqual(r.slot.files.map(f => f.rel), [path.join('KH.ps2', '_pcsx2_superblock')]);
});

test('dolphin: disc id read from iso + rvz headers, GCI saves matched per game, raw card fallback', () => {
  const roms = fresh();
  const iso = Buffer.alloc(0x40); iso.write('GMSE01', 0, 'latin1'); iso.writeUInt32BE(0xC2339F3D, 0x1c);
  put(path.join(roms, 'sunshine.iso'), iso);
  const rvz = Buffer.alloc(0x60); rvz.write('RVZ\x01', 0, 'latin1'); rvz.write('GM8E01', 0x58, 'latin1');
  put(path.join(roms, 'prime.rvz'), rvz);
  assert.strictEqual(saves.readDiscId(path.join(roms, 'sunshine.iso')), 'GMSE01');
  assert.strictEqual(saves.readDiscId(path.join(roms, 'prime.rvz')), 'GM8E01');
  assert.strictEqual(saves.readDiscId(put(path.join(roms, 'junk.iso'), Buffer.alloc(0x40))), null);

  const user = fresh();
  put(path.join(user, 'GC', 'USA', 'Card A', '01-GMSE-super_mario_sunshine.gci'), Buffer.concat([Buffer.from('GMSE01'), Buffer.alloc(58)]));
  put(path.join(user, 'GC', 'USA', 'Card A', '01-GM8E-MetroidPrime A.gci'), Buffer.concat([Buffer.from('GM8E01'), Buffer.alloc(58)]));
  const sun = { sys: 'gc', title: 'Super Mario Sunshine', path: path.join(roms, 'sunshine.iso') };
  assert.deepStrictEqual(saves.locate({ emulator: 'dolphin', dataDir: user, game: sun }).rels, [path.join('USA', 'Card A', '01-GMSE-super_mario_sunshine.gci')]);

  const user2 = fresh();
  put(path.join(user2, 'GC', 'MemoryCardA.USA.raw'), 'raw');
  put(path.join(user2, 'GC', 'MemoryCardB.USA.59.raw'), 'small raw'); // smaller cards carry their block count
  put(path.join(user2, 'GC', 'MemoryCardA.EUR.raw'), 'other region');
  const loc = saves.locate({ emulator: 'dolphin', dataDir: user2, game: sun });
  assert.deepStrictEqual(loc.rels.sort(), ['MemoryCardA.USA.raw', 'MemoryCardB.USA.59.raw']);
  assert.strictEqual(loc.perGame, false);
});

test('dolphin wii: title folder from the disc id', () => {
  const roms = fresh(), user = fresh();
  const wbfs = Buffer.alloc(0x210); wbfs.write('WBFS', 0, 'latin1'); wbfs.write('RMGE01', 0x200, 'latin1');
  put(path.join(roms, 'galaxy.wbfs'), wbfs);
  put(path.join(user, 'Wii', 'title', '00010000', '524d4745', 'data', 'GameData.bin'), 'galaxy');
  const loc = saves.locate({ emulator: 'dolphin', dataDir: user, game: { sys: 'wii', title: 'Super Mario Galaxy', path: path.join(roms, 'galaxy.wbfs') } });
  assert.deepStrictEqual(loc.rels, [path.join('524d4745', 'data')]);
});

test('xemu: hdd image from xemu.toml, flagged big', () => {
  const data = fresh(), hdd = put(path.join(fresh(), 'xbox_hdd.qcow2'), 'qcow');
  put(path.join(data, 'xemu.toml'), `[sys.files]\nbootrom_path = '/x/mcpx.bin'\nhdd_path = '${hdd}'\n`);
  const loc = saves.locate({ emulator: 'xemu', dataDir: data, game: { sys: 'xbox', title: 'Halo' } });
  assert.deepStrictEqual(loc.rels, ['xbox_hdd.qcow2']);
  assert.ok(loc.big);
});

test('snapshot store: dedupe, restore with undo point, rename pins, pruning keeps named', () => {
  const root = fresh(), data = fresh();
  const card = put(path.join(data, 'memcards', 'Crash Bandicoot_1.mcd'), 'v1');
  const ctx = { emulator: 'duckstation', dataDir: data, game: crash };

  const s1 = saves.snapshot(root, ctx, { reason: 'before-play', now: at(1) });
  assert.ok(s1.ok);
  assert.deepStrictEqual(saves.snapshot(root, ctx, { now: at(2) }), { skipped: 'unchanged' });
  fs.writeFileSync(card, 'v2');
  const s2 = saves.snapshot(root, ctx, { reason: 'after-play', now: at(3) });
  assert.ok(s2.ok);

  const r = saves.restore(root, ctx, s1.slot.id);
  assert.ok(r.ok && r.safety, 'restore made an undo point');
  assert.strictEqual(fs.readFileSync(card, 'utf8'), 'v1');
  const undo = saves.info(root, ctx).slots.find(s => s.kind === 'safety');
  saves.restore(root, ctx, undo.id);
  assert.strictEqual(fs.readFileSync(card, 'utf8'), 'v2', 'undo point brings the overwritten save back');

  // same-millisecond snapshots get distinct slots instead of overwriting each other
  fs.writeFileSync(card, 'same-ms-a'); const a = saves.snapshot(root, ctx, { kind: 'manual', now: at(5) });
  fs.writeFileSync(card, 'same-ms-b'); const b = saves.snapshot(root, ctx, { kind: 'manual', now: at(5) });
  assert.notStrictEqual(a.slot.id, b.slot.id);
  saves.restore(root, ctx, a.slot.id);
  assert.strictEqual(fs.readFileSync(card, 'utf8'), 'same-ms-a');

  assert.ok(saves.rename(root, crash, s1.slot.id, 'before Cortex').ok);
  for (let i = 0; i < 15; i++) { fs.writeFileSync(card, 'loop' + i); saves.snapshot(root, ctx, { now: at(10 + i) }); }
  const I = saves.info(root, ctx);
  assert.strictEqual(I.slots.filter(s => s.kind === 'auto').length, saves.KEEP.auto);
  assert.ok(I.slots.some(s => s.name === 'before Cortex' && s.kind === 'manual'), 'named slot survived pruning');
  assert.ok(saves.remove(root, crash, s1.slot.id).ok);
  assert.ok(saves.remove(root, crash, '../../etc').error, 'slot ids cannot escape the save folder');
});

test('snapshot store: nothing to save, unknown emulator', () => {
  const root = fresh();
  assert.deepStrictEqual(saves.snapshot(root, { emulator: 'duckstation', dataDir: fresh(), game: crash }), { skipped: 'nothing-to-save' });
  assert.ok(saves.snapshot(root, { emulator: 'xenia', dataDir: fresh(), game: crash }).error);
  assert.strictEqual(saves.info(root, { emulator: null, game: crash }).supported, false);
});
