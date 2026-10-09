// bios.js: "does this emulator have the firmware it needs, and is it the RIGHT file?"
//
// every rule here comes from the emulator's own source, not from forum lore:
//   DuckStation  src/core/bios.cpp FindBIOSImageInDirectory: any file in the bios dir that is exactly 512 KiB (PS1)
//                or 4 MiB (PS2 bios, also boots PS1). md5 against s_image_info_by_hash names it; unknown hashes are
//                still tried. the folder is [BIOS] SearchDirectory in settings.ini (default "bios", relative to data dir).
//   PCSX2        pcsx2/ps2/BiosTools.cpp LoadBiosVersion: any file whose romdir has RESET then ROMVER. region is
//                ROMVER[4] (J/A/E/H/C/T/X/P). folder is [Folders] Bios in inis/PCSX2.ini (default "bios").
//   RetroArch    libretro-database dat/System.dat: exact file names + md5 in system_directory (retroarch.cfg,
//                default <data>/system). for the cores REPRO ships (mgba, mesen, genesis_plus_gx) all optional.
//
// REPRO never downloads firmware. it checks what you dumped and copies a dropped file to the right place.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DB = require('./biosdb.json');

const PS1 = 0x80000, PS2 = 0x400000, PS3 = 0x3E66F0;
const MAX_BIOS = 16 * 1024 * 1024; // nothing we identify is bigger; keeps a dropped 4GB iso from being hashed
const md5 = buf => crypto.createHash('md5').update(buf).digest('hex');
const REGION_PS2 = { J: 'JPN', A: 'USA', E: 'EUR', H: 'Asia', C: 'China', T: 'devkit', X: 'test', P: 'free' };
const DS_BY_MD5 = new Map(DB.duckstation.map(e => [e.md5, e]));
const RA_BY_MD5 = new Map(); for (const [name, list] of Object.entries(DB.retroarch)) for (const e of list) RA_BY_MD5.set(e.md5, { name, ...e });

// which retroarch firmware matters for which system (libretro-core-info firmware lists for the cores in recipes/retroarch.json)
const RA_FILES = {
  gba: [{ file: 'gba_bios.bin', why: 'real GBA boot logo + a few games that call into the bios. mGBA works without it' }],
  gb: [{ file: 'gb_bios.bin', why: 'boot logo only, optional' }, { file: 'sgb_bios.bin', why: 'Super Game Boy borders, optional' }],
  gbc: [{ file: 'gbc_bios.bin', why: 'boot logo + original color palettes, optional' }],
  nes: [{ file: 'disksys.rom', why: 'only for Famicom Disk System (.fds) games' }],
  genesis: [{ file: 'bios_MD.bin', why: 'TMSS boot screen, optional' }, { file: 'bios_CD_U.bin', why: 'only for Sega CD games (USA)' }, { file: 'bios_CD_E.bin', why: 'only for Mega-CD games (EUR)' }, { file: 'bios_CD_J.bin', why: 'only for Mega-CD games (JPN)' }],
  sms: [{ file: 'bios_U.sms', why: 'boot screen, optional' }, { file: 'bios_E.sms', why: 'boot screen, optional' }, { file: 'bios_J.sms', why: 'boot screen, optional' }],
  gg: [{ file: 'bios.gg', why: 'boot screen, optional' }],
};

function readIni(file) {
  const out = {}; let sec = '';
  let text; try { text = fs.readFileSync(file, 'utf8'); } catch { return {}; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); const m = line.match(/^\[(.+)\]$/); if (m) { sec = m[1]; continue; }
    const i = line.indexOf('='); if (i > 0 && line[0] !== ';' && line[0] !== '#') (out[sec] ??= {})[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}
const under = (base, p) => !p ? null : path.isAbsolute(p) ? p : path.join(base, p);
function raCfg(file) { const o = {}; let t = ''; try { t = fs.readFileSync(file, 'utf8'); } catch { } for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*(\w+)\s*=\s*"(.*)"\s*$/); if (m) o[m[1]] = m[2]; } return o; }
function raPath(v, dataDir, home) {
  if (!v || v === 'default') return null;
  if (v === '~' || v.startsWith('~/')) return path.join(home, v.slice(2));
  if (v.startsWith(':')) return path.join(dataDir, v.slice(1).replace(/^[\\/]+/, ''));
  return under(dataDir, v);
}

// pcsx2 romdir walk: 16-byte entries {name[10], extinfo u16, size u32}; RESET first, then files laid out in order
function ps2Version(buf) {
  let off = -1;
  for (let i = 0; i + 16 <= Math.min(buf.length, 512 * 1024 * 16); i += 16) if (buf.toString('latin1', i, i + 5) === 'RESET' && buf[i + 5] === 0) { off = i; break; }
  if (off < 0) return null;
  let fileOffset = 0;
  for (let i = off; i + 16 <= buf.length; i += 16) {
    const name = buf.toString('latin1', i, i + 10).replace(/\0.*$/, ''); if (!name) break;
    const size = buf.readUInt32LE(i + 12);
    if (name === 'ROMVER') {
      const v = buf.toString('latin1', fileOffset, fileOffset + 14);
      if (!/^\d{4}[A-Z]/.test(v)) return null;
      return { version: `${+v.slice(0, 2)}.${v.slice(2, 4)}`, region: REGION_PS2[v[4]] || v[4], date: `${v.slice(6, 10)}-${v.slice(10, 12)}-${v.slice(12, 14)}` };
    }
    fileOffset += size % 0x10 === 0 ? size : (size + 0x10) & ~0xf;
  }
  return null;
}

