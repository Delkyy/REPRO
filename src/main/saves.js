// saves.js: real save management. REPRO never rewrites emulator configs; it reads where each emulator ACTUALLY
// keeps its saves (from the emulator's own ini/toml + defaults read from its source) and snapshots those files.
//
// snapshot layout:  saves/<sys>/<title>/<slot id>/   files copied under their path relative to the adapter's base
//                                                  + slot.json { id, name, kind, reason, created, emulator, base, files, sig }
// kinds: auto (pre-launch / post-play, pruned), manual (pinned, never pruned), safety (taken before every restore)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEEP = { auto: 10, autoBig: 3, safety: 5 };

// ---------- small helpers
const safeName = s => String(s).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/, '').slice(0, 80) || '_';
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const stripDisc = s => s.replace(/\s*[([]\s*(disc|disk|cd)\s*\d+[^)\]]*[)\]]/ig, '').replace(/\s*-\s*(disc|disk|cd)\s*\d+\s*$/i, '').trim();
const exists = p => { try { fs.accessSync(p); return true; } catch { return false; } };
function readIni(file) {
  const out = {}; let sec = '';
  let text; try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line[0] === ';' || line[0] === '#') continue;
    const m = line.match(/^\[(.+)\]$/); if (m) { sec = m[1]; out[sec] ??= {}; continue; }
    const i = line.indexOf('='); if (i < 0) continue;
    (out[sec] ??= {})[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}
const iniGet = (ini, sec, key, def) => (ini?.[sec]?.[key] ?? '') !== '' ? ini[sec][key] : def;
const iniBool = (ini, sec, key, def) => { const v = iniGet(ini, sec, key, null); return v == null ? def : /^(true|1|yes)$/i.test(v); };
const resolveIn = (base, p) => path.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p) ? p : path.join(base, p);

// GameCube / Wii disc id (e.g. GMSE01) straight from the image header, so saves can be matched per game.
// iso/gcm: offset 0. wbfs: 0x200. ciso: 0x8000. rvz/wia: disc header copy inside header 2 at 0x58 (0x48 header1 + 16).
function readDiscId(romPath) {
  let fd; try { fd = fs.openSync(romPath, 'r'); } catch { return null; }
  try {
    const head = Buffer.alloc(0x60); fs.readSync(fd, head, 0, head.length, 0);
    const magic = head.toString('latin1', 0, 4);
    let off = null;
    if (magic === 'RVZ\x01' || magic === 'WIA\x01') off = 0x58;
    else if (magic === 'WBFS') off = 0x200;
    else if (magic === 'CISO') off = 0x8000;
    else if (head.readUInt32BE(0x1c) === 0xC2339F3D || head.readUInt32BE(0x18) === 0x5D1C9EA3) off = 0;
    if (off == null) return null;
    const b = Buffer.alloc(6); fs.readSync(fd, b, 0, 6, off);
    const id = b.toString('latin1');
    return /^[A-Z0-9]{6}$/.test(id) ? id : null;
  } catch { return null; } finally { fs.closeSync(fd); }
}
const gcRegion = id => ({ E: 'USA', J: 'JAP' })[id?.[3]] || 'EUR';

