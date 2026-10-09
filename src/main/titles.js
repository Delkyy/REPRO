// titles.js: turn No-Intro / Redump filenames into what a person would call the game.
//
//   "Legend of Zelda, The - A Link to the Past (USA) (Rev 1).7z"  ->  name "The Legend of Zelda - A Link to the Past"
//   "Super Metroid (Japan, USA) (En,Ja).7z"                         ->  name "Super Metroid"
//   "150-in-1 (Asia) (Pirate).7z"                                   ->  kind "pirate"  (hidden by "hide junk")
//
// g.title is NOT touched: save snapshots live under saves/<sys>/<title>/ and the DuckStation adapter matches memcards
// by it. this module only adds display fields: name (shown), sort (alphabetical without "The"), kind (junk class),
// tags (short chips worth showing: Disc 2, Proto, Hack...) and group (what counts as "the same game").
'use strict';

const REGIONS = new Set(['usa', 'world', 'europe', 'japan', 'uk', 'australia', 'canada', 'brazil', 'korea', 'china', 'france',
  'germany', 'spain', 'italy', 'asia', 'netherlands', 'sweden', 'taiwan', 'hong kong', 'russia', 'scandinavia', 'unknown',
  'denmark', 'finland', 'norway', 'portugal', 'greece', 'poland', 'mexico', 'argentina', 'india', 'latin america', 'belgium',
  'austria', 'switzerland', 'united kingdom', 'latin america', 'scandinavia', 'europe, asia', 'new zealand', 'south africa', 'ireland', 'israel', 'turkey', 'czech', 'hungary', 'croatia', 'thailand']);
const LANG = /^[a-z]{2}(-[a-z]{2,4})?$/i;          // En, Ja, Zh-Hant, Pt-BR
const VERSION = /^(rev [a-z0-9.]+|v ?\d[\w.]*|alt( \d+)?|\d{4}-\d{2}-\d{2}|[a-z]+,? \d{4}|\d{1,2}[a-z]?|beta \d+|proto \d+|[a-z]{1,3}-?\d{1,4}|(19|20)\d\d|earlier|later|final|alt \w+)$/i;

// tag -> junk class. first match wins, order = most junky first
const KIND_RULES = [
  ['bios',   t => /^bios$/i.test(t)],
  ['pirate', t => /^pirate$/i.test(t)],
  ['bad',    t => /^(b\d*|o\d*)$/i.test(t)],                         // [b] bad dump, [o] overdump
  ['hack',   t => /^(h\d*|hack|t\d*)$/i.test(t)],               // [h] hack, [t] trainer
  ['test',   t => /^(test program|program|diagnostic|test cartridge|debug|debug version|competition cart)$/i.test(t)],
  ['unl',    t => /^(unl|unlicensed)$/i.test(t)],
  ['proto',  t => /^(proto|possible proto|prototype)( \d+)?$/i.test(t)],
  ['beta',   t => /^beta( \d+)?$/i.test(t)],
  ['demo',   t => /^(demo|sample|kiosk|kiosk, .+|trade demo|preview|promo)$/i.test(t)],
];
const JUNK = new Set(['bios', 'pirate', 'bad', 'hack', 'test', 'unl', 'proto', 'beta', 'demo']);
const KIND_LABEL = { pirate: 'Pirate', bad: 'Bad dump', hack: 'Hack', test: 'Test cart', unl: 'Unlicensed', proto: 'Proto', beta: 'Beta', demo: 'Demo', bios: 'BIOS' };

