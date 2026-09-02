const { app, BrowserWindow } = require('electron');
require('../src/main/main.js');
app.whenReady().then(() => setTimeout(() => {
  const w = BrowserWindow.getAllWindows()[0];
  w.webContents.on('console-message', (e, level, msg, line, src) => console.log('CONSOLE', level, msg, src.split('/').pop() + ':' + line));
  w.webContents.reload();
  setTimeout(async () => { console.log('GRID', await w.webContents.executeJavaScript('document.querySelectorAll(".card").length')); app.exit(0); }, 3000);
}, 1500));