// ---------- adapters. locate(ctx) -> { base, rels, label, perGame, big? } or null when REPRO can't see this emulator's saves.
// ctx = { game: {sys,title,file,path}, dataDir }. rels may be empty when the game was never played (post-play finds them).
const ADAPTERS = {
  // src/core/system.cpp GetGameMemoryCardPath + settings.cpp: [MemoryCards] Directory (default "memcards"),
  // Card1Type default PerGameTitle -> "<title>_1.mcd", Card2Type default None, Shared -> Card{n}Path or shared_card_{n}.mcd
  duckstation(ctx) {
    const ini = readIni(path.join(ctx.dataDir, 'settings.ini'));
    const dir = resolveIn(ctx.dataDir, iniGet(ini, 'MemoryCards', 'Directory', 'memcards'));
    const types = [iniGet(ini, 'MemoryCards', 'Card1Type', 'PerGameTitle'), iniGet(ini, 'MemoryCards', 'Card2Type', 'None')];
    const rels = []; let perGame = false;
    const g = ctx.game;
    const stem = g.file ? g.file.replace(/\.[^.]+$/, '') : g.title;
    const want = new Set([g.title, stripDisc(g.title), stem, stripDisc(stem)].map(norm));
    let cards = []; try { cards = fs.readdirSync(dir).filter(f => /\.mcd$/i.test(f)); } catch {}
    types.forEach((t, i) => {
      const n = i + 1;
      if (t === 'None' || t === 'NonPersistent') return;
      if (t === 'Shared') { const p = iniGet(ini, 'MemoryCards', `Card${n}Path`, `shared_card_${n}.mcd`); rels.push(path.relative(dir, resolveIn(dir, p))); return; }
      // PerGameTitle / PerGameFileTitle / PerGame(serial): we don't know the serial, but titles + file titles match by name
      perGame = true;
      for (const f of cards) { const m = f.match(/^(.*)_(\d)\.mcd$/i); if (m && +m[2] === n && want.has(norm(m[1]))) rels.push(f); }
    });
    return { base: dir, rels: [...new Set(rels)].filter(r => exists(path.join(dir, r))), label: perGame ? 'per-game memory card' : 'shared memory card', perGame };
  },
  // pcsx2/Pcsx2Config.cpp: [Folders] MemoryCards (default "memcards"), [MemoryCards] Slot{n}_Enable / Slot{n}_Filename
  // (defaults Mcd001.ps2 / Mcd002.ps2). cards are shared between games; folder memcards are directories.
  pcsx2(ctx) {
    const ini = readIni(path.join(ctx.dataDir, 'inis', 'PCSX2.ini'));
    const dir = resolveIn(ctx.dataDir, iniGet(ini, 'Folders', 'MemoryCards', 'memcards'));
    const rels = [];
    for (const n of [1, 2]) {
      if (!iniBool(ini, 'MemoryCards', `Slot${n}_Enable`, true)) continue;
      const f = iniGet(ini, 'MemoryCards', `Slot${n}_Filename`, `Mcd00${n}.ps2`);
      if (exists(path.join(dir, f))) rels.push(f);
    }
    return { base: dir, rels, label: 'shared memory card (all PS2 games)', perGame: false };
  },
  // Dolphin User dir: GC raw cards GC/MemoryCard{A,B}.<REGION>.raw, GCI folders GC/<REGION>/Card {A,B}/*.gci
  // (gci header bytes 0-5 = game code + maker = disc id), Wii saves Wii/title/00010000/<hex of id[0:4]>/data
  dolphin(ctx) {
    const g = ctx.game, id = g.discId ?? readDiscId(g.path);
    if (g.sys === 'wii') {
      if (!id) return { base: path.join(ctx.dataDir, 'Wii', 'title', '00010000'), rels: [], label: "Wii save (couldn't read the disc id)", perGame: true };
      const rel = path.join(Buffer.from(id.slice(0, 4), 'latin1').toString('hex'), 'data');
      const base = path.join(ctx.dataDir, 'Wii', 'title', '00010000');
      return { base, rels: exists(path.join(base, rel)) ? [rel] : [], label: 'Wii save data', perGame: true };
    }
    const base = path.join(ctx.dataDir, 'GC');
    const regions = id ? [gcRegion(id)] : ['USA', 'EUR', 'JAP'];
    const gci = [];
    if (id) for (const r of regions) for (const card of ['Card A', 'Card B']) {
      const d = path.join(base, r, card);
      let fl = []; try { fl = fs.readdirSync(d).filter(f => /\.gci$/i.test(f)); } catch {}
      for (const f of fl) {
        try { const fd = fs.openSync(path.join(d, f), 'r'); const b = Buffer.alloc(6); fs.readSync(fd, b, 0, 6, 0); fs.closeSync(fd); if (b.toString('latin1') === id) gci.push(path.join(r, card, f)); } catch {}
      }
    }
    if (gci.length) return { base, rels: gci, label: 'per-game GCI saves', perGame: true };
    const raw = [];
    // Config/MainSettings.cpp GetMemcardPath: MemoryCard{A,B}.<REGION>[.<free blocks> for cards smaller than 2043].raw
    let gcFiles = []; try { gcFiles = fs.readdirSync(base); } catch {}
    for (const f of gcFiles) { const m = f.match(/^MemoryCard[AB]\.(USA|EUR|JAP)(\.\d+)?\.raw$/); if (m && regions.includes(m[1])) raw.push(f); }
    if (raw.length) return { base, rels: raw, label: 'shared memory card (all GameCube games)', perGame: false };
    return { base, rels: [], label: 'GameCube save', perGame: !!id };
  },
  // xemu: every game saves inside one qcow2 HDD image; path from xemu.toml [sys.files] hdd_path. huge, so few copies.
  xemu(ctx) {
    let t = ''; try { t = fs.readFileSync(path.join(ctx.dataDir, 'xemu.toml'), 'utf8'); } catch {}
    const m = t.match(/hdd_path\s*=\s*(['"])(.+?)\1/);
    if (!m) return null;
    const hdd = resolveIn(ctx.dataDir, m[2]);
    return { base: path.dirname(hdd), rels: exists(hdd) ? [path.basename(hdd)] : [], label: 'Xbox HDD image (all games)', perGame: false, big: true };
  },
};
const supports = emuId => !!ADAPTERS[emuId];

function locate(ctx) {
  const a = ADAPTERS[ctx.emulator];
  if (!a || !ctx.dataDir) return null;
  try { return a(ctx); } catch { return null; }
}

// ---------- copying. reflink where the filesystem can (btrfs/xfs: a snapshot costs ~0 bytes), plain copy otherwise.
function copyAny(src, dst) {
  const st = fs.statSync(src);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (st.isDirectory()) { for (const e of fs.readdirSync(src)) copyAny(path.join(src, e), path.join(dst, e)); return; }
  fs.copyFileSync(src, dst, fs.constants.COPYFILE_FICLONE);
  fs.utimesSync(dst, st.atime, st.mtime);
}
function walkFiles(p, rel = '') {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return [{ rel, size: st.size, mtime: st.mtimeMs, abs: p }];
  return fs.readdirSync(p).sort().flatMap(e => walkFiles(path.join(p, e), rel ? path.join(rel, e) : e));
}
// content signature so identical saves aren't snapshotted twice. big files (HDD images) go by size+mtime.
function signature(base, rels, big) {
  const h = crypto.createHash('sha1');
  for (const r of [...rels].sort()) for (const f of walkFiles(path.join(base, r), r)) {
    h.update(f.rel + '\0' + f.size + '\0');
    if (big) h.update(String(Math.floor(f.mtime))); else h.update(fs.readFileSync(f.abs));
  }
  return h.digest('hex');
}

// ---------- snapshot store
const gameDir = (root, g) => path.join(root, 'saves', g.sys, safeName(g.title));
const stamp = d => d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 23);
function readSlots(root, g) {
  const dir = gameDir(root, g); let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()); } catch { return []; }
  const out = [];
  for (const e of ents) { try { out.push({ ...JSON.parse(fs.readFileSync(path.join(dir, e.name, 'slot.json'), 'utf8')), id: e.name }); } catch {} }
  return out.sort((a, b) => b.created - a.created);
}
function prune(root, g) {
  const slots = readSlots(root, g), dir = gameDir(root, g);
  const drop = (kind, keep) => slots.filter(s => s.kind === kind).slice(keep).forEach(s => fs.rmSync(path.join(dir, s.id), { recursive: true, force: true }));
  drop('auto', slots.some(s => s.big) ? KEEP.autoBig : KEEP.auto);
  drop('safety', KEEP.safety);
}

