import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('Admin Dashboard Metrics (BR-002, BR-003) & Auditor CSV Export', () => {
  let adminToken = '';
  let auditorToken = '';
  let renterToken = '';

  beforeAll(async () => {
    // 1. Login Admin
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = resAdmin.body.data.token;

    // 2. Login Auditor
    const resAuditor = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@instasquad.test', password: 'Demo@123456' });
    auditorToken = resAuditor.body.data.token;

    // 3. Login Renter
    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter.body.data.token;
  });

  it('1. Renter cannot access Admin Dashboard metrics (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(403);
  });

  it('2. Admin can retrieve real DB metrics and 10k goal progress', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { metrics, daily_chart } = res.body.data;

    expect(metrics).toBeDefined();
    expect(metrics.booking_goal).toBe(10000);
    expect(typeof metrics.total_bookings_completed).toBe('number');
    expect(typeof metrics.conversion_rate_pct).toBe('number');
    expect(metrics.conversion_rate_formula).toContain('Quy tắc tính toán chuyển đổi');
    expect(typeof metrics.total_users).toBe('number');
    expect(typeof metrics.active_companions).toBe('number');
    expect(typeof metrics.platform_revenue_12_pct).toBe('number');

    expect(Array.isArray(daily_chart)).toBe(true);
    expect(daily_chart.length).toBe(7);
  });

  it('3. Renter cannot access Auditor CSV Export (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get('/api/wallet/reconciliation/export-csv')
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(403);
  });

  it('4. Auditor can export reconciliation CSV with CSV injection escaping & BOM', async () => {
    const res = await request(app)
      .get('/api/wallet/reconciliation/export-csv')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toContain('attachment');

    const csvText = res.text;
    expect(csvText.charCodeAt(0)).toBe(0xFEFF); // UTF-8 BOM
    expect(csvText).toContain('Mã Giao Dịch (Txn ID)');
    expect(csvText).toContain('Loại Giao Dịch');
    expect(csvText).toContain('Chiều Hạch Toán');
    expect(csvText).toContain("'-500000"); // Đã chống CSV injection cho số âm -500000 thành '-500000
  });

  it('5. Anonymous visit counter & dual conversion rate metrics (order completion vs funnel conversion)', async () => {
    // Ghi nhận lượt truy cập ẩn danh
    const visitRes = await request(app)
      .post('/api/analytics/visit')
      .send({ session_key: `sess-test-${Date.now()}` });

    expect(visitRes.status).toBe(200);
    expect(visitRes.body.data.recorded).toBe(true);

    // Lấy lại Admin metrics để kiểm tra 2 chỉ số
    const res = await request(app)
      .get('/api/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { metrics } = res.body.data;

    // Chỉ số 1: Tỉ lệ hoàn tất đơn
    expect(typeof metrics.order_completion_rate_pct).toBe('number');
    expect(metrics.order_completion_rate_formula).toContain('chỉ số vận hành đơn');

    // Chỉ số 2: Tỉ lệ chuyển đổi toàn sàn
    expect(typeof metrics.conversion_rate_pct).toBe('number');
    expect(typeof metrics.funnel_conversion_rate_pct).toBe('number');
    expect(metrics.conversion_rate_formula).toContain('Quy tắc tính toán chuyển đổi');
    expect(metrics.total_site_visits).toBeGreaterThanOrEqual(1);
  });

  it('6. Security: Direct GET access to /storage/kyc_encrypted is NOT served static (returns 404)', async () => {
    const res = await request(app)
      .get('/storage/kyc_encrypted/kyc-front-dummy.enc');

    expect(res.status).toBe(404);
  });

  it('7. SiteVisit: Filters bots, hashes IP with HMAC, and counts 1 per session (idempotent)', async () => {
    const testSessionKey = `sess-bot-test-${Date.now()}`;

    // A. Bot request (Googlebot) is ignored
    const botRes = await request(app)
      .post('/api/analytics/visit')
      .set('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
      .send({ session_key: `sess-bot-${Date.now()}` });

    expect(botRes.status).toBe(200);
    expect(botRes.body.data.is_bot).toBe(true);
    expect(botRes.body.data.recorded).toBe(false);

    // B. Real human request: records visit, hashes IP with HMAC
    const humanRes = await request(app)
      .post('/api/analytics/visit')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      .set('X-Forwarded-For', '203.162.0.1')
      .send({ session_key: testSessionKey });

    expect(humanRes.status).toBe(200);
    expect(humanRes.body.data.recorded).toBe(true);
    expect(humanRes.body.data.is_bot).toBe(false);

    // Verify record in database has HMAC hashed IP, not raw IP
    const dbVisit = await prisma.siteVisit.findUnique({ where: { session_key: testSessionKey } });
    expect(dbVisit).toBeDefined();
    expect(dbVisit?.ip_hash).toBeDefined();
    expect(dbVisit?.ip_hash).not.toBe('203.162.0.1');
    expect(dbVisit?.ip_hash?.length).toBe(64); // SHA-256 hex length

    // C. Duplicate request with same session_key is idempotent (does NOT increment)
    const dupRes = await request(app)
      .post('/api/analytics/visit')
      .send({ session_key: testSessionKey });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.data.recorded).toBe(false);
  });
});
