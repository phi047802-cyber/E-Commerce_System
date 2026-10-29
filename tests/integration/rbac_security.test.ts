import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';

describe('RBAC & Data Privacy Security Tests (TC65, TC67)', () => {
  let renterToken: string;
  let companionToken: string;
  let csToken: string;
  let auditorToken: string;

  beforeAll(async () => {
    // Đăng nhập các tài khoản mẫu
    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter.body.data.token;

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = resComp.body.data.token;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    const resAuditor = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@instasquad.test', password: 'Demo@123456' });
    auditorToken = resAuditor.body.data.token;
  });

  it('1. Renter trying to call PUT /api/companion/profile should receive 403 FORBIDDEN', async () => {
    const res = await request(app)
      .put('/api/companion/profile')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ hourly_rate: 200000 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('2. Companion trying to view another user wallet should receive 403 FORBIDDEN', async () => {
    // companion1 cố gắng xem ví của renter1 (u-renter-01)
    const res = await request(app)
      .get('/api/wallet/u-renter-01')
      .set('Authorization', `Bearer ${companionToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('không có quyền xem');
  });

  it('3. Renter trying to view another user wallet should receive 403 FORBIDDEN', async () => {
    // renter1 cố gắng xem ví của companion1 (u-comp-01)
    const res = await request(app)
      .get('/api/wallet/u-comp-01')
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. User can view their own wallet via GET /api/wallet/me', async () => {
    const res = await request(app)
      .get('/api/wallet/me')
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.available_balance).toBe(500000);
  });

  it('5. Auditor CAN view another user wallet for auditing purposes', async () => {
    const res = await request(app)
      .get('/api/wallet/u-renter-01')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user_id).toBe('u-renter-01');
  });

  it('6. Regular Renter cannot access CS endpoints (GET /api/cs/cases)', async () => {
    const res = await request(app)
      .get('/api/cs/cases')
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('7. Companion cannot access CS endpoints (GET /api/cs/cases)', async () => {
    const res = await request(app)
      .get('/api/cs/cases')
      .set('Authorization', `Bearer ${companionToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('8. CS Agent CAN access CS endpoints', async () => {
    const res = await request(app)
      .get('/api/cs/cases')
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('9. Requests without Authorization header receive 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/wallet/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
