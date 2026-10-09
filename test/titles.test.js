// display names + junk classes, checked against real No-Intro names from Delk's library
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/main/titles');

test('names: region/language/revision tags go, articles come back to the front', () => {
  const cases = {
    'Legend of Zelda, The - A Link to the Past (USA) (Rev 1).7z': 'The Legend of Zelda - A Link to the Past',
    'Super Metroid (Japan, USA) (En,Ja).7z': 'Super Metroid',
    'Super Metroid (Japan) (En,Ja) (Virtual Console, Switch Online).7z': 'Super Metroid',
    'Addams Family, The - Pugsley\'s Scavenger Hunt (USA, Europe).7z': 'The Addams Family - Pugsley\'s Scavenger Hunt',
    'Pokemon - Red Version (USA, Europe) (SGB Enhanced).7z': 'Pokemon - Red Version',
    'Castlevania - The Adventure (USA) (Castlevania Anniversary Collection).7z': 'Castlevania - The Adventure',
    'Final Fantasy VII (USA) (Disc 2).chd': 'Final Fantasy VII · Disc 2',
    'Madden NFL 2004 (USA) (Player\'s Choice).iso': 'Madden NFL 2004 (Player\'s Choice)',
  };
  for (const [f, want] of Object.entries(cases)) assert.strictEqual(parse(f).name, want, f);
});

test('sort ignores a leading article', () => {
  assert.strictEqual(parse('Legend of Zelda, The - A Link to the Past (USA).7z').sort, 'legend of zelda - a link to the past');
});

test('junk classes', () => {
  const k = f => parse(f).kind;
  assert.strictEqual(k('150-in-1 Golden 1992 (Asia) (En) (Pirate).7z'), 'pirate');
  assert.strictEqual(k('10-Pin Bowling (USA) (Proto).7z'), 'proto');
  assert.strictEqual(k('F1 Challenge (Europe) (Beta).7z'), 'beta');
  assert.strictEqual(k('[BIOS] Nintendo Game Boy Boot ROM (World) (Rev 1).7z'), 'bios');
  assert.strictEqual(k('Game Boy Test Cartridge (USA, Europe) (Proto) (Test Program).7z'), 'test');
  assert.strictEqual(k('GameShark (USA) (Unl) [b].7z'), 'bad');
  assert.strictEqual(k('Super Metroid (Japan, USA) (En,Ja).7z'), null);
  assert.strictEqual(parse('Super Metroid (Japan, USA) (En,Ja).7z').junk, false);
  assert.strictEqual(parse('Bung Greetings Demo (World) (Demo) (Unl).7z').junk, true);
});

test('group: re-releases and betas of one game share a card, different discs and editions do not', () => {
  const g = f => parse(f).group;
  assert.strictEqual(g('Metroid (USA).7z'), g('Metroid (Europe) (Virtual Console).7z'));
  assert.strictEqual(g('Addams Family, The - Pugsley\'s Scavenger Hunt (USA, Europe).7z'), g('Addams Family, The - Pugsley\'s Scavenger Hunt (Europe) (Beta).7z'));
  assert.notStrictEqual(g('Final Fantasy VII (USA) (Disc 1).chd'), g('Final Fantasy VII (USA) (Disc 2).chd'));
  assert.notStrictEqual(g('Madden NFL 2004 (USA).iso'), g('Madden NFL 2004 (USA) (Player\'s Choice).iso'));
});

test('fan translations merge with the game, trainers are hacks', () => {
  const a = parse('Teenage Mutant Ninja Turtles 2 (Japan) [T-En by Rochet].7z');
  assert.strictEqual(a.name, 'Teenage Mutant Ninja Turtles 2');
  assert.strictEqual(a.trans, 'EN translation');
  assert.strictEqual(a.junk, false);
  assert.strictEqual(a.group, parse('Teenage Mutant Ninja Turtles 2 (USA).7z').group);
  assert.strictEqual(parse('Contra (USA) [t1].nes').kind, 'hack');
});

test('chinese translation packs: english name from the brackets, platform tag picks the console', () => {
  const a = parse('[恶魔城 晓月圆舞曲][キャッスルヴァニア 暁月の円舞曲][Castlevania Aria of Sorrow][20030508][GBA][汉化][GBA].zip');
  assert.strictEqual(a.name, 'Castlevania Aria of Sorrow'); assert.strictEqual(a.sysHint, 'gba'); assert.strictEqual(a.junk, false);
  const b = parse("[恶魔城Ⅱ 诅咒的封印][ドラキュラⅡ 呪いの封印][Castlevania Ⅱ Simon's Quest][19881201][FC][汉化][NES].zip");
  assert.strictEqual(b.name, "Castlevania II Simon's Quest"); assert.strictEqual(b.sysHint, 'nes');
  assert.strictEqual(parse('[恶魔城 迷宫的画廊][悪魔城ドラキュラ ギャラリーオブラビリンス][CastlevaniaPortrait of Ruin][20061116][NDS][汉化][NDS].zip').name, 'Castlevania Portrait of Ruin');
  assert.strictEqual(parse('[恶魔城 默示录外传][悪魔城ドラキュラ黙示録外伝 LEGEND OF CORNELL][Castlevania Legacy of Darkness][19991225][N64][汉化][EXE][高清整合安装版].zip').pc, true);
  assert.strictEqual(parse('[BIOS] Nintendo 64 - PIF (Europe).7z').kind, 'bios', 'normal [BIOS] prefix is not a pack');
});
