const http = require('http');

const endpoints = [
  { path: '/api/products', method: 'GET' },
  { path: '/api/products/1', method: 'GET' },
  { path: '/api/vouchers', method: 'GET' },
  { path: '/api/admin/stats', method: 'GET' },
  { path: '/api/admin/orders', method: 'GET' },
  { path: '/api/admin/users', method: 'GET' },
  { path: '/api/admin/auto-progression', method: 'GET' },
  { path: '/api/admin/returns', method: 'GET' },
  { path: '/api/admin/stock-imports', method: 'GET' },
  { path: '/api/reviews', method: 'GET' }
];

async function testEndpoint(ep) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: ep.path,
        method: ep.method,
        timeout: 3000
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            path: ep.path,
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 400,
            length: data.length
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ path: ep.path, status: 'ERROR', ok: false, error: err.message });
    });
    req.end();
  });
}

async function run() {
  console.log('Testing critical API endpoints...');
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    const mark = res.ok ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark} [${res.status}] ${ep.path} (${res.length || 0} bytes)`);
  }
}

run();
