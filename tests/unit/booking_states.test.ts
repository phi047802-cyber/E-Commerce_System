import { describe, it, expect } from 'vitest';
import { isBookingActive, getBookingGroup, getBookingStatusLabel } from '../../server/src/common/bookingStates.js';

describe('Booking States Standardization (UI_STATES / Mục B)', () => {
  describe('isBookingActive', () => {
    it('trả về true cho các trạng thái đang hoạt động thông thường', () => {
      expect(isBookingActive({ status: 'PENDING_ACCEPTANCE' })).toBe(true);
      expect(isBookingActive({ status: 'WAITING_COMPANION_RESPONSE' })).toBe(true);
      expect(isBookingActive({ status: 'ACCEPTED' })).toBe(true);
      expect(isBookingActive({ status: 'CONFIRMED' })).toBe(true);
      expect(isBookingActive({ status: 'IN_SESSION' })).toBe(true);
      expect(isBookingActive({ status: 'WAITING_RENTER_CONFIRM' })).toBe(true);
    });

    it('trả về false cho các trạng thái kết thúc dứt điểm', () => {
      expect(isBookingActive({ status: 'COMPLETED' })).toBe(false);
      expect(isBookingActive({ status: 'REFUNDED' })).toBe(false);
      expect(isBookingActive({ status: 'CANCELLED' })).toBe(false);
      expect(isBookingActive({ status: 'REJECTED' })).toBe(false);
      expect(isBookingActive({ status: 'TIMEOUT' })).toBe(false);
    });

    it('khiếu nại DISPUTED đang mở/chờ chứng cứ/xem xét được tính là ĐANG HOẠT ĐỘNG', () => {
      expect(isBookingActive({ status: 'DISPUTED', dispute: { status: 'OPEN' } })).toBe(true);
      expect(isBookingActive({ status: 'DISPUTED', dispute: { status: 'EVIDENCE_PENDING' } })).toBe(true);
      expect(isBookingActive({ status: 'DISPUTED', dispute: { status: 'UNDER_REVIEW' } })).toBe(true);
    });

    it('LỖI A.1 ĐÃ KHẮC PHỤC: khiếu nại DISPUTED đã phán quyết (RESOLVED) KHÔNG còn là đơn đang hoạt động', () => {
      expect(isBookingActive({ status: 'DISPUTED', dispute: { status: 'RESOLVED' } })).toBe(false);
      expect(isBookingActive({ status: 'DISPUTED', dispute_status: 'RESOLVED' })).toBe(false);
    });

    it('xử lý an toàn khi đối tượng rỗng hoặc null', () => {
      expect(isBookingActive(null as any)).toBe(false);
      expect(isBookingActive({} as any)).toBe(false);
    });
  });

  describe('getBookingGroup', () => {
    it('phân nhóm chính xác vào ACTIVE, COMPLETED, DISPUTED, CANCELLED_OR_REFUNDED', () => {
      expect(getBookingGroup({ status: 'IN_SESSION' })).toBe('ACTIVE');
      expect(getBookingGroup({ status: 'COMPLETED' })).toBe('COMPLETED');
      expect(getBookingGroup({ status: 'CANCELLED' })).toBe('CANCELLED_OR_REFUNDED');
      expect(getBookingGroup({ status: 'REFUNDED' })).toBe('CANCELLED_OR_REFUNDED');
      expect(getBookingGroup({ status: 'DISPUTED', dispute: { status: 'OPEN' } })).toBe('DISPUTED');
      expect(getBookingGroup({ status: 'DISPUTED', dispute: { status: 'RESOLVED' } })).toBe('CANCELLED_OR_REFUNDED');
    });
  });

  describe('getBookingStatusLabel', () => {
    it('trả về nhãn tiếng Việt rõ ràng, không chứa mã nội bộ BR/D', () => {
      const pending = getBookingStatusLabel({ status: 'PENDING_ACCEPTANCE' });
      expect(pending.label).toContain('Chờ xác nhận');
      expect(pending.label).not.toMatch(/BR-|D\d+/);

      const resolved = getBookingStatusLabel({ status: 'DISPUTED', dispute: { status: 'RESOLVED' } });
      expect(resolved.label).toBe('Khiếu nại đã giải quyết');

      const completed = getBookingStatusLabel({ status: 'COMPLETED' });
      expect(completed.label).toBe('Hoàn tất');
    });
  });
});
