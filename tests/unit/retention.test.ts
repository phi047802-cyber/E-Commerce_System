import { describe, it, expect } from 'vitest';
import { computeRetention } from '../../server/src/modules/admin/retention.js';

/** G10 — Tỷ lệ Renter quay lại trong 30 ngày. */
describe('computeRetention (G10)', () => {
  const now = new Date('2026-11-19T00:00:00Z');
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);

  it('tính trên nhóm có đơn đầu ≥ 30 ngày; quay lại phải trong 30 ngày kể từ đơn đầu', () => {
    const r = computeRetention(
      [
        // A: đơn đầu 60 ngày trước, quay lại sau 10 ngày → quay lại
        { renter_id: 'A', held_at: daysAgo(60) },
        { renter_id: 'A', held_at: daysAgo(50) },
        // B: đơn đầu 60 ngày trước, đơn 2 sau 40 ngày → KHÔNG tính (ngoài cửa sổ 30 ngày)
        { renter_id: 'B', held_at: daysAgo(60) },
        { renter_id: 'B', held_at: daysAgo(20) },
        // C: chỉ 1 đơn, 45 ngày trước → không quay lại
        { renter_id: 'C', held_at: daysAgo(45) },
        // D: đơn 2 đúng 30 ngày sau đơn đầu → vẫn tính (biên ≤ 30 ngày)
        { renter_id: 'D', held_at: daysAgo(31) },
        { renter_id: 'D', held_at: daysAgo(1) },
        // E: đơn đầu 5 ngày trước (chưa đủ 30 ngày), đã quay lại → không vào mẫu số, đếm riêng
        { renter_id: 'E', held_at: daysAgo(5) },
        { renter_id: 'E', held_at: daysAgo(2) },
        // F: đơn đầu 10 ngày trước, chưa quay lại
        { renter_id: 'F', held_at: daysAgo(10) },
      ],
      now
    );
    expect(r).toMatchObject({
      renters_with_escrow: 6,
      eligible_renters: 4, // A, B, C, D
      returned_within_window: 2, // A, D
      retention_rate_pct: 50,
      renters_in_window: 2, // E, F
      early_returners_in_window: 1, // E
      target_pct: 30,
    });
  });

  it('thứ tự đầu vào không ảnh hưởng (đơn đầu = thời điểm sớm nhất)', () => {
    const r = computeRetention(
      [
        { renter_id: 'A', held_at: daysAgo(50) },
        { renter_id: 'A', held_at: daysAgo(60) },
      ],
      now
    );
    expect(r.returned_within_window).toBe(1);
    expect(r.retention_rate_pct).toBe(100);
  });

  it('chưa có Renter đủ 30 ngày → tỷ lệ null (không báo 0% sai lệch)', () => {
    const r = computeRetention([{ renter_id: 'X', held_at: daysAgo(3) }], now);
    expect(r.eligible_renters).toBe(0);
    expect(r.retention_rate_pct).toBeNull();
    expect(r.renters_in_window).toBe(1);
  });

  it('không có đơn ký quỹ nào', () => {
    const r = computeRetention([], now);
    expect(r).toMatchObject({ renters_with_escrow: 0, eligible_renters: 0, retention_rate_pct: null });
  });
});
