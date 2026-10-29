import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { 
  NotFoundError, 
  BusinessError, 
  ConflictError, 
  ForbiddenError 
} from '../../common/errors.js';
import { calculateSlotDurationHours, getVietnamDayKey } from '../../common/dateUtils.js';
import { CreateBookingInput } from './booking.dto.js';
import { env } from '../../config/env.js';
import { ledgerService } from '../ledger/ledger.service.js';
import { settlementService } from '../ledger/settlement.service.js';
import { disputeService, CreateDisputeInput } from '../dispute/dispute.service.js';
import { SYSTEM_ACCOUNTS } from '../ledger/ledger.types.js';
import { logger } from '../../common/logger.js';

export class BookingService {
  async createBooking(renterId: string, input: CreateBookingInput) {
    const now = new Date();

    // 1. Chống đặt trùng theo request_key (Idempotency Check - BR-01, TC01, TC02)
    const existingBooking = await prisma.booking.findUnique({
      where: { request_key: input.request_key },
      include: {
        slot: true,
        companion: {
          include: {
            user: { select: { display_name: true, email: true } },
            game: true,
            tier: true,
          },
        },
      },
    });

    if (existingBooking) {
      // Kiểm tra trùng key nhưng khác payload (Requirement 2)
      if (
        existingBooking.slot_id !== input.slot_id ||
        existingBooking.renter_id !== renterId ||
        (input.duration_hours && existingBooking.duration_hours !== input.duration_hours)
      ) {
        throw new ConflictError(
          'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
          'Request key này đã được sử dụng với thông tin đặt lịch khác.'
        );
      }

      // Trả lại kết quả cũ nguyên vẹn, không tạo side-effect mới (TC01)
      return {
        booking: existingBooking,
        is_idempotent_replay: true,
      };
    }

    // 2. Kiểm tra thông tin Khung giờ (Slot) & Hồ sơ Companion (TC03)
    const slot = await prisma.slotCalendar.findUnique({
      where: { slot_id: input.slot_id },
      include: {
        profile: {
          include: {
            user: true,
            game: true,
            tier: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundError('Không tìm thấy khung giờ đặt lịch được yêu cầu.');
    }

    // Companion không thể tự thuê chính mình
    if (slot.profile.user_id === renterId) {
      throw new BusinessError('CANNOT_RENT_SELF', 'Companion không thể tự đặt lịch chính mình.');
    }

    // Kiểm tra Companion có đang hoạt động không
    if (slot.profile.user.status !== 'ACTIVE') {
      throw new BusinessError('COMPANION_INACTIVE', 'Tài khoản Companion hiện không ở trạng thái hoạt động.');
    }

    // Kiểm tra điểm tín nhiệm của Companion
    if (slot.profile.trust_score < 40) {
      throw new BusinessError('COMPANION_SUSPENDED', 'Hồ sơ Companion đang bị tạm khóa do điểm uy tín thấp (< 40).');
    }

    // Kiểm tra thời gian slot phải ở tương lai
    if (new Date(slot.start_time) <= now) {
      throw new BusinessError('SLOT_TIME_IN_PAST', 'Khung giờ này đã trôi qua hoặc đang diễn ra, không thể đặt lịch.');
    }

    // Kiểm tra tính khả dụng của slot
    if (slot.status === 'BOOKED') {
      throw new BusinessError('SLOT_ALREADY_BOOKED', 'Khung giờ này đã được đặt thành công bởi người khác.');
    }

    // Nếu slot đang HELD và chưa hết hạn TTL
    if (slot.status === 'HELD' && slot.held_until && new Date(slot.held_until) > now) {
      throw new ConflictError('SLOT_ALREADY_HELD', 'Khung giờ này hiện đang có người giữ chỗ tạm thời.');
    }

    // 3. Tính toán thời lượng và chốt phí snapshot (BR-04, TC05)
    const rawHours = calculateSlotDurationHours(new Date(slot.start_time), new Date(slot.end_time));
    const durationHours = Math.max(1, Math.round(rawHours));

    if (input.duration_hours && input.duration_hours !== durationHours) {
      throw new BusinessError(
        'DURATION_MISMATCH',
        `Thời lượng yêu cầu (${input.duration_hours}h) không khớp với khung giờ đã chọn (${durationHours}h).`
      );
    }

    // Chốt total_fee_snapshot bằng số nguyên VND ngay tại thời điểm đặt (TC05)
    const totalFeeSnapshot = slot.profile.hourly_rate * durationHours;

    // 4. Kiểm tra giới hạn 10 giờ/ngày theo giờ Việt Nam UTC+7 (BR-03, D08, TC68)
    const targetDayKey = getVietnamDayKey(new Date(slot.start_time));
    const sameDaySlots = await prisma.slotCalendar.findMany({
      where: {
        profile_id: slot.profile_id,
        slot_id: { not: slot.slot_id },
        status: { in: ['BOOKED', 'HELD'] },
      },
    });

    let currentDayHours = 0;
    for (const s of sameDaySlots) {
      if (getVietnamDayKey(new Date(s.start_time)) === targetDayKey) {
        // Nếu là HELD nhưng đã quá hạn thì bỏ qua
        if (s.status === 'HELD' && s.held_until && new Date(s.held_until) <= now) {
          continue;
        }
        currentDayHours += calculateSlotDurationHours(new Date(s.start_time), new Date(s.end_time));
      }
    }

    if (currentDayHours + durationHours > env.MAX_COMPANION_HOURS_PER_DAY) {
      throw new BusinessError(
        'COMPANION_DAILY_LIMIT_EXCEEDED',
        `Companion đã đạt hoặc sẽ vượt quá trần làm việc ${env.MAX_COMPANION_HOURS_PER_DAY} giờ/ngày trong ngày ${targetDayKey}.`
      );
    }

    // 5. Thực hiện Transaction: Khóa nguyên tử Slot + Tạo Booking + Ghi Status History (TC04, TC06, TC15)
    const heldUntil = new Date(now.getTime() + env.SLOT_HOLD_TTL_MINUTES * 60 * 1000);
    const responseDeadline = new Date(now.getTime() + env.BOOKING_RESPONSE_TIMEOUT_SECONDS * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 5A. Cập nhật có điều kiện nguyên tử (Atomic Conditional Update)
      // Chỉ thành công nếu slot là AVAILABLE hoặc HELD nhưng đã quá hạn
      const updateResult = await tx.slotCalendar.updateMany({
        where: {
          slot_id: input.slot_id,
          OR: [
            { status: 'AVAILABLE' },
            { status: 'HELD', held_until: { lt: now } },
          ],
        },
        data: {
          status: 'HELD',
          held_until: heldUntil,
        },
      });

      // Nếu 2 request cùng chạy đồng thời, chỉ 1 request có count === 1
      if (updateResult.count === 0) {
        throw new ConflictError(
          'SLOT_ALREADY_HELD',
          'Khung giờ này vừa có người khác giữ chỗ hoặc trạng thái không còn khả dụng.'
        );
      }

      // 5B. Tạo bản ghi Booking
      const booking = await tx.booking.create({
        data: {
          renter_id: renterId,
          profile_id: slot.profile.profile_id,
          slot_id: slot.slot_id,
          request_key: input.request_key,
          start_time: slot.start_time,
          duration_hours: durationHours,
          total_fee_snapshot: totalFeeSnapshot,
          status: 'PENDING_ACCEPTANCE',
          response_deadline: responseDeadline,
        },
        include: {
          slot: true,
          companion: {
            include: {
              user: { select: { display_name: true, email: true } },
              game: true,
              tier: true,
            },
          },
        },
      });

      // 5C. Ghi nhật ký trạng thái BOOKING_STATUS_HISTORY (Requirement 6, TC15)
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: booking.booking_id,
          from_status: null,
          to_status: 'PENDING_ACCEPTANCE',
          reason: 'Khởi tạo đơn đặt lịch và giữ chỗ slot thành công',
          changed_by: renterId,
        },
      });

      return booking;
    });

    return {
      booking: result,
      is_idempotent_replay: false,
    };
  }

