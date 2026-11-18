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
import { SubmitEvidenceInput, ResolveDisputeInput, RequestEvidenceInput, CompanionExplanationInput } from './dispute.dto.js';
import { wsNotificationService } from '../../common/ws-notification.service.js';
import { generateEvidenceSignedToken } from '../../middleware/auth.js';
import { userMessages, formatShortId, getDisputeReasonLabel } from '../../common/messages.vi.js';
import { encryptText, decryptText, encryptFileBuffer, decryptFileBuffer } from '../../common/crypto.js';

export interface CreateDisputeInput {
  reason_category: 'NO_SHOW' | 'HARASSMENT' | 'SKILL_MISMATCH' | 'TECHNICAL_ISSUE';
  description: string;
}

const FORBIDDEN_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.ts', '.py', '.php', '.dll', '.msi'];
const AUDIO_VIDEO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.mp4', '.avi', '.mov', '.mkv', '.webm'];

/**
 * Kiểm tra tính hợp lệ của định dạng ảnh dựa trên Magic Bytes (Chữ ký nhị phân tệp)
 * Hỗ trợ các chuẩn: PNG (89 50 4E 47), JPEG (FF D8 FF), WebP (RIFF....WEBP)
 */
export function validateImageMagicBytes(buffer: Buffer, declaredType?: string): void {
  if (declaredType === 'LOG_TEXT') {
    return;
  }
  if (!buffer || buffer.length < 4) {
    throw new ValidationError('Tệp tải lên không đủ kích thước hoặc rỗng.');
  }

  // PNG: 89 50 4E 47
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // WebP: 'RIFF' tại [0..3] và 'WEBP' tại [8..11]
  const isWebp =
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    throw new ValidationError(
      'Tệp tải lên không phải ảnh hợp lệ (chỉ chấp nhận PNG, JPEG, WebP hợp chuẩn magic bytes).'
    );
  }
}

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
        decryptText(booking.dispute.description) === input.description
      ) {
        return {
          dispute: {
            ...booking.dispute,
            description: decryptText(booking.dispute.description),
            companion_explanation: decryptText(booking.dispute.companion_explanation),
          },
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
          description: encryptText(input.description),
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
      const notifCompanion = userMessages.disputeOpenedToCompanion(
        booking.booking_id,
        dispute.dispute_id,
        dispute.reason_category
      );
      await tx.notification.create({
        data: {
          user_id: booking.companion.user_id,
          title: notifCompanion.title,
          message: notifCompanion.message,
          type: notifCompanion.type,
          target_url: notifCompanion.target_url,
        },
      });

      // Gửi thông báo xác nhận cho Renter
      const notifRenter = userMessages.disputeOpenedToRenter(
        dispute.dispute_id,
        booking.total_fee_snapshot
      );
      await tx.notification.create({
        data: {
          user_id: renterId,
          title: notifRenter.title,
          message: notifRenter.message,
          type: notifRenter.type,
          target_url: notifRenter.target_url,
        },
      });

      const updatedBooking = await tx.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true, session: true, dispute: true },
      });

      logger.info(`Dispute created for booking ${bookingId}, Escrow ${updatedEscrow.escrow_id} FROZEN.`);

      return {
        dispute: {
          ...dispute,
          description: decryptText(dispute.description),
          companion_explanation: decryptText(dispute.companion_explanation),
        },
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

    return {
      ...dispute,
      description: decryptText(dispute.description),
      companion_explanation: decryptText(dispute.companion_explanation),
    };
  }

  /**
   * Lấy chi tiết đầy đủ hồ sơ khiếu nại (CS Dossier) theo disputeId
   * Đảm bảo KHÔNG lộ mật khẩu hay dữ liệu bí mật (Prompt 10 - Requirement 6)
   */
  async getDisputeById(userId: string, userRole: string, disputeId: string) {
    let dispute = await prisma.disputeCase.findUnique({
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
      dispute = await prisma.disputeCase.findUnique({
        where: { booking_id: disputeId },
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
    }

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
        content: decryptText(m.content),
        is_censored: m.is_censored,
        original_content: isStaff && m.original_content ? decryptText(m.original_content) : undefined,
        created_at: m.created_at,
      }));

      // Bảo mật Đợt D1b - Mục B.2: Ghi nhận AuditLog an ninh khi CS Agent hoặc Admin xem chat log kiểm toán
      if (isStaff && chatMessages.length > 0) {
        try {
          await prisma.auditLog.create({
            data: {
              actor_id: userId,
              action: 'VIEW_DISPUTE_CHAT_AUDIT',
              entity_type: 'DISPUTE_CHAT',
              entity_id: dispute.dispute_id,
              payload_json: JSON.stringify({
                dispute_id: dispute.dispute_id,
                session_id: dispute.booking.session.session_id,
                message_count: chatMessages.length,
                censored_count: chatMessages.filter((m) => m.is_censored).length,
              }),
              ip_address: '127.0.0.1',
            },
          });
        } catch (auditErr) {
          logger.error('Failed to create audit log for dispute chat audit view:', auditErr);
        }
      }
    }

    // Tải nhật ký cuộc gọi WebRTC Voice (CallLog) cho CS Agent và Admin thẩm định (FR-006)
    let callLogs: any[] = [];
    if (dispute.booking.session) {
      try {
        const rawCallLogs = await prisma.callLog.findMany({
          where: { session_id: dispute.booking.session.session_id },
          orderBy: { started_at: 'desc' },
          include: {
            caller: { select: { user_id: true, display_name: true, role: true } },
            receiver: { select: { user_id: true, display_name: true, role: true } },
          },
        });

        callLogs = rawCallLogs.map((log) => ({
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
      } catch (err: any) {
        logger.warn(`Failed to fetch call logs for dispute: ${err.message}`);
      }
    }

    // Gắn signed_token thời hạn 60s và URL tải trực tiếp an toàn cho từng file chứng cứ (Mục B.1)
    const enhancedEvidences = (dispute.evidences || []).map((ev) => {
      const signedToken = generateEvidenceSignedToken(
        {
          user_id: userId,
          role: userRole,
          dispute_id: dispute.dispute_id,
          evidence_id: ev.evidence_id,
        },
        60
      );
      return {
        ...ev,
        signed_token: signedToken,
        signed_download_url: `/api/disputes/${dispute.dispute_id}/evidences/${ev.evidence_id}/file?signed_token=${signedToken}`,
      };
    });

    // D25: Tính toán chỉ số SLA (mục tiêu 45 phút, tạm dừng khi EVIDENCE_PENDING)
    const SLA_TARGET_MS = 45 * 60 * 1000;
    let currentPauseAddition = 0;
    if (dispute.status === 'EVIDENCE_PENDING' && dispute.evidence_requested_at) {
      currentPauseAddition = Math.max(0, Date.now() - new Date(dispute.evidence_requested_at).getTime());
    }
    const totalPausedMs = (dispute.paused_sla_ms || 0) + currentPauseAddition;
    const resolvedTime = dispute.resolved_at ? new Date(dispute.resolved_at).getTime() : Date.now();
    const grossElapsedMs = Math.max(0, resolvedTime - new Date(dispute.created_at).getTime());
    const activeElapsedMs = Math.max(0, grossElapsedMs - totalPausedMs);

    const slaMetrics = {
      target_minutes: 45,
      is_paused: dispute.status === 'EVIDENCE_PENDING',
      paused_ms: totalPausedMs,
      gross_elapsed_ms: grossElapsedMs,
      active_elapsed_ms: activeElapsedMs,
      within_sla: activeElapsedMs <= SLA_TARGET_MS,
      evidence_deadline: dispute.evidence_deadline,
    };

    const decryptedDispute = {
      ...dispute,
      description: decryptText(dispute.description),
      companion_explanation: decryptText(dispute.companion_explanation),
      category: dispute.reason_category,
      evidence: enhancedEvidences,
      evidences: enhancedEvidences,
    };

    return {
      dispute: decryptedDispute,
      chat_messages: chatMessages,
      call_logs: callLogs,
      is_staff: isStaff,
      sla_metrics: slaMetrics,
      // Tương thích ngược trực tiếp cho client component:
      ...decryptedDispute,
    };
  }

  /**
   * Danh sách tất cả khiếu nại dành cho CS Agent / Admin
   */
  async listDisputes(userRole: string, statusFilter?: string) {
    if (!['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole)) {
      throw new ForbiddenError('Chỉ nhân viên CS hoặc Quản trị viên mới có quyền xem danh sách khiếu nại.');
    }

    const disputes = await prisma.disputeCase.findMany({
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

    return disputes.map((d) => ({
      ...d,
      description: decryptText(d.description),
      companion_explanation: decryptText(d.companion_explanation),
    }));
  }

  /**
   * Nộp bằng chứng minh họa (Evidence Submission) cho hai bên (Prompt 10 - Requirement 4)
   * - Hỗ trợ tra cứu theo dispute_id hoặc booking_id
   * - Giới hạn kích thước tối đa 2MB.
   * - Chặn hoàn toàn file thực thi (.exe, .sh, ...) và file âm thanh/video thật.
   * - Lưu trữ metadata an toàn hoặc ghi file cục bộ vào uploads/evidences/.
   */
  async submitEvidence(userId: string, userRole: string, disputeId: string, input: SubmitEvidenceInput) {
    let dispute = await prisma.disputeCase.findUnique({
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
      dispute = await prisma.disputeCase.findUnique({
        where: { booking_id: disputeId },
        include: {
          booking: {
            include: {
              companion: { include: { user: true } },
              renter: true,
            },
          },
        },
      });
    }

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

    // Chuẩn hóa trích xuất Base64 nếu được truyền qua data URI
    let base64Payload = input.file_content_base64;
    if (!base64Payload && input.file_url && input.file_url.startsWith('data:')) {
      const commaIdx = input.file_url.indexOf(',');
      if (commaIdx !== -1) {
        base64Payload = input.file_url.slice(commaIdx + 1);
      }
    }

    let fileUrl = input.file_url || `/uploads/evidences/mock_${crypto.randomUUID().slice(0, 8)}${ext || '.png'}`;

    // 4. Nếu có nội dung base64 thực, ghi tệp an toàn vào thư mục uploads/evidences
    if (base64Payload) {
      const buffer = Buffer.from(base64Payload, 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        throw new ValidationError('Kích thước tệp tải lên vượt quá giới hạn tối đa 2MB.');
      }

      // Kiểm tra tính hợp lệ qua Magic Bytes (Đợt D1b - Mục C.6)
      validateImageMagicBytes(buffer, input.file_type);

      const uploadDir = path.resolve(process.cwd(), 'uploads', 'evidences');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeBaseName = `${crypto.randomUUID()}${ext || '.png'}`;
      const safeFilePath = path.join(uploadDir, safeBaseName);
      // Mã hóa tệp bằng AES-256-GCM trước khi ghi xuống đĩa (NFR-002)
      fs.writeFileSync(safeFilePath, encryptFileBuffer(buffer));
      fileUrl = `/uploads/evidences/${safeBaseName}`;
    }

    // 5. Lưu bản ghi DisputeEvidence
    const evidence = await prisma.disputeEvidence.create({
      data: {
        dispute_id: dispute.dispute_id,
        uploader_id: userId,
        file_url: fileUrl,
        file_type: input.file_type,
        description: input.description ? encryptText(input.description) : null,
      },
      include: {
        uploader: { select: { display_name: true, role: true } },
      },
    });

    // D25: Nếu trạng thái đang là EVIDENCE_PENDING, chuyển về UNDER_REVIEW và tích lũy thời gian tạm dừng SLA
    if (dispute.status === 'EVIDENCE_PENDING') {
      let additionalPausedMs = 0;
      if (dispute.evidence_requested_at) {
        additionalPausedMs = Math.max(0, Date.now() - new Date(dispute.evidence_requested_at).getTime());
      }
      await prisma.disputeCase.update({
        where: { dispute_id: dispute.dispute_id },
        data: {
          status: 'UNDER_REVIEW',
          paused_sla_ms: { increment: additionalPausedMs },
          evidence_requested_at: null,
        },
      });
    }

    // Tạo thông báo in-app cho toàn bộ nhân viên CS và Admin khi có chứng cứ mới (Đợt D1b - Mục C.4)
    try {
      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ['CS_AGENT', 'ADMIN'] } },
        select: { user_id: true },
      });
      if (staffUsers.length > 0) {
        const shortDsp = formatShortId('DSP', dispute.dispute_id);
        const uploaderLabel = userId === dispute.renter_id ? 'Người thuê' : 'Companion';
        await prisma.notification.createMany({
          data: staffUsers.map((u) => ({
            user_id: u.user_id,
            title: 'Chứng cứ khiếu nại mới được nộp',
            message: `${uploaderLabel} đã nộp chứng cứ mới cho khiếu nại ${shortDsp}. Vui lòng kiểm tra hồ sơ.`,
            type: 'DISPUTE_EVIDENCE_SUBMITTED',
            target_url: `/cs/cases/${dispute.dispute_id}`,
          })),
        });
      }
    } catch (notifErr) {
      logger.error('Failed to create in-app notifications for staff on evidence submit:', notifErr);
    }

    logger.info(`Evidence ${evidence.evidence_id} submitted for dispute ${dispute.dispute_id} by ${userId}`);

    // Gửi thông báo WebSocket Realtime cho CS Agents
    wsNotificationService.broadcast({
      type: 'DISPUTE_EVIDENCE_SUBMITTED',
      dispute_id: dispute.dispute_id,
      booking_id: dispute.booking_id,
      uploader_id: userId,
      evidence_id: evidence.evidence_id,
    });

    return evidence;
  }

  /**
   * Companion nộp văn bản giải trình và bằng chứng (Quyết định D29, BPMN Hình 6b)
   */
  async submitCompanionExplanation(companionUserId: string, disputeId: string, input: CompanionExplanationInput) {
    let dispute = await prisma.disputeCase.findUnique({
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
      dispute = await prisma.disputeCase.findUnique({
        where: { booking_id: disputeId },
        include: {
          booking: {
            include: {
              companion: { include: { user: true } },
              renter: true,
            },
          },
        },
      });
    }

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    if (dispute.booking.companion.user_id !== companionUserId) {
      throw new ForbiddenError('Chỉ Companion của đơn đặt lịch mới có quyền gửi bản giải trình.');
    }

    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      throw new BusinessError('DISPUTE_ALREADY_RESOLVED', 'Hồ sơ khiếu nại đã có phán quyết, không thể gửi giải trình.');
    }

    // 1. Cập nhật lời giải trình (Mã hóa AES-256-GCM theo NFR-002)
    const updateData: any = {
      companion_explanation: encryptText(input.explanation),
      companion_explained_at: new Date(),
    };

    // D25: Nếu đang chờ bổ sung, chuyển về UNDER_REVIEW và tích lũy thời gian tạm dừng SLA
    if (dispute.status === 'EVIDENCE_PENDING') {
      let additionalPausedMs = 0;
      if (dispute.evidence_requested_at) {
        additionalPausedMs = Math.max(0, Date.now() - new Date(dispute.evidence_requested_at).getTime());
      }
      updateData.status = 'UNDER_REVIEW';
      updateData.paused_sla_ms = { increment: additionalPausedMs };
      updateData.evidence_requested_at = null;
    }

    const updatedDispute = await prisma.disputeCase.update({
      where: { dispute_id: dispute.dispute_id },
      data: updateData,
    });

    // 2. Nếu có file đính kèm, tạo DisputeEvidence
    let evidenceRecord = null;
    if (input.file_content_base64 || (input.file_url && input.file_url.startsWith('data:'))) {
      evidenceRecord = await this.submitEvidence(
        companionUserId,
        'COMPANION',
        dispute.dispute_id,
        {
          file_type: input.file_type || 'IMAGE_PNG',
          file_content_base64: input.file_content_base64,
          file_url: input.file_url,
          file_name: input.file_name || 'giai_trinh_companion.png',
          file_size_bytes: input.file_size_bytes,
          description: `Giải trình của Companion: ${input.explanation.slice(0, 200)}`,
        }
      );
    }

    // 3. Thông báo in-app cho Renter & toàn bộ CS Agents / Admins
    const notifRenterExp = userMessages.disputeExplanationSubmittedToRenter(dispute.dispute_id);
    await prisma.notification.create({
      data: {
        user_id: dispute.renter_id,
        title: notifRenterExp.title,
        message: notifRenterExp.message,
        type: notifRenterExp.type,
        target_url: notifRenterExp.target_url,
      },
    });

    try {
      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ['CS_AGENT', 'ADMIN'] } },
        select: { user_id: true },
      });
      if (staffUsers.length > 0) {
        const notifStaffExp = userMessages.disputeExplanationSubmittedToStaff(dispute.dispute_id);
        await prisma.notification.createMany({
          data: staffUsers.map((u) => ({
            user_id: u.user_id,
            title: notifStaffExp.title,
            message: notifStaffExp.message,
            type: notifStaffExp.type,
            target_url: notifStaffExp.target_url,
          })),
        });
      }
    } catch (notifErr) {
      logger.error('Failed to notify staff on companion explanation:', notifErr);
    }

    wsNotificationService.notifyUser(dispute.renter_id, {
      type: 'DISPUTE_EXPLANATION_SUBMITTED',
      dispute_id: dispute.dispute_id,
      explanation: input.explanation,
    });

    wsNotificationService.broadcast({
      type: 'DISPUTE_EXPLANATION_SUBMITTED',
      dispute_id: dispute.dispute_id,
      companion_user_id: companionUserId,
    });

    return {
      dispute: {
        ...updatedDispute,
        description: decryptText(updatedDispute.description),
        companion_explanation: decryptText(updatedDispute.companion_explanation),
      },
      evidence: evidenceRecord,
    };
  }

  /**
   * Kiểm tra quyền truy cập vào file bằng chứng của khiếu nại (RBAC)
   */
  async checkEvidenceAccess(userId: string, userRole: string, disputeId: string, evidenceId: string) {
    let dispute = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
      include: {
        booking: {
          include: { companion: { include: { user: true } }, renter: true },
        },
      },
    });

    if (!dispute) {
      dispute = await prisma.disputeCase.findUnique({
        where: { booking_id: disputeId },
        include: {
          booking: {
            include: { companion: { include: { user: true } }, renter: true },
          },
        },
      });
    }

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    const evidence = await prisma.disputeEvidence.findUnique({
      where: { evidence_id: evidenceId },
    });

    if (!evidence || evidence.dispute_id !== dispute.dispute_id) {
      throw new NotFoundError('Không tìm thấy file bằng chứng được yêu cầu.');
    }

    const isStaff = ['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole);
    const isUploader = evidence.uploader_id === userId;
    const isParticipant = dispute.renter_id === userId || dispute.booking.companion.user_id === userId;

    if (!isStaff && !isUploader && !isParticipant) {
      throw new ForbiddenError('Bạn không có quyền truy cập file bằng chứng này.');
    }

    return { dispute, evidence, isStaff, isUploader, isParticipant };
  }

  /**
   * Sinh liên kết ký ngắn hạn 60 giây phục vụ tải tệp hoặc mở tab mới an toàn (Mục B.1)
   */
  async generateSignedEvidenceUrl(userId: string, userRole: string, disputeId: string, evidenceId: string) {
    const { dispute } = await this.checkEvidenceAccess(userId, userRole, disputeId, evidenceId);

    const signedToken = generateEvidenceSignedToken(
      {
        user_id: userId,
        role: userRole,
        dispute_id: dispute.dispute_id,
        evidence_id: evidenceId,
      },
      60
    );

    return {
      signed_token: signedToken,
      signed_url: `/api/disputes/${dispute.dispute_id}/evidences/${evidenceId}/file?signed_token=${signedToken}`,
      expires_in: 60,
    };
  }

  /**
   * Phục vụ file bằng chứng có kiểm tra quyền truy cập và ghi nhận AuditLog an ninh (Requirement 3)
   */
  async getEvidenceFile(userId: string, userRole: string, disputeId: string, evidenceId: string, ip?: string, download = false) {
    const { dispute, evidence, isStaff } = await this.checkEvidenceAccess(userId, userRole, disputeId, evidenceId);

    // Ghi vết kiểm toán an ninh khi nhân viên CS/Admin xem bằng chứng (Requirement 3)
    if (isStaff) {
      try {
        await prisma.auditLog.create({
          data: {
            actor_id: userId,
            action: 'VIEW_DISPUTE_EVIDENCE',
            entity_type: 'DISPUTE_EVIDENCE',
            entity_id: evidenceId,
            payload_json: JSON.stringify({
              dispute_id: dispute.dispute_id,
              evidence_id: evidenceId,
              download,
              file_type: evidence.file_type,
            }),
            ip_address: ip || '127.0.0.1',
          },
        });
      } catch (auditErr) {
        logger.error('Failed to create audit log for evidence access:', auditErr);
      }
    }

    // Xác định đường dẫn file thực tế trên đĩa
    let filePath: string | null = null;
    if (evidence.file_url.startsWith('/uploads/')) {
      filePath = path.resolve(process.cwd(), evidence.file_url.replace(/^\//, ''));
    }

    let buffer: Buffer;
    let contentType = 'image/png';
    if (evidence.file_type === 'IMAGE_JPEG') contentType = 'image/jpeg';
    else if (evidence.file_type === 'IMAGE_WEBP') contentType = 'image/webp';
    else if (evidence.file_type === 'LOG_TEXT') contentType = 'text/plain; charset=utf-8';

    if (filePath && fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath);
      // Giải mã trong bộ nhớ bằng AES-256-GCM (NFR-002)
      buffer = decryptFileBuffer(raw);
    } else if (evidence.file_url.startsWith('data:')) {
      const comma = evidence.file_url.indexOf(',');
      buffer = Buffer.from(evidence.file_url.slice(comma + 1), 'base64');
    } else {
      // Ảnh 1x1 png an toàn nếu file vật lý bị thiếu
      buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    }

    const safeFileName = path.basename(evidence.file_url) || `evidence_${evidenceId}.png`;
    return {
      buffer,
      contentType,
      fileName: safeFileName,
    };
  }

  /**
   * CS Agent yêu cầu hai bên bổ sung bằng chứng (D25: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định])
   * Tiền ký quỹ tiếp tục bị đóng băng (FROZEN), đồng hồ SLA 45m tạm dừng.
   */
  async requestAdditionalEvidence(csAgentId: string, userRole: string, disputeId: string, input: RequestEvidenceInput) {
    if (!['CS_AGENT', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenError('Chỉ nhân viên CS hoặc Admin mới có quyền yêu cầu bổ sung bằng chứng.');
    }

    let dispute = await prisma.disputeCase.findUnique({
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
      dispute = await prisma.disputeCase.findUnique({
        where: { booking_id: disputeId },
        include: {
          booking: {
            include: {
              companion: { include: { user: true } },
              escrow: true,
            },
          },
        },
      });
    }

    if (!dispute) {
      throw new NotFoundError('Không tìm thấy hồ sơ khiếu nại.');
    }

    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      throw new BusinessError('DISPUTE_ALREADY_RESOLVED', 'Khiếu nại đã giải quyết.');
    }

    const deadlineHours = input.deadline_hours || 24;
    const now = new Date();
    const evidenceDeadline = new Date(now.getTime() + deadlineHours * 3600 * 1000);

    const updatedDispute = await prisma.disputeCase.update({
      where: { dispute_id: dispute.dispute_id },
      data: {
        status: 'EVIDENCE_PENDING',
        evidence_deadline: evidenceDeadline,
        evidence_requested_at: now,
        evidence_requested_by: csAgentId,
        evidence_request_note: input.notes,
      },
    });

    // Thông báo in-app cho Renter & Companion
    const notifEvidenceReq = userMessages.disputeEvidenceRequested(
      dispute.dispute_id,
      evidenceDeadline,
      input.notes
    );
    await prisma.notification.createMany({
      data: [
        {
          user_id: dispute.renter_id,
          title: notifEvidenceReq.title,
          message: notifEvidenceReq.message,
          type: notifEvidenceReq.type,
          target_url: notifEvidenceReq.target_url,
        },
        {
          user_id: dispute.booking.companion.user_id,
          title: notifEvidenceReq.title,
          message: notifEvidenceReq.message,
          type: notifEvidenceReq.type,
          target_url: notifEvidenceReq.target_url,
        },
      ],
    });

    // Gửi thông báo WebSocket Realtime cho cả hai bên
    wsNotificationService.notifyUser(dispute.renter_id, {
      type: 'DISPUTE_EVIDENCE_REQUESTED',
      dispute_id: dispute.dispute_id,
      deadline: evidenceDeadline,
      notes: input.notes,
    });

    wsNotificationService.notifyUser(dispute.booking.companion.user_id, {
      type: 'DISPUTE_EVIDENCE_REQUESTED',
      dispute_id: dispute.dispute_id,
      deadline: evidenceDeadline,
      notes: input.notes,
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
          dispute: {
            ...dispute,
            description: decryptText(dispute.description),
            companion_explanation: decryptText(dispute.companion_explanation),
          },
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
        let targetPenalty = 0;
        let unpaidDebt = 0;
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

          // 2. Thu khoản phạt 20% giá trị đơn từ Companion ghi có doanh thu nền tảng (D22: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định])
          targetPenalty = Math.floor(totalFee * 0.20);
          const currentCompWallet = await tx.wallet.findUnique({
            where: { wallet_id: companionWallet.wallet_id },
          });

          // Cơ chế chống âm ví: Chỉ trừ tối đa số dư khả dụng hiện có, phần thiếu ghi nợ PENALTY_DEBT
          const deductiblePenalty = Math.min(currentCompWallet?.available_balance ?? 0, targetPenalty);
          unpaidDebt = targetPenalty - deductiblePenalty;

          if (deductiblePenalty > 0) {
            penaltyAmount = deductiblePenalty;
            const penaltyTx = await ledgerService.postTransaction(
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
                    wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID,
                    direction: 'CREDIT',
                    balance_type: 'AVAILABLE',
                    amount: deductiblePenalty,
                  },
                ],
              },
              tx
            );

            if (!penaltyTx.is_idempotent_replay) {
              await tx.platformRevenue.upsert({
                where: { txn_id: penaltyTx.transaction.txn_id },
                update: {},
                create: {
                  txn_id: penaltyTx.transaction.txn_id,
                  amount: deductiblePenalty,
                  commission_rate: 0.20,
                },
              });
            }
          }

          if (unpaidDebt > 0) {
            await tx.wallet.update({
              where: { wallet_id: companionWallet.wallet_id },
              data: {
                penalty_debt: { increment: unpaidDebt },
              },
            });
            logger.warn(
              `[D22] Companion ${booking.companion.user_id} insufficient balance for penalty: deducted ${deductiblePenalty}, recorded penalty_debt ${unpaidDebt} VND`
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
          ? `CS phán quyết Companion có lỗi ${faultPercent}% (từ 80% trở lên): Hoàn 100% (${refundAmount.toLocaleString('vi-VN')}đ) cho Renter. Khấu trừ chế tài vi phạm 20% (${targetPenalty.toLocaleString('vi-VN')}đ${unpaidDebt > 0 ? `, nợ vi phạm: ${unpaidDebt.toLocaleString('vi-VN')}đ` : ''}). Lý do: ${input.decision_reason}`
          : `CS phán quyết Companion có lỗi ${faultPercent}% (dưới 80%): Dịch vụ cơ bản hoàn tất. Giải ngân thu nhập (${companionReceived.toLocaleString('vi-VN')}đ) cho Companion. Lý do: ${input.decision_reason}`;

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
        const notifRenter = userMessages.disputeResolvedToRenter(disputeId, faultPercent, refundAmount);
        const notifCompanion = userMessages.disputeResolvedToCompanion(
          disputeId,
          faultPercent,
          companionReceived,
          penaltyAmount,
          unpaidDebt
        );

        await tx.notification.createMany({
          data: [
            {
              user_id: booking.renter_id,
              title: notifRenter.title,
              message: notifRenter.message,
              type: notifRenter.type,
              target_url: notifRenter.target_url,
            },
            {
              user_id: booking.companion.user_id,
              title: notifCompanion.title,
              message: notifCompanion.message,
              type: notifCompanion.type,
              target_url: notifCompanion.target_url,
            },
          ],
        });

        // Gửi thông báo WebSocket Realtime cho hai bên và CS
        wsNotificationService.notifyUser(booking.renter_id, {
          type: 'DISPUTE_RESOLVED',
          dispute_id: disputeId,
          result: notifRenter.message,
          fault_percent: faultPercent,
        });
        wsNotificationService.notifyUser(booking.renter_id, {
          type: 'BALANCE_UPDATED',
          reason: 'DISPUTE_RESOLVED',
        });
        wsNotificationService.notifyUser(booking.companion.user_id, {
          type: 'DISPUTE_RESOLVED',
          dispute_id: disputeId,
          result: notifCompanion.message,
          fault_percent: faultPercent,
        });
        wsNotificationService.notifyUser(booking.companion.user_id, {
          type: 'BALANCE_UPDATED',
          reason: 'DISPUTE_RESOLVED',
        });
        wsNotificationService.broadcast({
          type: 'DISPUTE_RESOLVED',
          dispute_id: disputeId,
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
          dispute: finalDispute
            ? {
                ...finalDispute,
                description: decryptText(finalDispute.description),
                companion_explanation: decryptText(finalDispute.companion_explanation),
              }
            : finalDispute,
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
