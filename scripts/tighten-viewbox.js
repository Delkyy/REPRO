// tighten the viewBox of wide simple-icons marks. they ship in a 24x24 box; a wordmark like PS2 fills a 24x4 strip
// of it, and since the app masks with `contain`, it renders as a 4px-tall sliver in a 36x18 slot. this measures the
// real ink bounds in chromium and rewrites viewBox to hug them (+4% pad). idempotent, safe to rerun.
//   npx electron scripts/tighten-viewbox.js ps2 ps3 psp vita wiiu      (or no args: every svg in assets/systems)
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'assets', 'systems');
const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const files = (ids.length ? ids.map(i => i + '.svg') : fs.readdirSync(DIR).filter(f => f.endsWith('.svg')));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 400, height: 400, webPreferences: { offscreen: true } });
  await win.loadURL('about:blank');
  for (const f of files) {
    const p = path.join(DIR, f), src = fs.readFileSync(p, 'utf8');
    if (/<text/.test(src)) { console.log('skip  ', f, '(text badge)'); continue; }
    const bb = await win.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = ${JSON.stringify(src)};
      const s = document.querySelector('svg'); const b = s.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height, vb: s.getAttribute('viewBox') };
    })()`);
    const pad = Math.max(bb.w, bb.h) * 0.04;
    const vb = [bb.x - pad, bb.y - pad, bb.w + pad * 2, bb.h + pad * 2].map(n => +n.toFixed(2)).join(' ');
    if (vb === bb.vb) { console.log('ok    ', f); continue; }
    const [, , ow, oh] = (bb.vb || '').split(/\s+/).map(Number);
    const fill = (bb.w * bb.h) / (ow * oh); // how much of the old box the ink actually used
    if (fill > 0.55) { console.log('ok    ', f, `(${Math.round(fill * 100)}% of box used)`); continue; }
    fs.writeFileSync(p, src.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`));
    console.log('tight ', f, bb.vb, '->', vb, `(was ${Math.round(fill * 100)}% used)`);
  }
  app.exit(0);
});
