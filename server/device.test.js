const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deviceAccess } = require('./deviceAccess');
const { createServer } = require('./index');
const request = (ip, login) => ({ socket: { remoteAddress: ip }, headers: { 'tailscale-user-login': login } });
test('device access fails closed and trusts identity only on loopback', () => {
  assert.throws(() => deviceAccess({ API_ACCESS_MODE: 'unknown' }));
  assert.throws(() => deviceAccess({ API_ACCESS_MODE: 'tailscale' }));
  const allow = deviceAccess({ API_ACCESS_MODE: 'tailscale', API_TESTER_LOGINS: ' alice@example.com, bob@example.com ' });
  assert.equal(allow(request('127.0.0.1', 'alice@example.com')), true);
  assert.equal(allow(request('::ffff:127.0.0.1', 'bob@example.com')), true);
  for (const login of [undefined, '', 'mallory@example.com', 'alice@example.com, mallory@example.com']) assert.equal(allow(request('127.0.0.1', login)), false);
  assert.equal(allow(request('192.168.1.2', 'alice@example.com')), false);
  assert.equal(allow(request(undefined, 'alice@example.com')), false);
  assert.equal(deviceAccess({})(request('127.0.0.1')), true);
});
test('all routes including health, preflight and assistant require tester identity in device mode', async () => {
  const previous = { mode: process.env.API_ACCESS_MODE, users: process.env.API_TESTER_LOGINS };
  process.env.API_ACCESS_MODE = 'tailscale';
  process.env.API_TESTER_LOGINS = 'tester@example.com';
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, method] of [['/api/health', 'GET'], ['/api/discover', 'GET'], ['/api/integrations/status', 'GET'], ['/api/assistant/status', 'GET'], ['/api/assistant', 'POST'], ['/api/assistant', 'OPTIONS']]) {
      for (const headers of [{}, { 'tailscale-user-login': 'intruder@example.com' }]) {
        const res = await fetch(base + path, { method, headers });
        assert.equal(res.status, 403);
        assert.equal(res.headers.get('cache-control'), 'no-store');
        assert.equal(res.headers.get('access-control-allow-origin'), null);
      }
    }
    const headers = { 'tailscale-user-login': 'tester@example.com' };
    assert.equal((await fetch(base + '/api/health', { headers })).status, 200);
    assert.equal((await fetch(base + '/api/assistant/status', { headers })).status, 200);
    assert.equal((await fetch(base + '/api/assistant', { method: 'POST', headers: { ...headers, origin: 'https://evil.example' } })).status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const [key, value] of [['API_ACCESS_MODE', previous.mode], ['API_TESTER_LOGINS', previous.users]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('client connection diagnostics preserve simulator access and distinguish phone errors', async () => {
  const ts = require('typescript');
  const vm = require('node:vm');
  const fs = require('node:fs');
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/data/apiConnection.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  function load(url, os, fetch) {
    const context = { exports: {}, process: { env: { EXPO_PUBLIC_DISCOVERY_API_URL: url } }, URL, AbortSignal, fetch,
      require: name => name === 'react-native' ? { Platform: { OS: os } } : require('../src/data/networkPolicy') };
    vm.runInNewContext(code, context);
    return context.exports.apiFetch;
  }
  const ok = async () => ({ status: 200 });
  const fail = async () => { throw new Error('network failure'); };
  assert.equal((await load('http://localhost:8787', 'ios', ok)('/api/health')).status, 200);
  await assert.rejects(load('http://localhost:8787', 'android', fail)('/api/health'), /this device’s localhost/);
  await assert.rejects(load('http://192.168.1.1:8787', 'ios', ok)('/api/health'), /Invalid API URL/);
  await assert.rejects(load('https://host.test', 'ios', fail)('/api/health'), /timed out/);
  await assert.rejects(load('https://host.test', 'ios', async () => ({ status: 403 }))('/api/health'), /API access denied/);
  let signal;
  await load('https://host.test', 'web', async (_, options) => { signal = options.signal; return { status: 200 }; })('/api/health');
  assert.ok(signal);
});