// what is this file? → [{ emu, kind, label, region, file (name to install as) }]. empty = not firmware we know.
function identify(file) {
  let st; try { st = fs.statSync(file); } catch { return []; }
  if (!st.isFile() || st.size > MAX_BIOS || st.size === 0) return [];
  const buf = fs.readFileSync(file), h = md5(buf), out = [];
  const name = path.basename(file);
  if (st.size === PS1 || st.size === PS2 || st.size === PS3) {
    const k = DS_BY_MD5.get(h);
    if (k && k.kind !== 'ps3') out.push({ emu: 'duckstation', kind: k.kind, label: k.desc, region: k.region, known: true, file: name });
    else if (st.size === PS1) out.push({ emu: 'duckstation', kind: 'ps1', label: 'unknown PS1 BIOS dump (right size, hash not in DuckStation\'s list)', region: '?', known: false, file: name });
  }
  const v2 = st.size >= 0x400000 ? ps2Version(buf) : null;
  if (v2) {
    out.push({ emu: 'pcsx2', kind: 'ps2', label: `PS2 BIOS v${v2.version} (${v2.date})`, region: v2.region, known: true, file: name });
    if (!out.some(o => o.emu === 'duckstation') && st.size === PS2) out.push({ emu: 'duckstation', kind: 'ps2', label: `PS2 BIOS v${v2.version}, DuckStation boots PS1 games with it`, region: v2.region, known: false, file: name });
  }
  const ra = RA_BY_MD5.get(h);
  if (ra) out.push({ emu: 'retroarch', kind: 'firmware', label: ra.name, region: '', known: true, file: ra.name }); // retroarch needs the exact name
  return out;
}

// where each emulator looks, read from ITS config (never ours)
function biosDir(emu, dataDir, home) {
  if (!dataDir) return null;
  if (emu === 'duckstation') return under(dataDir, readIni(path.join(dataDir, 'settings.ini')).BIOS?.SearchDirectory || 'bios');
  if (emu === 'pcsx2') return under(dataDir, readIni(path.join(dataDir, 'inis', 'PCSX2.ini')).Folders?.Bios || 'bios');
  if (emu === 'retroarch') return raPath(raCfg(path.join(dataDir, 'retroarch.cfg')).system_directory, dataDir, home) || path.join(dataDir, 'system');
  return null;
}
const SUPPORTED = ['duckstation', 'pcsx2', 'retroarch'];
const REQUIRED = { duckstation: ['ps1'], pcsx2: ['ps2'] }; // emulator refuses to boot without one

// one emulator's status. systems = { sys: gameCount } so the page only talks about consoles you have games for
function status(emu, { dataDir, home, systems = {} }) {
  const dir = biosDir(emu, dataDir, home);
  const files = [];
  let ents = []; try { ents = dir ? fs.readdirSync(dir, { withFileTypes: true }) : []; } catch { }
  const present = new Map();
  for (const e of ents) if (e.isFile()) { const p = path.join(dir, e.name); present.set(e.name, { path: p, ids: identify(p).filter(i => i.emu === emu) }); }
  if (REQUIRED[emu]) {
    for (const [name, f] of present) {
      const id = f.ids[0];
      files.push(id ? { file: name, ok: true, known: id.known, label: id.label, region: id.region, kind: id.kind }
        : { file: name, ok: false, label: 'not a BIOS this emulator can use (wrong size or contents)' });
    }
    const usable = files.filter(f => f.ok);
    const sys = REQUIRED[emu][0];
    const want = systems[sys] || 0;
    const usa = usable.some(f => f.region === 'USA' || f.region === 'any');
    return { emu, dir, required: true, systems: REQUIRED[emu], games: want, files, ok: usable.length > 0,
      note: !usable.length ? `${want ? want + ' game' + (want === 1 ? '' : 's') + " can't start" : 'nothing to play yet'}: drop your ${sys === 'ps1' ? 'PS1 (e.g. SCPH-1001 / 5501 / 7001)' : 'PS2'} BIOS dump here`
        : !usa && emu === 'duckstation' ? 'works, but no USA BIOS: US games may warn about region' : null };
  }
  // retroarch: optional per-system files, only for systems with games
  for (const [sys, list] of Object.entries(RA_FILES)) {
    if (!systems[sys]) continue;
    for (const w of list) {
      const f = present.get(w.file);
      const good = f && f.ids.some(i => i.file === w.file);
      files.push({ file: w.file, sys, ok: !!good, optional: true, label: w.why, bad: !!f && !good });
    }
  }
  return { emu, dir, required: false, systems: [...new Set(files.map(f => f.sys))], files, ok: true, note: null };
}

// copy a dropped file wherever it belongs. never overwrites a different file with the same name.
function install(src, targets /* { emu: dir } */) {
  const ids = identify(src);
  const done = [];
  for (const id of ids) {
    const dir = targets[id.emu]; if (!dir) continue;
    fs.mkdirSync(dir, { recursive: true });
    let dest = path.join(dir, id.file);
    if (fs.existsSync(dest)) {
      if (md5(fs.readFileSync(dest)) === md5(fs.readFileSync(src))) { done.push({ ...id, dest, already: true }); continue; }
      if (id.emu === 'retroarch') { done.push({ ...id, dest, conflict: true }); continue; } // exact name required, don't clobber
      let n = 2; const ext = path.extname(dest); while (fs.existsSync(dest)) dest = path.join(dir, `${path.basename(id.file, ext)}-${n++}${ext}`);
    }
    fs.copyFileSync(src, dest);
    done.push({ ...id, dest });
  }
  return { recognized: ids.length > 0, done };
}

module.exports = { identify, status, install, biosDir, ps2Version, SUPPORTED, REQUIRED, RA_FILES, PS1, PS2 };
