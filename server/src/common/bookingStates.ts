/**
 * INSTASQUAD — Chuẩn hóa trạng thái đơn hàng (UI_STATES)
 * Thống nhất định nghĩa Đơn đang hoạt động vs Đơn đã kết thúc
 * Tuân thủ quyết định của nhóm: Khiếu nại đã phán quyết (RESOLVED) thì đơn KHÔNG còn là đơn đang hoạt động.
 */

export type BookingStatusGroup = 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED_OR_REFUNDED';

export interface BookingStateLike {
  status: string;
  dispute?: {
    status: string;
  } | null;
  dispute_status?: string | null;
}

/**
 * Kiểm tra xem một đơn hàng có đang ở trạng thái HOẠT ĐỘNG (cần xử lý / đang diễn ra) hay không.
 * - PENDING_ACCEPTANCE / WAITING_COMPANION_RESPONSE: Chờ Companion xác nhận (đếm ngược 180s)
 * - ACCEPTED / CONFIRMED: Đã xác nhận, chuẩn bị vào phiên
 * - IN_SESSION: Đang trong phiên chơi
 * - WAITING_RENTER_CONFIRM: Phiên kết thúc, chờ Renter nghiệm thu 15 phút
 * - DISPUTED: Chỉ ACTIVE khi tranh chấp đang mở/xử lý (OPEN, EVIDENCE_PENDING, UNDER_REVIEW).
 *             Nếu tranh chấp đã giải quyết xong (RESOLVED), đơn coi như ĐÃ KẾT THÚC.
 */
export function isBookingActive(booking: BookingStateLike): boolean {
  if (!booking || !booking.status) return false;

  const status = booking.status.toUpperCase();

  // Các trạng thái kết thúc dứt điểm
  if (['COMPLETED', 'REFUNDED', 'CANCELLED', 'REJECTED', 'TIMEOUT'].includes(status)) {
    return false;
  }

  // Khiếu nại tranh chấp (DISPUTED)
  if (status === 'DISPUTED') {
    const disputeStatus = (booking.dispute?.status || booking.dispute_status || '').toUpperCase();
    if (disputeStatus === 'RESOLVED') {
      return false; // Khiếu nại đã phán quyết xong -> Đơn đã kết thúc
    }
    return true; // Đang thụ lý, cần CS Agent hoặc các bên bổ sung chứng cứ
  }

  // Các trạng thái đang diễn tiến
  if ([
    'PENDING_ACCEPTANCE',
    'WAITING_COMPANION_RESPONSE',
    'ACCEPTED',
    'CONFIRMED',
    'IN_SESSION',
    'WAITING_RENTER_CONFIRM',
  ].includes(status)) {
    return true;
  }

  return false;
}

/**
 * Phân loại đơn hàng vào đúng một trong các nhóm hiển thị UI
 */
export function getBookingGroup(booking: BookingStateLike): BookingStatusGroup {
  if (!booking || !booking.status) return 'CANCELLED_OR_REFUNDED';

  const status = booking.status.toUpperCase();

  if (status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (['REFUNDED', 'CANCELLED', 'REJECTED', 'TIMEOUT'].includes(status)) {
    return 'CANCELLED_OR_REFUNDED';
  }

  if (status === 'DISPUTED') {
    const disputeStatus = (booking.dispute?.status || booking.dispute_status || '').toUpperCase();
    if (disputeStatus === 'RESOLVED') {
      return 'CANCELLED_OR_REFUNDED'; // Hoặc đơn đã kết thúc qua hoàn tiền/giải ngân
    }
    return 'DISPUTED';
  }

  if (isBookingActive(booking)) {
    return 'ACTIVE';
  }

  return 'CANCELLED_OR_REFUNDED';
}

/**
 * Lấy nhãn tiếng Việt chuẩn hóa cho trạng thái đơn hàng
 */
export function getBookingStatusLabel(booking: BookingStateLike): { label: string; color: string } {
  if (!booking || !booking.status) {
    return { label: 'Không xác định', color: 'gray' };
  }

  const status = booking.status.toUpperCase();

  switch (status) {
    case 'PENDING_ACCEPTANCE':
    case 'WAITING_COMPANION_RESPONSE':
      return { label: 'Chờ xác nhận (180s)', color: 'amber' };
    case 'ACCEPTED':
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', color: 'blue' };
    case 'IN_SESSION':
      return { label: 'Đang trong phiên', color: 'indigo' };
    case 'WAITING_RENTER_CONFIRM':
      return { label: 'Chờ nghiệm thu (15p)', color: 'purple' };
    case 'COMPLETED':
      return { label: 'Hoàn tất', color: 'emerald' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: 'rose' };
    case 'REFUNDED':
      return { label: 'Đã hoàn tiền', color: 'slate' };
    case 'REJECTED':
      return { label: 'Từ chối nhận', color: 'rose' };
    case 'TIMEOUT':
      return { label: 'Hết giờ phản hồi', color: 'rose' };
    case 'DISPUTED': {
      const disputeStatus = (booking.dispute?.status || booking.dispute_status || '').toUpperCase();
      if (disputeStatus === 'RESOLVED') {
        return { label: 'Khiếu nại đã giải quyết', color: 'slate' };
      }
      if (disputeStatus === 'EVIDENCE_PENDING') {
        return { label: 'Chờ bổ sung chứng cứ', color: 'amber' };
      }
      return { label: 'Đang khiếu nại', color: 'rose' };
    }
    default:
      return { label: status, color: 'gray' };
  }
}
