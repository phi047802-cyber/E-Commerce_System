import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { 
  NotFoundError, 
  BusinessError, 
  ConflictError, 
  ForbiddenError,
  ValidationError 
} from '../../common/errors.js';
import { ledgerService } from '../ledger/ledger.service.js';
import { SYSTEM_ACCOUNTS } from '../ledger/ledger.types.js';
import { logger } from '../../common/logger.js';
import { SubmitEvidenceInput, ResolveDisputeInput, RequestEvidenceInput } from './dispute.dto.js';

export interface CreateDisputeInput {
  reason_category: 'NO_SHOW' | 'HARASSMENT' | 'SKILL_MISMATCH' | 'TECHNICAL_ISSUE';
  description: string;
}

const FORBIDDEN_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.ts', '.py', '.php', '.dll', '.msi'];
const AUDIO_VIDEO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.mp4', '.avi', '.mov', '.mkv', '.webm'];

export class DisputeService {
  /**
   * Mở khiếu nại tranh chấp (Report Issue) & Đóng băng Escrow (BR-26, M6/M7).
   */
  async createDispute(renterId: string, bookingId: string, input: CreateDisputeInput) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        escrow: true,
        session: true,
        dispute: true,
        companion: {
          include: { user: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    if (booking.renter_id !== renterId) {
      throw new ForbiddenError('Chỉ người đặt lịch (Renter) mới có quyền báo cáo sự cố khiếu nại.');
    }

    // Idempotency: nếu đã tạo khiếu nại cho đơn này rồi
    if (booking.dispute) {
      if (
        booking.dispute.reason_category === input.reason_category &&
        booking.dispute.description === input.description
      ) {
        return {
          dispute: booking.dispute,
          booking,
          is_idempotent_replay: true,
        };
      }
      throw new ConflictError(
        'DISPUTE_ALREADY_EXISTS',
        'Đơn đặt lịch này đang có một khiếu nại tranh chấp được thụ lý.'
      );
    }

    // Nếu đơn đã COMPLETED (đã nghiệm thu giải ngân)
    if (booking.status === 'COMPLETED') {
      throw new BusinessError(
        'BOOKING_ALREADY_COMPLETED',
        'Đơn đặt lịch đã hoàn tất nghiệm thu và giải ngân tiền. Không thể mở khiếu nại trực tiếp qua phiên.'
      );
    }

    if (['CANCELLED', 'REFUNDED'].includes(booking.status)) {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Không thể khiếu nại đơn đặt lịch ở trạng thái '${booking.status}'.`
      );
    }

    if (!['ACCEPTED', 'IN_SESSION'].includes(booking.status)) {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Chỉ có thể báo cáo sự cố khi đơn ở trạng thái đã chấp nhận hoặc đang trong phiên chơi (hiện tại: '${booking.status}').`
      );
    }

    if (!booking.escrow) {
      throw new BusinessError('ESCROW_NOT_FOUND', 'Không tìm thấy thông tin ký quỹ của đơn đặt lịch.');
    }

    if (booking.escrow.status === 'FROZEN') {
      throw new ConflictError('ESCROW_ALREADY_FROZEN', 'Khoản ký quỹ này đã bị đóng băng trước đó.');
    }

    if (booking.escrow.status !== 'HELD') {
      throw new BusinessError(
        'INVALID_ESCROW_STATUS',
        `Không thể khiếu nại khi trạng thái ký quỹ là '${booking.escrow.status}'.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Cập nhật có điều kiện nguyên tử để chống Race Condition với Accept Completion
      const updateResult = await tx.booking.updateMany({
        where: {
          booking_id: bookingId,
          status: { in: ['ACCEPTED', 'IN_SESSION'] },
        },
        data: {
          status: 'DISPUTED',
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          'BOOKING_STATE_CONFLICT',
          'Đơn đặt lịch vừa được thay đổi trạng thái (có thể đã nghiệm thu hoàn tất đồng thời).'
        );
      }

      // 2. Đóng băng Escrow ngay lập tức (FROZEN) trước bất kỳ hành động giải ngân nào
      const updatedEscrow = await tx.escrow.update({
        where: { escrow_id: booking.escrow!.escrow_id },
        data: {
          status: 'FROZEN',
          frozen_at: new Date(),
        },
      });

      // 3. Đóng phiên chơi nếu đang mở
      if (booking.session && booking.session.status !== 'CLOSED') {
        await tx.session.update({
          where: { booking_id: bookingId },
          data: { status: 'ENDED' },
        });
      }

      // 4. Khởi tạo hồ sơ khiếu nại tranh chấp (DisputeCase)
      const dispute = await tx.disputeCase.create({
        data: {
          booking_id: booking.booking_id,
          renter_id: renterId,
          reason_category: input.reason_category,
          description: input.description,
          status: 'OPENED',
        },
      });

      // 5. Ghi nhận BOOKING_STATUS_HISTORY
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: booking.booking_id,
          from_status: booking.status,
          to_status: 'DISPUTED',
          reason: `[DISPUTE] Người thuê báo sự cố (${input.reason_category}): ${input.description}. Ký quỹ Escrow đã được đóng băng toàn phần.`,
          changed_by: renterId,
        },
      });

      // 6. Gửi thông báo in-app cho Companion
      await tx.notification.create({
        data: {
          user_id: booking.companion.user_id,
          title: 'Đơn đặt lịch phát sinh khiếu nại',
          message: `Renter đã báo sự cố cho đơn #${booking.booking_id.slice(0, 8)}. Ký quỹ Escrow tạm thời bị đóng băng để Bộ phận CS/Admin giải quyết.`,
          type: 'DISPUTE_OPENED',
        },
      });