// re-release / collection tags: same game, different shelf. not shown, not part of the group key.
const RERELEASE = /^(virtual console|wii virtual console|switch online|switch|gamecube|gamecube edition|sega channel|seganet|lodgenet|netcard|np|arcade|e-reader edition|.*\b(collection|museum|classics|mini|anniversary)\b.*|retro collection|famicombox|aftermarket|limited edition)$/i;
// feature tags nobody needs on a cover
const NOISE = /^(sgb enhanced|cgb\+sgb enhanced|gb compatible|enhancement chip|j-cart|lock-on combination|datach|rumble|rumble version|# pin cart|\d+ pin cart|ntsc|pal|ntsc-u|ntsc-j|en|ja|!|a|f|p|e|u|j)$/i;

const EDITION = /\b(edition|version|choice|greatest hits|platinum|director'?s cut|special|deluxe|limited|collector'?s|anniversary|remix|tournament|championship edition|dx)\b/i;
const ARTICLES = /^(.+?), (The|A|An|Die|Der|Das|Le|La|Les|El|Il|Los|Las)(\b.*)?$/;

function stem(file) { return String(file || '').replace(/\.[^.\\/]+$/, '').replace(/\.(nkit|xiso)$/i, ''); }

// "Legend of Zelda, The - A Link to the Past" -> "The Legend of Zelda - A Link to the Past"
// applied per " - " segment so "Disney's Aladdin, The" style names in the subtitle get fixed too
function fixArticles(s) {
  return s.split(' - ').map(seg => { const m = seg.match(ARTICLES); return m && !m[3]?.trim() ? `${m[2]} ${m[1]}` : m ? `${m[2]} ${m[1]}${m[3]}` : seg; }).join(' - ');
}

function parse(file) {
  let s = stem(file);
  const tags = []; let kind = null, disc = null, trans = null;
  // leading [BIOS] / [Hack] style prefixes
  s = s.replace(/^\s*\[([^\]]+)\]\s*/, (_, t) => { tags.push(t.trim()); return ''; });
  // every (...) and [...] group anywhere (No-Intro puts them at the end, translation sets sometimes in the middle)
  const groups = [];
  const base = s.replace(/\s*(\(([^()]*)\)|\[([^\[\]]*)\])/g, (_, __, p, b) => { groups.push(p ?? b); return ''; }).replace(/\s+/g, ' ').trim();
  for (const g of groups) for (const t of [g.trim()]) tags.push(t);

  const shown = [];
  for (let t of tags) {
    if (!t) continue;
    const parts = t.split(/,\s*/);
    if (parts.every(p => REGIONS.has(p.toLowerCase()))) continue;                 // (Japan, USA)
    if (parts.every(p => LANG.test(p))) continue;                                 // (En,Ja,Fr)
    const d = t.match(/^(disc|disk|side) ?([0-9a-z]+)/i); if (d) { disc = `${d[1][0].toUpperCase()}${d[1].slice(1).toLowerCase()} ${d[2].toUpperCase()}`; continue; }
    const k = KIND_RULES.find(([, test]) => test(t))?.[0];
    if (k) { if (!kind || KIND_RULES.findIndex(r => r[0] === k) < KIND_RULES.findIndex(r => r[0] === kind)) kind = k; continue; }
    // judge comma lists part by part: (Virtual Console, Switch Online) (SGB Enhanced, GB Compatible) (En,Fr,De+En)
    const keep = parts.filter(p => !(REGIONS.has(p.toLowerCase()) || LANG.test(p) || /^[a-z]{2}(\+[a-z]{2})+$/i.test(p) || RERELEASE.test(p) || NOISE.test(p) || VERSION.test(p)));
    if (!keep.length) continue;
    t = keep.join(', ');
    // fan translations: same game, so same card (the official english release wins when there is one, else this IS the card)
    if (/[^\x00-\x7f]/.test(t)) { if (/汉化|中文|简体|繁体|chinese/i.test(t)) trans = 'CN translation'; continue; }
    if (/^t[+-]?(en|eng)\b/i.test(t) || /translat/i.test(t)) { trans = 'EN translation'; continue; }
    // only tags that change WHAT the game is make it onto the name: (Hall of Fame Edition), (Player's Choice), (Director's Cut).
    // everything else (bootleg publishers, beta dates, mapper names, 3DS VC...) is variant detail and stays in the file name.
    if (EDITION.test(t)) shown.push(t);
  }
  let name = fixArticles(base || stem(file));
  if (shown.length) name += ` (${shown.join(', ')})`;
  if (disc) name += ` · ${disc}`;
  const sort = name.replace(/^(the|a|an) /i, '').toLowerCase();
  // group: same base name + edition + disc = same game (merges Virtual Console / collection re-releases into one card)
  const group = (fixArticles(base) + (shown.length ? ' (' + shown.join(', ') + ')' : '') + (disc ? ' ' + disc : '')).toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, ' ').trim();
  const chips = [kind && KIND_LABEL[kind], trans].filter(Boolean);
  return { name, sort, group, kind, junk: JUNK.has(kind), chips, trans };
}

module.exports = { parse, fixArticles, stem, JUNK, KIND_LABEL };
