import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';
import crypto from 'crypto';

describe('Auth: Forgot Password & Email Verification (UC01)', () => {
  const testEmail = 'unverified_renter@instasquad.test';
  let testUserToken = '';
  let testUserId = '';

  beforeAll(async () => {
    // Xóa dữ liệu test cũ nếu có
    await prisma.authOtp.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Đăng ký user mới (mặc định is_email_verified = false)
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        display_name: 'Unverified Renter',
        role: 'RENTER',
        is_over_18: true,
      });

    expect(regRes.status).toBe(201);
    testUserToken = regRes.body.data.token;
    testUserId = regRes.body.data.user.user_id;

    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(dbUser?.is_email_verified).toBe(false);
  });

  it('1. Unverified user CANNOT create booking (403 EMAIL_NOT_VERIFIED)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        companion_id: 'u-comp-01',
        slot_id: 'slot-c1-01',
        request_key: `test-unverified-${Date.now()}`,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('2. Unverified user CANNOT create topup (403 EMAIL_NOT_VERIFIED)', async () => {
    const res = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        amount: 100000,
        provider: 'MOCK_VNPAY',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('3. Send OTP for email verification succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/send-verification-otp')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeDefined();

    const otpInDb = await prisma.authOtp.findFirst({
      where: { email: testEmail, purpose: 'EMAIL_VERIFICATION' },
    });
    expect(otpInDb).toBeDefined();
    expect(otpInDb?.otp_hash).toBeDefined();
  });

  it('4. Requesting OTP again immediately triggers rate limit 60s', async () => {
    const res = await request(app)
      .post('/api/auth/send-verification-otp')
      .send({ email: testEmail });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OTP_RATE_LIMITED');
  });

  it('5. Entering wrong OTP increments attempts and fails', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        otp: '000000',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OTP_INVALID');
  });

  it('6. Entering expired OTP fails with OTP_EXPIRED', async () => {
    // Cập nhật OTP trong DB thành hết hạn
    await prisma.authOtp.updateMany({
      where: { email: testEmail, purpose: 'EMAIL_VERIFICATION' },
      data: { expires_at: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        otp: '123456',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('7. Exceeding 5 attempts blocks further verification with OTP_MAX_ATTEMPTS_EXCEEDED', async () => {
    // Tạo OTP mới với attempts = 5 và expires_at trong tương lai
    const rawOtp = '654321';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    await prisma.authOtp.deleteMany({ where: { email: testEmail } });
    await prisma.authOtp.create({
      data: {
        email: testEmail,
        otp_hash: otpHash,
        purpose: 'EMAIL_VERIFICATION',
        attempts: 5,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        otp: rawOtp,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');
  });

  it('8. Successful email verification unlocks user', async () => {
    const rawOtp = '777888';
    const otpHash = crypto.createHmac('sha256', env.JWT_SECRET).update(rawOtp).digest('hex');

    await prisma.authOtp.deleteMany({ where: { email: testEmail } });
    await prisma.authOtp.create({
      data: {
        email: testEmail,
        otp_hash: otpHash,
        purpose: 'EMAIL_VERIFICATION',
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        otp: rawOtp,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.is_email_verified).toBe(true);

    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(dbUser?.is_email_verified).toBe(true);
  });

  it('9. Forgot password workflow: send OTP -> reset password with OTP', async () => {
    // Tạo OTP cho forgot password
    const rawForgotOtp = '999111';
    const otpHash = crypto.createHmac('sha256', env.JWT_SECRET).update(rawForgotOtp).digest('hex');

    await prisma.authOtp.deleteMany({ where: { email: testEmail } });
    await prisma.authOtp.create({
      data: {
        email: testEmail,
        otp_hash: otpHash,
        purpose: 'FORGOT_PASSWORD',
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Reset password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testEmail,
        otp: rawForgotOtp,
        new_password: 'NewSuperPassword2026!',
      });

    expect(resetRes.status).toBe(200);

    // Đăng nhập lại bằng mật khẩu mới
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'NewSuperPassword2026!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
  });

  it('10. Anti-enumeration: /forgot-password and /send-verification-otp return identical success response whether email exists or not', async () => {
    const nonExistentEmail = 'nonexistent_random_user_987654@instasquad.test';

    // Forgot password with non-existent email
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: nonExistentEmail });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.data.message).toBe('Nếu email tồn tại trong hệ thống, mã xác nhận OTP đã được gửi.');

    // Send verification OTP with non-existent email
    const verifyRes = await request(app)
      .post('/api/auth/send-verification-otp')
      .send({ email: nonExistentEmail });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.message).toBe('Nếu email tồn tại trong hệ thống và chưa xác minh, mã xác nhận OTP đã được gửi.');
  });
});
