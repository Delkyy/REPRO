// REPRO renderer. talks to main via window.repro (see preload.js).
const $ = s => document.querySelector(s), body = document.body;
let S = { games: [], unsorted: [], emulators: {}, systems: {}, config: {} };
let filter = 'all', sel = null, focus = 0, couchList = [], rowsMeta = [], ROOT = '';
let THEMES = [];
const sysc = k => `style="--sysc:${S.sysdb?.[k]?.color || 'var(--accent)'}"`;
const logo = k => `<i class="logo" style="--m:url('${fileUrl(ROOT + '/assets/systems/' + k + '.svg')}')"></i>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = p => 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
const fmtPt = s => !s ? '—' : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
const fmtLast = t => { if (!t) return 'never'; const d = (Date.now() - t) / 864e5; return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 7 ? `${Math.floor(d)} days ago` : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const sysName = k => S.systems[k] || k;
const emuName = k => { for (const [id, e] of Object.entries(S.emulators)) if (e.systems?.includes(k)) return e.name; return RECIPE_SYS[k] || '—'; };
const RECIPE_SYS = { gc: 'Dolphin', wii: 'Dolphin', ps1: 'DuckStation', ps2: 'PCSX2', xbox: 'xemu', x360: 'xenia', pc: 'native' };
const byId = id => S.games.find(g => g.id === id);
const played = () => S.games.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed);

function artEl(g) { return g.art ? `<img src="${fileUrl(g.art)}" alt="">` : `<div class="noart">${esc(g.title)}<small>${esc(sysName(g.sys))} · no art yet</small></div>`; }

/* ---------- desktop ---------- */
function renderSide() {
  const counts = {}; S.games.forEach(g => counts[g.sys] = (counts[g.sys] || 0) + 1);
  const B = (f, ico, txt, n, dot) => `<button data-f="${f}" class="${filter == f ? 'on' : ''}"><span class="ico">${ico}</span>${dot ? `<span class="dot ${dot}"></span>` : ''}<span class="txt">${txt}</span><span class="n">${n}</span></button>`;
  let h = `<h4>Library</h4>${B('all', '▦', 'All games', S.games.length)}${B('recent', '▶', 'Continue', Math.min(6, played().length))}${B('fav', '★', 'Favorites', S.games.filter(g => g.fav).length)}<h4>Systems</h4>`;
  for (const k of Object.keys(S.systems)) if (counts[k]) h += `<button data-f="${k}" class="${filter == k ? 'on' : ''}" ${sysc(k)}><span class="ico sys">${logo(k)}</span><span class="txt">${esc(sysName(k))}${hasEmu(k) ? '' : ' <small style="color:var(--accent2)">no emu</small>'}</span><span class="n">${counts[k]}</span></button>`;
  h += `<h4>Emulators</h4>`;
  for (const [id, e] of Object.entries(S.emulators)) h += `<button data-f="emu:${id}" class="${filter == 'emu:' + id ? 'on' : ''}" ${sysc(e.systems[0])}><span class="ico sys">${logo(id)}</span><span class="txt">${esc(e.name)}</span><span class="n">${e.systems.map(x => x.toUpperCase()).join(' ')}</span></button>`;
  h += `<button data-f="__addemu"><span class="ico">+</span><span class="txt" style="color:var(--accent)">add emulator…</span></button>`;
  h += `<h4>Needs you</h4>${B('unsorted', '?', 'Unsorted', S.unsorted.length, S.unsorted.length ? 'warn' : 'ok')}`;
  $('#side').innerHTML = h;
  $('#side').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (b.dataset.f == '__addemu') return addExe(); filter = b.dataset.f; renderSide(); renderGrid(); });
}
const hasEmu = sys => Object.values(S.emulators).some(e => e.systems?.includes(sys) && e.exe);
function list() {
  const q = ($('#q').value || '').toLowerCase();
  let l = S.games.filter(g => !q || g.title.toLowerCase().includes(q));
  if (filter == 'fav') l = l.filter(g => g.fav);
  else if (filter == 'recent') l = played().slice(0, 6);
  else if (S.systems[filter]) l = l.filter(g => g.sys == filter);
  return l.sort((a, b) => filter == 'recent' ? 0 : a.title.localeCompare(b.title));
}
function renderGrid() {
  const names = { all: 'All games', fav: 'Favorites', recent: 'Continue', unsorted: 'Unsorted' };
  $('#title').textContent = names[filter] || sysName(filter);
  if (filter == 'unsorted') {
    $('#sub').textContent = S.unsorted.length ? 'found these but could not place them.' : 'nothing here. everything scanned has a home.';
    $('#grid').style.display = 'block';
    $('#grid').innerHTML = S.unsorted.map(u => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t">${esc(u.path.split(/[\\/]/).pop())}<small>${esc(u.why)} · ${esc(u.path)}</small></div><div class="act" style="opacity:1"><button data-open="${esc(u.path)}">show in folder</button></div></div>`).join('');
    $('#grid').querySelectorAll('[data-open]').forEach(b => b.onclick = () => repro.showInFolder(b.dataset.open));
    return;
  }
  if (filter.startsWith('emu:')) return renderEmu(filter.slice(4));
  const l = list();
  $('#grid').style.display = 'grid';
  $('#sub').textContent = `${l.length} games${S.systems[filter] ? ' · ' + emuName(filter) : ''}`;
  if (!l.length) $('#grid').innerHTML = `<div class="hint-empty">no games yet. hit <b>+</b> up top and point REPRO at a rom folder.</div>`;
  else $('#grid').innerHTML = l.map(g => `<div class="card ${sel == g.id ? 'sel' : ''}" data-id="${esc(g.id)}" ${sysc(g.sys)}>${artEl(g)}<span class="tag">${esc(g.sys.toUpperCase())}</span>${g.fav ? '<span class="fav">★</span>' : ''}${g.playtime ? `<span class="pt">${fmtPt(g.playtime)}</span>` : ''}</div>`).join('');
  $('#grid').querySelectorAll('.card').forEach(c => { c.onclick = () => { sel = c.dataset.id; renderGrid(); renderDetail(); $('#detail').classList.add('open'); }; c.ondblclick = () => launch(c.dataset.id); });
}
function renderEmu(id) {
  const e = S.emulators[id]; if (!e) { filter = 'all'; return renderGrid(); }
  $('#title').innerHTML = `${logo(id)} ${esc(e.name)}`;
  $('#sub').textContent = `${e.systems.map(sysName).join(', ')} · ${S.games.filter(g => e.systems.includes(g.sys)).length} games`;
  $('#grid').style.display = 'block';
  $('#grid').innerHTML = `
    <div class="row" style="margin:0 0 18px"><button class="btn primary" style="width:auto" id="eLaunch">▶ Open ${esc(e.name)}</button><button class="btn" id="eChange">change exe…</button></div>
    <div class="sect"><h5>Files</h5>
    ${e.folders.map(f => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t"><b>${esc(f.label)}</b><small>${esc(f.path)}</small></div><div class="act" style="opacity:1"><button data-open="${esc(f.path)}">open folder</button></div></div>`).join('')}
    <div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t"><b>exe</b><small>${esc(e.exe)}</small></div><div class="act" style="opacity:1"><button data-show="${esc(e.exe)}">show in folder</button></div></div>
    </div>
    <div class="sect"><h5>Launch args (from recipes/${id}.json)</h5><div class="kv">${e.systems.map(k => `<span>${esc(sysName(k))}</span><code>${esc((S.recipeArgs?.[id]?.[k] || ['{rom}']).join(' '))}</code>`).join('')}</div></div>`;
  $('#eLaunch').onclick = () => repro.launchEmu(id);
  $('#eChange').onclick = async () => { const p = await repro.pickExe(); if (p) { S = await repro.setEmulator({ id, exe: p }); renderAll(); } };
  $('#grid').querySelectorAll('[data-open]').forEach(b => b.onclick = () => repro.openPath(b.dataset.open));
  $('#grid').querySelectorAll('[data-show]').forEach(b => b.onclick = () => repro.showInFolder(b.dataset.show));
}
async function addExe() { const p = await repro.pickExe(); if (!p) return; const r = await repro.detectOne(p); if (!r) return toast(`no recipe matches <b>${esc(p.split(/[\\/]/).pop())}</b>. custom emulators come in M4.`); S = await repro.setEmulator({ id: r.recipe, exe: p }); toast(`added <b>${esc(r.name)}</b>`); renderAll(); }
function renderDetail() {
  const g = byId(sel); if (!g) { $('#detail').innerHTML = '<div class="empty">pick a game</div>'; return; }
  const emu = emuName(g.sys), ok = hasEmu(g.sys);
  $('#detail').style.cssText = `--sysc:${S.sysdb?.[g.sys]?.color || 'var(--accent)'}`;
  $('#detail').innerHTML = `
  <button class="icon close" id="dClose">✕</button>
  <div class="hero">${g.art ? `<div class="bd"><img src="${fileUrl(g.art)}"></div>` : ''}<div class="cover">${artEl(g)}</div></div>
  <div class="body">
    <h3>${esc(g.title)}</h3>
    <div class="badges"><span class="badge sys">${logo(g.sys)} ${esc(sysName(g.sys))}</span><span class="badge">${fmtPt(g.playtime)} played</span><span class="badge">last ${fmtLast(g.lastPlayed)}</span>${g.fav ? '<span class="badge">★ fav</span>' : ''}</div>
    <button class="btn primary" id="dPlay" ${ok ? '' : 'disabled style="opacity:.5"'}>▶ Play${ok ? '' : ' (no emulator set)'}</button>
    <div class="row"><button class="btn" id="dFav">★ ${g.fav ? 'Unfavorite' : 'Favorite'}</button><button class="btn" id="dFolder">▣ Folder</button></div>
    <div class="sect"><h5>Saves</h5><div class="hint-empty">save manager is milestone 2.</div></div>
    <div class="sect"><h5>Launch</h5>
      <div class="kv">
        <span>emulator</span><code>${esc(emu)}</code>
        <span>rom</span><code title="${esc(g.path)}">${esc(g.file)}</code>
      </div>
    </div>
  </div>`;
  $('#dClose').onclick = () => $('#detail').classList.remove('open');
  $('#dPlay').onclick = () => launch(g.id);
  $('#dFav').onclick = () => toggleFav(g.id);
  $('#dFolder').onclick = () => repro.showInFolder(g.path);
}
async function toggleFav(id) { const g = byId(id); const r = await repro.setGame({ id, patch: { fav: !g.fav } }); Object.assign(g, r); toast(g.fav ? 'added to favorites' : 'removed from favorites'); renderAll(); }

/* ---------- couch ---------- */
function renderCouch() {
  const rows = []; const cont = played().slice(0, 8); if (cont.length) rows.push({ k: 'continue', n: 'Continue', items: cont });
  for (const k of Object.keys(S.systems)) { const it = S.games.filter(g => g.sys == k).sort((a, b) => a.title.localeCompare(b.title)); if (it.length) rows.push({ k, n: sysName(k), items: it }); }
  couchList = []; rowsMeta = [];
  if (!rows.length) { $('#inner').innerHTML = `<div class="hint-empty" style="padding:20px 48px">no games yet. press ⚙ to set up.</div>`; $('#hero').innerHTML = ''; return; }
  $('#inner').innerHTML = rows.map((r, ri) => `<div class="crow" data-ri="${ri}" ${r.k == 'continue' ? '' : sysc(r.k)}><h3>${r.k == 'continue' ? '' : logo(r.k)}<b>${esc(r.n)}</b> ${r.items.length}</h3><div class="strip">${r.items.map(g => { couchList.push(g.id); rowsMeta.push(ri); return `<div class="tile" data-id="${esc(g.id)}" ${sysc(g.sys)}>${artEl(g)}</div>`; }).join('')}</div></div>`).join('');
  $('#rows').querySelectorAll('.tile[data-id]').forEach((t, i) => { t.onmouseenter = () => setFocus(i); t.onclick = () => { if (focus == i) openOv(); else setFocus(i); }; });
  setFocus(Math.min(focus, couchList.length - 1));
}
let bgFlip = false;
function setFocus(i) {
  const tiles = [...$('#rows').querySelectorAll('.tile[data-id]')]; if (!tiles.length) return;
  focus = Math.max(0, Math.min(tiles.length - 1, i));
  tiles.forEach(t => t.classList.remove('focus')); const t = tiles[focus]; t.classList.add('focus');
  const ri = rowsMeta[focus], crows = [...$('#rows').querySelectorAll('.crow')];
  const inner = $('#inner'), padTop = parseFloat(getComputedStyle(inner).paddingTop);
  inner.style.transform = `translateY(-${crows[ri].offsetTop - padTop}px)`;
  crows.forEach((c, k) => { c.classList.toggle('dim', k > ri); c.classList.toggle('gone', k < ri); });
  const strip = t.parentElement, pad = parseFloat(getComputedStyle(strip).paddingLeft);
  const maxX = Math.max(0, strip.scrollWidth - $('#rows').clientWidth);
  strip.style.transform = `translateX(-${Math.min(maxX, Math.max(0, t.offsetLeft - pad - t.offsetWidth * 0.07))}px)`;
  const g = byId(couchList[focus]);
  const h = $('#hero'); h.style.cssText = `--sysc:${S.sysdb?.[g.sys]?.color || 'var(--accent)'}`; h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap');
  h.innerHTML = `<div class="sys">${logo(g.sys)} ${esc(sysName(g.sys))} · ${esc(emuName(g.sys))}</div><h1>${esc(g.title)}</h1><div class="meta"><span>${fmtPt(g.playtime)} played</span><span>last: ${fmtLast(g.lastPlayed)}</span>${g.fav ? '<span>★</span>' : ''}</div><div class="hint"><span class="p">▶ Play</span><span>★</span></div>`;
  const a = $('#bgA'), b = $('#bgB'), nxt = bgFlip ? a : b, cur = bgFlip ? b : a; bgFlip = !bgFlip;
  nxt.style.backgroundImage = g.art ? `url("${fileUrl(g.art)}")` : 'none';
  nxt.classList.add('on'); cur.classList.remove('on');
}
function openOv() {
  const g = byId(couchList[focus]); if (!g) return;
  $('#ov').style.cssText = `--sysc:${S.sysdb?.[g.sys]?.color || 'var(--accent)'}`;
  $('#ov').innerHTML = `<div class="box">${g.art ? `<img class="big" src="${fileUrl(g.art)}">` : `<div class="noart">no art yet</div>`}
   <div class="body"><h2>${esc(g.title)}</h2><div class="badges"><span class="badge sys">${logo(g.sys)} ${esc(sysName(g.sys))}</span><span class="badge">${fmtPt(g.playtime)} played</span><span class="badge">${esc(emuName(g.sys))}</span></div>
   <div class="big-btns"><button class="btn primary f" style="width:auto" id="ovPlay">▶ Play</button><button class="btn" id="ovFav">★</button></div>
   <div class="desc">${esc(g.file)}</div></div></div>`;
  $('#ovPlay').onclick = () => launch(g.id); $('#ovFav').onclick = () => toggleFav(g.id);
  $('#ov').classList.add('open');
}
async function launch(id) {
  const g = byId(id); $('#ov').classList.remove('open');
  const r = await repro.launch(id);
  if (r.error) return toast(`<b>can't launch:</b> ${esc(r.error)}`);
  toast(`launching <b>${esc(g.title)}</b> with ${esc(emuName(g.sys))}`);
}
repro.onGameExited(async ({ gameId, secs }) => { await refresh(); const g = byId(gameId); toast(`back. <b>${esc(g?.title)}</b>, ${fmtPt(secs)} this session.`); });

