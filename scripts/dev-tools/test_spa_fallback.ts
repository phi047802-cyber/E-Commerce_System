process.env.NODE_ENV = 'test';

async function testSpa() {
  const request = (await import('supertest')).default;
  const { app } = await import('../../server/src/server.js');

  console.log('Testing SPA fallback routes against Express server...');
  const routes = [
    '/tin-tuc',
    '/tin-tuc/co-che-ky-quy-escrow-va-so-cai-kep',
    '/chinh-sach-escrow',
    '/quy-trinh-khieu-nai',
    '/dieu-khoan-dich-vu',
    '/huong-dan-nap-rut'
  ];

  for (const r of routes) {
    const res = await request(app).get(r);
    const isHtml = res.headers['content-type'] && res.headers['content-type'].includes('text/html');
    console.log(`  Route: ${r.padEnd(45)} -> Status: ${res.status} | isHtml: ${isHtml} | Size: ${res.text.length} B`);
    if (res.status !== 200 || !isHtml) {
      console.error(`  [LỖI] Route ${r} không trả về HTML (Status: ${res.status})`);
      process.exit(1);
    }
  }

  const apiRes = await request(app).get('/api/news');
  const items = Array.isArray(apiRes.body) ? apiRes.body.length : (apiRes.body.data ? apiRes.body.data.length : 0);
  console.log(`  API: /api/news                                    -> Status: ${apiRes.status} | News count: ${items}`);
  if (apiRes.status !== 200 || items === 0) {
    console.error('  [LỖI] API /api/news không trả về dữ liệu bài viết');
    process.exit(1);
  }

  console.log('✅ SPA Fallback và News API hoạt động 100% hoàn hảo!');
  process.exit(0);
}

testSpa().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
