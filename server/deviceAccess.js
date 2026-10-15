const { isLoopbackHost } = require('../src/data/networkPolicy');
function deviceAccess(env = process.env) {
  const mode = env.API_ACCESS_MODE || 'local';
  if (!['local', 'tailscale'].includes(mode)) throw new Error('API_ACCESS_MODE must be local or tailscale.');
  const users = (env.API_TESTER_LOGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (mode === 'tailscale' && !users.length) throw new Error('Set API_TESTER_LOGINS to exact Tailscale login names.');
  return request => {
    // Only the loopback Serve proxy is trusted; local processes remain trusted.
    if (!isLoopbackHost(request.socket.remoteAddress?.replace(/^::ffff:/, ''))) return false;
    return mode === 'local' || users.includes(request.headers['tailscale-user-login']);
  };
}
module.exports = { deviceAccess };
