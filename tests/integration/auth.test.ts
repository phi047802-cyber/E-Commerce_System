import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';

describe('Auth & User Lifecycle API', () => {
  it('POST /api/auth/login should authenticate seeded renter1 and return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renter1@instasquad.test',
        password: 'Demo@123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('renter1@instasquad.test');
    expect(res.body.data.user.role).toBe('RENTER');
    expect(res.body.data.user.wallet.available_balance).toBe(500000);
  });

  it('POST /api/auth/login with wrong password should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renter1@instasquad.test',
        password: 'WrongPassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me should return authenticated user profile and wallet', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'renter1@instasquad.test',
        password: 'Demo@123456',
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('renter1@instasquad.test');
    expect(meRes.body.data.role).toBe('RENTER');
    expect(meRes.body.data.wallet.available_balance).toBe(500000);
  });

  it('POST /api/auth/register should create a new user and initial wallet', async () => {
    const randomEmail = `newuser_${Date.now()}@instasquad.test`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: randomEmail,
        password: 'Demo@123456',
        display_name: 'Người Chơi Mới',
        role: 'RENTER',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(randomEmail);
  });
});
