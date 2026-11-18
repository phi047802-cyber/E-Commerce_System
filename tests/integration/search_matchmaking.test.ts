import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { mockGameRankProvider } from '../../server/src/modules/companion/game-rank-provider.js';

describe('F4: Tìm kiếm và ghép cặp nâng cao (FR-002, UC02)', () => {
  beforeAll(async () => {
    // Đảm bảo có dữ liệu mẫu trong DB
  });

  afterAll(async () => {
    mockGameRankProvider.setSimulateUnavailable(false);
  });

  describe('1. Lọc theo 5 tiêu chí (FR-002, UC02)', () => {
    it('1.1. Lọc theo game_id trả về đúng companion của game đó', async () => {
      const res = await request(app).get('/api/companions?game_id=LMHT');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(Array.isArray(data)).toBe(true);
      data.forEach((comp: any) => {
        expect(comp.game_id).toBe('LMHT');
      });
    });

    it('1.2. Lọc theo rank/tier_id', async () => {
      const res = await request(app).get('/api/companions?tier_id=LMHT-CHALLENGER');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      data.forEach((comp: any) => {
        expect(comp.verified_tier_id).toBe('LMHT-CHALLENGER');
      });
    });

    it('1.3. Lọc theo mức giá theo giờ (min_price, max_price)', async () => {
      const minPrice = 80000;
      const maxPrice = 160000;
      const res = await request(app).get(`/api/companions?min_price=${minPrice}&max_price=${maxPrice}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      data.forEach((comp: any) => {
        expect(comp.hourly_rate).toBeGreaterThanOrEqual(minPrice);
        expect(comp.hourly_rate).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('1.4. Lọc theo TrustScore tối thiểu (min_trust_score)', async () => {
      const minTrust = 90;
      const res = await request(app).get(`/api/companions?min_trust_score=${minTrust}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      data.forEach((comp: any) => {
        expect(comp.trust_score).toBeGreaterThanOrEqual(minTrust);
      });
    });

    it('1.5. Lọc kết hợp nhiều tiêu chí cùng lúc (game, price, trust_score)', async () => {
      const res = await request(app).get('/api/companions?game_id=LMHT&min_trust_score=80&min_price=50000');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      data.forEach((comp: any) => {
        expect(comp.game_id).toBe('LMHT');
        expect(comp.trust_score).toBeGreaterThanOrEqual(80);
        expect(comp.hourly_rate).toBeGreaterThanOrEqual(50000);
      });
    });
  });

  describe('2. Xử lý tiêu chí một phần (UC02 Luồng 2a) & Trạng thái trống (UC02 Luồng 4a)', () => {
    it('2.1. Tìm kiếm với tiêu chí một phần vẫn hoạt động trơn tru (chỉ lọc theo giá)', async () => {
      const res = await request(app).get('/api/companions?min_price=100000');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('2.2. Bộ lọc không có kết quả trả về trạng thái trống kèm thông điệp hỗ trợ (UC02 4a)', async () => {
      const res = await request(app).get('/api/companions?min_price=999999999&paginated=true');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.empty_message).toContain('Không tìm thấy đồng đội phù hợp');
    });
  });

  describe('3. Sắp xếp (Sort) và Phân trang (Pagination)', () => {
    it('3.1. Sắp xếp theo giá tăng dần (price_asc)', async () => {
      const res = await request(app).get('/api/companions?sort_by=price_asc');
      expect(res.status).toBe(200);
      const data = res.body.data;
      for (let i = 1; i < data.length; i++) {
        expect(data[i].hourly_rate).toBeGreaterThanOrEqual(data[i - 1].hourly_rate);
      }
    });

    it('3.2. Sắp xếp theo giá giảm dần (price_desc)', async () => {
      const res = await request(app).get('/api/companions?sort_by=price_desc');
      expect(res.status).toBe(200);
      const data = res.body.data;
      for (let i = 1; i < data.length; i++) {
        expect(data[i].hourly_rate).toBeLessThanOrEqual(data[i - 1].hourly_rate);
      }
    });

    it('3.3. Sắp xếp theo TrustScore giảm dần (trust_score)', async () => {
      const res = await request(app).get('/api/companions?sort_by=trust_score');
      expect(res.status).toBe(200);
      const data = res.body.data;
      for (let i = 1; i < data.length; i++) {
        expect(data[i].trust_score).toBeLessThanOrEqual(data[i - 1].trust_score);
      }
    });

    it('3.4. Phân trang trả về cấu trúc phân trang chuẩn (page, limit, total, total_pages)', async () => {
      const res = await request(app).get('/api/companions?page=1&limit=2&paginated=true');
      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.items.length).toBeLessThanOrEqual(2);
      expect(res.header['x-total-count']).toBeDefined();
      expect(res.header['x-page']).toBe('1');
    });
  });

  describe('4. Xác thực eKYC & MockGameRankProvider (FR-002, UC02)', () => {
    it('4.1. Companion trả về cờ is_kyc_verified và kyc_badge', async () => {
      const res = await request(app).get('/api/companions');
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.length).toBeGreaterThan(0);
      data.forEach((c: any) => {
        expect(typeof c.is_kyc_verified).toBe('boolean');
        expect(['VERIFIED', 'UNVERIFIED']).toContain(c.kyc_badge);
      });
    });

    it('4.2. MockGameRankProvider xác minh rank chuẩn trả về VERIFIED_MOCK', async () => {
      mockGameRankProvider.setSimulateUnavailable(false);
      const result = await mockGameRankProvider.verifyRank('riot-acc-123', 'LMHT', 'LMHT-CHALLENGER');
      expect(result.verified).toBe(true);
      expect(result.provider_status).toBe('VERIFIED_MOCK');
      expect(result.is_simulated).toBe(true);
      expect(result.note).toContain('Đã đối chiếu (mô phỏng)');
    });

    it('4.3. MockGameRankProvider xử lý ngoại lệ Game API lỗi / không phản hồi (UC02 Luồng ngoại lệ 2)', async () => {
      // Khi nhà cung cấp lỗi hoặc không phản hồi
      mockGameRankProvider.setSimulateUnavailable(true);
      const result = await mockGameRankProvider.verifyRank('riot-acc-123', 'LMHT', 'LMHT-CHALLENGER');
      expect(result.verified).toBe(false);
      expect(result.provider_status).toBe('PROVIDER_UNAVAILABLE');
      expect(result.is_simulated).toBe(true);
      expect(result.note).toContain('không phản hồi');
      expect(result.note).toContain('theo khai báo');
      mockGameRankProvider.setSimulateUnavailable(false);
    });

    it('4.4. MockGameRankProvider phát hiện rank không khớp (MISMATCH)', async () => {
      const result = await mockGameRankProvider.verifyRank('riot-acc-mismatch', 'LMHT', 'LMHT-CHALLENGER');
      expect(result.verified).toBe(false);
      expect(result.provider_status).toBe('MISMATCH');
      expect(result.note).toContain('không khớp');
    });
  });

  describe('5. Thuật toán gợi ý ghép cặp (Matchmaking recommendation score & explanation)', () => {
    it('5.1. Companion trả về match_score (0-100) và bảng bóc tách điểm (match_breakdown)', async () => {
      const res = await request(app).get('/api/companions?game_id=LMHT&min_price=100000&max_price=200000');
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.length).toBeGreaterThan(0);

      const first = data[0];
      expect(typeof first.match_score).toBe('number');
      expect(first.match_score).toBeGreaterThanOrEqual(0);
      expect(first.match_score).toBeLessThanOrEqual(100);

      expect(first.match_breakdown).toBeDefined();
      expect(typeof first.match_breakdown.game).toBe('number');
      expect(typeof first.match_breakdown.rank).toBe('number');
      expect(typeof first.match_breakdown.price).toBe('number');
      expect(typeof first.match_breakdown.slot).toBe('number');
      expect(typeof first.match_breakdown.trust).toBe('number');
      expect(typeof first.match_breakdown.explanation).toBe('string');
      expect(first.match_breakdown.explanation.length).toBeGreaterThan(5);
    });
  });
});
