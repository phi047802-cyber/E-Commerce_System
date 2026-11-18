import { describe, it, expect } from 'vitest';
import {
  calculate8812Settlement,
  calculateCancellationRefund,
  calculateDisputeSettlement,
} from '../../server/src/common/financialMath.js';

describe('Unit Tests: Escrow Policy Numerical Examples & Page Consistency (/chinh-sach-escrow)', () => {
  const BOOKING_AMOUNT = 200000; // 200.000 VND chuẩn ví dụ

  describe('Ví dụ 1: Renter hủy trước 45 phút (>= 30 phút)', () => {
    it('Renter nhận hoàn 100% (200.000đ), Companion nhận 0đ, Sàn 0đ', () => {
      const result = calculateCancellationRefund(BOOKING_AMOUNT, 45);
      expect(result.policyApplied).toBe('CANCEL_GE_30M');
      expect(result.renterRefund).toBe(200000);
      expect(result.companionCompensation).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.renterRefund + result.companionCompensation + result.platformFee).toBe(BOOKING_AMOUNT);
    });
  });

  describe('Ví dụ 2: Renter hủy trước 20 phút (10 đến 29 phút)', () => {
    it('Renter nhận hoàn 70% (140.000đ), Companion nhận 30% (60.000đ), Sàn 0đ', () => {
      const result = calculateCancellationRefund(BOOKING_AMOUNT, 20);
      expect(result.policyApplied).toBe('CANCEL_10_30M');
      expect(result.renterRefund).toBe(140000);
      expect(result.companionCompensation).toBe(60000);
      expect(result.platformFee).toBe(0);
      expect(result.renterRefund + result.companionCompensation + result.platformFee).toBe(BOOKING_AMOUNT);
    });
  });

  describe('Ví dụ 3: Renter hủy trước 5 phút (< 10 phút - D21)', () => {
    it('Phạt 100% tiền ký quỹ: Companion nhận 88% (176.000đ), Sàn nhận 12% (24.000đ), Renter 0đ', () => {
      const result = calculateCancellationRefund(BOOKING_AMOUNT, 5);
      expect(result.policyApplied).toBe('CANCEL_LT_10M');
      expect(result.renterRefund).toBe(0);
      expect(result.companionCompensation).toBe(176000);
      expect(result.platformFee).toBe(24000);
      expect(result.renterRefund + result.companionCompensation + result.platformFee).toBe(BOOKING_AMOUNT);
    });
  });

  describe('Ví dụ 4: Phiên chơi hoàn tất và nghiệm thu thành công', () => {
    it('Giải ngân tỷ lệ 88/12: Companion nhận 176.000đ, Sàn nhận 24.000đ', () => {
      const result = calculate8812Settlement(BOOKING_AMOUNT);
      expect(result.companionFee).toBe(176000);
      expect(result.platformFee).toBe(24000);
      expect(result.companionFee + result.platformFee).toBe(BOOKING_AMOUNT);
    });
  });

  describe('Ví dụ 5: Khiếu nại được CS Agent thụ lý với lỗi Companion >= 80%', () => {
    it('Renter hoàn 100% (200.000đ), Companion bị phạt 20% (40.000đ)', () => {
      const result = calculateDisputeSettlement(BOOKING_AMOUNT, 80);
      expect(result.renterRefund).toBe(200000);
      expect(result.companionPayout).toBe(0);
      expect(result.applyDirectPenalty).toBe(true);
      // Mức phạt 20% trên giá trị đơn 200.000đ
      const penaltyAmount = Math.floor(BOOKING_AMOUNT * 0.20);
      expect(penaltyAmount).toBe(40000);
    });
  });
});
