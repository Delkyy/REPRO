// type candidates, rendered in the real app: same three crops (couch hero, desktop header+sidebar, detail panel) under
// each display/body pairing, stacked into one sheet. type is just --display/--font on :root so nothing else moves.
//   npx electron test/typesheet.js            -> sketches/type-sheet.png
//   --theme=billet   palette to render under (default billet)
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const cfgPath = path.join(ROOT, 'config.json'), cfgBackup = fs.readFileSync(cfgPath);
require('../src/main/main.js');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

// all google fonts, OFL. gf = families param for the css2 api; display/body = the css stacks.
const CANDS = [
  { id: 'current', label: 'current: Unbounded + Sora', gf: 'Unbounded:wght@700;900&family=Sora:wght@400;500;600;700', display: '"Unbounded",sans-serif', body: '"Sora",system-ui,sans-serif' },
  { id: 'grotesk', label: 'Space Grotesk + Inter', gf: 'Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700', display: '"Space Grotesk",sans-serif', body: '"Inter",system-ui,sans-serif' },
  { id: 'archivo', label: 'Archivo Black + IBM Plex Sans', gf: 'Archivo+Black&family=IBM+Plex+Sans:wght@400;500;600;700', display: '"Archivo Black",sans-serif', body: '"IBM Plex Sans",system-ui,sans-serif' },
  { id: 'bricolage', label: 'Bricolage Grotesque + IBM Plex Sans', gf: 'Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600;700', display: '"Bricolage Grotesque",sans-serif', body: '"IBM Plex Sans",system-ui,sans-serif' },
  { id: 'chakra', label: 'Chakra Petch + Inter', gf: 'Chakra+Petch:wght@600;700&family=Inter:wght@400;500;600;700', display: '"Chakra Petch",sans-serif', body: '"Inter",system-ui,sans-serif' },
  { id: 'syne', label: 'Syne + Inter', gf: 'Syne:wght@700;800&family=Inter:wght@400;500;600;700', display: '"Syne",sans-serif', body: '"Inter",system-ui,sans-serif' },
  { id: 'outfit', label: 'Outfit + Outfit', gf: 'Outfit:wght@400;500;600;700', display: '"Outfit",sans-serif', body: '"Outfit",system-ui,sans-serif' },
  { id: 'barlow', label: 'Barlow Condensed + Barlow', gf: 'Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700', display: '"Barlow Condensed",sans-serif', body: '"Barlow",system-ui,sans-serif' },
];
const OUT = path.join(ROOT, 'sketches', 'type-shots'); fs.mkdirSync(OUT, { recursive: true });

app.whenReady().then(() => setTimeout(async () => {
  const w = BrowserWindow.getAllWindows()[0];
  w.setSize(1400, 860);
  await w.webContents.executeJavaScript(`(async () => { setTheme(${JSON.stringify(arg('theme', 'billet'))}); await new Promise(r => setTimeout(r, 800)); })()`);
  for (const c of CANDS) {
    await w.webContents.executeJavaScript(`(async () => {
      let l = document.getElementById('typeLink'); if (!l) { l = document.createElement('link'); l.id = 'typeLink'; l.rel = 'stylesheet'; document.head.appendChild(l); }
      l.href = 'https://fonts.googleapis.com/css2?family=${c.gf}&display=swap';
      let s = document.getElementById('typeOv'); if (!s) { s = document.createElement('style'); s.id = 'typeOv'; document.head.appendChild(s); }
      s.textContent = ':root{--display:${c.display.replace(/"/g, '\\"')};--font:${c.body.replace(/"/g, '\\"')}}';
      await new Promise(r => setTimeout(r, 400));
      await Promise.all([document.fonts.load('700 40px ' + ${JSON.stringify(c.display)}), document.fonts.load('400 13px ' + ${JSON.stringify(c.body)}), document.fonts.load('600 13px ' + ${JSON.stringify(c.body)})]);
      await document.fonts.ready;
    })()`);
    for (const [mode, setup] of [['couch', "setMode('couch'); { const i = cList.findIndex(id => /Mario Golf/.test(byId(id).title)); cSetFocus(i >= 0 ? i : 2); }"], ['desktop', "setMode('desktop'); if (S.games[0]) { sel = S.games[0].id; } renderAll();"]]) {
      await w.webContents.executeJavaScript(`(async () => { ${setup} await new Promise(r => setTimeout(r, 900)); })()`);
      const img = await w.webContents.capturePage();
      fs.writeFileSync(path.join(OUT, `${c.id}-${mode}.png`), img.toPNG());
    }
    console.log('TYPE', c.id, c.label);
  }
  fs.writeFileSync(path.join(OUT, 'cands.json'), JSON.stringify(CANDS.map(c => ({ id: c.id, label: c.label }))));
  fs.writeFileSync(cfgPath, cfgBackup);
  app.exit(0);
}, 2200));
