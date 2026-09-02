// headless smoke test: detect + scan without a window.
//   npx electron test/smoke.js --smoke --dir="C:\path\to\roms"
const { app } = require('electron');
const M = require('../src/main/main.js');
app.whenReady().then(async () => {
  const found = await M.detectEmulators();
  console.log('DETECT'); for (const f of found) console.log(' ', f.recipe.padEnd(12), f.exe, '| data:', f.dataDir);
  for (const f of found) M.config.emulators[f.recipe] = { exe: f.exe, dataDir: f.dataDir };
  const dirs = process.argv.filter(a => a.startsWith('--dir=')).map(a => a.slice(6));
  M.config.romDirs = dirs.map(d => ({ path: d, system: null }));
  M.saveConfig();
  const s = await M.scanLibrary();
  console.log('GAMES', s.games.length);
  for (const g of s.games) console.log(' ', g.sys.padEnd(5), g.title, g.art ? '[art]' : '');
  console.log('UNSORTED'); for (const u of s.unsorted) console.log(' ', u.path.split(/[\\/]/).pop(), '::', u.why);
  app.exit(0);
});
