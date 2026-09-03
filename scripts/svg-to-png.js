// rasterize an svg to a transparent png at a given size, for scripts/trace-png.py.
//   npx electron scripts/svg-to-png.js <in.svg> <out.png> [size=1024]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const inp = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), size = +(process.argv[4] || 1024);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: size, height: size, useContentSize: true, transparent: true, webPreferences: { offscreen: true, webSecurity: false } });
  const html = `<!doctype html><style>html,body{margin:0;background:transparent;width:${size}px;height:${size}px;display:grid;place-items:center}img{max-width:${size}px;max-height:${size}px}</style><img src="file:///${inp.replace(/\\/g, '/')}">`;
  const tmp = path.join(app.getPath('temp'), 'svg2png.html'); fs.writeFileSync(tmp, html);
  await win.loadFile(tmp); await new Promise(r => setTimeout(r, 500));
  fs.writeFileSync(out, (await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })).toPNG());
  console.log('PNG', out); fs.unlinkSync(tmp); app.exit(0);
});
