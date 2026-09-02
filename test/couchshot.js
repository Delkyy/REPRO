// couch mode screenshot for design review. boots the real app, focuses a tile, captures the window.
//   npx electron test/couchshot.js --focus=3 --out=sketches/couch-after.png
//   --desktop     shoot desktop mode instead
//   --w=1400 --h=860   window size (default 1400x860, the app's default)
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
require('../src/main/main.js');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const focus = +arg('focus', 0), out = path.resolve(arg('out', 'sketches/couch-shot.png'));
const desktop = process.argv.includes('--desktop');
app.whenReady().then(() => setTimeout(async () => {
  const w = BrowserWindow.getAllWindows()[0];
  w.setSize(+arg('w', 1400), +arg('h', 860));
  w.webContents.on('console-message', (e, level, msg, line, src) => { if (level >= 2) console.log('CONSOLE', msg, src.split('/').pop() + ':' + line); });
  await w.webContents.executeJavaScript(`(async () => {
    setMode(${desktop ? "'desktop'" : "'couch'"});
    ${desktop ? '' : `cSetFocus(${focus});`}
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 900)); // let art + fades settle
  })()`);
  const img = await w.webContents.capturePage();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  console.log('SHOT', out, img.getSize());
  app.exit(0);
}, 2200));
