// proof sheet for assets/systems/*.svg: each logo masked the way the app does it, at the three sizes the app uses,
// in that system's color from systems.json. review sketches/logo-sheet.png before shipping a new mark.
//   npx electron test/logosheet.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SYS = JSON.parse(fs.readFileSync(path.join(ROOT, 'systems.json'), 'utf8'));
const dir = path.join(ROOT, 'assets', 'systems');
const ids = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).sort((a, b) => (SYS[a] ? 0 : 1) - (SYS[b] ? 0 : 1) || a.localeCompare(b));
const url = id => 'file:///' + path.join(dir, id + '.svg').replace(/\\/g, '/');
const html = `<!doctype html><meta charset=utf-8>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap" rel=stylesheet>
<style>
  body{margin:0;background:#111214;color:#9A9DA3;font:500 10px "JetBrains Mono",monospace;width:1400px;padding:16px 24px;box-sizing:border-box;columns:2;column-gap:40px;column-fill:auto;height:${'${H}'}px}
  .r{display:grid;grid-template-columns:70px 44px 80px 60px 120px 1fr;align-items:center;gap:12px;height:36px;border-bottom:1px solid #2C2E31;break-inside:avoid}
  .r.h{color:#5c5f66;height:22px;letter-spacing:.14em;text-transform:uppercase;font-size:9px}
  .lg{background:currentColor;-webkit-mask:var(--m) left/contain no-repeat;mask:var(--m) left/contain no-repeat;display:block}
  .side{width:36px;height:18px}.ban{width:70px;height:22px}.hero{width:50px;height:16px}
  .card{width:54px;height:20px;opacity:.85}
  .big{width:110px;height:30px;color:#F2F2F2}
  .muted{color:#9A9DA3}
</style>
<div class="r h"><span>id</span><span>side 36×18</span><span>banner 70×22</span><span>hero 50×16</span><span>big, fg</span><span>note</span></div>
${ids.map(id => { const c = SYS[id]?.color || '#9A9DA3', m = `--m:url('${url(id)}')`; const src = fs.readFileSync(path.join(dir, id + '.svg'), 'utf8'); const kind = /<text/.test(src) ? 'TEXT BADGE' : /wikimedia commons/.test(src) ? 'commons' : /simple-icons|role="img"/.test(src) ? 'simple-icons' : 'drawn'; return `<div class=r><span style="color:${c}">${id}</span><i class="lg side" style="${m};color:${c}"></i><i class="lg ban" style="${m};color:${c}"></i><i class="lg hero" style="${m};color:${c}"></i><i class="lg big" style="${m}"></i><span class=muted>${SYS[id]?.name || 'emulator'} · ${kind}</span></div>`; }).join('')}`;
app.whenReady().then(async () => {
  const H = 70 + Math.ceil(ids.length / 2) * 37, W = 1400;
  const tmp = path.join(app.getPath('temp'), 'repro-logosheet.html'); fs.writeFileSync(tmp, html.replace('${H}', H));
  const win = new BrowserWindow({ show: false, width: W, height: H, useContentSize: true, backgroundColor: '#111214', webPreferences: { offscreen: true } });
  await win.loadFile(tmp);
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 500)))');
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: W, height: H });
  const out = path.join(ROOT, 'sketches', 'logo-sheet.png'); fs.writeFileSync(out, img.toPNG());
  console.log('SHOT', path.relative(ROOT, out), img.getSize()); fs.unlinkSync(tmp); app.exit(0);
});
