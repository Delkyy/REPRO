// REPRO renderer. talks to main via window.repro (see preload.js). layout ported from sketches/002-desktop.
const $ = s => document.querySelector(s), app = $('#app');
let S = { games: [], unsorted: [], emulators: {}, systems: {}, sysdb: {}, config: {} };
let filter = 'all', sel = null, view = 'grid', ROOT = '';
let cFocus = 0, cList = [], cRows = [];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = p => 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
const fmtPt = s => !s ? '—' : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
const fmtLast = t => { if (!t) return 'never'; const d = (Date.now() - t) / 864e5; return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 7 ? `${Math.floor(d)} days ago` : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const sysName = k => S.systems[k] || k;
const sysColor = k => S.sysdb?.[k]?.color || null;
const sysc = k => sysColor(k) ? `style="--sysc:${sysColor(k)}"` : '';
const sysStyle = k => sysColor(k) ? `--sysc:${sysColor(k)}` : '';
const logo = k => `<i class="lg" style="--m:url('${fileUrl(ROOT + '/assets/systems/' + k + '.svg')}')"></i>`;
const emuFor = k => Object.entries(S.emulators).find(([id, e]) => e.systems?.includes(k))?.[1];
const emuName = k => emuFor(k)?.name || 'no emulator';
const hasEmu = k => !!emuFor(k)?.exe;
const byId = id => S.games.find(g => g.id === id);
const played = () => S.games.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed);
let tt; function toast(h) { const t = $('#toast'); t.innerHTML = h; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3000); }

function artEl(g) { return g.art ? `<img src="${fileUrl(g.art)}" alt="">` : `<div class="noart">${logo(g.sys)}${esc(g.title)}<small>no art yet</small></div>`; }

/* ---------- saved views: {id,name,filter:{sys,fav,q}} ---------- */
function matchView(g, v) { if (v.sys && g.sys !== v.sys) return false; if (v.fav && !g.fav) return false; if (v.q && !g.title.toLowerCase().includes(v.q.toLowerCase())) return false; return true; }

/* ---------- sidebar ---------- */
function renderSide() {
  const counts = {}; S.games.forEach(g => counts[g.sys] = (counts[g.sys] || 0) + 1);
  const it = (f, k, txt, n, extra = '') => `<button class="it ${filter == f ? 'on' : ''}" data-f="${f}" ${sysc(k)}>${k ? logo(k) : ''}<span class="tx">${txt}</span>${extra}<span class="n">${n ?? ''}</span></button>`;
  let h = `<details open><summary>Library</summary>
    ${it('all', null, 'All games', S.games.length)}
    ${it('recent', null, 'Continue', Math.min(8, played().length))}
    ${it('fav', null, 'Favorites', S.games.filter(g => g.fav).length)}
  </details>`;
  const sysKeys = Object.keys(S.systems).filter(k => counts[k]);
  if (sysKeys.length) h += `<details open><summary>Systems</summary>
    ${sysKeys.map(k => it(k, k, sysName(k), counts[k], hasEmu(k) ? '' : '<span class="warn" title="no emulator set up"></span>')).join('')}
  </details>`;
  const views = S.config.views || [];
  h += `<details open><summary>Views<span class="a" id="newView">+ save</span></summary>
    ${views.map(v => it('v:' + v.id, null, v.name, S.games.filter(g => matchView(g, v)).length)).join('') || '<div class="hint" style="padding:4px 8px">filter, then \u201c+ save\u201d to pin it here.</div>'}
  </details>`;
  const emuIds = Object.keys(S.emulators);
  h += `<details><summary>Emulators</summary>
    ${emuIds.map(id => `<button class="it ${filter == 'e:' + id ? 'on' : ''}" data-f="e:${id}" ${sysc(S.emulators[id].systems?.[0])}>${logo(id)}<span class="tx">${esc(S.emulators[id].name)}</span></button>`).join('')}
    <button class="it add" id="addEmuBtn">${logo('pc')}<span class="tx">add emulator…</span></button>
  </details>`;
  if (S.unsorted.length) h += `<details open><summary>Needs you</summary>${it('unsorted', null, 'Unsorted', S.unsorted.length, '<span class="warn"></span>')}</details>`;
  $('#side').innerHTML = h;
  $('#side').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; renderSide(); renderMain(); });
  $('#addEmuBtn').onclick = addExe;
  const nv = $('#newView'); if (nv) nv.onclick = e => { e.stopPropagation(); saveCurrentView(); };
}
async function saveCurrentView() {
  const name = prompt('name this view:'); if (!name) return;
  const v = { id: 'v' + Date.now(), name, filter: {} };
  if (S.systems[filter]) v.filter = { sys: filter }; else if (filter == 'fav') v.filter = { fav: true };
  const q = $('#q').value; if (q) v.filter.q = q;
  v.sys = v.filter.sys; v.fav = v.filter.fav; v.q = v.filter.q;
  S = await repro.saveView(v); toast(`saved view <b>${esc(name)}</b>`); renderAll();
}

