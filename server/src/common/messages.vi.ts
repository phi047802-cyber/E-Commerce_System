/**
 * INSTASQUAD — Nơi lưu trữ tập trung các mẫu câu hiển thị cho người dùng (User-Facing Messages)
 * Tuân thủ nghiêm ngặt tiêu chuẩn Đợt E2:
 * 1. Tiếng Việt tự nhiên, chuyên nghiệp, lịch sự.
 * 2. Tuyệt đối không chứa các mã quy định kỹ thuật hoặc ghi chú nội bộ.
 * 3. Tham số được định dạng rõ ràng: Số tiền (176.000đ), Thời gian (15/11/2026 10:15), Mã ngắn (DSP-59A5, BK-4F8A).
 * 4. Dịch sạch toàn bộ mã Enum kỹ thuật sang tiếng Việt.
 */

export interface FormattedNotification {
  title: string;
  message: string;
  type: string;
  target_url?: string;
}

/**
 * Định dạng số tiền VND theo chuẩn Việt Nam (ví dụ: 200.000đ)
 */
export function formatVnd(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0đ';
  return `${amount.toLocaleString('vi-VN')}đ`;
}

/**
 * Định dạng thời gian theo chuẩn Việt Nam (ví dụ: 15/11/2026 10:15)
 */
export function formatDateTime(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Rút gọn ID thành mã ngắn dễ đọc (ví dụ: DSP-59A5, BK-8C3D)
 */
export function formatShortId(prefix: string, fullId?: string | null): string {
  if (!fullId) return prefix;
  // Bỏ tiền tố nếu có
  const clean = fullId.replace(/^(bk-|dsp-|prof-|usr-|u-)/i, '').replace(/-/g, '');
  const tail = clean.slice(-4).toUpperCase();
  return `${prefix}-${tail}`;
}

/**
 * Bảng dịch mã lý do khiếu nại (Reason Categories) sang tiếng Việt tự nhiên
 */
export const DISPUTE_REASON_LABELS: Record<string, string> = {
  NO_SHOW: 'Companion không vào phòng chơi đúng giờ',
  MISCONDUCT: 'Thái độ không phù hợp',
  HARASSMENT: 'Quấy rối hoặc ngôn từ không phù hợp',
  SERVICE_NOT_AS_PROMISED: 'Dịch vụ không đúng cam kết',
  SKILL_MISMATCH: 'Kỹ năng không đúng cam kết',
  TECHNICAL_ISSUE: 'Sự cố kỹ thuật / kết nối',
  INTERRUPTED: 'Phiên bị gián đoạn',
  OTHER: 'Lý do khác',
};

export function getDisputeReasonLabel(category?: string | null): string {
  if (!category) return 'Lý do khác';
  return DISPUTE_REASON_LABELS[category] || 'Lý do khác';
}

/**
 * Bảng dịch trạng thái đơn hàng sang tiếng Việt thân thiện
 */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_COMPANION: 'Chờ phản hồi (180s)',
  CONFIRMED: 'Đã xác nhận',
  ACCEPTED: 'Đã chấp nhận',
  IN_SESSION: 'Đang trong phiên chơi',
  WAITING_CONFIRMATION: 'Chờ nghiệm thu (15m)',
  COMPLETED: 'Hoàn tất',
  DISPUTED: 'Đang khiếu nại',
  CANCELLED_BY_RENTER: 'Người thuê đã hủy',
  CANCELLED_BY_COMPANION: 'Companion đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  REJECTED: 'Bị từ chối',
  EXPIRED: 'Quá hạn phản hồi',
};

export function getBookingStatusLabel(status?: string | null): string {
  if (!status) return '';
  return BOOKING_STATUS_LABELS[status] || status;
}

/**
 * Bộ mẫu thông báo cho người dùng (User-Facing Notification Templates)
 */