  async getBookingById(userId: string, userRole: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        slot: true,
        escrow: true,
        reviews: true,
        session: true,
        companion: {
          include: {
            user: { select: { user_id: true, display_name: true, email: true } },
            game: true,
            tier: true,
          },
        },
        renter: {
          select: { user_id: true, display_name: true, email: true },
        },
        history: {
          orderBy: { changed_at: 'asc' },
          include: {
            actor: { select: { display_name: true, role: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy thông tin đơn đặt lịch.');
    }

    // Bảo vệ quyền riêng tư: Chỉ người trong đơn hoặc CS/Admin mới được xem
    const isParticipant = booking.renter_id === userId || booking.companion.user.user_id === userId;
    const isStaff = ['CS_AGENT', 'AUDITOR', 'ADMIN'].includes(userRole);

    if (!isParticipant && !isStaff) {
      throw new ForbiddenError('Bạn không có quyền xem chi tiết đơn đặt lịch của người khác.');
    }

    return booking;
  }

  async listMyBookings(userId: string, userRole: string) {
    const whereClause: any = {};

    if (userRole === 'RENTER') {
      whereClause.renter_id = userId;
    } else if (userRole === 'COMPANION') {
      const profile = await prisma.companionProfile.findUnique({
        where: { user_id: userId },
      });
      if (profile) {
        whereClause.profile_id = profile.profile_id;
      } else {
        return [];
      }
    } else if (!['CS_AGENT', 'AUDITOR', 'ADMIN'].includes(userRole)) {
      whereClause.renter_id = userId;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        slot: true,
        companion: {
          include: {
            user: { select: { display_name: true } },
            game: true,
          },
        },
        renter: {
          select: { display_name: true },
        },
        dispute: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return bookings;
  }

  /**
   * Ký quỹ Escrow an toàn qua Sổ cái ghi kép (M5 - PROMPT 07, BR-05, TC07, TC08, TC10).
   * Debit ví khả dụng Renter, Credit tài khoản Escrow. Chỉ đánh dấu HELD khi posting thành công.
   */
  async holdEscrow(renterId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        escrow: true,
        slot: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    if (booking.renter_id !== renterId) {
      throw new ForbiddenError('Chỉ người đặt lịch mới có quyền thực hiện ký quỹ cho đơn này.');
    }

    // Nếu đã ký quỹ thành công trước đó (Idempotency)
    if (booking.escrow && booking.escrow.status === 'HELD') {
      const renterWallet = await prisma.wallet.findUnique({ where: { user_id: renterId } });
      return {
        booking,
        escrow: booking.escrow,
        is_idempotent_replay: true,
        available_balance: renterWallet?.available_balance ?? 0,
        escrow_balance: renterWallet?.escrow_balance ?? 0,
      };
    }

    if (booking.status !== 'PENDING_ACCEPTANCE') {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS_FOR_ESCROW',
        `Đơn đặt lịch ở trạng thái '${booking.status}' không thể thực hiện ký quỹ.`
      );
    }

    // Kiểm tra số dư ví Renter
    const renterWallet = await prisma.wallet.findUnique({
      where: { user_id: renterId },
    });

    if (!renterWallet) {
      throw new NotFoundError('Không tìm thấy ví của người đặt lịch.');
    }

    if (renterWallet.available_balance < booking.total_fee_snapshot) {
      throw new BusinessError(
        'INSUFFICIENT_BALANCE',
        `Số dư ví khả dụng không đủ để ký quỹ. Cần ${booking.total_fee_snapshot.toLocaleString('vi-VN')} VND, hiện có ${renterWallet.available_balance.toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền.`
      );
    }

    const responseDeadline = new Date(Date.now() + env.BOOKING_RESPONSE_TIMEOUT_SECONDS * 1000);

    // Thực thi nguyên tử: Tạo Escrow + Ledger Posting + Cập nhật Booking + History
    return await prisma.$transaction(async (tx) => {
      // 1. Tạo Escrow
      const escrow = await tx.escrow.create({
        data: {
          booking_id: booking.booking_id,
          amount: booking.total_fee_snapshot,
          status: 'HELD',
          held_at: new Date(),
        },
      });

      // 2. Ghi nhận Sổ cái kép qua LedgerService (Debit Available, Credit Escrow)
      await ledgerService.postTransaction(
        {
          txn_type: 'ESCROW_HOLD',
          idempotency_key: `ESCROW-HOLD-${booking.booking_id}`,
          booking_id: booking.booking_id,
          escrow_id: escrow.escrow_id,
          entries: [
            {
              wallet_id: renterWallet.wallet_id,
              direction: 'DEBIT',
              balance_type: 'AVAILABLE',
              amount: booking.total_fee_snapshot,
            },
            {
              wallet_id: renterWallet.wallet_id,
              direction: 'CREDIT',
              balance_type: 'ESCROW',
              amount: booking.total_fee_snapshot,
            },
          ],
        },
        tx
      );

      // 3. Cập nhật Booking chuyển sang WAITING_COMPANION_RESPONSE với 180s deadline
      const updatedBooking = await tx.booking.update({
        where: { booking_id: booking.booking_id },
        data: {
          status: 'WAITING_COMPANION_RESPONSE',
          response_deadline: responseDeadline,
        },
        include: {
          escrow: true,
          slot: true,
          companion: {
            include: { user: { select: { display_name: true } }, game: true },
          },
        },
      });

      // 4. Ghi nhận BOOKING_STATUS_HISTORY
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: booking.booking_id,
          from_status: 'PENDING_ACCEPTANCE',
          to_status: 'WAITING_COMPANION_RESPONSE',
          reason: 'Ký quỹ Escrow thành công qua Sổ cái ghi kép, chờ Companion phản hồi trong 180s',
          changed_by: renterId,
        },
      });

      const updatedWallet = await tx.wallet.findUnique({ where: { wallet_id: renterWallet.wallet_id } });

      return {
        booking: updatedBooking,
        escrow,
        is_idempotent_replay: false,
        available_balance: updatedWallet?.available_balance ?? 0,
        escrow_balance: updatedWallet?.escrow_balance ?? 0,
      };
    });
  }

