const { contextBridge, ipcRenderer, webUtils } = require('electron');
const call = (name) => (...a) => ipcRenderer.invoke(name, ...a);
contextBridge.exposeInMainWorld('repro', {
  snapshot: call('snapshot'), detect: call('detect'), scan: call('scan'), launch: call('launch'),
  setEmulator: call('setEmulator'), addRomDir: call('addRomDir'), removeRomDir: call('removeRomDir'),
  setPref: call('setPref'), setGame: call('setGame'), pickFolder: call('pickFolder'), pickExe: call('pickExe'),
  showInFolder: call('showInFolder'), fullscreen: call('fullscreen'), root: call('root'), detectOne: call('detectOne'),
  pathOf: (file) => webUtils.getPathForFile(file),
  onGameExited: (fn) => ipcRenderer.on('game-exited', (_, d) => fn(d)),
});
