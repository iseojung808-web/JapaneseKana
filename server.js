/**
 * Kana Trainer's dev server: static files, plus a proxy to the Jisho API.
 *
 * The proxy exists because Jisho doesn't send CORS headers, so a browser
 * page can't call it directly. It only ever forwards a search keyword and a
 * page number to Jisho's word-search endpoint; it is not a general proxy.
 * Responses are cached in memory so repeat lookups don't hit Jisho again.
 *
 *   node server.js                 → http://localhost:8080
 *   PORT=3000 node server.js       → different port
 *   JISHO_BASE=http://... node ... → point at a mock Jisho (used in testing)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const CACHE_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;

function sendJSON(res, status, body) {
  res.writeHead(status, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function createServer({ root = __dirname, jishoBase = 'https://jisho.org', fetchImpl = globalThis.fetch } = {}) {
  const cache = new Map();

  async function jisho(url, res) {
    const keyword = (url.searchParams.get('keyword') || '').trim();
    const page = Math.min(Math.max(parseInt(url.searchParams.get('page'), 10) || 1, 1), 1000);
    if (!keyword || keyword.length > 100) {
      return sendJSON(res, 400, { error: 'Give a search word (up to 100 characters).' });
    }

    const key = `${keyword}\u0000${page}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return sendJSON(res, 200, hit.body);

    const upstream = `${jishoBase}/api/v1/search/words?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    try {
      const r = await fetchImpl(upstream, {
        headers: { accept: 'application/json', 'user-agent': 'kana-trainer (personal study app)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return sendJSON(res, 502, { error: `Jisho answered ${r.status}. Try again in a moment.` });
      const body = await r.json();
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), body });
      return sendJSON(res, 200, body);
    } catch (err) {
      return sendJSON(res, 502, { error: "Couldn't reach Jisho. Check your internet connection and try again." });
    }
  }

  function serveStatic(url, res) {
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      return res.end('bad request');
    }
    if (rel.endsWith('/')) rel += 'index.html';
    // Resolve inside root and refuse anything that escapes it (../, encoded or not).
    const file = path.resolve(root, '.' + path.posix.normalize('/' + rel));
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'content-type': TYPES['.txt'] });
        return res.end('not found');
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  }

  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end('method not allowed');
    }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/jisho') return jisho(url, res);
    return serveStatic(url, res);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  createServer({ jishoBase: process.env.JISHO_BASE || undefined }).listen(port, () => {
    console.log(`Kana Trainer running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