      // Gửi thông báo xác nhận cho Renter
      await tx.notification.create({
        data: {
          user_id: renterId,
          title: 'Đã tiếp nhận khiếu nại',
          message: `Hệ thống đã tiếp nhận khiếu nại #${dispute.dispute_id.slice(0, 8)}. Khoản tiền ${booking.total_fee_snapshot.toLocaleString('vi-VN')} VND đã được bảo vệ trong Escrow.`,
          type: 'DISPUTE_OPENED',
        },
      });

      const updatedBooking = await tx.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true, session: true, dispute: true },
      });

      logger.info(`Dispute created for booking ${bookingId}, Escrow ${updatedEscrow.escrow_id} FROZEN.`);

      return {
        dispute,
        booking: updatedBooking,
        escrow: updatedEscrow,
        is_idempotent_replay: false,
      };
    });
  }

  /**
   * Lấy chi tiết khiếu nại theo bookingId (kèm phân quyền xem RBAC)
   */
  async getDisputeByBookingId(userId: string, userRole: string, bookingId: string) {
    const dispute = await prisma.disputeCase.findUnique({
      where: { booking_id: bookingId },
      include: {
        booking: {
          include: {
            companion: { include: { user: { select: { display_name: true, email: true } } } },
            renter: { select: { display_name: true, email: true } },
            escrow: true,
          },
        },
        evidences: {
          include: { uploader: { select: { display_name: true, role: true } } },
        },
        decision: {
          include: { cs_agent: { select: { display_name: true } } },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại cho đơn đặt lịch này.');
    }

    const isStaff = ['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole);
    const isParticipant =
      dispute.renter_id === userId || dispute.booking.companion.user_id === userId;

    if (!isStaff && !isParticipant) {
      throw new ForbiddenError('Bạn không có quyền truy cập hồ sơ khiếu nại này.');
    }

    return dispute;
  }

  /**
   * Lấy chi tiết đầy đủ hồ sơ khiếu nại (CS Dossier) theo disputeId
   * Đảm bảo KHÔNG lộ mật khẩu hay dữ liệu bí mật (Prompt 10 - Requirement 6)
   */
  async getDisputeById(userId: string, userRole: string, disputeId: string) {
    const dispute = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
      include: {
        booking: {
          include: {
            companion: {
              include: {
                user: { select: { user_id: true, display_name: true, email: true, role: true, status: true } },
                game: true,
                tier: true,
              },
            },
            renter: { select: { user_id: true, display_name: true, email: true, role: true, status: true } },
            escrow: true,
            session: true,
            transactions: {
              include: { entries: true },
            },
          },
        },
        evidences: {
          include: {
            uploader: { select: { user_id: true, display_name: true, role: true } },
          },
          orderBy: { created_at: 'asc' },
        },
        decision: {
          include: {
            cs_agent: { select: { user_id: true, display_name: true, email: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    const isStaff = ['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole);
    const isParticipant =
      dispute.renter_id === userId || dispute.booking.companion.user_id === userId;

    if (!isStaff && !isParticipant) {
      throw new ForbiddenError('Bạn không có quyền truy cập hồ sơ khiếu nại này.');
    }

    // Nếu có Session, tải lịch sử tin nhắn phòng chơi kèm original_content cho CS
    let chatMessages: any[] = [];
    if (dispute.booking.session) {
      const rawMessages = await prisma.chatMessage.findMany({
        where: { session_id: dispute.booking.session.session_id },
        orderBy: { message_id: 'asc' },
        include: { sender: { select: { user_id: true, display_name: true, role: true } } },
      });

      chatMessages = rawMessages.map((m) => ({
        message_id: m.message_id,
        sender_id: m.sender_id,
        sender_name: m.sender.display_name,
        sender_role: m.sender.role,
        content: m.content,
        is_censored: m.is_censored,
        original_content: isStaff ? m.original_content : undefined,
        created_at: m.created_at,
      }));
    }

    return {
      dispute,
      chat_messages: chatMessages,
      is_staff: isStaff,
    };
  }

  /**
   * Danh sách tất cả khiếu nại dành cho CS Agent / Admin
   */
  async listDisputes(userRole: string, statusFilter?: string) {
    if (!['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole)) {
      throw new ForbiddenError('Chỉ nhân viên CS hoặc Quản trị viên mới có quyền xem danh sách khiếu nại.');
    }

    return await prisma.disputeCase.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        booking: {
          include: {
            renter: { select: { display_name: true, email: true } },
            companion: { include: { user: { select: { display_name: true, email: true } } } },
            escrow: true,
          },
        },
        evidences: true,
        decision: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Nộp bằng chứng minh họa (Evidence Submission) cho hai bên (Prompt 10 - Requirement 4)
   * - Giới hạn kích thước tối đa 2MB.
   * - Chặn hoàn toàn file thực thi (.exe, .sh, ...) và file âm thanh/video thật.
   * - Lưu trữ metadata an toàn hoặc ghi file cục bộ vào uploads/evidences/.
   */
  async submitEvidence(userId: string, userRole: string, disputeId: string, input: SubmitEvidenceInput) {
    const dispute = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
      include: {
        booking: {
          include: {
            companion: { include: { user: true } },
            renter: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      throw new BusinessError(
        'DISPUTE_ALREADY_RESOLVED',
        'Hồ sơ khiếu nại đã có phán quyết giải quyết. Không thể bổ sung chứng cứ.'
      );
    }

    const isStaff = ['CS_AGENT', 'ADMIN'].includes(userRole);
    const isParticipant =
      dispute.renter_id === userId || dispute.booking.companion.user_id === userId;

    if (!isStaff && !isParticipant) {
      throw new ForbiddenError('Chỉ người tham gia đơn đặt lịch hoặc CS Agent mới có quyền bổ sung chứng cứ.');
    }

    // 1. Kiểm tra phần mở rộng tệp an toàn
    const fileName = input.file_name || 'evidence.png';
    const ext = path.extname(fileName).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      throw new ValidationError('Tệp thực thi bị nghiêm cấm vì lý do an toàn.');
    }

    // 2. Chặn file âm thanh/video thật (Ranh giới học thuật)
    if (AUDIO_VIDEO_EXTENSIONS.includes(ext) || (input.file_type as string).startsWith('AUDIO') || (input.file_type as string).startsWith('VIDEO')) {
      throw new BusinessError(
        'AUDIO_VIDEO_NOT_SUPPORTED',
        '[GIỚI HẠN ĐỒ ÁN] Không hỗ trợ lưu trữ file âm thanh/video thật theo quy định phạm vi học thuật.'
      );
    }

    // 3. Kiểm tra dung lượng tệp <= 2MB
    if (input.file_size_bytes && input.file_size_bytes > 2 * 1024 * 1024) {
      throw new ValidationError('Kích thước tệp vượt quá giới hạn tối đa 2MB.');
    }

    let fileUrl = input.file_url || `/uploads/evidences/mock_${crypto.randomUUID().slice(0, 8)}${ext || '.png'}`;

    // 4. Nếu có nội dung base64 thực, ghi tệp an toàn vào thư mục uploads/evidences
    if (input.file_content_base64) {
      const buffer = Buffer.from(input.file_content_base64, 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        throw new ValidationError('Kích thước tệp tải lên vượt quá giới hạn tối đa 2MB.');
      }

      const uploadDir = path.resolve(process.cwd(), 'uploads', 'evidences');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeBaseName = `${crypto.randomUUID()}${ext || '.png'}`;
      const safeFilePath = path.join(uploadDir, safeBaseName);
      fs.writeFileSync(safeFilePath, buffer);
      fileUrl = `/uploads/evidences/${safeBaseName}`;
    }

    // 5. Lưu bản ghi DisputeEvidence
    const evidence = await prisma.disputeEvidence.create({
      data: {
        dispute_id: disputeId,
        uploader_id: userId,
        file_url: fileUrl,
        file_type: input.file_type,
        description: input.description || null,
      },
      include: {
        uploader: { select: { display_name: true, role: true } },
      },
    });

    // Nếu trạng thái đang là EVIDENCE_PENDING, chuyển về UNDER_REVIEW
    if (dispute.status === 'EVIDENCE_PENDING') {
      await prisma.disputeCase.update({
        where: { dispute_id: disputeId },
        data: { status: 'UNDER_REVIEW' },
      });
    }

    logger.info(`Evidence ${evidence.evidence_id} submitted for dispute ${disputeId} by ${userId}`);

    return evidence;
  }

  /**
   * CS Agent yêu cầu hai bên bổ sung bằng chứng (Prompt 10 - Requirement 5)
   * Tiền ký quỹ tiếp tục bị đóng băng (FROZEN)
   */
  async requestAdditionalEvidence(csAgentId: string, userRole: string, disputeId: string, input: RequestEvidenceInput) {
    if (!['CS_AGENT', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenError('Chỉ nhân viên CS hoặc Admin mới có quyền yêu cầu bổ sung bằng chứng.');
    }

    const dispute = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
      include: {
        booking: {
          include: {
            companion: { include: { user: true } },
            escrow: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      throw new BusinessError('DISPUTE_ALREADY_RESOLVED', 'Khiếu nại đã giải quyết.');
    }

    const updatedDispute = await prisma.disputeCase.update({
      where: { dispute_id: disputeId },
      data: { status: 'EVIDENCE_PENDING' },
    });

    // Thông báo cho Renter & Companion
    await prisma.notification.createMany({
      data: [
        {
          user_id: dispute.renter_id,
          title: 'Yêu cầu bổ sung bằng chứng khiếu nại',
          message: `Bộ phận CS yêu cầu bổ sung bằng chứng cho khiếu nại #${disputeId.slice(0, 8)} trong ${input.deadline_hours} giờ: ${input.notes}`,
          type: 'DISPUTE_EVIDENCE_REQUESTED',
        },
        {
          user_id: dispute.booking.companion.user_id,
          title: 'Yêu cầu bổ sung bằng chứng khiếu nại',
          message: `Bộ phận CS yêu cầu bổ sung bằng chứng cho khiếu nại #${disputeId.slice(0, 8)} trong ${input.deadline_hours} giờ: ${input.notes}`,
          type: 'DISPUTE_EVIDENCE_REQUESTED',
        },
      ],
    });

    return updatedDispute;
  }

  /**
   * CS Agent ban hành phán quyết chính thức (Prompt 10 - Requirements 6, 7, 8)
   * - Bắt buộc nhập lý do phán quyết (tối thiểu 10 ký tự).
   * - Lỗi Companion >= 80%: Hoàn 100% Escrow cho Renter + Phạt 20% Companion (chống âm ví) + Trừ 10 điểm TrustScore.
   * - Lỗi Companion < 80%: Dịch vụ hoàn tất cơ bản -> Giải ngân 88% Companion, 12% Sàn.
   * - Atomicity & Circuit Breaker: Thất bại sẽ rollback 100%, giữ nguyên FROZEN và log LedgerAuditAlert.
   */
  async resolveDispute(csAgentId: string, userRole: string, disputeId: string, input: ResolveDisputeInput) {
    if (!['CS_AGENT', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenError('Chỉ nhân viên CS hoặc Quản trị viên mới có thẩm quyền ra phán quyết khiếu nại.');
    }

    const dispute = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
      include: {
        decision: true,
        booking: {
          include: {
            escrow: true,
            companion: { include: { user: true } },
            renter: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    // Idempotency: nếu đã có phán quyết trước đó
    if (dispute.decision || dispute.status === 'RESOLVED') {
      if (
        dispute.decision?.fault_percent === input.fault_percent &&
        dispute.decision?.decision_reason === input.decision_reason
      ) {
        return {
          decision: dispute.decision,
          dispute,
          booking: dispute.booking,
          is_idempotent_replay: true,
        };
      }
      throw new ConflictError(
        'DISPUTE_ALREADY_RESOLVED',
        'Khiếu nại này đã có phán quyết chính thức và không thể thay đổi.'
      );
    }

    // Kiểm tra Escrow
    const escrow = dispute.booking.escrow;
    if (!escrow) {
      throw new BusinessError('ESCROW_NOT_FOUND', 'Không tìm thấy thông tin ký quỹ của đơn đặt lịch.');
    }

    if (escrow.status !== 'FROZEN') {
      throw new BusinessError(
        'INVALID_ESCROW_STATUS',
        `Không thể phân xử khi tiền ký quỹ không ở trạng thái FROZEN (hiện tại: '${escrow.status}').`
      );
    }

    const booking = dispute.booking;
    const totalFee = booking.total_fee_snapshot;
    const faultPercent = input.fault_percent;

    const renterWallet = await prisma.wallet.findUnique({ where: { user_id: booking.renter_id } });
    const companionWallet = await prisma.wallet.findUnique({ where: { user_id: booking.companion.user_id } });

    if (!renterWallet || !companionWallet) {
      throw new NotFoundError('Không tìm thấy ví của người dùng tham gia.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Khóa cập nhật trạng thái DisputeCase nguyên tử
        const disputeUpdate = await tx.disputeCase.updateMany({
          where: {
            dispute_id: disputeId,
            status: { in: ['OPENED', 'EVIDENCE_PENDING', 'UNDER_REVIEW'] },
          },
          data: {
            status: 'RESOLVED',
            resolved_at: new Date(),
          },
        });

        if (disputeUpdate.count === 0) {
          throw new ConflictError('DISPUTE_STATE_CONFLICT', 'Khiếu nại vừa được xử lý hoặc có thay đổi đồng thời.');
        }

        let refundAmount = 0;
        let penaltyAmount = 0;
        let companionReceived = 0;
        let platformFee = 0;
        let targetBookingStatus = 'COMPLETED';

        // =========================================================================
        // NHÁNH 1: Lỗi Companion >= 80% (Hoàn 100% Escrow + Phạt 20% Companion)
        // =========================================================================
        if (faultPercent >= 80) {
          targetBookingStatus = 'REFUNDED';
          refundAmount = totalFee;

          // 1. Hoàn 100% tiền ký quỹ Escrow về ví khả dụng của Renter
          await ledgerService.postTransaction(
            {
              txn_type: 'ESCROW_REFUND',
              idempotency_key: `DISPUTE-REFUND-${dispute.dispute_id}`,
              booking_id: booking.booking_id,
              escrow_id: escrow.escrow_id,
              entries: [
                {
                  wallet_id: renterWallet.wallet_id,
                  direction: 'DEBIT',
                  balance_type: 'ESCROW',
                  amount: totalFee,
                },
                {
                  wallet_id: renterWallet.wallet_id,
                  direction: 'CREDIT',
                  balance_type: 'AVAILABLE',
                  amount: totalFee,
                },
              ],
            },
            tx
          );

          // 2. Thu khoản phạt 20% giá trị đơn từ Companion bồi thường cho Renter (DEMO_POLICY #4)
          const targetPenalty = Math.floor(totalFee * 0.20);
          const currentCompWallet = await tx.wallet.findUnique({
            where: { wallet_id: companionWallet.wallet_id },
          });

          // Cơ chế chống âm ví: Chỉ trừ tối đa số dư khả dụng hiện có
          const deductiblePenalty = Math.min(currentCompWallet?.available_balance ?? 0, targetPenalty);

          if (deductiblePenalty > 0) {
            penaltyAmount = deductiblePenalty;
            await ledgerService.postTransaction(
              {
                txn_type: 'CANCEL_PENALTY',
                idempotency_key: `DISPUTE-PENALTY-${dispute.dispute_id}`,
                booking_id: booking.booking_id,
                entries: [
                  {
                    wallet_id: companionWallet.wallet_id,
                    direction: 'DEBIT',
                    balance_type: 'AVAILABLE',
                    amount: deductiblePenalty,
                  },
                  {
                    wallet_id: renterWallet.wallet_id,
                    direction: 'CREDIT',
                    balance_type: 'AVAILABLE',
                    amount: deductiblePenalty,
                  },
                ],
              },
              tx
            );
          }

          // 3. Cập nhật Escrow sang REFUNDED
          await tx.escrow.update({
            where: { escrow_id: escrow.escrow_id },
            data: {
              status: 'REFUNDED',
              refunded_at: new Date(),
            },
          });

          // 4. Trừ 10 điểm uy tín TrustScore của Companion
          const currentProfile = await tx.companionProfile.findUnique({
            where: { profile_id: booking.profile_id },
          });
          const currentScore = currentProfile?.trust_score ?? 80;
          const newScore = Math.max(0, currentScore - 10.0);

          await tx.companionProfile.update({
            where: { profile_id: booking.profile_id },
            data: {
              trust_score: newScore,
              availability: newScore < 40 ? 'OFFLINE' : currentProfile?.availability,
            },
          });

          await tx.trustScoreLog.create({
            data: {
              profile_id: booking.profile_id,
              booking_id: booking.booking_id,
              delta: -10.0,
              score_after: newScore,
              reason_code: `DISPUTE_FAULT_GE_80: ${input.decision_reason}`,
            },
          });
        } 
        // =========================================================================
        // NHÁNH 2: Lỗi Companion < 80% (Dịch vụ hoàn thành cơ bản -> Giải ngân 88/12)
        // =========================================================================
        else {
          targetBookingStatus = 'COMPLETED';
          platformFee = Math.floor(totalFee * 0.12);
          companionReceived = totalFee - platformFee;

          // Giải ngân 88% cho Companion và 12% cho Sàn
          const ledgerTx = await ledgerService.postTransaction(
            {
              txn_type: 'ESCROW_RELEASE',
              idempotency_key: `DISPUTE-RELEASE-${dispute.dispute_id}`,
              booking_id: booking.booking_id,
              escrow_id: escrow.escrow_id,
              entries: [
                {
                  wallet_id: renterWallet.wallet_id,
                  direction: 'DEBIT',
                  balance_type: 'ESCROW',
                  amount: totalFee,
                },
                {
                  wallet_id: companionWallet.wallet_id,
                  direction: 'CREDIT',
                  balance_type: 'AVAILABLE',
                  amount: companionReceived,
                },
                {
                  wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID,
                  direction: 'CREDIT',
                  balance_type: 'AVAILABLE',
                  amount: platformFee,
                },
              ],
            },
            tx
          );

          if (platformFee > 0 && !ledgerTx.is_idempotent_replay) {
            await tx.platformRevenue.upsert({
              where: { txn_id: ledgerTx.transaction.txn_id },
              update: {},
              create: {
                txn_id: ledgerTx.transaction.txn_id,
                amount: platformFee,
                commission_rate: 0.12,
              },
            });
          }

          // Cập nhật Escrow sang RELEASED
          await tx.escrow.update({
            where: { escrow_id: escrow.escrow_id },
            data: {
              status: 'RELEASED',
              released_at: new Date(),
            },
          });
        }

        // Cập nhật trạng thái Booking
        await tx.booking.update({
          where: { booking_id: booking.booking_id },
          data: { status: targetBookingStatus },
        });

        // Tạo bản ghi DisputeDecision chính thức
        const decision = await tx.disputeDecision.create({
          data: {
            dispute_id: disputeId,
            cs_agent_id: csAgentId,
            fault_percent: faultPercent,
            refund_amount: refundAmount,
            penalty_amount: penaltyAmount,
            decision_reason: input.decision_reason,
          },
        });

        // Ghi nhận BOOKING_STATUS_HISTORY
        const historyReason = faultPercent >= 80
          ? `[DEMO_POLICY — APPROVED] CS phán quyết lỗi Companion ${faultPercent}% (>= 80%): Hoàn 100% (${refundAmount.toLocaleString('vi-VN')} đ) cho Renter + Phạt ${penaltyAmount.toLocaleString('vi-VN')} đ. Lý do: ${input.decision_reason}`
          : `[DEMO_POLICY — APPROVED] CS phán quyết lỗi Companion ${faultPercent}% (< 80%): Dịch vụ cơ bản hoàn tất. Giải ngân 88% (${companionReceived.toLocaleString('vi-VN')} đ) cho Companion và 12% (${platformFee.toLocaleString('vi-VN')} đ) cho Sàn. Lý do: ${input.decision_reason}`;

        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.booking_id,
            from_status: 'DISPUTED',
            to_status: targetBookingStatus,
            reason: historyReason,
            changed_by: csAgentId,
          },
        });

        // Gửi thông báo cho hai bên
        await tx.notification.createMany({
          data: [
            {
              user_id: booking.renter_id,
              title: 'Phán quyết khiếu nại đã được ban hành',
              message: historyReason,
              type: 'DISPUTE_RESOLVED',
            },
            {
              user_id: booking.companion.user_id,
              title: 'Phán quyết khiếu nại đã được ban hành',
              message: historyReason,
              type: 'DISPUTE_RESOLVED',
            },
          ],
        });

        const finalDispute = await tx.disputeCase.findUnique({
          where: { dispute_id: disputeId },
          include: { decision: true, evidences: true },
        });

        const finalBooking = await tx.booking.findUnique({
          where: { booking_id: booking.booking_id },
          include: { escrow: true },
        });

        logger.info(`Dispute ${disputeId} resolved by CS ${csAgentId} with fault ${faultPercent}%`);

        return {
          decision,
          dispute: finalDispute,
          booking: finalBooking,
          is_idempotent_replay: false,
        };
      });
    } catch (err: any) {
      // Circuit Breaker: Lưu vết sự cố kiểm toán
      try {
        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: err.errorCode || err.code || 'DISPUTE_SETTLEMENT_FAILED',
            error_message: err.message,
            context_json: JSON.stringify({
              action: 'RESOLVE_DISPUTE',
              dispute_id: disputeId,
              cs_agent_id: csAgentId,
              fault_percent: faultPercent,
              error: err.message,
            }),
          },
        });
      } catch (alertError) {
        logger.error('Failed to write LedgerAuditAlert in resolveDispute:', alertError);
      }
      throw err;
    }
  }
}

export const disputeService = new DisputeService();