/* ---------- setup screen ---------- */
async function openSetup(firstRun) {
  const el = $('#setup'); el.classList.add('open');
  el.innerHTML = `<div class="wrap"><h1>REP<b>RO</b> ${firstRun ? 'setup' : 'settings'}</h1><p>${firstRun ? 'looking for emulators on this pc…' : 'emulators and rom folders. everything here is saved to config.json next to the app.'}</p><div id="setupBody"><div class="hint-empty">scanning…</div></div></div>`;
  const found = await repro.detect();
  renderSetup(found, firstRun);
}
function renderSetup(found, firstRun) {
  const emus = { ...S.emulators };
  for (const f of found) if (!emus[f.recipe]?.exe) emus[f.recipe] = { exe: f.exe, name: f.name, detected: true };
  const emuRows = Object.entries(emus).map(([id, e]) => `<div class="slot"><div class="dot ${e.exe ? 'ok' : 'warn'}"></div><div class="t"><b>${esc(e.name || id)}</b>${e.detected && !S.emulators[id]?.exe ? ' <small style="display:inline;color:var(--accent)">found</small>' : ''}<small>${esc(e.exe || 'not found')}</small></div><div class="act"><button data-exe="${id}">change…</button></div></div>`).join('');
  const known = ['dolphin', 'pcsx2', 'duckstation', 'xemu', 'xenia'].filter(k => !emus[k]);
  const dirRows = (S.config.romDirs || []).map(r => `<div class="slot"><div class="dot ok"></div><div class="t">${esc(r.path)}<small>${r.system ? 'forced: ' + esc(sysName(r.system)) : 'system guessed per file'}</small></div><div class="act"><button data-rm="${esc(r.path)}">remove</button></div></div>`).join('');
  $('#setupBody').innerHTML = `
    <div class="sect"><h5>Emulators</h5>${emuRows || '<div class="hint-empty">none found. click add and point me at the exe.</div>'}
      ${known.length ? `<div class="hint-empty">not found: ${known.join(', ')}. <button class="btn" id="addExe" style="padding:4px 10px;font-size:12px">add exe…</button></div>` : `<button class="btn" id="addExe" style="margin-top:6px">add another exe…</button>`}</div>
    <div class="sect"><h5>Rom folders</h5>${dirRows || '<div class="hint-empty">none yet.</div>'}<button class="btn" id="addDir" style="margin-top:6px">+ add folder…</button></div>
    <div class="foot"><button class="btn primary" id="setupDone">${firstRun ? "looks right, let's go" : 'done'}</button><span style="color:var(--muted);font-size:12px">config: ${esc(ROOT)}\\config.json</span></div>`;
  const useFound = async () => { for (const f of found) if (!S.emulators[f.recipe]?.exe) S = await repro.setEmulator({ id: f.recipe, exe: f.exe }); };
  $('#setupBody').querySelectorAll('[data-exe]').forEach(b => b.onclick = async () => { const p = await repro.pickExe(); if (p) { S = await repro.setEmulator({ id: b.dataset.exe, exe: p }); renderSetup(found, firstRun); } });
  $('#addExe').onclick = async () => { const p = await repro.pickExe(); if (!p) return; const r = await repro.detectOne(p); if (!r) return toast(`no recipe matches <b>${esc(p.split(/[\\/]/).pop())}</b>. custom emulators come in M4.`); S = await repro.setEmulator({ id: r.recipe, exe: p }); renderSetup(found, firstRun); };
  $('#addDir').onclick = async () => { const d = await repro.pickFolder(); if (d) { await useFound(); S = await repro.addRomDir({ dir: d }); renderSetup(found, firstRun); } };
  $('#setupBody').querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { S = await repro.removeRomDir(b.dataset.rm); renderSetup(found, firstRun); });
  $('#setupDone').onclick = async () => { await useFound(); S = await repro.scan(); $('#setup').classList.remove('open'); renderAll(); };
}

