// scraper.js — metadata + art scraper for REPRO
// Primary: IGDB (https://api-docs.igdb.com) — free, needs Twitch client_id + client_secret
// Art fallback: libretro-thumbnails CDN (https://thumbnails.libretro.com) — no auth, works immediately
// Source for IGDB platform IDs: https://www.igdb.com/platforms
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IGDB_PLATFORM_IDS = {
  nes: 18, snes: 19, n64: 4, gc: 21, wii: 5, wiiu: 41, switch: 130,
  gb: 33, gbc: 22, gba: 24, ds: 20, '3ds': 37,
  ps1: 7, ps2: 8, ps3: 9, psp: 38, vita: 46,
  xbox: 11, x360: 12, genesis: 29, saturn: 32, dc: 23, pc: 6,
};
// libretro system folder names for thumbnail CDN
const LR_SYSTEM = {
  nes: 'Nintendo - Nintendo Entertainment System',
  snes: 'Nintendo - Super Nintendo Entertainment System',
  n64: 'Nintendo - Nintendo 64',
  gc: 'Nintendo - GameCube',
  wii: 'Nintendo - Wii',
  gb: 'Nintendo - Game Boy', gbc: 'Nintendo - Game Boy Color', gba: 'Nintendo - Game Boy Advance',
  ds: 'Nintendo - Nintendo DS', '3ds': 'Nintendo - Nintendo 3DS',
  ps1: 'Sony - PlayStation', ps2: 'Sony - PlayStation 2',
  ps3: 'Sony - PlayStation 3', psp: 'Sony - PlayStation Portable',
  vita: 'Sony - PlayStation Vita',
  xbox: 'Microsoft - Xbox', x360: 'Microsoft - Xbox 360',
  genesis: 'Sega - Mega Drive - Genesis',
  saturn: 'Sega - Saturn', dc: 'Sega - Dreamcast',
};

let igdbToken = null; // { access_token, expires_at }

// ---- low-level HTTP helpers ----
function httpsGet(url, opts={}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: opts.headers || {} }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}
function httpsPost(url, body, headers={}) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Length': buf.length, ...headers } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(buf); req.end();
  });
}

// ---- IGDB auth ----
async function getIgdbToken(clientId, clientSecret) {
  if (igdbToken && igdbToken.expires_at > Date.now() + 60000) return igdbToken.access_token;
  const r = await httpsPost(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    '', { 'Content-Type': 'application/x-www-form-urlencoded' }
  );
  if (r.status !== 200) throw new Error(`IGDB auth failed: ${r.status} ${r.body.toString().slice(0,200)}`);
  const d = JSON.parse(r.body.toString());
  igdbToken = { access_token: d.access_token, expires_at: Date.now() + d.expires_in * 1000 };
  return igdbToken.access_token;
}

// ---- IGDB query ----
async function igdbQuery(endpoint, apicalypse, clientId, token) {
  const r = await httpsPost(`https://api.igdb.com/v4/${endpoint}`, apicalypse, {
    'Client-ID': clientId,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'text/plain',
  });
  if (r.status !== 200) throw new Error(`IGDB ${endpoint} failed: ${r.status}`);
  return JSON.parse(r.body.toString());
}

// ---- clean title for searching ----
function cleanTitle(title) {
  return title
    .replace(/:\s*(Special Edition|Hall of Fame Edition|Directors? Cut|Game of the Year|GOTY|Definitive Edition|Remastered|HD|Complete Edition)[^:]*$/i, '')
    .replace(/\s+/g, ' ').trim();
}

