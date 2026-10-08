// covers.js: real box art for every game, from libretro-thumbnails (free, no account, no api key).
//
// how it matches: the CDN serves an apache index per system folder, so REPRO downloads the list of names ONCE
// (cached a week) and matches every game locally instead of guessing 11k urls and eating 404s.
//   1. exact no-intro name (your file "Super Metroid (Japan, USA) (En,Ja).7z" -> "Super Metroid (Japan, USA) (En,Ja).png")
//   2. same title, best region (USA > Europe > Japan), skipping betas/protos/hacks
//   3. fuzzy: punctuation/case/"The" insensitive ("Sonic The Hedgehog" == "Sonic the Hedgehog")
// no box art -> the real title screen (Named_Titles). nothing at all -> the card shows the plain bar + title.
//
// each cover is shrunk to a small jpeg, and REPRO pulls a bar color out of it (the most vivid real color
// on the box, not the average mud) plus the box's aspect ratio so the card takes the real box shape.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const CDN = 'https://thumbnails.libretro.com';
const LR_SYSTEM = {
  nes: 'Nintendo - Nintendo Entertainment System', snes: 'Nintendo - Super Nintendo Entertainment System',
  n64: 'Nintendo - Nintendo 64', gc: 'Nintendo - GameCube', wii: 'Nintendo - Wii',
  gb: 'Nintendo - Game Boy', gbc: 'Nintendo - Game Boy Color', gba: 'Nintendo - Game Boy Advance',
  ds: 'Nintendo - Nintendo DS', '3ds': 'Nintendo - Nintendo 3DS',
  ps1: 'Sony - PlayStation', ps2: 'Sony - PlayStation 2', ps3: 'Sony - PlayStation 3', psp: 'Sony - PlayStation Portable',
  vita: 'Sony - PlayStation Vita', xbox: 'Microsoft - Xbox', x360: 'Microsoft - Xbox 360',
  genesis: 'Sega - Mega Drive - Genesis', sms: 'Sega - Master System - Mark III', gg: 'Sega - Game Gear',
  segacd: 'Sega - Mega-CD - Sega CD', '32x': 'Sega - 32X', saturn: 'Sega - Saturn', dc: 'Sega - Dreamcast',
  tg16: 'NEC - PC Engine - TurboGrafx 16', atari2600: 'Atari - 2600',
};
const KINDS = { box: 'Named_Boxarts', title: 'Named_Titles' };
const INDEX_TTL = 7 * 24 * 3600e3;