/* ---------- main: grid / list / empty / unsorted / emulator page ---------- */
function list() {
  const q = ($('#q').value || '').toLowerCase();
  let l = S.games.filter(g => !q || g.title.toLowerCase().includes(q));
  if (filter == 'fav') l = l.filter(g => g.fav);
  else if (filter == 'recent') l = played().slice(0, 8);
  else if (S.systems[filter]) l = l.filter(g => g.sys == filter);
  else if (filter.startsWith('v:')) { const v = (S.config.views || []).find(x => x.id == filter.slice(2)); if (v) l = l.filter(g => matchView(g, v)); }
  else if (filter.startsWith('e:')) { const sysList = S.emulators[filter.slice(2)]?.systems || []; l = l.filter(g => sysList.includes(g.sys)); }
  return l.sort((a, b) => filter == 'recent' ? 0 : a.title.localeCompare(b.title));
}
function renderMain() {
  if (filter == 'unsorted') return renderUnsorted();
  if (filter.startsWith('e:')) return renderEmu(filter.slice(2));
  const l = list();
  $('#count').textContent = `${l.length} / ${S.games.length}`;
  if (!l.length) return renderEmpty();
  const names = { all: 'All games', fav: 'Favorites', recent: 'Continue' };
  const name = S.systems[filter] ? `${logo(filter)}${esc(sysName(filter))}` : names[filter] || (S.config.views || []).find(v => 'v:' + v.id == filter)?.name || filter;
  const sub = `${l.length} games` + (S.systems[filter] ? ` · ${esc(emuName(filter))}` : '');
  $('#main').innerHTML = `<h2>${name}</h2><div class="sub">${sub}</div><div class="${view == 'list' ? 'list' : 'grid'}" id="items"></div>`;
  const box = $('#items');
  if (view == 'list') {
    box.innerHTML = l.map(g => `<div class="lrow ${sel == g.id ? 'sel' : ''}" data-id="${esc(g.id)}" ${sysc(g.sys)}>
      <div class="th">${g.art ? `<img src="${fileUrl(g.art)}">` : ''}</div>${logo(g.sys)}
      <span class="t">${esc(g.title)}</span>${g.fav ? '<span class="fav">★</span>' : ''}<span class="m">${fmtPt(g.playtime)}</span></div>`).join('');
  } else {
    box.innerHTML = l.map(g => `<div class="card ${sel == g.id ? 'sel' : ''}" data-id="${esc(g.id)}" ${sysc(g.sys)}>
      ${artEl(g)}${g.fav ? '<span class="fav">★</span>' : ''}${g.emulator ? '<span class="badge">ALT EMU</span>' : ''}
      ${g.playtime ? `<div class="pb"><i style="width:${Math.min(100, g.playtime / 36)}%"></i></div>` : ''}<div class="sysb"></div>
      <div class="over"><b>${esc(g.title)}</b><div class="acts"><button class="p" data-play="${esc(g.id)}">▶ Play</button><button class="cog" data-cog="${esc(g.id)}" title="settings">⚙</button></div></div></div>`).join('');
  }
  box.querySelectorAll('[data-id]').forEach(c => c.onclick = e => {
    if (e.target.closest('[data-play]')) return launch(c.dataset.id);
    sel = c.dataset.id; if (e.target.closest('[data-cog]')) window._openTab = 'launch';
    renderMain(); renderDetail(); app.classList.remove('nodetail');
  });
}
function renderEmpty() {
  const s = S.systems[filter];
  const emu = s ? emuFor(filter) : null;
  const msg = emu?.exe ? `REPRO found ${esc(emu.name)} but nothing to run on it.<br>point it at a folder, or make one in the REPRO folder and drop roms in.`
    : s ? `no emulator set up for this system yet.<br>add one, or drop roms in anyway for when you do.`
    : `nothing here yet. hit <b>+</b> up top and point REPRO at a rom folder.`;
  $('#count').textContent = `0 / ${S.games.length}`;
  $('#main').innerHTML = `<div class="empty"><div class="box"><h3>no ${s ? esc(sysName(filter)) + ' ' : ''}games yet</h3><p>${msg}</p><div class="btns">
    ${emu?.exe ? `<button class="p" id="eAddFolder">add rom folder…</button>` : s ? `<button class="p" id="eAddEmu">add emulator…</button>` : `<button class="p" id="eAddFolder">add rom folder…</button>`}
    ${s ? `<button id="eCreate">create roms/${filter}/</button>` : ''}<button id="eWhat">what files work?</button></div></div></div>`;
  const af = $('#eAddFolder'); if (af) af.onclick = () => $('#railAdd').click();
  const ae = $('#eAddEmu'); if (ae) ae.onclick = addExe;
  const ec = $('#eCreate'); if (ec) ec.onclick = async () => { S = await repro.createSystemFolder(filter); toast(`created <b>roms/${filter}/</b> and opened it`); renderAll(); };
  const ew = $('#eWhat'); if (ew) ew.onclick = () => { const r = Object.values(recipeSysExt(filter)); toast(s ? `${esc(sysName(filter))} files: <b>${(S.sysdb[filter]?.ext || []).join(' ')}</b>` : 'pick a system on the left first'); };
}
function recipeSysExt(sys) { return S.sysdb[sys]?.ext || []; }
function renderUnsorted() {
  $('#count').textContent = `${S.unsorted.length} unsorted`;
  $('#main').innerHTML = `<h2>Unsorted</h2><div class="sub">${S.unsorted.length ? 'found these but could not place them' : 'nothing here, everything scanned has a home'}</div>
    <div id="items">${S.unsorted.map(u => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t">${esc(u.path.split(/[\\/]/).pop())}<small>${esc(u.why)} · ${esc(u.path)}</small></div><div class="act" style="opacity:1"><button data-open="${esc(u.path)}">show in folder</button></div></div>`).join('')}</div>`;
  $('#main').querySelectorAll('[data-open]').forEach(b => b.onclick = () => repro.showInFolder(b.dataset.open));
}
function renderEmu(id) {
  const e = S.emulators[id]; if (!e) { filter = 'all'; return renderMain(); }
  $('#count').textContent = '';
  $('#main').innerHTML = `<h2>${logo(id)}${esc(e.name)}</h2><div class="sub">${(e.systems || []).map(sysName).join(', ')} · ${S.games.filter(g => e.systems?.includes(g.sys)).length} games</div>
    <div id="items">
    <div class="btnrow" style="margin:0 0 18px"><button class="p" id="eLaunch" style="flex:none;padding:9px 16px;background:var(--accent);color:#fff;border:0">▶ Open ${esc(e.name)}</button><button id="eChange" style="flex:none">change exe…</button></div>
    <div class="pane" style="padding:0"><h5>Files</h5>
    ${(e.folders || []).map(f => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t"><b>${esc(f.label)}</b><small>${esc(f.path)}</small></div><div class="act" style="opacity:1"><button data-open="${esc(f.path)}">open folder</button></div></div>`).join('')}
    <div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t"><b>exe</b><small>${esc(e.exe)}</small></div><div class="act" style="opacity:1"><button data-show="${esc(e.exe)}">show in folder</button></div></div>
    <h5>Launch args (recipes/${id}.json)</h5><div class="kv">${(e.systems || []).map(k => `<span>${esc(sysName(k))}</span><code>${esc((S.recipeArgs?.[id]?.[k] || ['{rom}']).join(' '))}</code>`).join('')}</div>
    </div></div>`;
  $('#eLaunch').onclick = () => repro.launchEmu(id);
  $('#eChange').onclick = async () => { const p = await repro.pickExe(); if (p) { S = await repro.setEmulator({ id, exe: p }); renderAll(); } };
  $('#main').querySelectorAll('[data-open]').forEach(b => b.onclick = () => repro.openPath(b.dataset.open));
  $('#main').querySelectorAll('[data-show]').forEach(b => b.onclick = () => repro.showInFolder(b.dataset.show));
}
async function addExe() { const p = await repro.pickExe(); if (!p) return; const r = await repro.detectOne(p); if (!r) return toast(`no recipe matches <b>${esc(p.split(/[\\/]/).pop())}</b>. custom emulators come in M4.`); S = await repro.setEmulator({ id: r.recipe, exe: p }); toast(`added <b>${esc(r.name)}</b>`); renderAll(); }

/* ---------- detail panel ---------- */
function renderDetail() {
  const g = byId(sel); if (!g) { $('#detail').innerHTML = ''; return; }
  const ok = hasEmu(g.sys); const emu = g.emulator ? S.emulators[g.emulator] : emuFor(g.sys);
  const tab = window._openTab || 'saves'; window._openTab = null;
  const panes = {
    saves: `<div id="savesPane"><div class="hint">loading…</div></div>`,
    launch: `<div class="kv">
        <span>emulator</span><select id="lEmu">${Object.entries(S.emulators).filter(([id, e]) => e.systems?.includes(g.sys)).map(([id, e]) => `<option value="${id}" ${g.emulator ? g.emulator == id : emuFor(g.sys) === e ? 'selected' : ''}>${esc(e.name)}${!g.emulator && emuFor(g.sys) === e ? ' (default)' : ''}</option>`).join('')}</select>${g.emulator ? '<span class="ovr">OVERRIDE</span>' : ''}
        <span>rom</span><code title="${esc(g.path)}">${esc(g.file)}</code>
      </div>
      <div class="btnrow"><button id="lSave">save</button>${g.emulator ? `<button id="lReset">reset to default</button>` : ''}</div>`,
    info: `<div class="kv"><span>title</span><code>${esc(g.title)}</code><span>system</span><code>${esc(sysName(g.sys))}</code><span>file</span><code title="${esc(g.path)}">${esc(g.file)}</code></div>
      <div class="hint" style="margin-top:10px">metadata scraping is milestone 5.</div>`,
  };
  $('#detail').innerHTML = `
   <div class="banner" ${sysc(g.sys)}>${g.art ? `<div class="bd" style="background-image:url('${fileUrl(g.art)}')"></div>` : ''}${logo(g.sys)}<button class="icon cog" id="dCog">⚙</button></div>
   <div class="head"><div class="cover">${g.art ? `<img src="${fileUrl(g.art)}">` : ''}</div><h3>${esc(g.title)}</h3></div>
   <div class="playbar"><button class="play" id="dPlay" ${ok ? '' : 'disabled'}>▶ Play${ok ? '' : ' (no emulator)'}</button>
     <div class="st"><span>last played</span><b>${fmtLast(g.lastPlayed)}</b></div><div class="st"><span>playtime</span><b>${fmtPt(g.playtime)}</b></div></div>
   <div class="links"><button id="dFav">★ ${g.fav ? 'unfavorite' : 'favorite'}</button><button id="dFolder">▣ folder</button><button id="dTabSaves">⛁ saves</button><button id="dTabLaunch2">⛭ launch</button></div>
   <div class="tabs">${['saves', 'launch', 'info'].map(t => `<button class="${tab == t ? 'on' : ''}" data-t="${t}">${t}${t == 'launch' && g.emulator ? '<span class="n" style="color:var(--accent2)">alt</span>' : ''}</button>`).join('')}</div>
   <div class="pane">${panes[tab]}</div>`;
  $('#dPlay').onclick = () => launch(g.id);
  $('#dFav').onclick = () => toggleFav(g.id);
  $('#dFolder').onclick = () => repro.showInFolder(g.path);
  const df2 = $('#dFolder2'); if (df2) df2.onclick = () => repro.showInFolder(g.path);
  $('#dCog').onclick = () => { window._openTab = 'launch'; renderDetail(); };
  const dts = $('#dTabSaves'); if (dts) dts.onclick = () => { window._openTab = 'saves'; renderDetail(); };
  $('#dTabLaunch2').onclick = () => { window._openTab = 'launch'; renderDetail(); };
  $('#detail').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { window._openTab = b.dataset.t; renderDetail(); });
  if (tab === 'saves') loadSavesTab(g);
  const lSave = $('#lSave'); if (lSave) lSave.onclick = async () => {
    const chosen = $('#lEmu').value; const isDefault = emuFor(g.sys) === S.emulators[chosen];
    const patch = { emulator: isDefault ? null : chosen }; const r = await repro.setGame({ id: g.id, patch }); Object.assign(g, r); toast('saved launch settings'); renderAll();
  };
  const lReset = $('#lReset'); if (lReset) lReset.onclick = async () => { const r = await repro.setGame({ id: g.id, patch: { emulator: null } }); Object.assign(g, r); toast('reset to default emulator'); renderAll(); };
}
async function toggleFav(id) { const g = byId(id); const r = await repro.setGame({ id, patch: { fav: !g.fav } }); Object.assign(g, r); toast(g.fav ? 'added to favorites' : 'removed from favorites'); renderAll(); }

async function loadSavesTab(g) {
  const slots = await repro.listSlots(g.id);
  const pane = $('#savesPane'); if (!pane) return;
  const fmtSize = b => b > 1e6 ? (b/1e6).toFixed(1)+'MB' : b > 1e3 ? (b/1e3).toFixed(0)+'KB' : b+'B';
  const fmtDate = ms => new Date(ms).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  pane.innerHTML = `
    <div class="btnrow" style="margin-bottom:12px">
      <button id="sSave" title="snapshot current save now">+ snapshot now</button>
      <button id="sFolder" title="open save folder in explorer">▣ folder</button>
    </div>
    ${slots.length ? slots.map(sl => `
    <div class="slot ${sl.isAuto?'auto':''}" data-file="${esc(sl.file)}">
      <div class="sh" style="background:${sl.isActive ? 'var(--accent)' : sl.isAuto ? '#3a3a44' : 'linear-gradient(135deg,#3a4a7a,#1f2b4d)'}"></div>
      <div class="t">
        <b>${sl.isActive ? 'active (live)' : sl.isAuto ? sl.file.slice(5,-1-sl.file.split('.').pop().length) : sl.file.replace(/\.[^.]+$/,'')}</b>
        <small>${fmtDate(sl.mtime)} · ${fmtSize(sl.size)}</small>
      </div>
      <div class="act">
        ${sl.isActive ? '' : `<button data-restore="${esc(sl.file)}">restore</button>`}
        ${sl.isActive ? '' : `<button data-rename="${esc(sl.file)}">rename</button>`}
        ${sl.isActive || sl.isAuto ? '' : `<button data-del="${esc(sl.file)}" style="color:var(--accent)">✕</button>`}
      </div>
    </div>`).join('') : `<div class="hint">no saves yet — play the game and REPRO will snapshot automatically before each launch.</div>`}`;
  $('#sSave').onclick = async () => { const r = await repro.snapshotSave(g.id); if (r.error) toast(`<b>error:</b> ${esc(r.error)}`); else { toast('snapshot taken'); loadSavesTab(g); } };
  $('#sFolder').onclick = () => repro.openSaveFolder(g.id);
  pane.querySelectorAll('[data-restore]').forEach(b => b.onclick = async () => {
    const r = await repro.restoreSave({ id: g.id, file: b.dataset.restore });
    if (r.error) toast(`<b>restore failed:</b> ${esc(r.error)}`); else { toast('restored. restart the game to play it.'); loadSavesTab(g); }
  });
  pane.querySelectorAll('[data-rename]').forEach(b => b.onclick = async () => {
    const cur = b.dataset.rename.replace(/\.[^.]+$/,'');
    const from = b.dataset.rename;
    const gen = ++modalGen;
    $('#modal').innerHTML = `<div class="box" style="max-width:460px"><div class="mh"><h3>Rename save</h3><button class="icon" id="mClose">✕</button></div><div class="mb"><div class="kv"><span>name</span><input id="rnInput" value="${esc(cur)}" style="max-width:280px"></div><div class="btnrow" style="margin-top:12px"><button id="rnSave" style="background:var(--accent);color:#fff;border-color:transparent">rename</button></div></div></div>`;
    $('#mClose').onclick = () => { if (gen !== modalGen) return; modalGen++; $('#modal').classList.remove('open'); };
    $('#rnSave').onclick = async () => {
      if (gen !== modalGen) return;
      const nw = $('#rnInput').value.trim(); if (!nw || nw === cur) { modalGen++; $('#modal').classList.remove('open'); return; }
      const r = await repro.renameSlot({ id: g.id, from, to: nw });
      if (r.error) toast(`<b>error:</b> ${esc(r.error)}`); else { modalGen++; $('#modal').classList.remove('open'); loadSavesTab(g); }
    };
    $('#modal').classList.add('open');
  });
  pane.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const r = await repro.deleteSlot({ id: g.id, file: b.dataset.del });
    if (r.error) toast(`<b>error:</b> ${esc(r.error)}`); else { toast('deleted'); loadSavesTab(g); }
  });
}
async function launch(id) { const g = byId(id); const r = await repro.launch(id); if (r.error) return toast(`<b>can't launch:</b> ${esc(r.error)}`); toast(`launching <b>${esc(g.title)}</b>`); }
repro.onGameExited(async ({ gameId, secs }) => { await refresh(); const g = byId(gameId); toast(`back. <b>${esc(g?.title)}</b>, ${fmtPt(secs)} this session.`); });

/* ---------- couch mode (ported from sketch 001) ---------- */
function renderCouch() {
  const rows = []; const cont = played().slice(0, 8); if (cont.length) rows.push({ k: 'continue', n: 'Continue', items: cont });
  for (const k of Object.keys(S.systems)) { const it = S.games.filter(g => g.sys == k).sort((a, b) => a.title.localeCompare(b.title)); if (it.length) rows.push({ k, n: sysName(k), items: it }); }
  cList = []; cRows = [];
  if (!rows.length) { $('#cinner').innerHTML = `<div class="hint" style="padding:20px 48px">no games yet. switch to desktop and hit +.</div>`; $('#chero').innerHTML = ''; return; }
  $('#cinner').innerHTML = rows.map((r, ri) => `<div class="crow" data-ri="${ri}" ${r.k == 'continue' ? '' : sysc(r.k)} data-skin="${S.sysdb?.[r.k]?.skin || ''}"><h3>${r.k == 'continue' ? '' : logo(r.k)}<b>${esc(r.n)}</b> ${r.items.length}</h3><div class="strip">${r.items.map(g => { cList.push(g.id); cRows.push(ri); return `<div class="ctile" data-id="${esc(g.id)}" ${r.k == 'continue' ? sysc(g.sys) : ''}>${artEl(g)}</div>`; }).join('')}</div></div>`).join('');
  $('#crows').querySelectorAll('.ctile[data-id]').forEach((t, i) => { t.onmouseenter = () => cSetFocus(i); t.onclick = () => { if (cFocus == i) cOpen(); else cSetFocus(i); }; });
  cSetFocus(Math.min(cFocus, cList.length - 1));
}
let bgFlip = false;
function cSetFocus(i) {
  const tiles = [...$('#crows').querySelectorAll('.ctile[data-id]')]; if (!tiles.length) return;
  cFocus = Math.max(0, Math.min(tiles.length - 1, i));
  tiles.forEach(t => t.classList.remove('focus')); const t = tiles[cFocus]; t.classList.add('focus');
  const ri = cRows[cFocus], crows = [...$('#crows').querySelectorAll('.crow')];
  const inner = $('#cinner'), padTop = parseFloat(getComputedStyle(inner).paddingTop);
  inner.style.transform = `translateY(-${crows[ri].offsetTop - padTop}px)`;
  crows.forEach((c, k) => { c.classList.toggle('dim', k > ri); c.classList.toggle('gone', k < ri); });
  const strip = t.parentElement, pad = parseFloat(getComputedStyle(strip).paddingLeft);
  const maxX = Math.max(0, strip.scrollWidth - $('#crows').clientWidth);
  strip.style.transform = `translateX(-${Math.min(maxX, Math.max(0, t.offsetLeft - pad - t.offsetWidth * 0.07))}px)`;
  const g = byId(cList[cFocus]);
  const h = $('#chero'); h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap'); h.setAttribute('style', sysStyle(g.sys));
  h.innerHTML = `<div class="sys">${logo(g.sys)}${esc(sysName(g.sys))} · ${esc(emuName(g.sys))}</div><h1>${esc(g.title)}</h1><div class="meta"><span>${fmtPt(g.playtime)} played</span><span>last: ${fmtLast(g.lastPlayed)}</span>${g.fav ? '<span>★</span>' : ''}</div><div class="hint"><span class="p">▶ Play</span><span>★</span></div>`;
  const a = $('#bgA'), b = $('#bgB'), nxt = bgFlip ? a : b, cur = bgFlip ? b : a; bgFlip = !bgFlip;
  nxt.style.backgroundImage = g.art ? `url("${fileUrl(g.art)}")` : 'none';
  nxt.classList.add('on'); cur.classList.remove('on');
  const skin = S.sysdb?.[g.sys]?.skin;
  const ck = $('#cskin'); if (skin) { ck.dataset.skin = skin; ck.classList.add('on'); } else { ck.classList.remove('on'); }
  $('#couchwrap').classList.toggle('hasskin', !!skin);
}
function cOpen() {
  const g = byId(cList[cFocus]); if (!g) return;
  $('#cov').innerHTML = `<div class="box" ${sysc(g.sys)}>${g.art ? `<img class="big" src="${fileUrl(g.art)}">` : `<div class="noart">no art yet</div>`}
   <div class="body"><h2>${esc(g.title)}</h2><div class="meta" style="display:flex;gap:14px;color:var(--muted);font-size:13px">${logo(g.sys)}<span>${esc(sysName(g.sys))}</span><span>${fmtPt(g.playtime)} played</span><span>${esc(emuName(g.sys))}</span></div>
   <div class="big-btns"><button class="btn p" id="ovPlay">▶ Play</button><button class="btn" id="ovFav">★</button></div></div></div>`;
  $('#ovPlay').onclick = () => { launch(g.id); $('#cov').classList.remove('open'); };
  $('#ovFav').onclick = () => toggleFav(g.id);
  $('#cov').classList.add('open');
}
function cKey(key) {
  const n = cList.length; if (!n) return; const ri = cRows[cFocus];
  const rowStart = r => cRows.indexOf(r), rowLen = r => cRows.filter(x => x == r).length;
  if (key == 'ArrowRight' && cRows[cFocus + 1] == ri) cSetFocus(cFocus + 1);
  if (key == 'ArrowLeft' && cRows[cFocus - 1] == ri) cSetFocus(cFocus - 1);
  if (key == 'ArrowDown' || key == 'ArrowUp') { const r2 = ri + (key == 'ArrowDown' ? 1 : -1); if (rowStart(r2) < 0) return; const col = cFocus - rowStart(ri); cSetFocus(rowStart(r2) + Math.min(col, rowLen(r2) - 1)); }
  if (key == 'Enter') cOpen();
  if (key == 'x') cSetFocus(Math.floor(Math.random() * n));
  if (key == 'y') toggleFav(cList[cFocus]);
}

/* ---------- mode / panels / theme ---------- */
function setMode(m) { app.classList.toggle('couch', m == 'couch'); repro.setPref({ mode: m }); if (m == 'couch') renderCouch(); }
function setTheme(t) { app.dataset.theme = t; $('#themeCss').href = `../../themes/${t}/theme.css`; repro.setPref({ theme: t }); }
function setUI(u) { document.documentElement.style.setProperty('--u', u == 'tv' ? 1.5 : 1); repro.setPref({ ui: u }); }
function setPanel(which, on) { app.classList.toggle(which == 'side' ? 'noside' : 'nodetail', !on); const p = { ...(S.config.panels || {}) }; p[which] = on; repro.setPref({ panels: p }); }

/* ---------- modals: settings / duplicates ---------- */
let modalGen = 0;
async function openSettings() {
  const gen = ++modalGen;
  $('#modal').innerHTML = `<div class="box"><div class="mh"><h3>Settings</h3><button class="icon" id="mClose">✕</button></div><div class="mb"><div class="hint">scanning for emulators…</div></div></div>`;
  $('#mClose').onclick = () => $('#modal').classList.remove('open');
  $('#modal').classList.add('open');
  const found = await repro.detect();
  if (gen !== modalGen || !$('#modal').classList.contains('open')) return; // dialog moved on or closed while we were scanning
  const emus = { ...S.emulators };
  for (const f of found) if (!emus[f.recipe]?.exe) emus[f.recipe] = { exe: f.exe, name: f.name, detected: true };
  const emuRows = Object.entries(emus).map(([id, e]) => `<div class="slot"><div class="sh" style="background:${e.exe ? '#3ddc84' : 'var(--accent2)'}"></div><div class="t"><b>${esc(e.name || id)}</b>${e.detected && !S.emulators[id]?.exe ? ' <small style="color:var(--accent2)">found, not added</small>' : ''}<small>${esc(e.exe || 'not set')}</small></div><div class="act" style="opacity:1"><button data-exe="${id}" data-found="${esc(e.exe || '')}">${e.detected && !S.emulators[id]?.exe ? 'add' : 'change…'}</button></div></div>`).join('');
  const dirRows = (S.config.romDirs || []).map(r => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t">${esc(r.path)}<small>${r.system ? 'forced: ' + esc(sysName(r.system)) : 'system guessed per file'}</small></div><div class="act" style="opacity:1"><button data-rm="${esc(r.path)}">remove</button></div></div>`).join('');
  $('#modal').innerHTML = `<div class="box"><div class="mh"><h3>Settings</h3><button class="icon" id="mClose">✕</button></div><div class="mb">
    <h5>Emulators</h5>${emuRows || '<div class="hint">none found.</div>'}<button class="btnrow" id="mAddExe" style="margin-top:8px;display:block;padding:7px 12px;border:1px solid var(--line);border-radius:6px">add exe…</button>
    <h5 style="margin-top:16px">Rom folders</h5>${dirRows || '<div class="hint">none yet.</div>'}<button id="mAddDir" style="margin-top:8px;display:block;padding:7px 12px;border:1px solid var(--line);border-radius:6px">+ add folder…</button>
    <h5 style="margin-top:16px">Config</h5><div class="hint">everything lives next to the app: ${esc(ROOT)}</div>
    <h5 style="margin-top:16px">Hub key</h5><div class="hint">press <code style="background:var(--panel);padding:2px 6px;border-radius:4px">${esc(S.config.hubKey || 'Ctrl+Alt+H')}</code>${S.config.hubKeyOk === false ? ' <b style="color:var(--accent2)">— not registered, another app has this combo</b>' : ''} anywhere, even with the emulator focused, to close the running game and jump back to REPRO. map a controller's Guide/Home button to it in Windows or Steam Input for a one-button "back to hub". <button id="mHubKey" style="margin-top:6px;display:block;padding:6px 10px;border:1px solid var(--line);border-radius:6px">change…</button></div>
    </div></div>`;
  $('#mClose').onclick = () => $('#modal').classList.remove('open');
  $('#modal').querySelectorAll('[data-exe]').forEach(b => b.onclick = async () => { const found2 = b.dataset.found; const p = found2 || await repro.pickExe(); if (p) { S = await repro.setEmulator({ id: b.dataset.exe, exe: p }); openSettings(); } });
  $('#mAddExe').onclick = addExe;
  const mhk = $('#mHubKey'); if (mhk) mhk.onclick = () => changeHubKey(openSettings);
  $('#mAddDir').onclick = async () => { const d = await repro.pickFolder(); if (d) { S = await repro.addRomDir({ dir: d }); openSettings(); renderAll(); } };
  $('#modal').querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { S = await repro.removeRomDir(b.dataset.rm); openSettings(); renderAll(); });
}
async function openDuplicates() {
  const gen = ++modalGen;
  $('#modal').innerHTML = `<div class="box"><div class="mh"><h3>Duplicates</h3><button class="icon" id="mClose">✕</button></div><div class="mb"><div class="hint">scanning…</div></div></div>`;
  $('#mClose').onclick = () => $('#modal').classList.remove('open');
  $('#modal').classList.add('open');
  const dupes = await repro.duplicates();
  if (gen !== modalGen || !$('#modal').classList.contains('open')) return;
  $('#modal').innerHTML = `<div class="box"><div class="mh"><h3>Duplicates</h3><button class="icon" id="mClose">✕</button></div><div class="mb">
    ${dupes.length ? dupes.map(group => `<div class="slot" style="flex-direction:column;align-items:stretch"><b style="margin-bottom:6px">${esc(group[0].title)} (${esc(sysName(group[0].sys))})</b>${group.map(g => `<div class="slot"><div class="sh" style="background:var(--bg)"></div><div class="t"><small>${esc(g.path)}</small></div><div class="act" style="opacity:1"><button data-open="${esc(g.path)}">show</button></div></div>`).join('')}</div>`).join('') : '<div class="hint">no duplicates found. good scan.</div>'}
    </div></div>`;
  $('#mClose').onclick = () => $('#modal').classList.remove('open');
  $('#modal').querySelectorAll('[data-open]').forEach(b => b.onclick = () => repro.showInFolder(b.dataset.open));
}

/* ---------- glue ---------- */
$('#tSide').onclick = () => setPanel('side', app.classList.contains('noside'));
$('#tDetail').onclick = () => setPanel('detail', app.classList.contains('nodetail'));
$('#btnCouch').onclick = () => setMode('couch');
$('#railAdd').onclick = async () => { const d = await repro.pickFolder(); if (d) { S = await repro.addRomDir({ dir: d }); toast(`added <b>${esc(d)}</b>`); renderAll(); } };
$('#railSettings').onclick = openSettings;
$('#zoom').oninput = e => document.documentElement.style.setProperty('--cw', e.target.value + 'px');
$('#q').oninput = () => renderMain();
$('#viewSeg').querySelectorAll('button').forEach(b => b.onclick = () => { view = b.dataset.v; $('#viewSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x == b)); renderMain(); });
document.querySelectorAll('.rail [data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('.rail [data-f]').forEach(x => x.classList.toggle('on', x == b)); renderSide(); renderMain(); });
$('#cov').onclick = e => { if (e.target.id == 'cov') $('#cov').classList.remove('open'); };
$('#modal').onclick = e => { if (e.target.id == 'modal') { modalGen++; $('#modal').classList.remove('open'); } };
repro.onMenu((cmd, arg) => {
  ({ addRomDir: () => $('#railAdd').click(), addExe, rescan: () => refresh(true), setup: openSettings, duplicates: openDuplicates,
     search: () => { $('#q').focus(); }, mode: () => setMode(arg), theme: () => setTheme(arg), ui: () => setUI(arg),
     toast: () => toast(arg), hubkey: changeHubKey })[cmd]?.();
});
async function changeHubKey(onClose) {
  const gen = ++modalGen;
  const cur = S.config.hubKey || 'Ctrl+Alt+H';
  $('#modal').innerHTML = `<div class="box"><div class="mh"><h3>Hub key</h3><button class="icon" id="mClose">✕</button></div><div class="mb">
    <div class="hint">key combo to close the running game and jump back to REPRO, from anywhere — even while the emulator has focus. examples: Ctrl+Alt+H, Ctrl+Shift+Q, F13.</div>
    <div class="kv" style="margin-top:12px"><span>key</span><input id="hkInput" value="${esc(cur)}" style="max-width:220px"></div>
    <div class="hint" id="hkMsg" style="margin-top:8px"></div>
    <div class="btnrow" style="margin-top:12px"><button id="hkSave" style="background:var(--accent);color:#fff;border-color:transparent">save</button></div>
    </div></div>`;
  const close = () => { if (gen !== modalGen) return; if (onClose) onClose(); else $('#modal').classList.remove('open'); };
  $('#mClose').onclick = close;
  $('#hkSave').onclick = async () => {
    const key = $('#hkInput').value.trim(); if (!key) return;
    const r = await repro.setHubKey(key);
    if (gen !== modalGen) return; // user navigated away while this was in flight
    if (r.ok) { S.config.hubKey = r.key; S.config.hubKeyOk = true; toast(`hub key set to <b>${esc(r.key)}</b>. map your controller's Guide/Home button to this in Windows or Steam Input to trigger it from the pad.`); close(); }
    else { $('#hkMsg').innerHTML = `<b style="color:var(--accent2)">"${esc(key)}" is already claimed by another app (Steam, Nvidia overlay, Windows, etc). kept <b>${esc(S.config.hubKey)}</b>. try a different combo.</b>`; }
  };
  $('#modal').classList.add('open');
}
document.addEventListener('keydown', e => {
  if ($('#modal').classList.contains('open')) { if (e.key == 'Escape') { modalGen++; $('#modal').classList.remove('open'); } return; }
  if (e.target.tagName == 'INPUT') { if (e.key == 'Escape') e.target.blur(); return; }
  if (e.ctrlKey && e.key == 'e') { e.preventDefault(); setPanel('side', app.classList.contains('noside')); return; }
  if (e.ctrlKey && e.key == 'g') { e.preventDefault(); setPanel('detail', app.classList.contains('nodetail')); return; }
  if (e.ctrlKey && e.key == 'f') { e.preventDefault(); $('#q').focus(); return; }
  if (e.ctrlKey && e.key == '1') { setMode('desktop'); return; }
  if (e.ctrlKey && e.key == '2') { setMode('couch'); return; }
  if (!app.classList.contains('couch')) return;
  if (e.key == 'Tab') { e.preventDefault(); setMode('desktop'); return; }
  if (guideOpen) {
    if (e.key == 'Escape' || e.key == 'Backspace') closeGuide();
    else if (e.key == 'ArrowDown') guideMoveDown();
    else if (e.key == 'ArrowUp') guideMoveUp();
    else if (e.key == 'ArrowLeft') guideSectionNav(-1);
    else if (e.key == 'ArrowRight') guideSectionNav(1);
    else if (e.key == 'Enter') guideSelect(byId(cList[cFocus]));
    return;
  }
  if ($('#cov').classList.contains('open')) { if (e.key == 'Escape' || e.key == 'Backspace') $('#cov').classList.remove('open'); if (e.key == 'Enter') launch(cList[cFocus]); return; }
  if (e.key.toLowerCase() == 'g' && !guideOpen) { openGuide(); return; }
  cKey(e.key);
});
// drag-drop a folder onto the window adds it as a rom dir
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
document.addEventListener('drop', async e => {
  e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return;
  const p = repro.pathOf(f); if (!p) return toast('could not read the dropped path');
  if (/\.exe$/i.test(p)) { const r = await repro.detectOne(p); if (r) { S = await repro.setEmulator({ id: r.recipe, exe: p }); toast(`added <b>${esc(r.name)}</b>`); renderAll(); } else toast('unknown emulator exe, use settings → add exe for now'); }
  else { const dir = p.replace(/[\\/][^\\/]+\.\w+$/, ''); S = await repro.addRomDir({ dir }); toast(`added folder for <b>${esc(f.name)}</b>`); renderAll(); }
});
setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000);

// ---------- gamepad: standard mapping (https://w3c.github.io/gamepad/#remapping). A=0 B=1 X=2 Y=3, dpad 12-15, left stick axes 0/1
// stick reading uses hysteresis (engage high, release low) so one flick can't flicker across a single
// threshold and fire twice, plus a longer initial hold before auto-repeat kicks in.
let padPrev = {}, padHeld = 0;
let stickLatch = { x: 0, y: 0 }; // -1/0/1, only clears once the stick returns near center
const STICK_ENGAGE = 0.55, STICK_RELEASE = 0.25;
function readStickAxis(v, latchKey) {
  if (Math.abs(v) < STICK_RELEASE) stickLatch[latchKey] = 0;
  else if (stickLatch[latchKey] === 0 && Math.abs(v) > STICK_ENGAGE) stickLatch[latchKey] = v > 0 ? 1 : -1;
  return stickLatch[latchKey];
}
function pollPad() {
  const gp = navigator.getGamepads?.()[0];
  if (gp && app.classList.contains('couch') && !$('#modal').classList.contains('open')) {
    const b = i => gp.buttons[i]?.pressed, ax = gp.axes;
    const sx = readStickAxis(ax[0], 'x'), sy = readStickAxis(ax[1], 'y');
    const now = { up: b(12) || sy < 0, down: b(13) || sy > 0, left: b(14) || sx < 0, right: b(15) || sx > 0, a: b(0), bb: b(1), x: b(2), y: b(3), sel: b(8), start: b(9) };
    const edge = k => now[k] && !padPrev[k];
    if (guideOpen) {
      // guide nav: up/down moves in right panel, left/right changes section, A selects, B/start closes
      if (edge('bb') || edge('start')) closeGuide();
      else if (edge('a')) guideSelect(byId(cList[cFocus]));
      else if (now.up && (edge('up') || (padHeld > 18 && padHeld % 6 == 0))) guideMoveUp();
      else if (now.down && (edge('down') || (padHeld > 18 && padHeld % 6 == 0))) guideMoveDown();
      else if (edge('left')) guideSectionNav(-1);
      else if (edge('right')) guideSectionNav(1);
      padHeld = (now.up || now.down) ? padHeld + 1 : 0;
      padPrev = now;
      requestAnimationFrame(pollPad); return;
    }
    const ovOpen = $('#cov').classList.contains('open');
    if (ovOpen) { if (edge('a')) launch(cList[cFocus]); if (edge('bb')) $('#cov').classList.remove('open'); }
    else {
      // 28 frames (~470ms) before repeat starts, then one step every 9 frames (~150ms) — a quick flick moves exactly one
      const rep = (k, key) => { if (now[k] && (edge(k) || (padHeld > 28 && padHeld % 9 == 0))) cKey(key); };
      rep('up', 'ArrowUp'); rep('down', 'ArrowDown'); rep('left', 'ArrowLeft'); rep('right', 'ArrowRight');
      if (edge('a')) cOpen(); if (edge('x')) cKey('x'); if (edge('y')) cKey('y'); if (edge('sel')) setMode('desktop');
      if (edge('start')) openGuide();
    }
    padHeld = (now.up || now.down || now.left || now.right) ? padHeld + 1 : 0;
    padPrev = now;
  } else if (gp && padAnyEdge(gp) && !app.classList.contains('couch') && !$('#modal').classList.contains('open')) {
    setMode('couch');
  }
  requestAnimationFrame(pollPad);
}
function padAnyEdge(gp) { const any = gp.buttons.some(b => b.pressed); const r = any && !padPrev.any; padPrev.any = any; return r; }
window.addEventListener('gamepadconnected', e => toast(`controller connected: <b>${esc(e.gamepad.id)}</b>`));
pollPad();

/* ============ GUIDE OVERLAY ============ */
let guideSection = 'game'; // game | saves | settings | power
let guideFocus = 0;    // focused button index within right panel
let guideOpen = false;
let guideSlotsCache = [];
const guideSections = [
  { id:'game',     ico:'▶',  label:'Game'     },
  { id:'saves',    ico:'⛁',  label:'Saves'    },
  { id:'settings', ico:'⚙',  label:'Settings' },
  { id:'power',    ico:'⏻',  label:'Power'    },
];
function openGuide() {
  guideOpen = true;
  const g = byId(cList[cFocus]);
  renderGuide(g);
  $('#guide').classList.add('open');
}
function closeGuide() {
  guideOpen = false;
  $('#guide').classList.remove('open');
}
async function renderGuide(g) {
  const el = $('#guide'); if (!el) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const date = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
  const leftItems = guideSections.map((sec,i) => `
    <div class="gitem ${guideSection===sec.id?'on':''}" data-sec="${sec.id}">
      <span class="ico">${sec.ico}</span>${sec.label}
    </div>`).join('');
  el.innerHTML = `
    <div class="scrim" id="guideScrim"></div>
    <div class="box">
      <div class="left">
        <div class="gtime">${time}</div>
        <div class="gdate">${date}</div>
        <div class="gsep"></div>
        ${leftItems}
        <div class="gsep" style="margin-top:auto"></div>
        <div class="gitem acc" data-sec="power"><span class="ico">⏻</span>Quit REPRO</div>
      </div>
      <div class="right" id="guideRight"></div>
    </div>`;
  el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => { guideSection = b.dataset.sec; guideFocus = 0; renderGuide(g); });
  $('#guideScrim').onclick = closeGuide;
  await renderGuideRight(g);
}
async function renderGuideRight(g) {
  const el = $('#guideRight'); if (!el) return;
  const fmtPt = s => !s ? '—' : s < 3600 ? `${Math.round(s/60)}m` : `${Math.floor(s/3600)}h ${Math.round((s%3600)/60)}m`;
  const fmtDate = ms => !ms ? 'never' : new Date(ms).toLocaleDateString([], {month:'short',day:'numeric'});
  const fmtSize = b => b > 1e6 ? (b/1e6).toFixed(1)+'MB' : b > 1e3 ? Math.round(b/1e3)+'KB' : b+'B';
  const fmtTs = ms => new Date(ms).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

  if (guideSection === 'game') {
    el.innerHTML = `
      <h4>${esc(sysName(g?.sys||''))} · ${esc(emuName(g?.sys||''))}</h4>
      <div class="game-card">
        <div class="cover">${g?.art ? `<img src="${fileUrl(g.art)}">` : ''}</div>
        <div><h3>${esc(g?.title||'no game')}</h3><div class="meta">${fmtPt(g?.playtime)} played · last ${fmtDate(g?.lastPlayed)}</div></div>
      </div>
      <button class="gbtn primary focus" data-action="play"><span class="k">A</span>Resume / Play</button>
      <button class="gbtn" data-action="saves"><span class="k">Y</span>Save slots</button>
      <button class="gbtn" data-action="fav"><span class="k">X</span>${g?.fav ? 'Remove favorite' : 'Add to favorites'}</button>
      <button class="gbtn" data-action="desktop"><span class="k">▤</span>Go to desktop</button>
      <div class="hints"><span><span class="b">B</span>close</span><span><span class="b">↑↓</span>navigate</span><span><span class="b">A</span>select</span></div>`;
  } else if (guideSection === 'saves') {
    const slots = g ? await repro.listSlots(g.id) : [];
    guideSlotsCache = slots;
    const fmtSlot = sl => sl.isActive ? 'active' : sl.isAuto ? sl.file.slice(5, sl.file.lastIndexOf('.')) : sl.file.replace(/\.[^.]+$/,'');
    el.innerHTML = `
      <h4>Save slots — ${esc(g?.title||'')}</h4>
      ${slots.length ? `<div class="slots-mini">${slots.slice(0,8).map((sl,i) => `<div class="sm ${sl.isActive?'act':''}" data-slot="${i}">${esc(fmtSlot(sl))}<br><span style="opacity:.6">${fmtTs(sl.mtime)} · ${fmtSize(sl.size)}</span></div>`).join('')}</div>` : '<div class="meta" style="margin:10px 0">no saves yet — play the game first.</div>'}
      <div style="margin-top:14px"></div>
      <button class="gbtn primary focus" data-action="snapshot"><span class="k">A</span>Snapshot now</button>
      <button class="gbtn" data-action="opensaves"><span class="k">X</span>Open save folder</button>
      <div class="hints"><span><span class="b">B</span>close</span><span><span class="b">A</span>snapshot</span></div>`;
    el.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => {
      const sl = slots[+b.dataset.slot]; if (!sl || sl.isActive) return;
      await repro.restoreSave({ id: g.id, file: sl.file }); toast('restored — restart to play it'); closeGuide();
    });
  } else if (guideSection === 'settings') {
    const hub = S.config.hubKey || 'Ctrl+Alt+H';
    el.innerHTML = `
      <h4>Quick settings</h4>
      <button class="gbtn focus" data-action="theme-billet"><span class="k">1</span>Theme: Billet</button>
      <button class="gbtn" data-action="theme-manual"><span class="k">2</span>Theme: Manual</button>
      <button class="gbtn" data-action="theme-crt"><span class="k">3</span>Theme: CRT</button>
      <div class="gsep" style="margin:10px 0"></div>
      <button class="gbtn" data-action="tv"><span class="k">T</span>Scale: ${document.documentElement.style.getPropertyValue('--u')==='1.5'?'TV (active)':'TV'}</button>
      <button class="gbtn" data-action="desk-scale"><span class="k">D</span>Scale: ${document.documentElement.style.getPropertyValue('--u')!=='1.5'?'Desk (active)':'Desk'}</button>
      <div class="gsep" style="margin:10px 0"></div>
      <div class="meta" style="font-size:11px;color:var(--muted)">Hub key: ${esc(hub)} closes running game from anywhere</div>
      <div class="hints"><span><span class="b">B</span>close</span><span><span class="b">A</span>select</span></div>`;
  } else if (guideSection === 'power') {
    el.innerHTML = `
      <h4>Power</h4>
      <button class="gbtn primary focus" data-action="desktop"><span class="k">A</span>Go to desktop mode</button>
      <button class="gbtn" data-action="quit"><span class="k">Y</span>Quit REPRO</button>
      <div class="hints"><span><span class="b">B</span>close</span><span><span class="b">A</span>select</span></div>`;
  }

  // wire button actions
  const btns = [...el.querySelectorAll('[data-action]')];
  if (guideFocus >= btns.length) guideFocus = 0;
  btns.forEach((b,i) => {
    b.classList.toggle('focus', i === guideFocus);
    b.onclick = () => guideAction(b.dataset.action, g);
  });
}
function guideAction(action, g) {
  if (action === 'play') { closeGuide(); if (g) launch(g.id); }
  else if (action === 'saves') { guideSection='saves'; guideFocus=0; renderGuide(g); }
  else if (action === 'fav') { if (g) toggleFav(g.id); closeGuide(); }
  else if (action === 'desktop') { closeGuide(); setMode('desktop'); }
  else if (action === 'quit') { closeGuide(); repro.quit?.() || window.close(); }
  else if (action === 'snapshot') { if (g) { repro.snapshotSave(g.id).then(()=>{ toast('snapshot taken'); renderGuideRight(g); }); } }
  else if (action === 'opensaves') { if (g) repro.openSaveFolder(g.id); closeGuide(); }
  else if (action === 'theme-billet') { setTheme('billet'); closeGuide(); }
  else if (action === 'theme-manual') { setTheme('manual'); closeGuide(); }
  else if (action === 'theme-crt') { setTheme('crt'); closeGuide(); }
  else if (action === 'tv') { setUI('tv'); closeGuide(); }
  else if (action === 'desk-scale') { setUI('desk'); closeGuide(); }
}
function guideMoveDown() { const btns = [...$('#guideRight')?.querySelectorAll('[data-action]')||[]]; if (!btns.length) return; guideFocus=Math.min(guideFocus+1,btns.length-1); btns.forEach((b,i)=>b.classList.toggle('focus',i===guideFocus)); btns[guideFocus]?.scrollIntoView({block:'nearest'}); }
function guideMoveUp()   { const btns = [...$('#guideRight')?.querySelectorAll('[data-action]')||[]]; if (!btns.length) return; guideFocus=Math.max(guideFocus-1,0); btns.forEach((b,i)=>b.classList.toggle('focus',i===guideFocus)); btns[guideFocus]?.scrollIntoView({block:'nearest'}); }
function guideSelect(g)  { const btns = [...$('#guideRight')?.querySelectorAll('[data-action]')||[]]; if (btns[guideFocus]) guideAction(btns[guideFocus].dataset.action, g); }
function guideSectionNav(dir) {
  const idx = guideSections.findIndex(s=>s.id===guideSection);
  const next = guideSections[Math.max(0,Math.min(guideSections.length-1,idx+dir))];
  if (next && next.id !== guideSection) { guideSection=next.id; guideFocus=0; renderGuide(byId(cList[cFocus])); }
}

function renderAll() { renderSide(); renderMain(); renderDetail(); if (app.classList.contains('couch')) renderCouch(); }
async function refresh(showToast) { S = await repro.scan(); if (showToast) toast(`rescanned: ${S.games.length} games`); renderAll(); }
(async () => {
  ROOT = await repro.root();
  $('#brandLg').style.setProperty('--m', `url('${fileUrl(ROOT + '/assets/brand/repro-mark.svg')}')`);
  S = await repro.snapshot();
  const c = S.config || {};
  setTheme(c.theme || 'billet'); setUI(c.ui || 'desk');
  if (c.panels) { setPanel('side', c.panels.side !== false); setPanel('detail', c.panels.detail !== false); }
  if (c.cardSize) { $('#zoom').value = c.cardSize; document.documentElement.style.setProperty('--cw', c.cardSize + 'px'); }
  renderAll();
  if (c.mode == 'couch') setMode('couch');
  if (!S.games.length && !(c.romDirs || []).length) openSettings();
})();
