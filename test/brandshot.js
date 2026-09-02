// renders the brand assets with the app's own chromium so what we ship is what we looked at.
//   npx electron test/brandshot.js
// writes: sketches/brand-sheet.png (review sheet: mark, wordmark, icon at real sizes, dark + light)
//         assets/brand/ico/icon-<size>.png (transparent, one per ico size; scripts/make-ico.py packs them into icon.ico)
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, 'assets', 'brand', f), 'utf8');
const mark = read('repro-mark.svg'), word = read('repro-wordmark.svg'), icon = read('icon.svg');
const sheet = `<!doctype html><meta charset=utf-8>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel=stylesheet>
<style>
  body{margin:0;background:#0C0C0D;color:#9A9DA3;font:12px "Sora",system-ui;width:1200px;overflow:hidden}
  .row{display:flex;gap:40px;padding:28px 40px;align-items:center;border-bottom:1px solid #2C2E31}
  .row.light{background:#F2F2F2;color:#666;border-color:#ddd}
  h5{font:500 10px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;margin:0;width:110px;flex:none}
  .cell{display:flex;flex-direction:column;align-items:center;gap:8px}
  .cell small{font:500 10px "JetBrains Mono",monospace;opacity:.7}
  svg{display:block}
  .mark{color:#FF2D6F}.word{color:#F2F2F2}.light .word{color:#0C0C0D}.light .mark{color:#FF2D6F}
  .mono .mark,.mono .word{color:#F2F2F2}
  .taskbar{background:#202020;padding:10px 14px;border-radius:6px;display:flex;gap:18px;align-items:center}
  .win{background:#202020;padding:0;width:320px;border:1px solid #444;border-radius:8px 8px 0 0;overflow:hidden}
  .win .tb{display:flex;align-items:center;gap:8px;padding:6px 8px;font:12px "Segoe UI",system-ui;color:#fff}
  .win .tb i{margin-left:auto;font-style:normal;letter-spacing:8px;opacity:.7}
  .win .body{height:56px;background:#0C0C0D}
</style>
<div class=row><h5>mark</h5>
  ${[128, 64, 40, 24, 16].map(s => `<div class=cell><div class=mark style="width:${s * .9}px;height:${s}px">${mark.replace('<svg ', `<svg width="${s * .9}" height="${s}" `)}</div><small>${s}</small></div>`).join('')}
  <div class=cell><div class=mark style="color:#00E5FF">${mark.replace('<svg ', '<svg width="57.6" height="64" ')}</div><small>accent2</small></div>
  <div class=cell><div class=mark style="color:#F2F2F2">${mark.replace('<svg ', '<svg width="57.6" height="64" ')}</div><small>fg</small></div>
</div>
<div class=row><h5>wordmark</h5>
  <div class=cell><div class=word>${word.replace('<svg ', '<svg height="64" ')}</div><small>64</small></div>
  <div class=cell><div class=word>${word.replace('<svg ', '<svg height="28" ')}</div><small>28</small></div>
  <div class=cell><div class=word>${word.replace('<svg ', '<svg height="14" ')}</div><small>14</small></div>
</div>
<div class="row light"><h5>on light</h5>
  <div class=cell><div class=mark>${mark.replace('<svg ', '<svg width="57.6" height="64" ')}</div></div>
  <div class=cell><div class=word>${word.replace('<svg ', '<svg height="40" ')}</div></div>
</div>
<div class=row><h5>icon</h5>
  ${[256, 128, 64, 48, 32, 24, 16].map(s => `<div class=cell>${icon.replace('<svg ', `<svg width="${s}" height="${s}" `)}<small>${s}</small></div>`).join('')}
</div>
<div class=row><h5>in situ</h5>
  <div class=taskbar>${icon.replace('<svg ', '<svg width="24" height="24" ')}<span style="width:24px;height:24px;border-radius:4px;background:#1a73e8"></span><span style="width:24px;height:24px;border-radius:4px;background:#0f7b0f"></span><span style="width:24px;height:24px;border-radius:4px;background:#8a3ffc"></span></div>
  <div class=win><div class=tb>${icon.replace('<svg ', '<svg width="16" height="16" ')}REPRO<i>—▢✕</i></div><div class=body></div></div>
</div>`;
app.whenReady().then(async () => {
  // one window, reloaded per shot: a second offscreen BrowserWindow after destroy() fails to load anything (ERR_FAILED).
  // transparent so the icon renders come out with real alpha; the sheet paints its own body background.
  const win = new BrowserWindow({ show: false, width: 1200, height: 900, useContentSize: true, transparent: true, webPreferences: { offscreen: true } });
  const shot = async (html, w, h, out) => {
    const tmp = path.join(app.getPath('temp'), `repro-brand-${Math.random().toString(36).slice(2)}.html`); fs.writeFileSync(tmp, html);
    win.setContentSize(w, h);
    await win.loadFile(tmp);
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 400)))');
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h });
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, img.toPNG());
    console.log('SHOT', path.relative(ROOT, out), img.getSize()); fs.unlinkSync(tmp);
  };
  await shot(sheet, 1200, 900, path.join(ROOT, 'sketches', 'brand-sheet.png'));
  // every ico size rendered from the vector at its real pixel size (crisper than downsampling one big raster). scripts/make-ico.py packs them.
  for (const s of [1024, 256, 128, 64, 48, 32, 24, 16])
    await shot(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${icon.replace('<svg ', `<svg width="${s}" height="${s}" `)}`, s, s, path.join(ROOT, 'assets', 'brand', 'ico', `icon-${s}.png`));
  app.exit(0);
});