// take a snapshot of whatever the emulator currently has for this game.
// returns { ok, slot } | { skipped: 'nothing-to-save' | 'unchanged' } | { error }
function snapshot(root, ctx, { kind = 'auto', reason = 'manual', name = null, now = new Date() } = {}) {
  const loc = locate(ctx);
  if (!loc) return { error: `REPRO can't find ${ctx.emulator || 'this emulator'}'s saves yet` };
  if (!loc.rels.length) return { skipped: 'nothing-to-save' };
  const sig = signature(loc.base, loc.rels, loc.big);
  const last = readSlots(root, ctx.game)[0];
  if (kind === 'auto' && last && last.sig === sig) return { skipped: 'unchanged' };
  const gdir = gameDir(root, ctx.game);
  // ids are timestamps; two snapshots in the same millisecond must never share (and overwrite) a folder
  let id = stamp(now) + '-' + kind;
  for (let i = 2; exists(path.join(gdir, id)); i++) id = `${stamp(now)}-${kind}-${i}`;
  const dir = path.join(gdir, id);
  fs.mkdirSync(dir, { recursive: true });
  for (const r of loc.rels) copyAny(path.join(loc.base, r), path.join(dir, 'files', r));
  const files = loc.rels.flatMap(r => walkFiles(path.join(loc.base, r), r)).map(({ rel, size, mtime }) => ({ rel, size, mtime }));
  const slot = { id, name, kind, reason, created: now.getTime(), emulator: ctx.emulator, base: loc.base, label: loc.label, perGame: loc.perGame, big: !!loc.big, files, sig };
  fs.writeFileSync(path.join(dir, 'slot.json'), JSON.stringify(slot, null, 2));
  prune(root, ctx.game);
  return { ok: true, slot };
}

