import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('ĐỢT F-FIX: Sửa lỗi eKYC của Companion mới (Mục C)', () => {
  const dummy1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('C.1 & C.2: Đăng ký Companion mới tự động tạo CompanionProfile mặc định', async () => {
    const email = `comp_reg_${Date.now()}@test.instasquad.vn`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Ngân Thanh',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2001-08-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    // Kiểm tra CompanionProfile trong DB
    const profile = await prisma.companionProfile.findUnique({
      where: { user_id: res.body.data.user.user_id },
    });
    expect(profile).not.toBeNull();
    expect(profile?.trust_score).toBe(80.0);
    expect(profile?.verification_status).toBe('UNVERIFIED');
  });

  it('C.3: Companion mới nộp eKYC (3 ảnh hợp lệ) thành công với trạng thái PENDING', async () => {
    const email = `comp_ekyc_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Ngân Thanh eKYC',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2000-03-25',
      });

    const token = regRes.body.data.token;

    // Nộp eKYC
    const kycRes = await request(app)
      .post('/api/companion/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idFrontBase64: dummy1x1Png,
        idBackBase64: dummy1x1Png,
        selfieBase64: dummy1x1Png,
      });

    expect(kycRes.status).toBe(201);
    expect(kycRes.body.success).toBe(true);
    expect(kycRes.body.data.status).toBe('PENDING');

    // Kiểm tra trong DB: CompanionProfile chuyển sang PENDING_REVIEW
    const profile = await prisma.companionProfile.findUnique({
      where: { user_id: regRes.body.data.user.user_id },
    });
    expect(profile?.verification_status).toBe('PENDING_REVIEW');
  });

  it('C.4: Tài khoản Renter bị từ chối 403 khi cố nộp hồ sơ eKYC', async () => {
    const email = `renter_block_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Khách Hàng Renter',
        role: 'RENTER',
        is_over_18: true,
        date_of_birth: '1995-10-12',
      });

    const token = regRes.body.data.token;

    const kycRes = await request(app)
      .post('/api/companion/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idFrontBase64: dummy1x1Png,
        idBackBase64: dummy1x1Png,
        selfieBase64: dummy1x1Png,
      });

    expect(kycRes.status).toBe(403);
    expect(kycRes.body.success).toBe(false);
    expect(kycRes.body.error?.message).toMatch(/Vai trò|Companion/i);
  });

  it('C.5: Tự động bù CompanionProfile cho tài khoản Companion cũ bị thiếu hồ sơ', async () => {
    // Tạo user Companion trực tiếp trong DB không qua register (không có companionProfile)
    const legacyUser = await prisma.user.create({
      data: {
        email: `legacy_comp_${Date.now()}@test.instasquad.vn`,
        password_hash: 'mock_hash',
        display_name: 'Companion Cũ',
        role: 'COMPANION',
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: legacyUser.email,
        password: 'Demo@123456', // Sẽ dùng token sinh thủ công
      });

    // Giả lập token
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign(
      { user_id: legacyUser.user_id, email: legacyUser.email, role: 'COMPANION', display_name: legacyUser.display_name },
      process.env.JWT_SECRET || 'dev_secret_fallback_do_not_use_in_prod'
    );

    // Gọi API nộp eKYC: Service tự động bù profile và xử lý thành công!
    const kycRes = await request(app)
      .post('/api/companion/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idFrontBase64: dummy1x1Png,
        idBackBase64: dummy1x1Png,
        selfieBase64: dummy1x1Png,
      });

    expect(kycRes.status).toBe(201);
    expect(kycRes.body.success).toBe(true);

    const healedProfile = await prisma.companionProfile.findUnique({
      where: { user_id: legacyUser.user_id },
    });
    expect(healedProfile).not.toBeNull();
  });
});
