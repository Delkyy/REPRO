// draws the text-badge system logos as real paths, one type family, so they render identically everywhere and sit
// with the REPRO wordmark (same grid: cap 100, stem 22, bar 18, round strokes 19-20).
//   node scripts/make-badges.js          writes assets/systems/<id>.svg for every entry in BADGES
// simple-icons marks (gc, ps*, xbox, wii, switch, dolphin, retroarch...) are NOT touched: they're real brand marks.
// drop a better svg with the same name to override any of these; this script only rewrites the ids listed below.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'systems');

// glyphs on a 100-cap grid, y down. `f` = filled path data (nonzero: holes wound the other way), `s` = stroked
// centerline for the round glyphs a bold fill can't express cleanly, `w` = advance width.
const G = {
  I: { w: 22, f: 'M0,0H22V100H0Z' },
  E: { w: 70, f: 'M0,0H22V100H0Z M0,0H70V18H0Z M0,40H62V58H0Z M0,82H70V100H0Z' },
  T: { w: 72, f: 'M0,0H72V18H47V100H25V18Z' },
  N: { w: 80, f: 'M0,0H24L58,58V0H80V100H56L22,42V100H0Z' },
  M: { w: 96, f: 'M0,0H22L48,44L74,0H96V100H74V40L48,82L22,40V100H0Z' },
  X: { w: 84, f: 'M0,0H30L84,100H54Z M54,0H84L30,100H0Z' },
  K: { w: 88, f: 'M0,0H22V100H0Z M22,50L60,0H88L50,50Z M36,44H62L88,100H62Z' },
  A: { w: 92, f: 'M34,0H58L24,100H0Z M34,0H58L92,100H68Z M20,62H72V80H20Z' },
  U: { w: 90, f: 'M0,0H22V55A23,23 0 0 0 68,55V0H90V57A45,45 0 0 1 0,57Z' },
  D: { w: 78, f: 'M0,0H34A44,50 0 0 1 34,100H0Z M22,80H34A24,30 0 0 0 34,20H22Z' },
  O: { w: 80, f: 'M40,-2A40,40 0 0 1 80,38V62A40,40 0 0 1 40,102A40,40 0 0 1 0,62V38A40,40 0 0 1 40,-2Z M40,18A20,20 0 0 0 20,38V62A20,20 0 0 0 40,82A20,20 0 0 0 60,62V38A20,20 0 0 0 40,18Z' },
  C: { w: 80, f: 'M79,30A40,40 0 0 0 40,-2A40,40 0 0 0 0,38V62A40,40 0 0 0 40,102A40,40 0 0 0 79,70H58A20,20 0 0 1 40,82A20,20 0 0 1 20,62V38A20,20 0 0 1 40,18A20,20 0 0 1 58,30Z' },
  G: { w: 80, f: 'M79,30A40,40 0 0 0 40,-2A40,40 0 0 0 0,38V62A40,40 0 0 0 40,102A40,40 0 0 0 80,62V46H44V64H60V62A20,20 0 0 1 40,82A20,20 0 0 1 20,62V38A20,20 0 0 1 40,18A20,20 0 0 1 58,30Z' },
  B: { w: 68, f: 'M0,0H36A28,27 0 0 1 36,54H0Z M0,44H36A32,28 0 0 1 36,100H0Z M22,36H36A8,9 0 0 0 36,18H22Z M22,82H36A14,14 0 0 0 36,54H22Z' },
  P: { w: 78, f: 'M0,0H22V100H0Z M0,0H48A30,30 0 0 1 48,60H0Z M22,18V42H46A12,12 0 0 0 46,18Z' },
  R: { w: 90, f: 'M0,0H22V100H0Z M0,0H48A30,30 0 0 1 48,60H0Z M42,52H67L90,100H65Z M22,18V42H46A12,12 0 0 0 46,18Z' },
  4: { w: 76, f: 'M46,0H68V100H46Z M46,0L0,62H25L46,34Z M0,62H76V80H0Z' },
  0: { w: 80, f: 'M40,-2A40,40 0 0 1 80,38V62A40,40 0 0 1 40,102A40,40 0 0 1 0,62V38A40,40 0 0 1 40,-2Z M40,18A20,20 0 0 0 20,38V62A20,20 0 0 0 40,82A20,20 0 0 0 60,62V38A20,20 0 0 0 40,18Z' },
  // round figures are stroked centerlines (stroke 19). two tangent circles: top r18 at y27.5, bottom r22.5 at y68,
  // so outer edges land exactly on 0 and 100. the S runs CCW over the top then CW under the bottom.
  S: { w: 62, s: 'M44.7,17.2A18,18 0 1 0 30,45.5A22.5,22.5 0 1 1 11.6,80.9' },
  3: { w: 63, s: 'M16.3,17.2A18,18 0 1 1 31,45.5A22.5,22.5 0 1 1 12.6,80.9' },
  6: { w: 66, s: 'M33,43.5A23.5,23.5 0 1 0 33,90.5A23.5,23.5 0 1 0 33,43.5 M9.5,67A52,52 0 0 1 50,9.5' },
  2: { w: 60, s: 'M13.1,21.3A18,18 0 1 1 42.7,40.2L6,84', f: 'M0,82H60V100H0Z' },
};
const KERN = 12, PAD = 6, STROKE = 19;

function word(text) {
  let x = 0; const parts = [];
  for (const ch of text) {
    const g = G[ch]; if (!g) throw new Error(`no glyph for "${ch}"`);
    const t = x ? ` transform="translate(${x},0)"` : '';
    if (g.f) parts.push(`<path${t} d="${g.f}"/>`);
    if (g.s) parts.push(`<path${t} fill="none" stroke="#000" stroke-width="${STROKE}" stroke-linejoin="round" d="${g.s}"/>`);
    x += g.w + KERN;
  }
  return { w: x - KERN, body: parts.join('') };
}
// arcade: a stick + two buttons silhouette, no brand. same 100 cap.
const ARCADE = { w: 104, body: '<path d="M8,64H96A8,8 0 0 1 104,72V100H0V72A8,8 0 0 1 8,64Z"/><circle cx="24" cy="14" r="14"/><path d="M20,22H28V66H20Z"/><circle cx="62" cy="54" r="12"/><circle cx="90" cy="44" r="12"/><path d="M56,54H68V68H56Z M84,44H96V68H84Z"/>' };

// only ids that DON'T have a real mark. every console is a real commons mark now (see README) —
// do not add any back here or a rerun stomps them.
const BADGES = {
  arcade: ARCADE,
  pcsx2: word('PCSX2'), duckstation: word('DUCK'), xemu: word('XEMU'), xenia: word('XENIA'),
};
fs.mkdirSync(OUT, { recursive: true });
for (const [id, b] of Object.entries(BADGES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD - 2} ${b.w + PAD * 2} ${104 + PAD * 2}" fill="#000"><title>${id}</title>${b.body}</svg>\n`;
  fs.writeFileSync(path.join(OUT, id + '.svg'), svg);
  console.log('BADGE', id.padEnd(12), b.w + PAD * 2, 'x', 104 + PAD * 2);
}