// put a slot back. ALWAYS takes a safety snapshot of the current saves first, so a restore can be undone.
// files go to the emulator's CURRENT save folder (not the recorded one), so a slot made on windows restores on linux.
function restore(root, ctx, slotId) {
  const slot = readSlots(root, ctx.game).find(s => s.id === slotId);
  if (!slot) return { error: 'slot not found' };
  const loc = locate(ctx);
  if (!loc) return { error: `REPRO can't find ${ctx.emulator}'s save folder` };
  const safety = snapshot(root, ctx, { kind: 'safety', reason: 'before-restore' });
  if (safety.error) return safety;
  const src = path.join(gameDir(root, ctx.game), slotId, 'files');
  for (const f of slot.files) {
    const dst = path.join(loc.base, f.rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(src, f.rel), dst);
  }
  return { ok: true, safety: safety.slot?.id || null };
}
function rename(root, g, slotId, name) {
  const p = path.join(gameDir(root, g), slotId, 'slot.json');
  let s; try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { error: 'slot not found' }; }
  s.name = String(name).slice(0, 80); s.kind = 'manual'; // naming a slot pins it, so pruning never eats it
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
  return { ok: true };
}
function remove(root, g, slotId) {
  if (!/^[\w.-]+$/.test(slotId)) return { error: 'bad slot id' };
  const p = path.join(gameDir(root, g), slotId);
  if (!exists(path.join(p, 'slot.json'))) return { error: 'slot not found' };
  fs.rmSync(p, { recursive: true, force: true });
  return { ok: true };
}
// everything the UI needs for one game
function info(root, ctx) {
  const loc = ctx.emulator ? locate(ctx) : null;
  const live = loc ? loc.rels.flatMap(r => walkFiles(path.join(loc.base, r), r)) : [];
  return {
    supported: !!loc, emulator: ctx.emulator || null, label: loc?.label || null, perGame: !!loc?.perGame, base: loc?.base || null,
    live: live.length ? { files: live.map(f => f.rel), size: live.reduce((a, f) => a + f.size, 0), mtime: Math.max(...live.map(f => f.mtime)) } : null,
    slots: readSlots(root, ctx.game).map(s => ({ id: s.id, name: s.name, kind: s.kind, reason: s.reason, created: s.created, size: s.files.reduce((a, f) => a + f.size, 0), files: s.files.length, label: s.label })),
    folder: gameDir(root, ctx.game),
  };
}

module.exports = { ADAPTERS, supports, locate, snapshot, restore, rename, remove, info, readDiscId, readIni, gameDir, safeName, KEEP };