/* ---------- glue ---------- */
function setMode(m) { body.dataset.mode = m; $('#modeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m == m)); repro.setPref({ mode: m }); if (m == 'couch') renderCouch(); }
function setUI(u) { body.dataset.ui = u; $('#uiSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.u == u)); repro.setPref({ ui: u }); if (body.dataset.mode == 'couch') requestAnimationFrame(() => setFocus(focus)); }
function setTheme(t) { body.dataset.theme = t; $('#themeCss').href = `../../themes/${t}/theme.css`; document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x.dataset.t == t)); repro.setPref({ theme: t }); }
async function loadThemes() { THEMES = await repro.themes(); $('#themeSwatches').innerHTML = THEMES.map(t => `<button class="swatch" data-t="${t.id}" title="${esc(t.name)}: ${esc(t.description || '')}" style="background:${t.swatch}"></button>`).join(''); document.querySelectorAll('.swatch').forEach(s => s.onclick = () => setTheme(s.dataset.t)); }
$('#modeSeg').querySelectorAll('button').forEach(b => b.onclick = () => setMode(b.dataset.m));
$('#uiSeg').querySelectorAll('button').forEach(b => b.onclick = () => setUI(b.dataset.u));
$('#q').oninput = () => renderGrid();
$('#btnSetup').onclick = () => openSetup(false);
repro.onMenu((cmd, arg) => {
  ({ addRomDir: () => $('#btnAdd').click(), addExe, rescan: () => $('#btnRescan').click(), setup: () => openSetup(false), search: () => { setMode('desktop'); $('#q').focus(); },
     mode: () => setMode(arg), theme: () => setTheme(arg), ui: () => setUI(arg) })[cmd]?.();
});
$('#btnAdd').onclick = async () => { const d = await repro.pickFolder(); if (d) { S = await repro.addRomDir({ dir: d }); toast(`added <b>${esc(d)}</b>`); renderAll(); } };
$('#btnRescan').onclick = async () => { S = await repro.scan(); toast(`rescanned: ${S.games.length} games`); renderAll(); };
let tt; function toast(h) { const t = $('#toast'); t.innerHTML = h; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3000); }
window.addEventListener('resize', () => { if (body.dataset.mode == 'couch') setFocus(focus); });
document.addEventListener('keydown', e => {
  if ($('#setup').classList.contains('open')) return;
  if (e.target.tagName == 'INPUT') { if (e.key == 'Escape') e.target.blur(); return; }
  if (e.key == '/') { e.preventDefault(); $('#q').focus(); return; }
  if (e.key == 'Tab') { e.preventDefault(); setMode(body.dataset.mode == 'couch' ? 'desktop' : 'couch'); return; }
  if (e.key == 'F11') { fs = !fs; repro.fullscreen(fs); return; }
  if (body.dataset.mode != 'couch') { if (e.key == 'Escape') $('#detail').classList.remove('open'); return; }
  if ($('#ov').classList.contains('open')) { if (e.key == 'Escape' || e.key == 'Backspace') $('#ov').classList.remove('open'); if (e.key == 'Enter') launch(couchList[focus]); return; }
  couchKey(e.key);
});
let fs = false;
function couchKey(key) {
  const n = couchList.length; if (!n) return; const ri = rowsMeta[focus];
  const rowStart = r => rowsMeta.indexOf(r), rowLen = r => rowsMeta.filter(x => x == r).length;
  if (key == 'ArrowRight' && rowsMeta[focus + 1] == ri) setFocus(focus + 1);
  if (key == 'ArrowLeft' && rowsMeta[focus - 1] == ri) setFocus(focus - 1);
  if (key == 'ArrowDown' || key == 'ArrowUp') { const r2 = ri + (key == 'ArrowDown' ? 1 : -1); if (rowStart(r2) < 0) return; const col = focus - rowStart(ri); setFocus(rowStart(r2) + Math.min(col, rowLen(r2) - 1)); }
  if (key == 'Enter') openOv();
  if (key == 'x') setFocus(Math.floor(Math.random() * n));
  if (key == 'y') toggleFav(couchList[focus]);
  if (key == 't') setUI(body.dataset.ui == 'tv' ? 'desk' : 'tv');
}
// gamepad: standard mapping (https://w3c.github.io/gamepad/#remapping). A=0 B=1 X=2 Y=3, dpad 12-15, left stick axes 0/1
let padPrev = {}, padHeld = 0;
function pollPad() {
  const gp = navigator.getGamepads?.()[0];
  if (gp && body.dataset.mode == 'couch' && !$('#setup').classList.contains('open')) {
    const b = i => gp.buttons[i]?.pressed, ax = gp.axes;
    const now = { up: b(12) || ax[1] < -.5, down: b(13) || ax[1] > .5, left: b(14) || ax[0] < -.5, right: b(15) || ax[0] > .5, a: b(0), bb: b(1), x: b(2), y: b(3), sel: b(8) };
    const edge = k => now[k] && !padPrev[k];
    const ovOpen = $('#ov').classList.contains('open');
    if (ovOpen) { if (edge('a')) launch(couchList[focus]); if (edge('bb')) $('#ov').classList.remove('open'); }
    else {
      const rep = (k, key) => { if (now[k] && (edge(k) || padHeld > 18 && padHeld % 5 == 0)) couchKey(key); };
      rep('up', 'ArrowUp'); rep('down', 'ArrowDown'); rep('left', 'ArrowLeft'); rep('right', 'ArrowRight');
      if (edge('a')) openOv(); if (edge('x')) couchKey('x'); if (edge('y')) couchKey('y'); if (edge('sel')) setMode('desktop');
    }
    padHeld = (now.up || now.down || now.left || now.right) ? padHeld + 1 : 0;
    padPrev = now;
  } else if (gp && edgeAny(gp) && body.dataset.mode == 'desktop') { setMode('couch'); }
  requestAnimationFrame(pollPad);
}
function edgeAny(gp) { const any = gp.buttons.some(b => b.pressed); const r = any && !padPrev.any; padPrev.any = any; return r; }
$('#ov').onclick = e => { if (e.target.id == 'ov') $('#ov').classList.remove('open'); };
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); body.classList.add('dragging'); }));
document.addEventListener('dragleave', e => { if (e.relatedTarget == null) body.classList.remove('dragging'); });
document.addEventListener('drop', async e => {
  e.preventDefault(); body.classList.remove('dragging');
  const f = e.dataTransfer.files[0]; if (!f) return;
  const p = (window.repro.pathOf ? repro.pathOf(f) : f.path) || '';
  if (!p) return toast('could not read the dropped path');
  if (/\.exe$/i.test(p)) toast('emulator exes: use ⚙ setup → change… for now');
  else { S = await repro.addRomDir({ dir: p.replace(/[\\/][^\\/]+\.\w+$/, '') }); toast(`added folder for <b>${esc(f.name)}</b>`); renderAll(); }
});
setInterval(() => $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 1000);

function renderAll() { renderSide(); renderGrid(); renderDetail(); if (body.dataset.mode == 'couch') renderCouch(); }
async function refresh() { S = await repro.snapshot(); renderAll(); }
(async () => {
  ROOT = await repro.root(); await loadThemes();
  S = await repro.snapshot();
  const c = S.config || {};
  setTheme(THEMES.some(t => t.id == c.theme) ? c.theme : 'billet'); if (c.ui) setUI(c.ui);
  renderAll();
  if (c.mode == 'couch') setMode('couch');
  if (!S.games.length && !(c.romDirs || []).length) openSetup(true);
  pollPad();
})();