  /**
   * Companion chấp nhận đơn đặt lịch (BR-16, D10).
   * Yêu cầu: Trong hạn 180s, tiền ký quỹ đã ở trạng thái HELD.
   * Chuyển Booking -> ACCEPTED, Slot -> BOOKED, tạo Session với room_token.
   */
  async acceptBooking(companionUserId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        slot: true,
        companion: {
          include: { user: true },
        },
        escrow: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    if (booking.companion.user_id !== companionUserId) {
      throw new ForbiddenError('Chỉ Companion được đặt lịch mới có quyền chấp nhận đơn này.');
    }

    // Idempotency: nếu đã ACCEPTED rồi thì trả kết quả cũ
    if (booking.status === 'ACCEPTED') {
      const session = await prisma.session.findUnique({
        where: { booking_id: bookingId },
      });
      return {
        booking,
        session,
        is_idempotent_replay: true,
      };
    }

    if (booking.status !== 'WAITING_COMPANION_RESPONSE') {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Không thể chấp nhận đơn ở trạng thái '${booking.status}'. Đơn phải được ký quỹ thành công trước.`
      );
    }

    const now = new Date();
    if (booking.response_deadline && now > booking.response_deadline) {
      throw new BusinessError(
        'COMPANION_RESPONSE_TIMEOUT',
        'Thời hạn phản hồi 180 giây của Companion đã kết thúc.'
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Cập nhật có điều kiện nguyên tử để chống race condition
      const updateResult = await tx.booking.updateMany({
        where: {
          booking_id: bookingId,
          status: 'WAITING_COMPANION_RESPONSE',
        },
        data: {
          status: 'ACCEPTED',
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          'BOOKING_STATE_CONFLICT',
          'Đơn đặt lịch vừa được thay đổi trạng thái hoặc đã bị hủy/quá hạn.'
        );
      }

      // 2. Chuyển slot sang BOOKED
      await tx.slotCalendar.update({
        where: { slot_id: booking.slot_id },
        data: {
          status: 'BOOKED',
          held_until: null,
        },
      });

      // 3. Khởi tạo Session phòng chơi kèm room_token
      const endTime = new Date(booking.start_time.getTime() + booking.duration_hours * 3600 * 1000);
      const session = await tx.session.create({
        data: {
          booking_id: booking.booking_id,
          status: 'SCHEDULED',
          start_time: booking.start_time,
          end_time: endTime,
          room_token: crypto.randomUUID(),
        },
      });

      // 4. Ghi nhận BOOKING_STATUS_HISTORY
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: booking.booking_id,
          from_status: 'WAITING_COMPANION_RESPONSE',
          to_status: 'ACCEPTED',
          reason: 'Companion đã chấp nhận đơn đặt lịch. Phòng chơi đã được khởi tạo.',
          changed_by: companionUserId,
        },
      });

      // 5. Tạo thông báo in-app cho Renter
      await tx.notification.create({
        data: {
          user_id: booking.renter_id,
          title: 'Đơn đặt lịch được chấp nhận',
          message: `Companion ${booking.companion.user.display_name} đã chấp nhận đơn đặt lịch của bạn. Phòng chơi đã sẵn sàng!`,
          type: 'BOOKING_ACCEPTED',
        },
      });

      const updatedBooking = await tx.booking.findUnique({
        where: { booking_id: bookingId },
        include: {
          slot: true,
          companion: {
            include: { user: { select: { display_name: true, email: true } }, game: true },
          },
          escrow: true,
        },
      });

      return {
        booking: updatedBooking,
        session,
        is_idempotent_replay: false,
      };
    });
  }

  /**
   * Companion từ chối đơn đặt lịch (BR-16, D10).
   * Hoàn 100% Escrow cho Renter trong một posting duy nhất.
   * Nếu lỗi ledger, rollback và tạo LedgerAuditAlert.
   */
  async rejectBooking(companionUserId: string, bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        slot: true,
        companion: { include: { user: true } },
        escrow: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    if (booking.companion.user_id !== companionUserId) {
      throw new ForbiddenError('Chỉ Companion được đặt lịch mới có quyền từ chối đơn này.');
    }

    // Idempotency: nếu đã hủy rồi
    if (booking.status === 'CANCELLED' && booking.escrow?.status === 'REFUNDED') {
      return {
        booking,
        is_idempotent_replay: true,
      };
    }

    if (booking.status !== 'WAITING_COMPANION_RESPONSE') {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Không thể từ chối đơn ở trạng thái '${booking.status}'.`
      );
    }

