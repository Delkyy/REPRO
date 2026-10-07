// platform.js: everything that differs between Windows and Linux lives here, so main.js never says "C:\" or "taskkill".
// Pure helpers take their inputs as arguments (os id, file contents, env) so tests can exercise BOTH platforms from either one.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');

const OS = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const FLATPAK_PREFIX = 'flatpak:';

// ---------- recipes: per-OS fields
// legacy recipes have exe/dataDirs as flat arrays, which always meant Windows. new ones use { win: [...], linux: [...] }.
function perOs(field, osId = OS) {
  if (!field) return [];
  if (Array.isArray(field)) return osId === 'win' ? field : [];
  return field[osId] || [];
}
function allOs(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  return Object.values(field).flat();
}

// ---------- variables for recipe paths. a variable that doesn't apply on this OS resolves to null,
// and any path using a null variable is skipped (fixes "{appdata}" quietly becoming "" on Linux).
function pathVars({ osId = OS, env = process.env, home = os.homedir(), exe = null, flatpak = null } = {}) {
  const v = { home, exe, docs: path.join(home, 'Documents') };
  if (osId === 'win') {
    v.appdata = env.APPDATA || null;
    v.localappdata = env.LOCALAPPDATA || null;
  } else {
    v.xdg_config = env.XDG_CONFIG_HOME || path.join(home, '.config');
    v.xdg_data = env.XDG_DATA_HOME || path.join(home, '.local', 'share');
    v.var = flatpak ? path.join(home, '.var', 'app', flatpak) : null; // flatpak sandbox home for this app
  }
  return v;
}
function fillVars(s, vars) {
  let missing = false;
  const out = s.replace(/\{(\w+)\}/g, (_, k) => { const x = vars[k]; if (x == null || x === '') { missing = true; return ''; } return x; });
  return missing ? null : out;
}

// ---------- emulator handles: a real file path, or "flatpak:<app id>"
const isFlatpak = exe => typeof exe === 'string' && exe.startsWith(FLATPAK_PREFIX);
const flatpakId = exe => isFlatpak(exe) ? exe.slice(FLATPAK_PREFIX.length) : null;
function programDir(exe) {
  if (!exe) return null;
  if (isFlatpak(exe)) return path.join(os.homedir(), '.var', 'app', flatpakId(exe));
  return path.dirname(exe);
}
// how to actually start an emulator. extraDirs = folders the sandbox must be able to see (rom folder, REPRO saves).
function launchSpec(exe, args = [], { extraDirs = [], roDirs = [] } = {}) {
  if (isFlatpak(exe)) {
    const perms = [...roDirs.map(d => `--filesystem=${d}:ro`), ...extraDirs.map(d => `--filesystem=${d}`)];
    return { cmd: 'flatpak', args: ['run', ...perms, flatpakId(exe), ...args], cwd: os.homedir() };
  }
  return { cmd: exe, args, cwd: path.dirname(exe) };
}
// spawn an emulator. on posix it gets its own process group so we can kill everything it spawned.
function spawnEmu(exe, args, opts = {}) {
  const s = launchSpec(exe, args, opts);
  return spawn(s.cmd, s.args, { cwd: s.cwd, stdio: 'ignore', detached: OS !== 'win', ...(opts.spawn || {}) });
}
function killTree(pid, exe) {
  if (OS === 'win') { spawn('taskkill', ['/PID', String(pid), '/T', '/F']); return; }
  if (isFlatpak(exe)) execFile('flatpak', ['kill', flatpakId(exe)], () => {});
  const sig = s => { try { process.kill(-pid, s); return true; } catch { try { process.kill(pid, s); return true; } catch { return false; } } };
  if (sig('SIGTERM')) setTimeout(() => sig('SIGKILL'), 4000).unref?.();
}

