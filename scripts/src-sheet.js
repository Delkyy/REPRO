// contact sheet of raw logo sources (svg + png) on white, so you can see what you're about to flatten.
//   npx electron scripts/src-sheet.js <dir> <out.png>
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || 'src-sheet.png');
const files = fs.readdirSync(dir).filter(f => /\.(svg|png)$/i.test(f)).sort();
const html = `<body style="margin:0;background:#3a3a3a;color:#ddd;font:11px monospace;display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:1200px;box-sizing:border-box">
${files.map(f => `<div style="width:140px"><div style="background:#fff;padding:6px;height:110px;display:grid;place-items:center"><img src="file:///${path.join(dir, f).replace(/\\/g, '/')}" style="max-width:128px;max-height:98px"></div>${f}</div>`).join('')}</body>`;
app.whenReady().then(async () => {
  const rows = Math.ceil(files.length / 8), h = rows * 140 + 16;
  const win = new BrowserWindow({ show: false, width: 1200, height: h, useContentSize: true, webPreferences: { offscreen: true, webSecurity: false } });
  const tmp = path.join(app.getPath('temp'), 'src-sheet.html'); fs.writeFileSync(tmp, html);
  await win.loadFile(tmp); await new Promise(r => setTimeout(r, 800));
  fs.writeFileSync(out, (await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: h })).toPNG());
  console.log('SHEET', out, files.length); fs.unlinkSync(tmp); app.exit(0);
});