    const renterWallet = await prisma.wallet.findUnique({
      where: { user_id: booking.renter_id },
    });

    if (!renterWallet) {
      throw new NotFoundError('Không tìm thấy ví của người đặt lịch.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Khóa trạng thái đơn hàng nguyên tử
        const updateResult = await tx.booking.updateMany({
          where: {
            booking_id: bookingId,
            status: 'WAITING_COMPANION_RESPONSE',
          },
          data: {
            status: 'CANCELLED',
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            'BOOKING_STATE_CONFLICT',
            'Đơn đặt lịch vừa được thay đổi trạng thái hoặc đã bị hủy trước đó.'
          );
        }

        // 2. Ghi nhận Sổ cái: Hoàn 100% Escrow về ví khả dụng của Renter trong một posting duy nhất
        await ledgerService.postTransaction(
          {
            txn_type: 'ESCROW_REFUND',
            idempotency_key: `REFUND-REJECT-${booking.booking_id}`,
            booking_id: booking.booking_id,
            escrow_id: booking.escrow?.escrow_id,
            entries: [
              {
                wallet_id: renterWallet.wallet_id,
                direction: 'DEBIT',
                balance_type: 'ESCROW',
                amount: booking.total_fee_snapshot,
              },
              {
                wallet_id: renterWallet.wallet_id,
                direction: 'CREDIT',
                balance_type: 'AVAILABLE',
                amount: booking.total_fee_snapshot,
              },
            ],
          },
          tx
        );

        // 3. Cập nhật Escrow thành REFUNDED
        if (booking.escrow) {
          await tx.escrow.update({
            where: { escrow_id: booking.escrow.escrow_id },
            data: {
              status: 'REFUNDED',
              refunded_at: new Date(),
            },
          });
        }

        // 4. Giải phóng Slot trở lại AVAILABLE
        await tx.slotCalendar.update({
          where: { slot_id: booking.slot_id },
          data: {
            status: 'AVAILABLE',
            held_until: null,
          },
        });

        // 5. Ghi nhận BOOKING_STATUS_HISTORY
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.booking_id,
            from_status: 'WAITING_COMPANION_RESPONSE',
            to_status: 'CANCELLED',
            reason: reason || 'Companion từ chối nhận đơn. Tiền ký quỹ đã được hoàn 100% cho Renter.',
            changed_by: companionUserId,
          },
        });

