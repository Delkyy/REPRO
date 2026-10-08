// covers: matcher, listing parser, color picker, end-to-end download with a fake CDN
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('../src/main/covers');

const NAMES = [
  'Super Metroid (Europe) (En,Fr,De)', 'Super Metroid (Japan, USA) (En,Ja)', 'Super Metroid - Redux (USA)',
  'Super Metroid (USA, Europe) (En,Ja) (Virtual Console, Classic Mini, Switch Online)',
  'Sonic The Hedgehog (USA, Europe)', 'Sonic The Hedgehog (Japan, Korea)',
  'Zelda (USA) (Beta)', 'Zelda (Japan)', 'Pocky _ Rocky (USA)', 'Castlevania - Symphony of the Night (USA)',
];

test('listing parser reads the apache index and decodes names', () => {
  const html = '<a href="?C=N;O=D">Name</a><a href="../">Parent</a><a href="Super%20Metroid%20(Japan,%20USA)%20(En,Ja).png">x</a><a href="Pocky%20_%20Rocky%20(USA).png">y</a>';
  assert.deepStrictEqual(C.parseListing(html), ['Super Metroid (Japan, USA) (En,Ja)', 'Pocky _ Rocky (USA)']);
});

test('matching: exact no-intro name, then best region, then fuzzy; betas lose to real releases', () => {
  const m = (file, title) => C.matchName({ file, title: title || file }, NAMES);
  assert.strictEqual(m('Super Metroid (Europe) (En,Fr,De).7z'), 'Super Metroid (Europe) (En,Fr,De)', 'exact file name wins');
  assert.strictEqual(m('Super Metroid (Brazil).7z'), 'Super Metroid (Japan, USA) (En,Ja)', 'unknown dump -> USA box, not the VC re-release');
  assert.strictEqual(m('Sonic the Hedgehog (USA).md'), 'Sonic The Hedgehog (USA, Europe)', 'case-insensitive title');
  assert.strictEqual(m('Zelda (USA).nes'), 'Zelda (Japan)', 'a real japan box beats a USA beta');
  assert.strictEqual(m('Pocky & Rocky (USA).sfc'), 'Pocky _ Rocky (USA)', '& is stored as _ on the CDN');
  assert.strictEqual(m('Castlevania - Symphony of the Night (USA).chd'), 'Castlevania - Symphony of the Night (USA)');
  assert.strictEqual(m('Totally Unknown Game (USA).7z'), null);
});

test('bar color: picks the vivid color that covers real area, not the average mud', () => {
  // 40x40: 70% near-black, 25% red, 5% tiny bright green speck
  const w = 40, h = 40, px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = i < 1120 ? [12, 12, 14] : i < 1520 ? [200, 30, 40] : [0, 255, 0];
    px[i * 4] = b; px[i * 4 + 1] = g; px[i * 4 + 2] = r; px[i * 4 + 3] = 255;
  }
  const a = C.accentFromBitmap(px, w, h);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(a.color.slice(i, i + 2), 16));
  assert.ok(r > 150 && g < 80 && b < 80, 'got ' + a.color);
  assert.strictEqual(a.ink, '#ffffff');
  // all light cover -> dark ink
  const lite = Buffer.alloc(16 * 16 * 4, 235);
  assert.strictEqual(C.accentFromBitmap(lite, 16, 16).ink, '#111111');
});

test('coverFor: index cached once, box art preferred, title screen fallback, files land in art/<sys>/', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-cov-'));
  const hits = [];
  const fetch = async url => {
    hits.push(decodeURIComponent(url));
    if (url.endsWith('/Named_Boxarts/')) return { status: 200, body: Buffer.from('<a href="Super%20Metroid%20(Japan,%20USA)%20(En,Ja).png">') };
    if (url.endsWith('/Named_Titles/')) return { status: 200, body: Buffer.from('<a href="Metroid%20(USA).png">') };
    if (url.endsWith('.png')) return { status: 200, body: Buffer.alloc(800, 1) };
    return { status: 404, body: Buffer.alloc(0) };
  };
  const img = { decode: () => ({ w: 300, h: 210, jpeg: () => Buffer.from('jpg'), bitmap: () => ({ data: Buffer.alloc(8 * 8 * 4, 128), w: 8, h: 8 }) }) };
  const opts = { artDir: path.join(dir, 'art'), cacheDir: path.join(dir, 'idx'), img, fetch, indexes: {} };
  const r1 = await C.coverFor({ sys: 'snes', title: 'Super Metroid', file: 'Super Metroid (Japan, USA) (En,Ja).7z' }, opts);
  assert.strictEqual(r1.artKind, 'box');
  assert.strictEqual(r1.artAR, +(300 / 210).toFixed(3));
  assert.ok(fs.existsSync(r1.art) && r1.art.startsWith(path.join(dir, 'art', 'snes')));
  const r2 = await C.coverFor({ sys: 'snes', title: 'Metroid', file: 'Metroid (USA).7z' }, opts);
  assert.strictEqual(r2.artKind, 'title', 'no box -> title screen');
  assert.strictEqual(await C.coverFor({ sys: 'snes', title: 'Nope', file: 'Nope (USA).7z' }, opts), null);
  assert.strictEqual(hits.filter(u => u.endsWith('/Named_Boxarts/')).length, 1, 'index downloaded once for all games');
  assert.ok(fs.existsSync(path.join(dir, 'idx', 'snes.box.json')), 'index cached on disk');
  fs.rmSync(dir, { recursive: true, force: true });
});
