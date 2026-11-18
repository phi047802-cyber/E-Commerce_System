import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
import * as jose from 'jose';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';
import { setMockJWKS } from '../../server/src/modules/auth/google-auth.service.js';

describe('F2 - Google OAuth2 Authentication (FR-001, UC01)', () => {
  let privateKey: jose.KeyLike;
  let publicKey: jose.KeyLike;
  let otherPrivateKey: jose.KeyLike;

  const testClientId = env.GOOGLE_CLIENT_ID || 'mock-google-client-id-demo-2026.apps.googleusercontent.com';
  const testEmail = 'google_oauth_test_user@gmail.com';
  const existingEmail = 'existing_linked_user@gmail.com';

  beforeAll(async () => {
    // 1. Tạo cặp khóa RSA thử nghiệm cho môi trường test
    const keyPair = await jose.generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    const otherKeyPair = await jose.generateKeyPair('RS256');
    otherPrivateKey = otherKeyPair.privateKey;

    // Thiết lập mock JWKS resolver
    setMockJWKS(async () => publicKey);

    // 2. Tạo một tài khoản có sẵn để kiểm tra tính năng liên kết tài khoản
    await prisma.user.upsert({
      where: { email: existingEmail },
      update: { google_id: null },
      create: {
        email: existingEmail,
        password_hash: 'mock_password_hash',
        display_name: 'Người Dùng Có Sẵn',
        role: 'RENTER',
        is_email_verified: true,
      },
    });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.wallet.deleteMany({
      where: { user: { email: { in: [testEmail, existingEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, existingEmail] } },
    });
  });

  describe('1. Xác minh chữ ký RS256 và các trường kiểm định Token Google', () => {
    it('Từ chối khi token có chữ ký sai (Invalid Signature)', async () => {
      const invalidSigToken = await new jose.SignJWT({
        sub: 'google-sub-invalid-sig',
        email: 'invalid_sig@gmail.com',
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience(testClientId)
        .setExpirationTime('1h')
        .sign(otherPrivateKey); // Ký bằng private key khác

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: invalidSigToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/chữ ký/i);
    });

    it('Từ chối khi sai Audience (Invalid Audience)', async () => {
      const wrongAudToken = await new jose.SignJWT({
        sub: 'google-sub-wrong-aud',
        email: 'wrong_aud@gmail.com',
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience('unauthorized-client-id.apps.googleusercontent.com')
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: wrongAudToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Từ chối khi token đã hết hạn (Token Expired)', async () => {
      const expiredToken = await new jose.SignJWT({
        sub: 'google-sub-expired',
        email: 'expired@gmail.com',
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience(testClientId)
        .setExpirationTime('-10s') // Hết hạn 10 giây trước
        .sign(privateKey);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: expiredToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Từ chối khi email chưa được xác minh (email_verified = false)', async () => {
      const unverifiedToken = await new jose.SignJWT({
        sub: 'google-sub-unverified',
        email: 'unverified@gmail.com',
        email_verified: false,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience(testClientId)
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: unverifiedToken });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/xác minh địa chỉ email/i);
    });
  });

  describe('2. Đăng nhập người dùng mới và quy trình hoàn thiện hồ sơ (Onboarding)', () => {
    let newAuthToken: string;

    it('Đăng ký tài khoản mới qua Google thành công, đánh dấu needs_onboarding: true và CHƯA tạo ví', async () => {
      const validToken = await new jose.SignJWT({
        sub: 'google-sub-new-123456',
        email: testEmail,
        name: 'Nguyễn Văn Google',
        picture: 'https://lh3.googleusercontent.com/mock-avatar.jpg',
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience(testClientId)
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: validToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.needs_onboarding).toBe(true);
      expect(res.body.data.token).toBeDefined();

      newAuthToken = res.body.data.token;

      // Kiểm tra DB: User đã tạo nhưng ví chưa có
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { wallet: true },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.is_onboarding_completed).toBe(false);
      expect(dbUser?.wallet).toBeNull(); // Chưa có ví
    });

    it('Từ chối hoàn thiện hồ sơ khi người dùng dưới 18 tuổi', async () => {
      // Ngày sinh tương ứng 15 tuổi
      const underageDob = new Date();
      underageDob.setFullYear(underageDob.getFullYear() - 15);

      const res = await request(app)
        .post('/api/auth/google/complete-profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          role: 'RENTER',
          date_of_birth: underageDob.toISOString(),
          terms_accepted: true,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/18 tuổi/i);
    });

    it('Từ chối khi chưa đồng ý Điều khoản dịch vụ', async () => {
      const validDob = new Date();
      validDob.setFullYear(validDob.getFullYear() - 20);

      const res = await request(app)
        .post('/api/auth/google/complete-profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          role: 'RENTER',
          date_of_birth: validDob.toISOString(),
          terms_accepted: false,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Điều khoản dịch vụ/i);
    });

    it('Hoàn tất thông tin hồ sơ hợp lệ: Kích hoạt User, cập nhật Role và khởi tạo Wallet 0đ', async () => {
      const validDob = new Date();
      validDob.setFullYear(validDob.getFullYear() - 22);

      const res = await request(app)
        .post('/api/auth/google/complete-profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          role: 'RENTER',
          date_of_birth: validDob.toISOString(),
          terms_accepted: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.is_onboarding_completed).toBe(true);
      expect(res.body.data.user.wallet).not.toBeNull();
      expect(res.body.data.user.wallet.available_balance).toBe(0);

      // Kiểm tra trong DB
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { wallet: true },
      });
      expect(dbUser?.is_onboarding_completed).toBe(true);
      expect(dbUser?.wallet).not.toBeNull();
    });
  });

  describe('3. Liên kết tài khoản có sẵn (Account Linking by Verified Email)', () => {
    it('Đăng nhập Google bằng email đã có tài khoản: Tự động liên kết google_id vào tài khoản cũ', async () => {
      const linkToken = await new jose.SignJWT({
        sub: 'google-sub-linked-7890',
        email: existingEmail,
        name: 'Tên Từ Google',
        email_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://accounts.google.com')
        .setAudience(testClientId)
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ id_token: linkToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { email: existingEmail },
      });
      expect(dbUser?.google_id).toBe('google-sub-linked-7890');
    });
  });
});
