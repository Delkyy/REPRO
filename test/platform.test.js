// platform layer tests. pure helpers take the os id / file contents as input, so windows AND linux behaviour
// is checked from whichever machine runs the suite.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const plat = require('../src/main/platform');

const REPO = path.join(__dirname, '..');
const recipe = id => JSON.parse(fs.readFileSync(path.join(REPO, 'recipes', id + '.json'), 'utf8'));

test('perOs: legacy flat arrays are windows-only, objects are per os', () => {
  assert.deepStrictEqual(plat.perOs(['a.exe'], 'win'), ['a.exe']);
  assert.deepStrictEqual(plat.perOs(['a.exe'], 'linux'), []);
  assert.deepStrictEqual(plat.perOs({ win: ['a.exe'], linux: ['a'] }, 'linux'), ['a']);
  assert.deepStrictEqual(plat.allOs({ win: ['a.exe'], linux: ['a'] }), ['a.exe', 'a']);
});

test('fillVars drops paths whose variable does not exist on this os (no more "{appdata}" -> "")', () => {
  const lin = plat.pathVars({ osId: 'linux', env: {}, home: '/home/d' });
  assert.strictEqual(plat.fillVars('{appdata}/xemu', lin), null);
  assert.strictEqual(plat.fillVars('{xdg_data}/duckstation', lin), '/home/d/.local/share/duckstation');
  assert.strictEqual(plat.fillVars('{var}/config/x', lin), null, '{var} only exists for flatpaks');
  const fp = plat.pathVars({ osId: 'linux', env: {}, home: '/home/d', flatpak: 'net.pcsx2.PCSX2' });
  assert.strictEqual(plat.fillVars('{var}/config/PCSX2', fp), '/home/d/.var/app/net.pcsx2.PCSX2/config/PCSX2');
  const xdg = plat.pathVars({ osId: 'linux', env: { XDG_CONFIG_HOME: '/cfg' }, home: '/home/d' });
  assert.strictEqual(plat.fillVars('{xdg_config}/PCSX2', xdg), '/cfg/PCSX2');
  const win = plat.pathVars({ osId: 'win', env: { APPDATA: 'C:\\Users\\d\\AppData\\Roaming' }, home: 'C:\\Users\\d' });
  assert.strictEqual(plat.fillVars('{appdata}/xemu', win), 'C:\\Users\\d\\AppData\\Roaming/xemu');
  assert.strictEqual(plat.fillVars('{xdg_data}/x', win), null);
});

test('launchSpec: native runs the binary, flatpak goes through flatpak run with sandbox holes', () => {
  assert.deepStrictEqual(plat.launchSpec('/usr/bin/dolphin-emu', ['--batch']), { cmd: '/usr/bin/dolphin-emu', args: ['--batch'], cwd: '/usr/bin' });
  const s = plat.launchSpec('flatpak:org.duckstation.DuckStation', ['-batch', '/roms/ps1/x.cue'], { roDirs: ['/roms/ps1'], extraDirs: ['/repro/saves'] });
  assert.strictEqual(s.cmd, 'flatpak');
  assert.deepStrictEqual(s.args, ['run', '--filesystem=/roms/ps1:ro', '--filesystem=/repro/saves', 'org.duckstation.DuckStation', '-batch', '/roms/ps1/x.cue']);
});

test('parseMounts: home + real data disks, never system mounts or "/"', () => {
  const mounts = [
    '/dev/sda2 / btrfs rw 0 0', '/dev/sda3 /home btrfs rw 0 0', '/dev/sda1 /boot ext4 rw 0 0',
    '/dev/sda0 /boot/efi vfat rw 0 0', 'proc /proc proc rw 0 0', 'tmpfs /tmp tmpfs rw 0 0',
    '/dev/sdb1 /mnt/backup ext4 rw 0 0', '/dev/sdc1 /run/media/d/ROMS\\040DRIVE exfat rw 0 0',
    '//nas/roms /mnt/nas cifs rw 0 0', '/dev/sdb2 /mnt/backup/inner ext4 rw 0 0', 'overlay /var/lib/docker overlay rw 0 0',
  ].join('\n');
  assert.deepStrictEqual(plat.parseMounts(mounts, '/home/d'), ['/home/d', '/mnt/backup', '/run/media/d/ROMS DRIVE', '/mnt/nas']);
});

test('userRoot: portable next to the program on both oses', () => {
  const base = { isPackaged: true, devRoot: '/repo', execPath: '/tmp/.mount_X/repro', home: '/home/d' };
  assert.strictEqual(plat.userRoot({ ...base, env: {}, isPackaged: false }), '/repo');
  assert.strictEqual(plat.userRoot({ ...base, osId: 'linux', env: { APPIMAGE: '/home/d/Apps/REPRO.AppImage' } }), '/home/d/Apps');
  assert.strictEqual(plat.userRoot({ ...base, osId: 'linux', env: {} }), '/home/d/.local/share/REPRO');
  assert.strictEqual(plat.userRoot({ ...base, osId: 'win', env: { PORTABLE_EXECUTABLE_DIR: 'D:\\REPRO' } }), 'D:\\REPRO');
  assert.strictEqual(plat.userRoot({ ...base, osId: 'win', env: { REPRO_ROOT: '/x' } }), path.resolve('/x'));
});

test('guide button: finds gamepads in /proc/bus/input/devices and decodes BTN_MODE presses', () => {
  const devs = `I: Bus=0003 Vendor=045e Product=0b12\nN: Name="Microsoft Xbox Controller"\nH: Handlers=event21 js0 \n\nI: Bus=0003\nN: Name="Corsair K68"\nH: Handlers=sysrq kbd leds event9 \n`;
  assert.deepStrictEqual(plat.parseInputDevices(devs), [{ event: '/dev/input/event21', name: 'Microsoft Xbox Controller' }]);
  const ev = (type, code, value) => { const b = Buffer.alloc(24); b.writeUInt16LE(type, 16); b.writeUInt16LE(code, 18); b.writeInt32LE(value, 20); return b; };
  const got = [...plat.parseInputEvents(Buffer.concat([ev(1, 0x13c, 1), ev(0, 0, 0), ev(1, 0x13c, 0)]))];
  assert.deepStrictEqual(got.map(e => [e.type, e.code, e.value]), [[1, 0x13c, 1], [0, 0, 0], [1, 0x13c, 0]]);
});

test('shipped recipes: every linux recipe has binary names + data dirs, flatpak ids look real', () => {
  for (const id of ['dolphin', 'duckstation', 'pcsx2', 'xemu']) {
    const r = recipe(id);
    assert.ok(plat.perOs(r.exe, 'win').length, `${id} win exe`);
    assert.ok(plat.perOs(r.exe, 'linux').length, `${id} linux exe`);
    assert.ok(plat.perOs(r.dataDirs, 'linux').some(d => d.includes('{var}')), `${id} has flatpak data dir`);
    assert.match(r.flatpak, /^[a-z]+\.[A-Za-z0-9-]+\.[A-Za-z0-9-]+$/i, `${id} flatpak id`);
    assert.ok(r.source.linux, `${id} cites where the linux paths came from`);
  }
  assert.deepStrictEqual(plat.perOs(recipe('xenia').exe, 'linux'), [], 'xenia stays windows-only');
});
