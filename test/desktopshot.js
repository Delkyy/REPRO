// desktop-mode screenshots for design review. boots the real app, applies view state WITHOUT persisting it (config.json
// is restored on exit), captures the window.
//   npx electron test/desktopshot.js --out=sketches/x.png
//   --theme=billet        theme to render (default: whatever config says)
//   --detail              select the first game so the detail panel shows
//   --tab=launch|info     detail tab (with --detail)
//   --modal=settings      open a modal
//   --filter=unsorted|fav|recent|<sysid>|e:<emuid>
//   --view=list           list instead of grid
//   --empty               render the zero-games empty state
//   --hover=N             hover the Nth card (0-based) so its overlay shows
//   --w=1400 --h=860
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const cfgPath = path.join(ROOT, 'config.json'), cfgBackup = fs.readFileSync(cfgPath);
require('../src/main/main.js');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const out = path.resolve(arg('out', 'sketches/desktop-shot.png'));
app.whenReady().then(() => setTimeout(async () => {
  const w = BrowserWindow.getAllWindows()[0];
  w.setSize(+arg('w', 1400), +arg('h', 860));
  w.webContents.on('console-message', (e, level, msg, line, src) => { if (level >= 2) console.log('CONSOLE', msg, src.split('/').pop() + ':' + line); });
  await w.webContents.executeJavaScript(`(async () => {
    ${arg('theme') ? `setTheme(${JSON.stringify(arg('theme'))});` : ''}
    setMode('desktop');
    ${has('empty') ? 'S.games = []; S.unsorted = []; S.config.romDirs = [];' : ''}
    ${arg('filter') ? `filter = ${JSON.stringify(arg('filter'))};` : ''}
    ${arg('view') ? `view = ${JSON.stringify(arg('view'))}; document.querySelectorAll('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v == view));` : ''}
    renderAll();
    ${has('detail') ? "if (S.games[0]) { sel = S.games[0].id; " + (arg('tab') ? `window._openTab = ${JSON.stringify(arg('tab'))};` : '') + " renderAll(); }" : ''}
    ${arg('modal') === 'settings' ? 'openSettings();' : ''}
    ${arg('hover') ? `{ const c = document.querySelectorAll('.card')[${+arg('hover')}]; if (c) { c.classList.add('sel'); c.querySelector('.over').style.opacity = 1; } }` : ''}
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 1200));
  })()`);
  const img = await w.webContents.capturePage();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  console.log('SHOT', path.relative(ROOT, out), img.getSize());
  fs.writeFileSync(cfgPath, cfgBackup); // setTheme/setMode wrote prefs; put the user's config back
  app.exit(0);
}, 2200));
