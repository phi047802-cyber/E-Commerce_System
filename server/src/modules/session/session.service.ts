import { prisma } from '../../common/prisma.js';
import { 
  NotFoundError, 
  BusinessError, 
  ConflictError, 
  ForbiddenError 
} from '../../common/errors.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger.js';
import { encryptText, decryptText } from '../../common/crypto.js';

// Danh sách từ khóa nhạy cảm / vi phạm chính sách giao dịch ngoài sàn
const SENSITIVE_PATTERNS = [
  /\b(0[35789]\d{8})\b/g, // Số điện thoại VN
  /\b(\+84[35789]\d{8})\b/g, // SĐT định dạng quốc tế
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
  /\b(zalo|telegram|tele|fb|facebook|chuyen khoan ngoai|ck ngoai|inbox rieng)\b/gi, // Kênh ngoài sàn
];

export class SessionService {
  /**
   * Kiểm tra quyền truy cập phòng phiên chơi (RBAC: Renter, Companion của đơn, CS/Admin/Auditor)
   */
  private async checkSessionAccess(userId: string, userRole: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { session_id: sessionId },
      include: {
        booking: {
          include: {
            companion: { include: { user: true } },
            renter: true,
            escrow: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Không tìm thấy phòng phiên chơi.');
    }

    const isStaff = ['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole);
    const isParticipant =
      session.booking.renter_id === userId || session.booking.companion.user_id === userId;

    if (!isStaff && !isParticipant) {
      throw new ForbiddenError('Bạn không có quyền truy cập vào phòng phiên chơi này.');
    }

    return { session, isStaff, isParticipant };
  }

  /**
   * Lấy chi tiết phiên chơi theo sessionId
   */
  async getSessionById(userId: string, userRole: string, sessionId: string) {
    const { session, isStaff } = await this.checkSessionAccess(userId, userRole, sessionId);
    return {
      session: {
        session_id: session.session_id,
        booking_id: session.booking_id,
        status: session.status,
        start_time: session.start_time,
        end_time: session.end_time,
        room_token: session.room_token,
        booking: {
          booking_id: session.booking.booking_id,
          status: session.booking.status,
          total_fee_snapshot: session.booking.total_fee_snapshot,
          start_time: session.booking.start_time,
          duration_hours: session.booking.duration_hours,
          confirm_deadline: session.booking.confirm_deadline,
          renter: {
            user_id: session.booking.renter.user_id,
            display_name: session.booking.renter.display_name,
          },
          companion: {
            user_id: session.booking.companion.user_id,
            display_name: session.booking.companion.user.display_name,
          },
        },
      },
      is_staff: isStaff,
    };
  }

  /**
   * Lấy chi tiết phiên chơi theo bookingId
   */
  async getSessionByBookingId(userId: string, userRole: string, bookingId: string) {
    const session = await prisma.session.findUnique({
      where: { booking_id: bookingId },
    });

    if (!session) {
      throw new NotFoundError('Chưa có phiên chơi nào được khởi tạo cho đơn đặt lịch này.');
    }

    return this.getSessionById(userId, userRole, session.session_id);
  }

  /**
   * Khởi chạy / Bắt đầu phiên chơi (SCHEDULED -> ACTIVE, Booking -> IN_SESSION)
   */
  async startSession(userId: string, userRole: string, sessionId: string) {
    const { session } = await this.checkSessionAccess(userId, userRole, sessionId);

    // Idempotency: nếu đã ACTIVE
    if (session.status === 'ACTIVE') {
      return {
        session,
        is_idempotent_replay: true,
      };
    }

    if (session.status === 'CLOSED' || session.status === 'ENDED') {
      throw new BusinessError(
        'SESSION_CANNOT_BE_STARTED',
        `Không thể bắt đầu phiên chơi khi ở trạng thái '${session.status}'.`
      );
    }

    if (!['ACCEPTED', 'IN_SESSION'].includes(session.booking.status)) {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Chỉ có thể bắt đầu phiên chơi khi đơn đặt lịch ở trạng thái ACCEPTED (hiện tại: '${session.booking.status}').`
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.session.update({
        where: { session_id: sessionId },
        data: {
          status: 'ACTIVE',
        },
      });

      if (session.booking.status !== 'IN_SESSION') {
        await tx.booking.update({
          where: { booking_id: session.booking_id },
          data: {
            status: 'IN_SESSION',
          },
        });

        await tx.bookingStatusHistory.create({
          data: {
            booking_id: session.booking_id,
            from_status: session.booking.status,
            to_status: 'IN_SESSION',
            reason: 'Bắt đầu phiên chơi trực tiếp (Session Started).',
            changed_by: userId,
          },
        });
      }

      logger.info(`Session ${sessionId} started by ${userId} for booking ${session.booking_id}`);

      return {
        session: updatedSession,
        is_idempotent_replay: false,
      };
    });
  }

  /**
   * Kết thúc thời lượng thuê và kích hoạt hạn nghiệm thu 15 phút (BR-14)
   */
  async endSession(userId: string, userRole: string, sessionId: string) {
    const { session } = await this.checkSessionAccess(userId, userRole, sessionId);

    if (session.status === 'CLOSED') {
      throw new BusinessError('SESSION_CLOSED', 'Phiên chơi đã đóng hoàn toàn.');
    }

    // Tính hạn chót nghiệm thu 15 phút theo chính sách
    const acceptanceMinutes = env.FULFILLMENT_ACCEPTANCE_TIMEOUT_MINUTES;
    const confirmDeadline = new Date(Date.now() + acceptanceMinutes * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.session.update({
        where: { session_id: sessionId },
        data: {
          status: 'ENDED',
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { booking_id: session.booking_id },
        data: {
          confirm_deadline: confirmDeadline,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: session.booking_id,
          from_status: session.booking.status,
          to_status: session.booking.status,
          reason: `Kết thúc phiên chơi. Bắt đầu đếm ngược ${acceptanceMinutes} phút nghiệm thu (hạn chót: ${confirmDeadline.toISOString()}).`,
          changed_by: userId,
        },
      });

      // Gửi thông báo cho Renter để nghiệm thu
      await tx.notification.create({
        data: {
          user_id: session.booking.renter_id,
          title: 'Phiên chơi kết thúc — Mời nghiệm thu',
          message: `Phiên chơi đã kết thúc. Bạn có ${acceptanceMinutes} phút để xác nhận nghiệm thu hoặc báo sự cố trước khi hệ thống tự động giải ngân.`,
          type: 'ACCEPTANCE_REQUIRED',
        },
      });

      return {
        session: updatedSession,
        booking: updatedBooking,
        confirm_deadline: confirmDeadline,
      };
    });
  }

  /**
   * Gửi tin nhắn trong phòng phiên chơi kèm bộ lọc kiểm duyệt nội dung văn bản đơn giản
   * Bảo mật Đợt D1b - Mục B.2: stripped hoàn toàn original_content trong API phòng chat thường
   */
  async sendMessage(userId: string, userRole: string, sessionId: string, content: string) {
    const { session } = await this.checkSessionAccess(userId, userRole, sessionId);

    if (session.status === 'CLOSED') {
      throw new BusinessError('SESSION_CLOSED', 'Không thể gửi tin nhắn khi phòng phiên chơi đã đóng.');
    }

    // Kiểm tra và che dấu thông tin nhạy cảm (Censorship filter)
    let isCensored = false;
    let sanitizedContent = content;

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(sanitizedContent)) {
        isCensored = true;
        sanitizedContent = sanitizedContent.replace(pattern, '***[NỘI DUNG ĐÃ BỊ KIỂM DUYỆT]***');
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        sender_id: userId,
        content: encryptText(sanitizedContent),
        is_censored: isCensored,
        original_content: isCensored ? encryptText(content) : null,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            display_name: true,
            role: true,
          },
        },
      },
    });

    return {
      message_id: message.message_id,
      session_id: message.session_id,
      sender_id: message.sender_id,
      sender_name: message.sender.display_name,
      sender_role: message.sender.role,
      content: sanitizedContent,
      is_censored: message.is_censored,
      original_content: undefined,
      created_at: message.created_at,
    };
  }

  /**
   * Lấy lịch sử tin nhắn phòng chơi (Hỗ trợ Polling qua afterId)
   * Bảo mật Đợt D1b - Mục B.2: stripped hoàn toàn original_content trong API phòng chat thường
   */
  async getMessages(userId: string, userRole: string, sessionId: string, afterId?: number) {
    const { isStaff } = await this.checkSessionAccess(userId, userRole, sessionId);

    const messages = await prisma.chatMessage.findMany({
      where: {
        session_id: sessionId,
        ...(afterId ? { message_id: { gt: afterId } } : {}),
      },
      orderBy: { message_id: 'asc' },
      take: 100,
      include: {
        sender: {
          select: {
            user_id: true,
            display_name: true,
            role: true,
          },
        },
      },
    });

    return messages.map((m) => ({
      message_id: m.message_id,
      session_id: m.session_id,
      sender_id: m.sender_id,
      sender_name: m.sender.display_name,
      sender_role: m.sender.role,
      content: decryptText(m.content),
      is_censored: m.is_censored,
      original_content: isStaff && m.original_content ? decryptText(m.original_content) : undefined,
      created_at: m.created_at,
    }));
  }

  /**
   * Lấy cấu hình ICE Servers phục vụ WebRTC Voice Call (FR-006)
   */
  async getIceServers(userId: string, userRole: string, sessionId: string) {
    await this.checkSessionAccess(userId, userRole, sessionId);

    try {
      const parsed = JSON.parse(env.ICE_SERVERS);
      return { ice_servers: parsed };
    } catch {
      return {
        ice_servers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
    }
  }

  /**
   * Lấy lịch sử cuộc gọi thoại CallLog của phiên chơi (FR-006)
   */
  async getCallLogs(userId: string, userRole: string, sessionId: string) {
    await this.checkSessionAccess(userId, userRole, sessionId);

    const callLogs = await prisma.callLog.findMany({
      where: { session_id: sessionId },
      orderBy: { started_at: 'desc' },
      include: {
        caller: { select: { user_id: true, display_name: true, role: true } },
        receiver: { select: { user_id: true, display_name: true, role: true } },
      },
    });

    return callLogs.map((log) => ({
      call_id: log.call_id,
      session_id: log.session_id,
      caller_id: log.caller_id,
      caller_name: log.caller.display_name,
      caller_role: log.caller.role,
      receiver_id: log.receiver_id,
      receiver_name: log.receiver?.display_name || null,
      receiver_role: log.receiver?.role || null,
      started_at: log.started_at,
      ended_at: log.ended_at,
      duration_sec: log.duration_sec,
      result: log.result,
      events: log.events ? JSON.parse(log.events) : [],
      created_at: log.created_at,
    }));
  }
}

export const sessionService = new SessionService();
