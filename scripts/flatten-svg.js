// flatten a commons/brand svg into the single-color mask format assets/systems uses.
// every drawn element gets fill=#000 (stroke kept but recolored), gradients/whites/clip junk dropped, viewBox tightened to
// the ink. writes assets/systems/<id>.svg. review with test/logosheet.js.
//   npx electron scripts/flatten-svg.js <srcdir> <id> [id...]     e.g. %LOCALAPPDATA%/Temp/commons ps4 ps5
//   --keep-white   some sources draw the mark IN white on a colored plate; then white is the ink and the plate is dropped.
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), flags = process.argv.filter(a => a.startsWith('--'));
const SRC = args[0], ids = args.slice(1), OUT = path.join(__dirname, '..', 'assets', 'systems');
const keepWhite = flags.includes('--keep-white');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 800, webPreferences: { offscreen: true } });
  await win.loadURL('about:blank');
  for (const id of ids) {
    const src = fs.readFileSync(path.join(SRC, id + '.svg'), 'utf8');
    const out = await win.webContents.executeJavaScript(`(() => {
      const keepWhite = ${keepWhite};
      document.body.innerHTML = ${JSON.stringify(src)};
      const svg = document.querySelector('svg');
      const isWhite = c => { if (!c || c === 'none') return false; const m = c.match(/\\d+/g); return m && m.length >= 3 && m.slice(0, 3).every(v => +v > 235); };
      const drawn = [...svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text')];
      // decide which color is the ink: the color covering the most bbox area that isn't the biggest single plate
      const area = e => { const b = e.getBBox(); return b.width * b.height; };
      const byColor = {};
      for (const e of drawn) { const cs = getComputedStyle(e); const c = cs.fill !== 'none' ? cs.fill : cs.stroke; (byColor[c] ??= []).push(e); }
      let removed = 0;
      for (const e of drawn) {
        const cs = getComputedStyle(e);
        const fill = cs.fill, stroke = cs.stroke;
        const white = isWhite(fill) || (fill === 'none' && isWhite(stroke));
        if (white && !keepWhite) { e.remove(); removed++; continue; }
        if (!white && keepWhite) { e.remove(); removed++; continue; }
        if (fill === 'none' && stroke === 'none') { e.remove(); removed++; continue; }
        e.removeAttribute('style'); e.removeAttribute('class');
        if (fill !== 'none') e.setAttribute('fill', '#000'); else e.setAttribute('fill', 'none');
        if (stroke !== 'none') e.setAttribute('stroke', '#000');
        e.removeAttribute('fill-opacity'); e.removeAttribute('opacity'); e.removeAttribute('stroke-opacity');
      }
      svg.querySelectorAll('defs,style,metadata,title,desc,image,filter,mask,linearGradient,radialGradient,pattern').forEach(n => n.remove());
      svg.querySelectorAll('*').forEach(n => { for (const a of ['opacity', 'fill-opacity', 'style', 'class', 'filter', 'mask', 'clip-path']) n.removeAttribute(a); });
      svg.querySelectorAll('g').forEach(g => { if (!g.querySelector('path,rect,circle,ellipse,polygon,polyline,line,text')) g.remove(); });
      const b = svg.getBBox(); const pad = Math.max(b.width, b.height) * 0.03;
      svg.setAttribute('viewBox', [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2].map(n => +n.toFixed(2)).join(' '));
      for (const a of ['width', 'height', 'style', 'xml:space', 'id', 'sodipodi:docname', 'inkscape:version']) svg.removeAttribute(a);
      return { svg: svg.outerHTML, removed, kept: svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text').length, colors: Object.fromEntries(Object.entries(byColor).map(([c, es]) => [c, es.length])) };
    })()`);
    fs.writeFileSync(path.join(OUT, id + '.svg'), `<!-- source: wikimedia commons, see assets/systems/README.md. trademark of its owner. flattened by scripts/flatten-svg.js -->\n` + out.svg + '\n');
    console.log('FLAT', id.padEnd(8), `kept ${out.kept} dropped ${out.removed}`, JSON.stringify(out.colors));
  }
  app.exit(0);
});