// ---- libretro CDN art fallback (no auth) ----
// URL format: https://thumbnails.libretro.com/{system}/Named_Boxarts/{title}.png
function lrSafe(s) { return encodeURIComponent(s.replace(/[&*/:"`<>?\\|]/g, '_')); }
async function fetchLibretroArt(title, sys) {
  const folder = LR_SYSTEM[sys]; if (!folder) return null;
  const url = `https://thumbnails.libretro.com/${encodeURIComponent(folder)}/Named_Boxarts/${lrSafe(title)}.png`;
  try {
    const r = await httpsGet(url);
    if (r.status === 200 && r.body.length > 500) return r.body;
  } catch {}
  return null;
}

// ---- IGDB art download ----
async function fetchIgdbArt(imageId) {
  const url = `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
  try {
    const r = await httpsGet(url);
    if (r.status === 200 && r.body.length > 500) return r.body;
  } catch {}
  return null;
}

// ---- main scrape function ----
// Returns { title, year, desc, genres, players, cover: Buffer|null, igdbId, coverUrl }
// artDir: where to save the art file (returns saved path or null)
async function scrapeGame(g, artDir, credentials) {
  const { clientId, clientSecret } = credentials || {};
  const result = { igdbId: null, title: g.title, year: null, desc: null, genres: [], players: null, artPath: null };

  // 1. try IGDB if we have credentials
  if (clientId && clientSecret) {
    try {
      const token = await getIgdbToken(clientId, clientSecret);
      const platformId = IGDB_PLATFORM_IDS[g.sys];
      const searchTitle = cleanTitle(g.title);

      // search with platform filter first, fall back to name-only
      const query = platformId
        ? `search "${searchTitle.replace(/"/g, '')}"; fields name,summary,first_release_date,cover.image_id,genres.name,game_modes.name; where platforms = (${platformId}); limit 5;`
        : `search "${searchTitle.replace(/"/g, '')}"; fields name,summary,first_release_date,cover.image_id,genres.name,game_modes.name; limit 5;`;

      const games = await igdbQuery('games', query, clientId, token);
      if (games.length) {
        const best = games[0]; // first result is usually right with platform filter
        result.igdbId = best.id;
        result.title = best.name || g.title;
        result.desc = best.summary || null;
        result.year = best.first_release_date ? new Date(best.first_release_date * 1000).getFullYear() : null;
        result.genres = (best.genres || []).map(x => x.name);
        result.players = (best.game_modes || []).some(m => /multi/i.test(m.name)) ? '1-4' : '1';

        if (best.cover?.image_id) {
          const artBuf = await fetchIgdbArt(best.cover.image_id);
          if (artBuf) {
            const artPath = path.join(artDir, g.title + '.jpg');
            fs.mkdirSync(artDir, { recursive: true });
            fs.writeFileSync(artPath, artBuf);
            result.artPath = artPath;
            return result;
          }
        }
      }
    } catch (e) {
      console.warn('[scraper] IGDB error for', g.title, ':', e.message);
    }
  }

  // 2. libretro CDN fallback for art (no auth needed)
  if (!result.artPath) {
    const artBuf = await fetchLibretroArt(cleanTitle(g.title), g.sys);
    if (artBuf) {
      const artPath = path.join(artDir, g.title + '.png');
      fs.mkdirSync(artDir, { recursive: true });
      fs.writeFileSync(artPath, artBuf);
      result.artPath = artPath;
    }
  }
  return result;
}

// ---- batch scrape: all games missing art or desc ----
// onProgress(current, total, game, result) called per game
async function scrapeLibrary(games, artBaseDir, credentials, onProgress) {
  const needsArt = games.filter(g => !g.art || !g.desc);
  const results = [];
  for (let i = 0; i < needsArt.length; i++) {
    const g = needsArt[i];
    const artDir = path.join(artBaseDir, g.sys);
    let result;
    try {
      result = await scrapeGame(g, artDir, credentials);
    } catch (e) {
      result = { error: e.message };
    }
    results.push({ gameId: g.id, ...result });
    if (onProgress) onProgress(i + 1, needsArt.length, g, result);
    // IGDB rate limit: 4 req/s. we do 2 req per game (search + art), so 250ms gap is safe
    if (credentials?.clientId && i < needsArt.length - 1) await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

module.exports = { scrapeGame, scrapeLibrary, IGDB_PLATFORM_IDS };