export const userMessages = {
  // 1. Đơn đặt lịch được chấp nhận
  bookingAccepted(companionName: string, bookingId: string): FormattedNotification {
    return {
      title: 'Đơn đặt lịch được chấp nhận',
      message: `Companion ${companionName} đã nhận đơn đặt lịch ${formatShortId('BK', bookingId)}. Phòng chơi đã sẵn sàng!`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_ACCEPTED',
    };
  },

  // 2. Đơn đặt lịch bị từ chối
  bookingRejected(bookingId: string, amount: number): FormattedNotification {
    return {
      title: 'Đơn đặt lịch bị từ chối',
      message: `Companion đã từ chối đơn ${formatShortId('BK', bookingId)}. Khoản ${formatVnd(amount)} đã được hoàn về ví của bạn.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_REJECTED',
    };
  },

  // 3. Quá hạn phản hồi 180s (Renter)
  bookingTimeoutRefund(bookingId: string, amount: number): FormattedNotification {
    return {
      title: 'Đơn đặt lịch hết hạn phản hồi',
      message: `Companion không phản hồi trong 180 giây cho đơn ${formatShortId('BK', bookingId)}. Khoản ${formatVnd(amount)} đã được hoàn về ví của bạn.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_TIMEOUT_REFUND',
    };
  },

  // 4. Bỏ lỡ đơn 180s (Companion)
  companionMissedBooking(bookingId: string): FormattedNotification {
    return {
      title: 'Bỏ lỡ phản hồi đơn đặt lịch',
      message: `Bạn đã không phản hồi đơn ${formatShortId('BK', bookingId)} trong 180 giây. Đơn đã tự động hủy và bạn bị trừ 3 điểm uy tín.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'COMPANION_PENALIZED',
    };
  },

  // 5. Phiên kết thúc mời nghiệm thu 15m
  acceptanceRequired(bookingId: string, minutes: number = 15): FormattedNotification {
    return {
      title: 'Phiên chơi kết thúc — Mời nghiệm thu',
      message: `Phiên chơi đơn ${formatShortId('BK', bookingId)} đã kết thúc. Bạn có ${minutes} phút để xác nhận nghiệm thu hoặc báo sự cố trước khi hệ thống tự động giải ngân.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'ACCEPTANCE_REQUIRED',
    };
  },

  // 6. Giải ngân thành công cho Companion
  escrowReleasedToCompanion(bookingId: string, amount: number, offsetAmount: number = 0): FormattedNotification {
    const offsetText = offsetAmount > 0 ? ` (đã cấn trừ ${formatVnd(offsetAmount)} nợ vi phạm)` : '';
    return {
      title: 'Giải ngân dịch vụ thành công',
      message: `Đơn ${formatShortId('BK', bookingId)} đã hoàn tất nghiệm thu. Bạn nhận được ${formatVnd(amount)} vào ví khả dụng${offsetText}.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'ESCROW_RELEASED',
    };
  },

  // 7. Đơn hoàn tất gửi Renter
  bookingCompletedToRenter(bookingId: string): FormattedNotification {
    return {
      title: 'Đơn đặt lịch hoàn tất',
      message: `Đơn ${formatShortId('BK', bookingId)} đã hoàn tất nghiệm thu. Cảm ơn bạn đã sử dụng dịch vụ!`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_COMPLETED',
    };
  },

  // 8. Khiếu nại tiếp nhận gửi Renter
  disputeOpenedToRenter(disputeId: string, amount: number): FormattedNotification {
    return {
      title: 'Đã tiếp nhận khiếu nại',
      message: `Chúng tôi đã tiếp nhận khiếu nại ${formatShortId('DSP', disputeId)}. Khoản ký quỹ ${formatVnd(amount)} đang được giữ cho đến khi có kết quả.`,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_OPENED',
    };
  },

  // 9. Khiếu nại mở gửi Companion
  disputeOpenedToCompanion(bookingId: string, disputeId: string, reasonCategory: string): FormattedNotification {
    return {
      title: 'Đơn đặt lịch phát sinh khiếu nại',
      message: `Người thuê đã báo sự cố (${getDisputeReasonLabel(reasonCategory)}) cho đơn ${formatShortId('BK', bookingId)}. Khoản ký quỹ được tạm giữ để bộ phận CS xem xét.`,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_OPENED',
    };
  },

  // 10. Yêu cầu chứng cứ bổ sung
  disputeEvidenceRequested(disputeId: string, deadline: Date | string, notes?: string): FormattedNotification {
    const noteText = notes ? `: ${notes}` : '.';
    return {
      title: 'Yêu cầu bổ sung bằng chứng khiếu nại',
      message: `Bộ phận CS yêu cầu bổ sung bằng chứng cho khiếu nại ${formatShortId('DSP', disputeId)} trước ${formatDateTime(deadline)}${noteText}`,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_EVIDENCE_REQUESTED',
    };
  },

  // 11. Companion gửi giải trình gửi Renter
  disputeExplanationSubmittedToRenter(disputeId: string): FormattedNotification {
    return {
      title: 'Companion đã gửi giải trình',
      message: `Companion đã gửi bản giải trình cho khiếu nại ${formatShortId('DSP', disputeId)}. Bộ phận CS đang tiến hành xem xét.`,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_EXPLANATION_SUBMITTED',
    };
  },

  // 12. Companion gửi giải trình gửi Staff
  disputeExplanationSubmittedToStaff(disputeId: string): FormattedNotification {
    return {
      title: 'Giải trình khiếu nại mới',
      message: `Companion đã nộp bản giải trình cho khiếu nại ${formatShortId('DSP', disputeId)}. Vui lòng xem xét hồ sơ.`,
      target_url: `/cs/cases/${disputeId}`,
      type: 'DISPUTE_EXPLANATION_SUBMITTED',
    };
  },

  // 13. Phán quyết khiếu nại gửi Renter (lỗi >= 80% hoặc < 80%)
  disputeResolvedToRenter(disputeId: string, faultPercent: number, refundAmount: number): FormattedNotification {
    const message = faultPercent >= 80
      ? `Khiếu nại ${formatShortId('DSP', disputeId)} đã có kết quả. CS xác nhận Companion có lỗi (mức độ ${faultPercent}%). Khoản ${formatVnd(refundAmount)} đã được hoàn về ví của bạn.`
      : `Khiếu nại ${formatShortId('DSP', disputeId)} đã có kết quả. CS đánh giá lỗi của Companion ở mức ${faultPercent}%, chưa đạt ngưỡng hoàn tiền. Khoản ký quỹ được giải ngân cho Companion theo quy định. Bạn có thể xem lý do chi tiết trong hồ sơ khiếu nại.`;

    return {
      title: 'Phán quyết khiếu nại đã ban hành',
      message,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_RESOLVED',
    };
  },

  // 14. Phán quyết khiếu nại gửi Companion
  disputeResolvedToCompanion(
    disputeId: string,
    faultPercent: number,
    receivedAmount: number,
    penaltyAmount: number,
    unpaidDebt: number = 0
  ): FormattedNotification {
    let message = '';
    if (faultPercent >= 80) {
      const debtText = unpaidDebt > 0 ? ` (ghi nhận nợ vi phạm ${formatVnd(unpaidDebt)})` : '';
      message = `Khiếu nại ${formatShortId('DSP', disputeId)} đã có kết quả. CS kết luận mức độ lỗi ${faultPercent}%. Tiền ký quỹ đã hoàn cho Renter và bạn chịu chế tài vi phạm ${formatVnd(penaltyAmount)}${debtText}. Bạn bị trừ 10 điểm uy tín. Bạn có thể xem chi tiết trong hồ sơ khiếu nại.`;
    } else {
      message = `Khiếu nại ${formatShortId('DSP', disputeId)} đã có kết quả. CS đánh giá mức độ lỗi ${faultPercent}%. Bạn được nhận ${formatVnd(receivedAmount)} thu nhập vào ví. Bạn có thể xem chi tiết trong hồ sơ khiếu nại.`;
    }

    return {
      title: 'Phán quyết khiếu nại đã ban hành',
      message,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_RESOLVED',
    };
  },

  // 15. Hết hạn nộp chứng cứ 24h
  disputeEvidenceExpired(disputeId: string): FormattedNotification {
    return {
      title: 'Hết hạn nộp bằng chứng khiếu nại',
      message: `Thời hạn 24 giờ nộp bổ sung chứng cứ cho khiếu nại ${formatShortId('DSP', disputeId)} đã kết thúc. Nhân viên CS sẽ phán quyết dựa trên hồ sơ hiện có.`,
      target_url: `/khieu-nai/${disputeId}`,
      type: 'DISPUTE_EVIDENCE_EXPIRED',
    };
  },

  // 16. Thử lại giải ngân lỗi gửi Staff
  settlementRetryExhaustedStaff(bookingId: string): FormattedNotification {
    return {
      title: 'Thông báo xử lý thanh toán',
      message: `Đơn ${formatShortId('BK', bookingId)} đang được chuyển sang bộ phận Kiểm toán xử lý thủ công trong vòng 24 giờ. Khoản tiền vẫn được bảo lưu an toàn.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'SETTLEMENT_RETRY_FAILED',
    };
  },

  // 17. Nạp tiền thành công
  topupSuccess(amount: number, provider: string = 'SePay'): FormattedNotification {
    return {
      title: 'Nạp tiền thành công',
      message: `Bạn đã nạp thành công ${formatVnd(amount)} vào ví qua ${provider}. Số dư khả dụng đã được cập nhật.`,
      target_url: `/vi`,
      type: 'TOPUP_SUCCESS',
    };
  },

  // 18. Nạp tiền muộn
  topupLate(amount: number): FormattedNotification {
    return {
      title: 'Giao dịch nạp tiền được ghi nhận',
      message: `Giao dịch ${formatVnd(amount)} chuyển khoản sau thời hạn đã được hệ thống khớp thành công vào ví của bạn.`,
      target_url: `/vi`,
      type: 'TOPUP_SUCCESS',
    };
  },

  // 19. Hủy trước phiên > 30m
  bookingCancelledRefund100(bookingId: string, amount: number): FormattedNotification {
    return {
      title: 'Hủy đơn đặt lịch thành công',
      message: `Đơn ${formatShortId('BK', bookingId)} đã hủy trước giờ hẹn. Khoản ${formatVnd(amount)} đã được hoàn 100% về ví của bạn.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_CANCELLED',
    };
  },

  // 20. Hủy 10m - 30m
  bookingCancelledRefund70(bookingId: string, refundAmount: number, feeAmount: number): FormattedNotification {
    return {
      title: 'Hủy đơn đặt lịch (có khấu trừ)',
      message: `Đơn ${formatShortId('BK', bookingId)} đã hủy gần giờ hẹn. Bạn nhận lại 70% (${formatVnd(refundAmount)}), 30% (${formatVnd(feeAmount)}) được khấu trừ theo quy định.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_CANCELLED',
    };
  },

  // 21. Hủy gấp dưới 10m
  bookingCancelledLatePenalty(bookingId: string): FormattedNotification {
    return {
      title: 'Hủy đơn gấp dưới 10 phút',
      message: `Đơn ${formatShortId('BK', bookingId)} hủy dưới 10 phút trước phiên chơi. Tiền ký quỹ được khấu trừ theo quy định hủy gấp.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'BOOKING_CANCELLED',
    };
  },

  // 22. Nhắc đánh giá sau phiên (G10) — gửi 1 lần cho bên chưa đánh giá
  reviewReminder(counterpartName: string, bookingId: string): FormattedNotification {
    return {
      title: 'Bạn chưa đánh giá buổi hẹn',
      message: `Hãy dành 1 phút đánh giá ${counterpartName} cho đơn ${formatShortId('BK', bookingId)}. Đánh giá giúp cộng đồng chọn đúng người và cập nhật TrustScore.`,
      target_url: `/don-hang/${bookingId}`,
      type: 'REVIEW_REMINDER',
    };
  },
};

/**
 * Hàm làm sạch và chuẩn hóa tin nhắn giao diện (Sanitizer)
 * Tự động loại bỏ sạch toàn bộ mã nội bộ nếu vô tình lọt vào chuỗi ký tự hiển thị.
 */
export function sanitizeUIMessage(raw: string): string {
  if (!raw) return '';

  let sanitized = raw;

  // Loại bỏ các thẻ nội bộ
  sanitized = sanitized.replace(/\[NHÓM ĐÃ CHỐT[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Nhóm đã chốt[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\(D\d+\)/gi, '');
  sanitized = sanitized.replace(/\(BR-\d+\)/gi, '');
  sanitized = sanitized.replace(/REF-[A-Z]+-\d+/gi, '');
  sanitized = sanitized.replace(/–\s*Charter chưa quy định/gi, '');
  sanitized = sanitized.replace(/Charter chưa quy định/gi, '');

  // Thay thế các mã enum kỹ thuật sang tiếng Việt
  sanitized = sanitized.replace(/\bNO_SHOW\b/g, 'không vào phòng chơi đúng giờ');
  sanitized = sanitized.replace(/\bHARASSMENT\b/g, 'quấy rối / ngôn từ không phù hợp');
  sanitized = sanitized.replace(/\bSKILL_MISMATCH\b/g, 'kỹ năng không đúng cam kết');
  sanitized = sanitized.replace(/\bSERVICE_NOT_AS_PROMISED\b/g, 'dịch vụ không đúng cam kết');
  sanitized = sanitized.replace(/\bTECHNICAL_ISSUE\b/g, 'sự cố kỹ thuật / kết nối');
  sanitized = sanitized.replace(/\bMISCONDUCT\b/g, 'thái độ không phù hợp');
  sanitized = sanitized.replace(/\bEVIDENCE_PENDING\b/g, 'chờ bổ sung bằng chứng');
  sanitized = sanitized.replace(/\bUNDER_REVIEW\b/g, 'đang thẩm định phán quyết');
  sanitized = sanitized.replace(/\bPENALTY_DEBT\b/g, 'nợ vi phạm');

  // Chuẩn hóa ID dài dạng #59a5fd4e... thành DSP-xxxx hoặc BK-xxxx
  sanitized = sanitized.replace(/#([a-f0-9]{8})[a-f0-9-]*/gi, (_match, p1) => {
    return `#${p1.slice(-4).toUpperCase()}`;
  });

  // Dọn dẹp khoảng trắng thừa và dấu hai chấm lặp
  sanitized = sanitized.replace(/\s+/g, ' ').replace(/\s*:\s*:/g, ':').trim();

  return sanitized;
}
