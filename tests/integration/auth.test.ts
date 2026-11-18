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

  it('POST /api/auth/register should reject registration if is_over_18 is false (REF-AUTH-02)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `underage_${Date.now()}@instasquad.test`,
        password: 'Demo@123456',
        display_name: 'Người Chơi Trẻ',
        role: 'RENTER',
        is_over_18: false,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNDERAGE_REGISTRATION');
  });

  it('POST /api/auth/register should reject registration if date_of_birth is under 18 years old (REF-AUTH-02)', async () => {
    const currentYear = new Date().getFullYear();
    const underageYear = currentYear - 15; // 15 tuổi
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `underage_dob_${Date.now()}@instasquad.test`,
        password: 'Demo@123456',
        display_name: 'Game Thủ 15 Tuổi',
        role: 'RENTER',
        is_over_18: true,
        date_of_birth: `${underageYear}-05-15`,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNDERAGE_REGISTRATION');
  });

  it('POST /api/auth/register should accept registration when verified 18+ (REF-AUTH-02)', async () => {
    const validEmail = `adult_${Date.now()}@instasquad.test`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: validEmail,
        password: 'Demo@123456',
        display_name: 'Game Thủ Đủ 18 Tuổi',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2000-01-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validEmail);
  });
});
