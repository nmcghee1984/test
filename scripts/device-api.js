// Force secure device mode after loading local settings; never change the bind interface.
require('../server/env')();
process.env.API_ACCESS_MODE = 'tailscale';
process.env.API_HOST = '127.0.0.1';
const { createServer } = require('../server');
createServer().listen(Number(process.env.API_PORT || 8787), '127.0.0.1', () => {
  console.log('Private device API ready on loopback. Start Tailscale Serve as described in docs/device-testing.md.');
});