// ---------- pure helpers (tested)
// libretro-thumbnails replaces these in file names: &*/:`<>?\|"
const lrName = s => s.replace(/[&*/:`<>?\\|"]/g, '_');
const stemOf = f => f.replace(/\.(7z|zip|rar)$/i, '').replace(/\.[^.]+$/, '').replace(/\.(nkit|xiso)$/i, '');
const baseTitle = s => s.replace(/\s*[([][^)\]]*[)\]]/g, '').trim();
const fuzzy = s => baseTitle(s).toLowerCase().replace(/^the\s+|,\s*the\b/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function parseListing(html) {
  const out = [];
  for (const m of html.matchAll(/href="([^"?/][^"]*?)\.png"/g)) { try { out.push(decodeURIComponent(m[1])); } catch {} }
  return out;
}

const BAD = /\((beta|proto|demo|sample|pirate|hack|unl|aftermarket|program)/i;
function rank(name) {
  const f = name.toLowerCase();
  const tag = (f.match(/\(([^()]+)\)/g) || []).map(t => t.slice(1, -1).split(/,\s*/)).find(p => p.every(x => /^(usa|world|europe|japan|uk|australia|canada|brazil|korea|china|france|germany|spain|italy|asia)$/.test(x.trim()))) || [];
  const has = r => tag.some(p => p.trim() === r);
  let r = has('usa') || has('world') ? 0 : has('europe') || has('uk') || has('australia') ? 10 : has('japan') ? 20 : 30;
  if (/virtual console|switch online|classic mini|collection|arcade/i.test(f)) r += 3; // re-release boxes are often missing/odd
  if (BAD.test(f)) r += 100;
  return r;
}

// names: array of available thumbnail names (no .png). returns the best name or null.
function matchName(game, names, idx) {
  idx = idx || indexNames(names);
  const stem = lrName(stemOf(game.file || game.title));
  if (idx.exact.has(stem)) return stem;
  const pick = list => list && list.slice().sort((a, b) => rank(a) - rank(b) || a.length - b.length)[0];
  const byBase = pick(idx.base.get(baseTitle(stem).toLowerCase()));
  if (byBase && !BAD.test(byBase)) return byBase;
  const byFuzzy = pick(idx.fuzzy.get(fuzzy(stem)) || idx.fuzzy.get(fuzzy(lrName(game.title || ''))));
  if (byFuzzy && !BAD.test(byFuzzy)) return byFuzzy;
  return byBase || byFuzzy || null;
}
function indexNames(names) {
  const exact = new Set(names), base = new Map(), fz = new Map();
  for (const n of names) {
    const b = baseTitle(n).toLowerCase(); (base.get(b) || base.set(b, []).get(b)).push(n);
    const f = fuzzy(n); if (f) (fz.get(f) || fz.set(f, []).get(f)).push(n);
  }
  return { exact, base, fuzzy: fz };
}

// bar color: the most vivid color that covers a real chunk of the box. averages turn every cover to brown mud.
// bgra = raw pixels (electron nativeImage.toBitmap), small image is plenty (we sample a 32x32).
function accentFromBitmap(bgra, w, h) {
  const bins = new Map();
  const step = Math.max(1, Math.floor(Math.min(w, h) / 48));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4, b = bgra[i], g = bgra[i + 1], r = bgra[i + 2];
    const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4); // 4096 buckets
    const e = bins.get(k) || bins.set(k, [0, 0, 0, 0]).get(k); e[0] += r; e[1] += g; e[2] += b; e[3]++;
  }
  const total = [...bins.values()].reduce((a, e) => a + e[3], 0) || 1;
  // merge neighbouring buckets by coarser key so a gradient counts as one color
  const coarse = new Map();
  for (const [k, e] of bins) { const ck = ((k >> 9) & 7) << 6 | ((k >> 5) & 7) << 3 | ((k >> 1) & 7); const c = coarse.get(ck) || coarse.set(ck, [0, 0, 0, 0]).get(ck); for (let j = 0; j < 4; j++) c[j] += e[j]; }
  let best = null, bs = -1, dominant = null, dn = -1;
  for (const e of coarse.values()) {
    const r = e[0] / e[3], g = e[1] / e[3], b = e[2] / e[3];
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2;
    const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
    const share = e[3] / total;
    if (e[3] > dn) { dn = e[3]; dominant = [r, g, b]; }
    if (share < 0.02) continue; // a few pixels of logo don't get to pick the color
    const score = s * (1 - Math.abs(l - 0.5) * 1.5) * Math.pow(share, 0.35);
    if (score > bs) { bs = score; best = [r, g, b]; }
  }
  const c = (bs > 0.05 ? best : dominant) || [40, 40, 44];
  const hex = '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return { color: hex, ink: lum > 150 ? '#111111' : '#ffffff' };
}

// ---------- network + disk
function get(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'REPRO (github.com/osiriz/REPRO)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve(get(new URL(res.headers.location, url).href, timeout)); }
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
  });
}
const folderUrl = (sys, kind) => `${CDN}/${encodeURIComponent(LR_SYSTEM[sys])}/${KINDS[kind]}/`;

async function loadIndex(sys, kind, cacheDir, { fetch = get, now = Date.now() } = {}) {
  if (!LR_SYSTEM[sys]) return null;
  const file = path.join(cacheDir, `${sys}.${kind}.json`);
  try { const c = JSON.parse(fs.readFileSync(file, 'utf8')); if (now - c.at < INDEX_TTL) return c.names; } catch {}
  try {
    const r = await fetch(folderUrl(sys, kind), 60000);
    if (r.status !== 200) throw new Error('http ' + r.status);
    const names = parseListing(r.body.toString('utf8'));
    fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ at: now, names }));
    return names;
  } catch (e) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')).names; } catch { return null; } // offline: stale index beats nothing
  }
}

// img = { decode(buf) -> { w, h, jpeg(maxH) -> Buffer, bitmap(maxSide) -> { data, w, h } } } (electron nativeImage in main)
async function coverFor(game, { artDir, cacheDir, img, fetch = get, indexes = {} }) {
  for (const kind of ['box', 'title']) {
    const key = game.sys + '.' + kind;
    if (!(key in indexes)) { const names = await loadIndex(game.sys, kind, cacheDir, { fetch }); indexes[key] = names && { names, idx: indexNames(names) }; }
    const ix = indexes[key]; if (!ix) continue;
    const name = matchName(game, ix.names, ix.idx); if (!name) continue;
    const r = await fetch(folderUrl(game.sys, kind) + encodeURIComponent(name) + '.png').catch(() => null);
    if (!r || r.status !== 200 || r.body.length < 500) continue;
    const pic = img.decode(r.body); if (!pic || !pic.w) continue;
    const dir = path.join(artDir, game.sys); fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${lrName(stemOf(game.file || game.title))}.${kind}.jpg`);
    fs.writeFileSync(out, pic.jpeg(420));
    const bm = pic.bitmap(64);
    return { art: out, artKind: kind, artAR: +(pic.w / pic.h).toFixed(3), ...prefix(accentFromBitmap(bm.data, bm.w, bm.h)), artFrom: name };
  }
  return null;
}
const prefix = a => ({ artColor: a.color, artInk: a.ink });

// colour + shape for art that came from somewhere else (IGDB scrape, user dropped a file in art/)
function describeLocal(file, img) {
  try { const pic = img.decode(fs.readFileSync(file)); if (!pic?.w) return null; const bm = pic.bitmap(64); return { artAR: +(pic.w / pic.h).toFixed(3), ...prefix(accentFromBitmap(bm.data, bm.w, bm.h)) }; }
  catch { return null; }
}

// whole library, a few downloads at a time. onEach(game, result|null, done, total). stop() aborts between games.
function coverAll(games, opts, onEach) {
  let stopped = false; const total = games.length; let done = 0, i = 0;
  const indexes = {};
  const worker = async () => {
    while (!stopped && i < games.length) {
      const g = games[i++];
      let r = null; try { r = await coverFor(g, { ...opts, indexes }); } catch {}
      done++; onEach?.(g, r, done, total);
    }
  };
  const p = Promise.all(Array.from({ length: opts.concurrency || 6 }, worker));
  return { done: p, stop: () => { stopped = true; } };
}

module.exports = { LR_SYSTEM, lrName, stemOf, parseListing, matchName, indexNames, rank, accentFromBitmap, loadIndex, coverFor, coverAll, describeLocal };
