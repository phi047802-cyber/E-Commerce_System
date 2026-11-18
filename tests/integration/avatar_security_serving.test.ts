import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Jimp } from 'jimp';
import { app } from '../../server/src/server.js';

describe('Avatar Security & Serving Verification (Đợt E2 - Mục C)', () => {
  let renterToken: string;
  let companionToken: string;
  let validPngBase64: string;

  beforeAll(async () => {
    // 1. Đăng nhập lấy JWT tokens
    const renterRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = renterRes.body.data.token;

    const compRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = compRes.body.data.token;

    // 2. Tạo ảnh PNG 64x64 hợp lệ có magic bytes
    const image = new Jimp({ width: 64, height: 64, color: 0xff0000ff });
    const buffer = await image.getBuffer('image/png');
    validPngBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
  });

  describe('1. Phục vụ tĩnh an toàn (Static Serving & Security Headers)', () => {
    let uploadedAvatarUrl: string;

    it('Tải lên avatar hợp lệ thành công và trả về avatar_url', async () => {
      const res = await request(app)
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          avatar_base64: validPngBase64,
          file_name: 'test-avatar.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar_url).toMatch(/^\/uploads\/avatars\/[a-f0-9-]+\.png$/);
      uploadedAvatarUrl = res.body.data.avatar_url;
    });

    it('GET đường dẫn avatar trả 200, đúng Content-Type và nosniff', async () => {
      expect(uploadedAvatarUrl).toBeTruthy();

      const res = await request(app).get(uploadedAvatarUrl);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/(png|webp)/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toContain('max-age=86400');
    });

    it('Chặn Path Traversal và truy cập file hệ thống ngoài thư mục avatar', async () => {
      const res1 = await request(app).get('/uploads/avatars/../server.ts');
      expect([403, 404]).toContain(res1.status);

      const res2 = await request(app).get('/uploads/avatars/.env');
      expect([403, 404]).toContain(res2.status);
    });

    it('Xóa avatar thành công và cập nhật hồ sơ về null', async () => {
      const delRes = await request(app)
        .delete('/api/me/avatar')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const profileRes = await request(app)
        .get('/api/me/profile')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.avatar_url).toBeNull();
    });
  });

  describe('2. Kiểm chứng avatar hiển thị đồng bộ qua API ở nhiều vị trí (Mục C.5)', () => {
    let companionAvatarUrl: string;
    let companionProfileId: string;

    beforeAll(async () => {
      // Tải avatar cho Companion Bảo Ngọc
      const res = await request(app)
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${companionToken}`)
        .send({
          avatar_base64: validPngBase64,
          file_name: 'bao-ngoc-avatar.png',
        });
      companionAvatarUrl = res.body.data.avatar_url;

      const profile = await request(app)
        .get('/api/companion/profile')
        .set('Authorization', `Bearer ${companionToken}`);
      companionProfileId = profile.body.data.profile_id;
    });

    it('Vị trí 1: API Hồ sơ cá nhân (/api/me/profile) trả avatar_url chính xác', async () => {
      const res = await request(app)
        .get('/api/me/profile')
        .set('Authorization', `Bearer ${companionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.avatar_url).toBe(companionAvatarUrl);
    });

    it('Vị trí 2: API Danh sách Companion (/api/companions) đồng bộ avatar_url của Companion', async () => {
      const res = await request(app).get('/api/companions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const companions = res.body.data;
      expect(Array.isArray(companions)).toBe(true);

      const baoNgoc = companions.find((c: any) => c.user?.display_name?.includes('Bảo Ngọc') || c.display_name?.includes('Bảo Ngọc'));
      expect(baoNgoc).toBeTruthy();
      const url = baoNgoc.avatar_url || baoNgoc.user?.avatar_url;
      expect(url).toBe(companionAvatarUrl);
    });

    it('Vị trí 3: API Chi tiết Companion (/api/companions/:id) trả đúng avatar', async () => {
      expect(companionProfileId).toBeTruthy();

      const res = await request(app).get(`/api/companions/${companionProfileId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const url = res.body.data.avatar_url || res.body.data.user?.avatar_url;
      expect(url).toBe(companionAvatarUrl);
    });
  });
});
