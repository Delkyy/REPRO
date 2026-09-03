// render an svg's top-level drawn elements one per cell so you can see which path is which before flattening.
//   npx electron scripts/svg-explode.js <file.svg> [out.png]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || file.replace(/\.svg$/, '-explode.png'));
const src = fs.readFileSync(file, 'utf8');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1200, height: 400, webPreferences: { offscreen: true } });
  await win.loadURL('about:blank');
  const cells = await win.webContents.executeJavaScript(`(() => {
    document.body.innerHTML = ${JSON.stringify(src)};
    const svg = document.querySelector('svg'); const vb = svg.getAttribute('viewBox');
    const drawn = [...svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline')].filter(e => !e.closest('defs,mask,clipPath,pattern,symbol'));
    return drawn.map((e, i) => {
      const cs = getComputedStyle(e); const b = e.getBBox();
      const clone = svg.cloneNode(true); [...clone.querySelectorAll('path,rect,circle,ellipse,polygon,polyline')].filter(x => !x.closest('defs,mask,clipPath,pattern,symbol')).forEach((x, j) => { if (j !== i) x.remove(); });
      clone.setAttribute('viewBox', vb); clone.removeAttribute('width'); clone.removeAttribute('height');
      return { i, fill: cs.fill, stroke: cs.stroke, area: Math.round(b.width * b.height), svg: clone.outerHTML };
    });
  })()`);
  const full = src.replace(/<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')}>`);
  const html = `<body style="margin:0;background:#3a3a3a;color:#ddd;font:11px monospace;display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:1200px;box-sizing:border-box">
    <div style="width:130px"><div style="background:#fff;padding:4px;height:100px;display:grid;place-items:center">${full.replace('<svg', '<svg style="max-width:120px;max-height:92px"')}</div>full</div>
    ${cells.map(c => `<div style="width:130px"><div style="background:#fff;padding:4px;height:100px;display:grid;place-items:center">${c.svg.replace('<svg', '<svg style="max-width:120px;max-height:92px"')}</div>#${c.i} ${c.fill.slice(0, 22)}<br>area ${c.area}</div>`).join('')}</body>`;
  const tmp = path.join(app.getPath('temp'), 'svg-explode.html'); fs.writeFileSync(tmp, html);
  const rows = Math.ceil((cells.length + 1) / 8), h = rows * 132 + 16;
  win.setContentSize(1200, h); await win.loadFile(tmp); await new Promise(r => setTimeout(r, 500));
  fs.writeFileSync(out, (await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: h })).toPNG());
  console.log('EXPLODE', out, cells.length, 'elements'); cells.forEach(c => console.log(`  #${c.i} area=${c.area} fill=${c.fill} stroke=${c.stroke}`));
  fs.unlinkSync(tmp); app.exit(0);
});
