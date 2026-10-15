require('../server/env')();
const { isSecureApiUrl, isLoopbackHost } = require('../src/data/networkPolicy');
async function check() {
  const base = process.env.EXPO_PUBLIC_DISCOVERY_API_URL || '';
  if (!isSecureApiUrl(base) || isLoopbackHost(new URL(base).hostname)) {
    throw new Error('Set EXPO_PUBLIC_DISCOVERY_API_URL to the private HTTPS Serve origin (no path).');
  }
  for (const path of ['/api/health', '/api/integrations/status', '/api/assistant/status']) {
    const response = await fetch(`${base.replace(/\/+$/, '')}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}. Check Serve, tester login allowlist and API process.`);
    const body = await response.json();
    if (path.endsWith('/health') && body.status !== 'ok') throw new Error('Unexpected health response. Check the Serve target.');
    if (path.endsWith('/status') && path.includes('assistant')) {
      console.log(`Assistant: ${body.configured ? 'configured (no paid request made)' : 'reachable; set OPENAI_API_KEY in .env.server and restart API'}`);
    } else console.log(`${path}: reachable`);
  }
  console.log('Computer checks passed. Repeat /api/health in the phone browser; this does not certify phone connectivity.');
}
check().catch(error => {
  if (/^(Set EXPO_PUBLIC_|Unexpected health|\/api\/)/.test(error.message)) console.error(error.message);
  console.error('Device check failed. Check HTTPS URL, VPN/DNS, Serve target, API process and API_TESTER_LOGINS. See docs/device-testing.md.');
  process.exitCode = 1;
});
