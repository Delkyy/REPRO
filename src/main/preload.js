const { contextBridge, ipcRenderer, webUtils } = require('electron');
const call = (name) => (...a) => ipcRenderer.invoke(name, ...a);
contextBridge.exposeInMainWorld('repro', {
  snapshot: call('snapshot'), detect: call('detect'), scan: call('scan'), launch: call('launch'),
  setEmulator: call('setEmulator'), addRomDir: call('addRomDir'), removeRomDir: call('removeRomDir'),
  setPref: call('setPref'), setGame: call('setGame'), pickFolder: call('pickFolder'), pickExe: call('pickExe'),
  showInFolder: call('showInFolder'), fullscreen: call('fullscreen'), root: call('root'), detectOne: call('detectOne'),
  themes: call('themes'), openPath: call('openPath'), launchEmu: call('launchEmu'),
  duplicates: call('duplicates'), saveView: call('saveView'), removeView: call('removeView'), createSystemFolder: call('createSystemFolder'),
  killRunning: call('killRunning'), isRunning: call('isRunning'), setHubKey: call('setHubKey'),
  listSlots: call('listSlots'), snapshotSave: call('snapshotSave'), restoreSave: call('restoreSave'),
  renameSlot: call('renameSlot'), deleteSlot: call('deleteSlot'), openSaveFolder: call('openSaveFolder'),
  quit: () => ipcRenderer.send('quit'),
  scrapeAll: call('scrapeAll'), scrapeOne: call('scrapeOne'),
  setIgdb: call('setIgdb'), generateM3u: call('generateM3u'), scrapeStatus: call('scrapeStatus'),
  onScrapeProgress: (fn) => ipcRenderer.on('scrape-progress', (_, d) => fn(d)),
  autoScanRoms: call('autoScanRoms'), recoverPaths: call('recoverPaths'),
  onScanProgress: (fn) => ipcRenderer.on('scan-progress', (_, d) => fn(d)),
  onMenu: (fn) => ipcRenderer.on('menu', (_, cmd, arg) => fn(cmd, arg)),
  pathOf: (file) => webUtils.getPathForFile(file),
  onGameExited: (fn) => ipcRenderer.on('game-exited', (_, d) => fn(d)),
});