// ---------- where to look for emulators
function emulatorSearchDirs({ osId = OS, home = os.homedir(), env = process.env } = {}) {
  if (osId === 'win') return [
    path.join(home, 'Documents'), path.join(home, 'Desktop'), path.join(home, 'Downloads'),
    (env.ProgramFiles || 'C:\\Program Files'), (env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'),
    path.join(home, 'AppData', 'Local', 'Programs'),
  ];
  return [
    path.join(home, 'Applications'), path.join(home, 'AppImages'), path.join(home, '.local', 'bin'),
    path.join(home, 'Emulation'), path.join(home, 'Games'), path.join(home, 'Desktop'), path.join(home, 'Downloads'), '/opt',
  ];
}
const pathDirs = (env = process.env) => (env.PATH || '').split(path.delimiter).filter(Boolean);
function isExecutable(p) {
  try { const st = fs.statSync(p); if (!st.isFile()) return false; if (OS === 'win') return true; fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; }
}
// installed flatpak app ids (user + system). empty on Windows or when flatpak isn't installed.
function listFlatpaks() {
  if (OS !== 'linux') return Promise.resolve(new Set());
  return new Promise(res => execFile('flatpak', ['list', '--app', '--columns=application'], { timeout: 8000 }, (err, out) =>
    res(err ? new Set() : new Set(String(out).split('\n').map(s => s.trim()).filter(Boolean)))));
}

// ---------- drives / mount points to deep-scan for roms
const REAL_FS = new Set(['ext2', 'ext3', 'ext4', 'btrfs', 'xfs', 'f2fs', 'zfs', 'bcachefs', 'ntfs', 'ntfs3', 'fuseblk', 'exfat', 'vfat', 'nfs', 'nfs4', 'cifs', 'smb3', 'fuse.sshfs']);
const SYSTEM_MOUNTS = /^\/(boot|efi|proc|sys|dev|run(?!\/media)|tmp|var|usr|etc|opt|snap|srv\/.*\.snapshots|\.snapshots)(\/|$)/;
// /proc/mounts → the folders a human keeps files in: home + anything mounted under /mnt, /media, /run/media, or elsewhere non-system.
// "/" itself is never walked whole; your home is the part of it that matters.
function parseMounts(text, home) {
  const roots = [home];
  for (const line of text.split('\n')) {
    const [, mnt, type] = line.split(/\s+/);
    if (!mnt || !REAL_FS.has(type)) continue;
    const m = mnt.replace(/\\040/g, ' ');
    if (m === '/' || m === '/home' || SYSTEM_MOUNTS.test(m)) continue;
    roots.push(m);
  }
  // drop roots nested inside another root, keep order
  const uniq = [...new Set(roots)];
  return uniq.filter(r => !uniq.some(o => o !== r && r.startsWith(o.endsWith(path.posix.sep) ? o : o + '/')));
}
async function listRoots() {
  if (OS === 'win') {
    // probe drive letters directly: wmic is gone on current Windows 11, and a stat per letter is instant
    const out = [];
    for (let c = 67; c <= 90; c++) { const d = String.fromCharCode(c) + ':\\'; try { await fs.promises.access(d); out.push(d); } catch {} }
    return out.length ? out : ['C:\\'];
  }
  let text = '';
  try { text = await fs.promises.readFile('/proc/mounts', 'utf8'); } catch {}
  return parseMounts(text, os.homedir());
}
// folder names never worth descending into while deep-scanning
const SKIP_DIRS = new Set(['Windows', '$RECYCLE.BIN', 'System Volume Information', 'Program Files', 'Program Files (x86)',
  'ProgramData', 'node_modules', 'AppData', '$Windows.~BT', '$Windows.~WS', 'Boot', 'Recovery', 'Config.Msi',
  'lost+found', 'proc', 'sys', 'dev', 'snap', 'site-packages', '__pycache__']);

// ---------- Linux controller Guide button: read evdev directly (no native module).
// joysticks are tagged uaccess by systemd, so the logged-in user can read their /dev/input/event* nodes.
const BTN_MODE = 0x13c, EV_KEY = 1;
// /proc/bus/input/devices → event nodes of devices that also have a js handler (i.e. gamepads)
function parseInputDevices(text) {
  const out = [];
  for (const block of text.split(/\n\s*\n/)) {
    const h = block.match(/^H: Handlers=(.*)$/m); if (!h) continue;
    const handlers = h[1].trim().split(/\s+/);
    if (!handlers.some(x => /^js\d+$/.test(x))) continue;
    const ev = handlers.find(x => /^event\d+$/.test(x)); if (!ev) continue;
    const name = (block.match(/^N: Name="(.*)"$/m) || [])[1] || ev;
    out.push({ event: '/dev/input/' + ev, name });
  }
  return out;
}
// struct input_event on 64-bit linux: timeval (16) + type u16 + code u16 + value s32 = 24 bytes
function* parseInputEvents(buf) {
  for (let o = 0; o + 24 <= buf.length; o += 24) yield { type: buf.readUInt16LE(o + 16), code: buf.readUInt16LE(o + 18), value: buf.readInt32LE(o + 20) };
}
function startLinuxGuideHook(onPress, log = console.warn) {
  const open = new Map(); // event path -> stream
  let warned = false;
  const sync = () => {
    let text = ''; try { text = fs.readFileSync('/proc/bus/input/devices', 'utf8'); } catch { return; }
    const want = new Set(parseInputDevices(text).map(d => d.event));
    for (const [p, s] of open) if (!want.has(p)) { s.destroy(); open.delete(p); }
    for (const p of want) {
      if (open.has(p)) continue;
      const s = fs.createReadStream(p, { highWaterMark: 24 * 64 });
      let rest = Buffer.alloc(0);
      s.on('data', chunk => {
        const buf = Buffer.concat([rest, chunk]); const n = buf.length - (buf.length % 24); rest = buf.subarray(n);
        for (const e of parseInputEvents(buf.subarray(0, n))) if (e.type === EV_KEY && e.code === BTN_MODE && e.value === 1) onPress();
      });
      s.on('error', err => { open.delete(p); if (!warned) { warned = true; log(`guide button: can't read ${p} (${err.code}). controller hotkey disabled.`); } });
      open.set(p, s);
    }
  };
  sync();
  const t = setInterval(sync, 3000); // hotplug
  return () => { clearInterval(t); for (const s of open.values()) s.destroy(); open.clear(); };
}

// where config/library/art/saves live. portable by design: next to the program the user launched.
//   windows portable exe: PORTABLE_EXECUTABLE_DIR (electron-builder sets it), else the exe's folder
//   linux AppImage:       the folder the .AppImage sits in (APPIMAGE env); the binary itself runs from a read-only mount
//   anything else installed read-only (deb/rpm/flatpak later): $XDG_DATA_HOME/REPRO
function userRoot({ isPackaged, devRoot, execPath, env = process.env, osId = OS, home = os.homedir() }) {
  if (env.REPRO_ROOT) return path.resolve(env.REPRO_ROOT);
  if (!isPackaged) return devRoot;
  if (osId === 'win') return env.PORTABLE_EXECUTABLE_DIR || path.dirname(execPath);
  if (env.APPIMAGE) return path.dirname(env.APPIMAGE);
  return path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'REPRO');
}

module.exports = {
  OS, userRoot, perOs, allOs, pathVars, fillVars, isFlatpak, flatpakId, programDir, launchSpec, spawnEmu, killTree,
  emulatorSearchDirs, pathDirs, isExecutable, listFlatpaks, parseMounts, listRoots, SKIP_DIRS,
  parseInputDevices, parseInputEvents, startLinuxGuideHook, FLATPAK_PREFIX,
};
