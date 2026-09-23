/**
 * Server tests: the Jisho proxy forwards only what it should and caches,
 * and static serving can't be walked out of the app folder.
 */
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const { createServer } = require('../server.js');

function listen(server) {
  return new Promise((resolve) => server.listen(0, () => resolve(server.address().port)));
}

function get(port, p) {
  return new Promise((resolve, reject) => {
    // Raw request so "../" isn't normalized away by a URL parser first.
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, type: res.headers['content-type'] }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('proxy forwards keyword and page to Jisho, and caches the answer', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ meta: { status: 200 }, data: [{ slug: 'ok' }] }) };
  };
  const server = createServer({ root: path.join(__dirname, '..'), jishoBase: 'https://jisho.example', fetchImpl });
  const port = await listen(server);
  try {
    const a = await get(port, '/api/jisho?keyword=' + encodeURIComponent('#jlpt-n5') + '&page=2');
    assert.strictEqual(a.status, 200);
    assert.deepStrictEqual(JSON.parse(a.body).data, [{ slug: 'ok' }]);
    assert.strictEqual(calls[0], 'https://jisho.example/api/v1/search/words?keyword=%23jlpt-n5&page=2');

    await get(port, '/api/jisho?keyword=' + encodeURIComponent('#jlpt-n5') + '&page=2');
    assert.strictEqual(calls.length, 1, 'second identical lookup should come from cache');
  } finally {
    server.close();
  }
});

test('proxy rejects empty keywords and reports Jisho failures as 502 with a readable message', async () => {
  const server = createServer({
    root: path.join(__dirname, '..'),
    fetchImpl: async () => { throw new Error('offline'); },
  });
  const port = await listen(server);
  try {
    assert.strictEqual((await get(port, '/api/jisho?keyword=')).status, 400);
    const r = await get(port, '/api/jisho?keyword=cat');
    assert.strictEqual(r.status, 502);
    assert.match(JSON.parse(r.body).error, /Couldn't reach Jisho/);
  } finally {
    server.close();
  }
});

test('static files are served, and paths cannot escape the app folder', async () => {
  const server = createServer({ root: path.join(__dirname, '..') });
  const port = await listen(server);
  try {
    const index = await get(port, '/');
    assert.strictEqual(index.status, 200);
    assert.match(index.type, /text\/html/);
    for (const evil of ['/../../../../etc/passwd', '/%2e%2e/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2f..%2fetc/passwd']) {
      const r = await get(port, evil);
      assert.notStrictEqual(r.status, 200, `${evil} should not be served`);
      assert.doesNotMatch(r.body, /root:/);
    }
  } finally {
    server.close();
  }
});
