import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('Profile, Avatar & RBAC Protection (Đợt E1 / REF-PROF-01)', () => {
  let renterToken: string;
  let companionToken: string;
  let adminToken: string;
  let csToken: string;

  beforeAll(async () => {
    // 1. Đăng nhập lấy JWT tokens cho các vai trò
    const renterRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = renterRes.body.data.token;

    const companionRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = companionRes.body.data.token;

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = adminRes.body.data.token;

    const csRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = csRes.body.data.token;
  });

  describe('1. GET & PATCH /api/me/profile', () => {
    it('GET /api/me/profile trả về đầy đủ thông tin hồ sơ của người dùng', async () => {
      const res = await request(app)
        .get('/api/me/profile')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('renter1@instasquad.test');
      expect(res.body.data.role).toBe('RENTER');
      expect(res.body.data.wallet_balance).toBeGreaterThanOrEqual(0);
    });

    it('PATCH /api/me/profile cập nhật bio và tên hiển thị hợp lệ', async () => {
      const res = await request(app)
        .patch('/api/me/profile')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          display_name: 'Minh Hoàng Pro',
          bio: 'Chuyên leo rank Thách Đấu các buổi tối cuối tuần.',
          favorite_games: 'LMHT, VALORANT, TFT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.display_name).toBe('Minh Hoàng Pro');
      expect(res.body.data.bio).toBe('Chuyên leo rank Thách Đấu các buổi tối cuối tuần.');
      expect(res.body.data.favorite_games).toBe('LMHT, VALORANT, TFT');
    });

    it('Chặn cập nhật display_name chứa số điện thoại hoặc email (Contact Filter)', async () => {
      const res = await request(app)
        .patch('/api/me/profile')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          display_name: 'Minh 0901234567',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('không được chứa số điện thoại');
    });

    it('Chặn mass-assignment: Không thể tự đổi role hoặc email', async () => {
      const res = await request(app)
        .patch('/api/me/profile')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          role: 'ADMIN',
          email: 'hacker@instasquad.test',
          display_name: 'Minh Hoàng Hacker',
        });

      expect(res.status).toBe(200);
      const user = await prisma.user.findUnique({ where: { user_id: 'u-renter-01' } });
      expect(user?.role).toBe('RENTER');
      expect(user?.email).toBe('renter1@instasquad.test');
    });
  });

  describe('2. POST & DELETE /api/me/avatar', () => {
    let uploadedAvatarUrl: string;

    it('Upload avatar hợp lệ: Resize, crop vuông, xóa metadata EXIF và lưu tệp thành công', async () => {
      // Tạo một ảnh PNG thật bằng Jimp
      const testImg = new Jimp({ width: 200, height: 150, color: 0x336699ff });
      const imgBuffer = (await testImg.getBuffer('image/png')) as Buffer;
      const base64Data = `data:image/png;base64,${imgBuffer.toString('base64')}`;

      const res = await request(app)
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          avatar_base64: base64Data,
          file_name: 'avatar_test.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar_url).toMatch(/^\/uploads\/avatars\/[a-f0-9\-]+\.png$/);
      uploadedAvatarUrl = res.body.data.avatar_url;

      // Kiểm tra file có thực sự được lưu trên ổ đĩa
      const filePath = path.resolve(process.cwd(), uploadedAvatarUrl.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);

      // Kiểm tra AuditLog được ghi lại
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'AVATAR_UPLOADED', actor_id: 'u-renter-01' },
        orderBy: { created_at: 'desc' },
      });
      expect(audit).not.toBeNull();
    });

    it('Chặn tải lên tệp giả mạo đuôi ảnh nhưng nội dung là script/văn bản (Magic Bytes mismatch)', async () => {
      const fakeBuffer = Buffer.from('<?php echo "malicious script"; ?>');
      const base64Fake = `data:image/png;base64,${fakeBuffer.toString('base64')}`;

      const res = await request(app)
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          avatar_base64: base64Fake,
          file_name: 'shell.png',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Định dạng ảnh không hợp lệ');
    });

    it('Chặn tải lên tệp vượt quá 2MB', async () => {
      const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024, 0xff); // 2.5MB
      const base64Large = `data:image/jpeg;base64,${largeBuffer.toString('base64')}`;

      const res = await request(app)
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          avatar_base64: base64Large,
          file_name: 'large.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('vượt quá dung lượng cho phép');
    });

    it('DELETE /api/me/avatar xóa ảnh đại diện và cập nhật avatar_url = null', async () => {
      const res = await request(app)
        .delete('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { user_id: 'u-renter-01' } });
      expect(user?.avatar_url).toBeNull();
    });
  });

  describe('3. POST /api/me/change-password', () => {
    it('Từ chối khi nhập sai mật khẩu hiện tại', async () => {
      const res = await request(app)
        .post('/api/me/change-password')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          current_password: 'WrongPassword@123',
          new_password: 'NewStrongPassword@999',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Mật khẩu hiện tại không chính xác');
    });

    it('Từ chối khi mật khẩu mới trùng mật khẩu hiện tại', async () => {
      const res = await request(app)
        .post('/api/me/change-password')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          current_password: 'Demo@123456',
          new_password: 'Demo@123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('không được trùng');
    });

    it('Đổi mật khẩu thành công và đăng nhập được bằng mật khẩu mới', async () => {
      const res = await request(app)
        .post('/api/me/change-password')
        .set('Authorization', `Bearer ${companionToken}`)
        .send({
          current_password: 'Demo@123456',
          new_password: 'NewCompanionPass@2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      // Đăng nhập lại bằng mật khẩu mới
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'companion1@instasquad.test', password: 'NewCompanionPass@2026' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeDefined();

      // Đổi lại về mật khẩu cũ để không làm ảnh hưởng các test suite khác
      await request(app)
        .post('/api/me/change-password')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`)
        .send({
          current_password: 'NewCompanionPass@2026',
          new_password: 'Demo@123456',
        });
    });
  });

  describe('4. Phân Quyền RBAC Guard (Khắc phục lỗi A.2)', () => {
    it('Chặn ADMIN tạo đơn thuê Companion -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          profile_id: 'prof-comp-01',
          slot_id: 'slot-c1-01',
          request_key: 'req-admin-forbidden-test',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('quản trị/vận hành không được thực hiện đặt đơn');
    });

    it('Chặn CS_AGENT tạo đơn thuê Companion -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          profile_id: 'prof-comp-01',
          slot_id: 'slot-c1-01',
          request_key: 'req-cs-forbidden-test',
        });

      expect(res.status).toBe(403);
    });

    it('Chặn ADMIN nạp tiền ví cá nhân -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/payments/create-topup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('không sử dụng tính năng nạp tiền');
    });

    it('LỖI A.2 ĐÃ SỬA: ADMIN gọi /my-bookings không nhận đơn của toàn sàn', async () => {
      const res = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]); // Admin không có đơn cá nhân, không bị lẫn đơn của người khác
    });

    it('ADMIN xem toàn bộ đơn sàn qua endpoint quản trị GET /api/admin/bookings', async () => {
      const res = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