        // 6. Gửi thông báo cho Renter
        await tx.notification.create({
          data: {
            user_id: booking.renter_id,
            title: 'Đơn đặt lịch bị từ chối',
            message: `Companion đã từ chối nhận đơn. Số tiền ${booking.total_fee_snapshot.toLocaleString('vi-VN')} VND đã được hoàn về ví của bạn.`,
            type: 'BOOKING_REJECTED',
          },
        });

        const updatedBooking = await tx.booking.findUnique({
          where: { booking_id: bookingId },
          include: { escrow: true, slot: true },
        });

        return {
          booking: updatedBooking,
          is_idempotent_replay: false,
        };
      });
    } catch (err: any) {
      try {
        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: err.errorCode || err.code || 'LEDGER_POSTING_FAILED',
            error_message: err.message,
            context_json: JSON.stringify({
              action: 'REJECT_BOOKING',
              booking_id: bookingId,
              companion_id: companionUserId,
              error: err.message,
            }),
          },
        });
      } catch (alertError) {
        logger.error('Failed to write LedgerAuditAlert:', alertError);
      }
      throw err;
    }
  }

  /**
   * Xử lý quá hạn 180 giây không phản hồi từ Companion (BR-16, D10).
   * Hoàn 100% Escrow cho Renter và trừ 3 điểm TrustScore của Companion.
   */
  async handleTimeout(bookingId: string, actorId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        slot: true,
        companion: { include: { user: true } },
        escrow: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    // Idempotency: nếu đã hủy do timeout
    if (booking.status === 'CANCELLED' && booking.escrow?.status === 'REFUNDED') {
      return {
        booking,
        is_idempotent_replay: true,
      };
    }

    if (booking.status !== 'WAITING_COMPANION_RESPONSE') {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Không thể xử lý timeout cho đơn ở trạng thái '${booking.status}'.`
      );
    }

    const now = new Date();
    if (booking.response_deadline && now <= booking.response_deadline) {
      throw new BusinessError(
        'DEADLINE_NOT_REACHED',
        'Chưa hết thời hạn 180 giây phản hồi của Companion.'
      );
    }

    const renterWallet = await prisma.wallet.findUnique({
      where: { user_id: booking.renter_id },
    });

    if (!renterWallet) {
      throw new NotFoundError('Không tìm thấy ví của người đặt lịch.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Chuyển trạng thái Booking sang CANCELLED
        const updateResult = await tx.booking.updateMany({
          where: {
            booking_id: bookingId,
            status: 'WAITING_COMPANION_RESPONSE',
          },
          data: {
            status: 'CANCELLED',
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            'BOOKING_STATE_CONFLICT',
            'Đơn đặt lịch vừa được thay đổi trạng thái hoặc đã được xử lý trước đó.'
          );
        }

        // 2. Ghi nhận Sổ cái: Hoàn 100% Escrow về ví Renter
        await ledgerService.postTransaction(
          {
            txn_type: 'ESCROW_REFUND',
            idempotency_key: `REFUND-TIMEOUT-${booking.booking_id}`,
            booking_id: booking.booking_id,
            escrow_id: booking.escrow?.escrow_id,
            entries: [
              {
                wallet_id: renterWallet.wallet_id,
                direction: 'DEBIT',
                balance_type: 'ESCROW',
                amount: booking.total_fee_snapshot,
              },
              {
                wallet_id: renterWallet.wallet_id,
                direction: 'CREDIT',
                balance_type: 'AVAILABLE',
                amount: booking.total_fee_snapshot,
              },
            ],
          },
          tx
        );

        // 3. Cập nhật Escrow thành REFUNDED
        if (booking.escrow) {
          await tx.escrow.update({
            where: { escrow_id: booking.escrow.escrow_id },
            data: {
              status: 'REFUNDED',
              refunded_at: new Date(),
            },
          });
        }

        // 4. Giải phóng Slot trở lại AVAILABLE
        await tx.slotCalendar.update({
          where: { slot_id: booking.slot_id },
          data: {
            status: 'AVAILABLE',
            held_until: null,
          },
        });

        // 5. Phạt điểm tín nhiệm Companion (-3.0 điểm TrustScore theo BPMN & DEMO_POLICY)
        const profile = await tx.companionProfile.findUnique({
          where: { profile_id: booking.profile_id },
        });
        const currentScore = profile?.trust_score ?? 80.0;
        const scoreAfter = Math.max(0, currentScore - 3.0);

        await tx.companionProfile.update({
          where: { profile_id: booking.profile_id },
          data: {
            trust_score: scoreAfter,
            availability: scoreAfter < 40 ? 'OFFLINE' : (profile?.availability ?? 'ONLINE'),
          },
        });

        await tx.trustScoreLog.create({
          data: {
            profile_id: booking.profile_id,
            booking_id: booking.booking_id,
            reason_code: 'COMPANION_TIMEOUT',
            delta: -3.0,
            score_after: scoreAfter,
          },
        });

        // 6. Ghi nhận BOOKING_STATUS_HISTORY
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.booking_id,
            from_status: 'WAITING_COMPANION_RESPONSE',
            to_status: 'CANCELLED',
            reason: 'Hết thời hạn 180s phản hồi (Companion Timeout). Hoàn 100% tiền ký quỹ cho Renter và trừ 3.0 điểm uy tín Companion.',
            changed_by: actorId || null,
          },
        });

        // 7. Tạo thông báo cho 2 bên
        await tx.notification.create({
          data: {
            user_id: booking.renter_id,
            title: 'Đơn đặt lịch hết hạn phản hồi',
            message: `Companion đã không phản hồi trong 180 giây. Số tiền ${booking.total_fee_snapshot.toLocaleString('vi-VN')} VND đã được hoàn 100% về ví của bạn.`,
            type: 'BOOKING_TIMEOUT_REFUND',
          },
        });

        await tx.notification.create({
          data: {
            user_id: booking.companion.user_id,
            title: 'Cảnh báo: Bỏ lỡ phản hồi đơn đặt lịch',
            message: `Bạn đã không phản hồi đơn đặt lịch trong 180 giây. Đơn đã bị hủy và bạn bị trừ 3 điểm uy tín.`,
            type: 'COMPANION_PENALIZED',
          },
        });

        const updatedBooking = await tx.booking.findUnique({
          where: { booking_id: bookingId },
          include: { escrow: true, slot: true },
        });

        return {
          booking: updatedBooking,
          is_idempotent_replay: false,
          companion_trust_score: scoreAfter,
        };
      });
    } catch (err: any) {
      try {
        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: err.errorCode || err.code || 'LEDGER_POSTING_FAILED',
            error_message: err.message,
            context_json: JSON.stringify({
              action: 'TIMEOUT_BOOKING',
              booking_id: bookingId,
              error: err.message,
            }),
          },
        });
      } catch (alertError) {
        logger.error('Failed to write LedgerAuditAlert:', alertError);
      }
      throw err;
    }
  }

  /**
   * Hủy đặt lịch trước giờ hẹn theo BPMN và DEMO_POLICY (BR-17, BR-18, D11).
   * - >= 30 phút trước giờ hẹn: Hoàn 100% cho Renter.
   * - 10 đến < 30 phút trước giờ hẹn: Hoàn 70% cho Renter, bồi thường 30% cho Companion (trong 1 transaction duy nhất).
   * - < 10 phút trước giờ hẹn: [DEMO_POLICY - APPROVED] Phạt 100%: 88% cho Companion, 12% cho Nền tảng.
   * - >= giờ hẹn (now >= start_time): Cấm hủy thông thường (SESSION_ALREADY_STARTED).
   */
  async cancelBooking(userId: string, userRole: string, bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        slot: true,
        companion: { include: { user: true } },
        escrow: true,
        session: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    const isRenter = booking.renter_id === userId;
    const isStaff = ['CS_AGENT', 'AUDITOR', 'ADMIN'].includes(userRole);

    if (!isRenter && !isStaff) {
      throw new ForbiddenError('Chỉ người đặt lịch hoặc nhân viên CS mới có quyền hủy đơn này.');
    }

    // Idempotency: nếu đã hủy trước đó
    if (booking.status === 'CANCELLED') {
      return {
        booking,
        is_idempotent_replay: true,
      };
    }

    const cancelableStatuses = ['PENDING_ACCEPTANCE', 'WAITING_COMPANION_RESPONSE', 'ACCEPTED'];
    if (!cancelableStatuses.includes(booking.status)) {
      throw new BusinessError(
        'CANNOT_CANCEL_IN_CURRENT_STATUS',
        `Không thể hủy đơn đặt lịch ở trạng thái '${booking.status}'.`
      );
    }

    const now = new Date();

    // DEMO_POLICY #11: Cấm hủy đơn thông thường sau khi phiên đã bắt đầu
    if (now >= new Date(booking.start_time)) {
      throw new BusinessError(
        'SESSION_ALREADY_STARTED',
        'Không thể hủy đơn sau khi phiên chơi đã bắt đầu. Vui lòng báo sự cố RMA nếu có tranh chấp.'
      );
    }

    // Trường hợp PENDING_ACCEPTANCE (chưa ký quỹ Escrow): Không có tiền cần hoàn
    const activeEscrow = booking.escrow;
    if (booking.status === 'PENDING_ACCEPTANCE' || !activeEscrow || activeEscrow.status !== 'HELD') {
      return await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { booking_id: bookingId },
          data: { status: 'CANCELLED' },
        });

        await tx.slotCalendar.update({
          where: { slot_id: booking.slot_id },
          data: { status: 'AVAILABLE', held_until: null },
        });

        await tx.bookingStatusHistory.create({
          data: {
            booking_id: bookingId,
            from_status: booking.status,
            to_status: 'CANCELLED',
            reason: reason || 'Renter hủy đơn trước khi thực hiện ký quỹ.',
            changed_by: userId,
          },
        });

        const updated = await tx.booking.findUnique({
          where: { booking_id: bookingId },
          include: { slot: true },
        });

        return {
          booking: updated,
          policy_applied: 'CANCEL_NO_ESCROW',
          is_idempotent_replay: false,
        };
      });
    }

    const heldEscrow = activeEscrow;

    // Đã ký quỹ Escrow HELD: Tính thời gian chênh lệch (Delta tính bằng phút)
    const deltaMinutes = (new Date(booking.start_time).getTime() - now.getTime()) / (60 * 1000);

    const renterWallet = await prisma.wallet.findUnique({
      where: { user_id: booking.renter_id },
    });
    if (!renterWallet) {
      throw new NotFoundError('Không tìm thấy ví của người đặt lịch.');
    }

    const companionWallet = await prisma.wallet.findUnique({
      where: { user_id: booking.companion.user_id },
    });
    if (!companionWallet) {
      throw new NotFoundError('Không tìm thấy ví của Companion.');
    }

    const totalFee = booking.total_fee_snapshot;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Khóa trạng thái Booking sang CANCELLED
        const updateResult = await tx.booking.updateMany({
          where: {
            booking_id: bookingId,
            status: { in: ['WAITING_COMPANION_RESPONSE', 'ACCEPTED'] },
          },
          data: { status: 'CANCELLED' },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            'BOOKING_STATE_CONFLICT',
            'Đơn đặt lịch vừa được thay đổi trạng thái hoặc không thể hủy.'
          );
        }

        // 2. Nếu đã tạo Session, đóng phòng chơi
        if (booking.session) {
          await tx.session.update({
            where: { booking_id: bookingId },
            data: { status: 'CLOSED' },
          });
        }

        // 3. Giải phóng slot trở lại AVAILABLE
        await tx.slotCalendar.update({
          where: { slot_id: booking.slot_id },
          data: { status: 'AVAILABLE', held_until: null },
        });

        let policyApplied = '';
        let historyReason = '';

        // 4. Phân loại chính sách hủy theo deltaMinutes
        if (deltaMinutes >= 30) {
          // ==========================================
          // NHÁNH 1: Hủy >= 30 phút (Hoàn 100% Renter)
          // ==========================================
          policyApplied = 'CANCEL_GE_30M';
          historyReason = `[POLICY: CANCEL_GE_30M] Hủy trước ${Math.round(deltaMinutes)} phút (>= 30 phút). Hoàn 100% tiền ký quỹ (${totalFee.toLocaleString('vi-VN')} VND) cho Renter.`;

          await ledgerService.postTransaction(
            {
              txn_type: 'ESCROW_REFUND',
              idempotency_key: `REFUND-CANCEL-${booking.booking_id}`,
              booking_id: booking.booking_id,
              escrow_id: heldEscrow.escrow_id,
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

          await tx.escrow.update({
            where: { escrow_id: heldEscrow.escrow_id },
            data: {
              status: 'REFUNDED',
              refunded_at: new Date(),
            },
          });
        } else if (deltaMinutes >= 10) {
          // ==============================================================
          // NHÁNH 2: Hủy từ 10 đến dưới 30 phút (Hoàn 70% Renter, 30% Companion)
          // ==============================================================
          policyApplied = 'CANCEL_10_30M';
          const renterRefund = Math.floor(totalFee * 0.70);
          const companionComp = totalFee - renterRefund; // Bảo toàn số nguyên VND

          historyReason = `[POLICY: CANCEL_10_30M] Hủy trước ${Math.round(deltaMinutes)} phút (10 đến < 30 phút): Hoàn 70% (${renterRefund.toLocaleString('vi-VN')} VND) cho Renter, bồi thường 30% (${companionComp.toLocaleString('vi-VN')} VND) cho Companion.`;

          // Ghi nhận Sổ cái: 1 transaction duy nhất với 3 bút toán đối ứng cân bằng tuyệt đối
          await ledgerService.postTransaction(
            {
              txn_type: 'CANCEL_PENALTY',
              idempotency_key: `PENALTY-CANCEL-10_30M-${booking.booking_id}`,
              booking_id: booking.booking_id,
              escrow_id: heldEscrow.escrow_id,
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
                  amount: renterRefund,
                },
                {
                  wallet_id: companionWallet.wallet_id,
                  direction: 'CREDIT',
                  balance_type: 'AVAILABLE',
                  amount: companionComp,
                },
              ],
            },
            tx
          );

          await tx.escrow.update({
            where: { escrow_id: heldEscrow.escrow_id },
            data: {
              status: 'RELEASED',
              released_at: new Date(),
            },
          });
        } else {
          // ==============================================================
          // NHÁNH 3: Hủy dưới 10 phút ([DEMO_POLICY - APPROVED] Phạt 100%: 88% Companion, 12% Platform)
          // ==============================================================
          policyApplied = 'CANCEL_LT_10M';
          const platformFee = Math.floor(totalFee * 0.12);
          const companionShare = totalFee - platformFee; // Bảo toàn số nguyên VND

          historyReason = `[DEMO_POLICY - APPROVED] Hủy dưới 10 phút (${Math.round(deltaMinutes)} phút còn lại): Phạt 100% tiền ký quỹ, chi trả 88% (${companionShare.toLocaleString('vi-VN')} VND) cho Companion và 12% (${platformFee.toLocaleString('vi-VN')} VND) cho Nền tảng.`;

          // Ghi nhận Sổ cái: 1 transaction duy nhất với 3 bút toán đối ứng cân bằng
          await ledgerService.postTransaction(
            {
              txn_type: 'CANCEL_PENALTY',
              idempotency_key: `PENALTY-CANCEL-LT10M-${booking.booking_id}`,
              booking_id: booking.booking_id,
              escrow_id: heldEscrow.escrow_id,
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
                  amount: companionShare,
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

          await tx.escrow.update({
            where: { escrow_id: heldEscrow.escrow_id },
            data: {
              status: 'RELEASED',
              released_at: new Date(),
            },
          });
        }

        // 5. Ghi nhận BOOKING_STATUS_HISTORY
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.booking_id,
            from_status: booking.status,
            to_status: 'CANCELLED',
            reason: reason ? `${historyReason} Lý do người hủy: ${reason}` : historyReason,
            changed_by: userId,
          },
        });

        // 6. Thông báo cho người dùng
        await tx.notification.create({
          data: {
            user_id: booking.renter_id,
            title: 'Hủy đơn đặt lịch thành công',
            message: historyReason,
            type: 'BOOKING_CANCELLED',
          },
        });

        await tx.notification.create({
          data: {
            user_id: booking.companion.user_id,
            title: 'Đơn đặt lịch đã bị hủy',
            message: `Renter đã hủy đơn đặt lịch. ${historyReason}`,
            type: 'BOOKING_CANCELLED',
          },
        });

        const updatedBooking = await tx.booking.findUnique({
          where: { booking_id: bookingId },
          include: { escrow: true, slot: true },
        });

        return {
          booking: updatedBooking,
          policy_applied: policyApplied,
          delta_minutes: deltaMinutes,
          is_idempotent_replay: false,
        };
      });
    } catch (err: any) {
      try {
        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: err.errorCode || err.code || 'LEDGER_POSTING_FAILED',
            error_message: err.message,
            context_json: JSON.stringify({
              action: 'CANCEL_BOOKING',
              booking_id: bookingId,
              user_id: userId,
              delta_minutes: deltaMinutes,
              error: err.message,
            }),
          },
        });
      } catch (alertError) {
        logger.error('Failed to write LedgerAuditAlert:', alertError);
      }
      throw err;
    }
  }

  /**
   * Renter nghiệm thu hoàn tất và giải ngân 88/12 (BR-14, D11).
   */
  async acceptFulfillment(renterId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    if (booking.renter_id !== renterId) {
      throw new ForbiddenError('Chỉ người đặt lịch (Renter) mới có quyền xác nhận nghiệm thu dịch vụ.');
    }

    // Gọi settlementService (đảm bảo tách biệt controller/service và idempotent)
    return await settlementService.settleBooking(bookingId, 'RENTER_MANUAL_ACCEPT', renterId);
  }

  /**
   * Hệ thống tự động nghiệm thu sau 15 phút không có khiếu nại (DEMO_POLICY #2)
   * Hỗ trợ testability với fake clock / simulatedNow.
   */
  async autoAccept(bookingId: string, simulatedNow?: Date) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    // Nếu đã hoàn tất rồi
    if (booking.status === 'COMPLETED') {
      return await settlementService.settleBooking(bookingId, 'SYSTEM_AUTO_ACCEPT_TIMEOUT');
    }

    if (booking.escrow?.status === 'FROZEN') {
      throw new BusinessError(
        'ESCROW_FROZEN',
        'Khoản ký quỹ này hiện đang bị đóng băng do có khiếu nại tranh chấp (RMA). Không thể giải ngân.'
      );
    }

    if (booking.status === 'DISPUTED') {
      throw new BusinessError(
        'DISPUTE_IN_PROGRESS',
        'Đơn đặt lịch đang trong tiến trình khiếu nại chưa xử lý. Không thể thực hiện giải ngân.'
      );
    }

    if (!booking.confirm_deadline) {
      throw new BusinessError(
        'NO_CONFIRM_DEADLINE',
        'Đơn đặt lịch chưa hoàn thành phiên chơi để kích hoạt thời hạn nghiệm thu.'
      );
    }

    const checkTime = simulatedNow || new Date();
    if (checkTime < booking.confirm_deadline) {
      throw new BusinessError(
        'ACCEPTANCE_DEADLINE_NOT_REACHED',
        `Chưa hết thời hạn nghiệm thu 15 phút (hạn chót: ${booking.confirm_deadline.toISOString()}, thời điểm kiểm tra: ${checkTime.toISOString()}).`
      );
    }

    return await settlementService.settleBooking(bookingId, 'SYSTEM_AUTO_ACCEPT_TIMEOUT');
  }

  /**
   * Renter báo sự cố / mở khiếu nại tranh chấp (BR-26, M6 Prompt 09)
   */
  async reportIssue(renterId: string, bookingId: string, input: CreateDisputeInput) {
    return await disputeService.createDispute(renterId, bookingId, input);
  }

  /**
   * Xem thông tin khiếu nại của đơn đặt lịch
   */
  async getDispute(userId: string, userRole: string, bookingId: string) {
    return await disputeService.getDisputeByBookingId(userId, userRole, bookingId);
  }
}

export const bookingService = new BookingService();
