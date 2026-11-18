import { describe, it, expect } from 'vitest';
import { 
  userMessages, 
  formatVnd, 
  formatDateTime, 
  formatShortId, 
  getDisputeReasonLabel, 
  sanitizeUIMessage, 
  DISPUTE_REASON_LABELS 
} from '../../server/src/common/messages.vi.js';

describe('UI Messages & Text Standardization (Đợt E2 - Mục B)', () => {
  const FORBIDDEN_PATTERNS = [
    /\[?NHÓM ĐÃ CHỐT/i,
    /Charter/i,
    /\(D\d+\)/,
    /\(BR-\d+\)/,
    /REF-[A-Z]+-\d+/,
    /#([0-9a-f]{8})[0-9a-f-]{4,}/i,
    /\bNO_SHOW\b/,
    /\bEVIDENCE_PENDING\b/,
    /\bUNDER_REVIEW\b/,
    /\bPENALTY_DEBT\b/,
  ];

  function assertCleanText(text: string) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(pattern.test(text)).toBe(false);
    }
  }

  describe('Định dạng cơ bản (formatVnd, formatDateTime, formatShortId)', () => {
    it('định dạng số tiền VND tự nhiên có chữ đ', () => {
      expect(formatVnd(200000)).toBe('200.000đ');
      expect(formatVnd(176000)).toBe('176.000đ');
      expect(formatVnd(0)).toBe('0đ');
    });

    it('định dạng thời gian theo chuẩn Việt Nam', () => {
      const d = new Date(2026, 10, 15, 14, 30);
      const formatted = formatDateTime(d);
      expect(formatted).toBe('15/11/2026 14:30');
    });

    it('rút gọn ID thành mã ngắn dễ đọc (DSP-xxxx, BK-xxxx)', () => {
      expect(formatShortId('DSP', '59a5fd4e-1234-5678-90ab-cdef12345678')).toBe('DSP-5678');
      expect(formatShortId('BK', 'bk-4f8a-9999-aaaa-bbbb-cccc-dddd4f8a')).toBe('BK-4F8A');
      expect(formatShortId('BK', null)).toBe('BK');
    });
  });

  describe('Tham số hóa toàn bộ lý do khiếu nại (Reason Categories)', () => {
    const reasons = Object.keys(DISPUTE_REASON_LABELS);

    it.each(reasons)('dịch chính xác lý do %s sang tiếng Việt tự nhiên', (category) => {
      const label = getDisputeReasonLabel(category);
      expect(label).toBeTruthy();
      expect(label).not.toBe(category);
      assertCleanText(label);
    });

    it('trả về nhãn mặc định khi lý do undefined hoặc rỗng', () => {
      expect(getDisputeReasonLabel(null)).toBe('Lý do khác');
      expect(getDisputeReasonLabel(undefined)).toBe('Lý do khác');
      expect(getDisputeReasonLabel('UNKNOWN_REASON')).toBe('Lý do khác');
    });
  });

  describe('Bộ mẫu câu thông báo (userMessages)', () => {
    it('1. bookingAccepted: đơn được chấp nhận', () => {
      const n = userMessages.bookingAccepted('Bảo Ngọc', 'bk-1234-abcd');
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('Bảo Ngọc');
      expect(n.message).toContain('BK-ABCD');
      expect(n.target_url).toBe('/don-hang/bk-1234-abcd');
    });

    it('2. bookingRejected: đơn bị từ chối hoàn tiền', () => {
      const n = userMessages.bookingRejected('bk-1234-abcd', 200000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('200.000đ');
      expect(n.message).toContain('BK-ABCD');
    });

    it('3. bookingTimeoutRefund: hết hạn phản hồi 180s (Renter)', () => {
      const n = userMessages.bookingTimeoutRefund('bk-1234-abcd', 200000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('180 giây');
      expect(n.message).toContain('200.000đ');
    });

    it('4. companionMissedBooking: Companion bỏ lỡ đơn 180s', () => {
      const n = userMessages.companionMissedBooking('bk-1234-abcd');
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('180 giây');
      expect(n.message).toContain('3 điểm uy tín');
    });

    it('5. acceptanceRequired: mời nghiệm thu 15m', () => {
      const n = userMessages.acceptanceRequired('bk-1234-abcd', 15);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('15 phút');
    });

    it('6. escrowReleasedToCompanion: giải ngân thành công', () => {
      const n = userMessages.escrowReleasedToCompanion('bk-1234-abcd', 176000, 24000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('176.000đ');
      expect(n.message).toContain('cấn trừ 24.000đ nợ vi phạm');
    });

    it('7. disputeOpenedToRenter: tiếp nhận khiếu nại', () => {
      const n = userMessages.disputeOpenedToRenter('dsp-59a5fd4e', 200000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('200.000đ');
      expect(n.target_url).toBe('/khieu-nai/dsp-59a5fd4e');
    });

    it('8. disputeOpenedToCompanion: khiếu nại phát sinh gửi Companion', () => {
      const n = userMessages.disputeOpenedToCompanion('bk-4f8a-1111', 'dsp-59a5fd4e', 'NO_SHOW');
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('BK-1111');
      expect(n.message).toContain('Companion không vào phòng chơi đúng giờ');
    });

    it('9. disputeEvidenceRequested: yêu cầu chứng cứ bổ sung 24h', () => {
      const deadline = new Date(2026, 10, 16, 10, 0);
      const n = userMessages.disputeEvidenceRequested('dsp-59a5fd4e', deadline, 'Cung cấp ảnh lịch sử đấu');
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('Cung cấp ảnh lịch sử đấu');
    });

    it('10. disputeResolvedToRenter (lỗi >= 80%): hoàn 100% cho Renter', () => {
      const n = userMessages.disputeResolvedToRenter('dsp-59a5fd4e', 85, 200000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('85%');
      expect(n.message).toContain('200.000đ đã được hoàn về ví của bạn');
      // Tuyệt đối không nêu tỷ lệ chia 12% sàn hay nợ phạt nội bộ
      expect(n.message).not.toContain('12%');
      expect(n.message).not.toContain('PENALTY_DEBT');
    });

    it('11. disputeResolvedToRenter (lỗi < 80%): giải ngân cho Companion', () => {
      const n = userMessages.disputeResolvedToRenter('dsp-59a5fd4e', 70, 0);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('70%');
      expect(n.message).toContain('chưa đạt ngưỡng hoàn tiền');
      expect(n.message).not.toContain('12%');
    });

    it('12. disputeResolvedToCompanion (lỗi >= 80%): phạt vi phạm', () => {
      const n = userMessages.disputeResolvedToCompanion('dsp-59a5fd4e', 85, 0, 40000, 30000);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('40.000đ');
      expect(n.message).toContain('nợ vi phạm 30.000đ');
      expect(n.message).not.toContain('PENALTY_DEBT');
    });

    it('13. disputeResolvedToCompanion (lỗi < 80%): nhận thu nhập', () => {
      const n = userMessages.disputeResolvedToCompanion('dsp-59a5fd4e', 50, 176000, 0);
      assertCleanText(n.title);
      assertCleanText(n.message);
      expect(n.message).toContain('DSP-FD4E');
      expect(n.message).toContain('176.000đ');
    });

    it('14. topupSuccess & topupLate: nạp tiền vào ví', () => {
      const n1 = userMessages.topupSuccess(500000, 'SePay');
      assertCleanText(n1.title);
      assertCleanText(n1.message);
      expect(n1.message).toContain('500.000đ');

      const n2 = userMessages.topupLate(200000);
      assertCleanText(n2.title);
      assertCleanText(n2.message);
      expect(n2.message).toContain('200.000đ');
    });

    it('15. bookingCancelledRefund100 & bookingCancelledRefund70: hủy đơn', () => {
      const n1 = userMessages.bookingCancelledRefund100('bk-1234', 200000);
      assertCleanText(n1.message);
      expect(n1.message).toContain('200.000đ');

      const n2 = userMessages.bookingCancelledRefund70('bk-1234', 140000, 60000);
      assertCleanText(n2.message);
      expect(n2.message).toContain('140.000đ');
      expect(n2.message).toContain('60.000đ');
    });
  });

  describe('Bộ lọc làm sạch (sanitizeUIMessage)', () => {
    it('loại bỏ sạch [NHÓM ĐÃ CHỐT ...], (D22), (BR-02), REF-AUTH-02', () => {
      const dirty = '[NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định] (D22) Lỗi phán quyết NO_SHOW cho đơn #59a5fd4eb123: Phạt 20% (REF-MOD-01)';
      const cleaned = sanitizeUIMessage(dirty);
      assertCleanText(cleaned);
      expect(cleaned).toContain('không vào phòng chơi đúng giờ');
      expect(cleaned).toContain('#FD4E');
      expect(cleaned).not.toContain('NHÓM ĐÃ CHỐT');
      expect(cleaned).not.toContain('D22');
      expect(cleaned).not.toContain('Charter');
    });
  });
});
