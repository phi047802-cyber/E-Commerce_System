import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('ĐỢT G0: Hồ sơ Companion ở trạng thái INCOMPLETE (Mục B.6)', () => {
  const dummy1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('1. Đăng ký Companion mới: hồ sơ INCOMPLETE, game, rank, giá, mã in-game rỗng (null)', async () => {
    const email = `comp_g0_reg_${Date.now()}@test.instasquad.vn`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Ngân Thanh G0',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2001-08-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    const profile = await prisma.companionProfile.findUnique({
      where: { user_id: res.body.data.user.user_id },
    });

    expect(profile).not.toBeNull();
    expect(profile?.profile_status).toBe('INCOMPLETE');
    expect(profile?.game_id).toBeNull();
    expect(profile?.verified_tier_id).toBeNull();
    expect(profile?.hourly_rate).toBeNull();
    expect(profile?.game_account_id).toBeNull();
    expect(profile?.availability).toBe('OFFLINE');
    expect(profile?.verification_status).toBe('UNVERIFIED');
  });

  it('2. Companion INCOMPLETE không xuất hiện trong danh sách công khai', async () => {
    const email = `comp_g0_hidden_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Companion Ẩn',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2000-05-15',
      });

    const companionUserId = regRes.body.data.user.user_id;

    const catRes = await request(app).get('/api/companions');
    expect(catRes.status).toBe(200);
    expect(catRes.body.success).toBe(true);

    const found = catRes.body.data.some((c: any) => c.user_id === companionUserId);
    expect(found).toBe(false);
  });

  it('3. Companion INCOMPLETE cố tình mở khung giờ rảnh bị từ chối 422', async () => {
    const email = `comp_g0_slot_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Companion Mở Slot',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2000-01-20',
      });

    const token = regRes.body.data.token;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(16, 0, 0, 0);

    const slotRes = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${token}`)
      .send({
        start_time: tomorrow.toISOString(),
        end_time: tomorrowEnd.toISOString(),
      });

    expect(slotRes.status).toBe(422);
    expect(slotRes.body.success).toBe(false);
    expect(slotRes.body.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('4. Companion INCOMPLETE vẫn nộp được eKYC', async () => {
    const email = `comp_g0_ekyc_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Companion eKYC INCOMPLETE',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '1999-12-12',
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

    expect(kycRes.status).toBe(201);
    expect(kycRes.body.success).toBe(true);
    expect(kycRes.body.data.status).toBe('PENDING');
  });

  it('5. Cập nhật hồ sơ với bậc rank ngoài danh sách của game bị từ chối 422', async () => {
    const email = `comp_g0_bad_rank_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Companion Rank Lỗi',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '1998-03-10',
      });

    const token = regRes.body.data.token;

    // Chọn game VALORANT nhưng gán tier LMHT_CHALLENGER
    const updateRes = await request(app)
      .put('/api/companion/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        game_id: 'VALORANT',
        verified_tier_id: 'LMHT_CHALLENGER',
        hourly_rate: 100000,
        game_account_id: 'TestPlayer#123',
      });

    expect(updateRes.status).toBe(422);
    expect(updateRes.body.success).toBe(false);
    expect(updateRes.body.error.code).toBe('INVALID_RANK_FOR_GAME');
  });

  it('6. Hoàn thiện hồ sơ đầy đủ -> ACTIVE, xuất hiện đúng game và mở được slot', async () => {
    const email = `comp_g0_complete_${Date.now()}@test.instasquad.vn`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Demo@123456',
        display_name: 'Ngân Thanh Hoàn Thiện',
        role: 'COMPANION',
        is_over_18: true,
        date_of_birth: '2001-08-10',
      });

    const token = regRes.body.data.token;
    const userId = regRes.body.data.user.user_id;

    // Hoàn thiện thông tin
    const updateRes = await request(app)
      .put('/api/companion/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        game_id: 'LMHT',
        verified_tier_id: 'LMHT_DIAMOND',
        hourly_rate: 120000,
        game_account_id: 'NganThanh#VN1',
        bio: 'Chuyên hỗ trợ leo rank vui vẻ văn minh.',
        availability: 'ONLINE',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.profile_status).toBe('ACTIVE');
    expect(updateRes.body.data.game_id).toBe('LMHT');
    expect(updateRes.body.data.hourly_rate).toBe(120000);

    // Xuất hiện trong danh sách công khai
    const catRes = await request(app).get('/api/companions?game_id=LMHT');
    expect(catRes.status).toBe(200);
    const found = catRes.body.data.find((c: any) => c.user_id === userId);
    expect(found).toBeDefined();
    expect(found.hourly_rate).toBe(120000);

    // Mở được khung giờ rảnh
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(17, 0, 0, 0);

    const slotRes = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${token}`)
      .send({
        start_time: tomorrow.toISOString(),
        end_time: tomorrowEnd.toISOString(),
      });

    expect(slotRes.status).toBe(201);
    expect(slotRes.body.success).toBe(true);
  });
});
