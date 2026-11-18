import { prisma } from '../../common/prisma.js';
import { 
  NotFoundError, 
  BusinessError, 
  ConflictError, 
  ForbiddenError 
} from '../../common/errors.js';
import { ledgerService } from './ledger.service.js';
import { SYSTEM_ACCOUNTS } from './ledger.types.js';
import { logger } from '../../common/logger.js';
import { userMessages } from '../../common/messages.vi.js';

export class SettlementService {
  /**
   * Nghiệm thu hoàn tất & Giải ngân 88/12 qua Sổ cái kép (M6 - PROMPT 09, BR-14, D11).
   * - Phí hoa hồng sàn: floor(total_fee * 0.12)
   * - Thu nhập Companion: total_fee - platform_fee (Zero-cent rounding)
   * - Ghi 3 bút toán đối ứng cân bằng trong 1 transaction Sổ cái duy nhất.
   * - Escrow chuyển sang RELEASED, Booking chuyển sang COMPLETED.
   * - Không giải ngân nếu Escrow đang bị đóng băng (FROZEN) do tranh chấp.
   */
  async settleBooking(bookingId: string, triggerReason: string, actorId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        escrow: true,
        session: true,
        companion: {
          include: { user: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Không tìm thấy đơn đặt lịch.');
    }

    // Idempotency: Nếu đã COMPLETED và Escrow đã RELEASED trước đó
    if (booking.status === 'COMPLETED' && booking.escrow?.status === 'RELEASED') {
      const platformFee = Math.floor(booking.total_fee_snapshot * 0.12);
      const companionFee = booking.total_fee_snapshot - platformFee;
      return {
        booking,
        settlement: {
          total_fee: booking.total_fee_snapshot,
          companion_received: companionFee,
          platform_fee: platformFee,
          escrow_status: 'RELEASED',
        },
        is_idempotent_replay: true,
      };
    }

    // Kiểm tra tính hợp lệ của Escrow
    if (!booking.escrow) {
      throw new BusinessError('ESCROW_NOT_FOUND', 'Đơn đặt lịch chưa có thông tin ký quỹ Escrow.');
    }

    // Nếu Escrow đang FROZEN do khiếu nại (Requirement 7)
    if (booking.escrow.status === 'FROZEN') {
      throw new BusinessError(
        'ESCROW_FROZEN',
        'Khoản ký quỹ này hiện đang bị đóng băng do có khiếu nại tranh chấp (RMA). Không thể giải ngân.'
      );
    }

    if (booking.escrow.status !== 'HELD') {
      throw new BusinessError(
        'INVALID_ESCROW_STATUS',
        `Không thể giải ngân khi khoản ký quỹ ở trạng thái '${booking.escrow.status}'.`
      );
    }

    // Kiểm tra trạng thái Booking
    if (booking.status === 'DISPUTED') {
      throw new BusinessError(
        'DISPUTE_IN_PROGRESS',
        'Đơn đặt lịch đang trong tiến trình khiếu nại chưa xử lý. Không thể thực hiện giải ngân.'
      );
    }

    if (!['ACCEPTED', 'IN_SESSION'].includes(booking.status)) {
      throw new BusinessError(
        'INVALID_BOOKING_STATUS',
        `Không thể nghiệm thu giải ngân đơn đặt lịch ở trạng thái '${booking.status}'.`
      );
    }

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
    const platformFee = Math.floor(totalFee * 0.12);
    const standardCompanionFee = totalFee - platformFee; // Bảo toàn số nguyên VND tuyệt đối

    // D22: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định]
    // Cấn trừ nợ phạt (penalty_debt) nếu Companion còn nợ phạt từ các khiếu nại trước
    const penaltyDebt = companionWallet.penalty_debt || 0;
    const penaltyOffset = Math.min(penaltyDebt, standardCompanionFee);
    const companionFee = standardCompanionFee - penaltyOffset;
    const totalPlatformCredit = platformFee + penaltyOffset;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Khóa trạng thái Booking sang COMPLETED nguyên tử (Chống Race Condition)
        const updateResult = await tx.booking.updateMany({
          where: {
            booking_id: bookingId,
            status: { in: ['ACCEPTED', 'IN_SESSION'] },
          },
          data: {
            status: 'COMPLETED',
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            'BOOKING_STATE_CONFLICT',
            'Đơn đặt lịch vừa được thay đổi trạng thái hoặc đang có tranh chấp đồng thời.'
          );
        }

        // 2. Ghi nhận Sổ cái kép: ESCROW_RELEASE (3 bút toán đối ứng cân bằng)
        const ledgerTx = await ledgerService.postTransaction(
          {
            txn_type: 'ESCROW_RELEASE',
            idempotency_key: `SETTLE-BOOKING-${booking.booking_id}`,
            booking_id: booking.booking_id,
            escrow_id: booking.escrow!.escrow_id,
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
                amount: companionFee,
              },
              {
                wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID,
                direction: 'CREDIT',
                balance_type: 'AVAILABLE',
                amount: totalPlatformCredit,
              },
            ],
          },
          tx
        );

        // D22: Trừ nợ phạt trong ví Companion nếu có cấn trừ
        if (penaltyOffset > 0) {
          await tx.wallet.update({
            where: { wallet_id: companionWallet.wallet_id },
            data: {
              penalty_debt: { decrement: penaltyOffset },
            },
          });
          logger.info(`[D22] Offset ${penaltyOffset} VND penalty debt for companion ${companionWallet.user_id}`);
        }

        if (totalPlatformCredit > 0 && !ledgerTx.is_idempotent_replay) {
          await tx.platformRevenue.upsert({
            where: { txn_id: ledgerTx.transaction.txn_id },
            update: {},
            create: {
              txn_id: ledgerTx.transaction.txn_id,
              amount: totalPlatformCredit,
              commission_rate: 0.12,
            },
          });
        }

        // D26: Cập nhật SettlementRetryQueue sang SUCCESS nếu có hàng đợi thử lại
        await tx.settlementRetryQueue.updateMany({
          where: { booking_id: bookingId },
          data: { status: 'SUCCESS' },
        });

        // 3. Cập nhật trạng thái Escrow sang RELEASED
        await tx.escrow.update({
          where: { escrow_id: booking.escrow!.escrow_id },
          data: {
            status: 'RELEASED',
            released_at: new Date(),
          },
        });

        // 4. Nếu có Session liên kết, đóng phòng chơi (CLOSED)
        if (booking.session) {
          await tx.session.update({
            where: { booking_id: bookingId },
            data: { status: 'CLOSED' },
          });
        }

        // 5. Ghi nhận BOOKING_STATUS_HISTORY
        const isAutoTimeout = triggerReason === 'SYSTEM_AUTO_ACCEPT_TIMEOUT';
        const offsetNote = penaltyOffset > 0
          ? ` (Đã cấn trừ ${penaltyOffset.toLocaleString('vi-VN')} VND nợ vi phạm, còn nợ: ${(penaltyDebt - penaltyOffset).toLocaleString('vi-VN')} VND)`
          : '';
        const historyReason = isAutoTimeout
          ? `Tự động nghiệm thu sau 15 phút kết thúc phiên. Giải ngân ${companionFee.toLocaleString('vi-VN')}đ cho Companion${offsetNote}.`
          : `Renter xác nhận hoàn tất: Giải ngân ${companionFee.toLocaleString('vi-VN')}đ cho Companion${offsetNote}.`;

        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.booking_id,
            from_status: booking.status,
            to_status: 'COMPLETED',
            reason: historyReason,
            changed_by: (actorId && actorId !== 'SYSTEM') ? actorId : null,
          },
        });

        // 6. Gửi thông báo in-app
        const notifCompanion = userMessages.escrowReleasedToCompanion(booking.booking_id, companionFee, penaltyOffset);
        await tx.notification.create({
          data: {
            user_id: booking.companion.user_id,
            title: notifCompanion.title,
            message: notifCompanion.message,
            type: notifCompanion.type,
            target_url: notifCompanion.target_url,
          },
        });

        const notifRenter = userMessages.bookingCompletedToRenter(booking.booking_id);
        await tx.notification.create({
          data: {
            user_id: booking.renter_id,
            title: notifRenter.title,
            message: notifRenter.message,
            type: notifRenter.type,
            target_url: notifRenter.target_url,
          },
        });

        const updatedBooking = await tx.booking.findUnique({
          where: { booking_id: bookingId },
          include: { escrow: true, session: true },
        });

        return {
          booking: updatedBooking,
          settlement: {
            total_fee: totalFee,
            companion_received: companionFee,
            penalty_offset: penaltyOffset,
            platform_fee: totalPlatformCredit,
            escrow_status: 'RELEASED',
          },
          is_idempotent_replay: false,
        };
      });
    } catch (err: any) {
      // Circuit Breaker: Lưu vết sự cố kiểm toán
      try {
        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: err.errorCode || err.code || 'SETTLEMENT_LEDGER_FAILED',
            error_message: err.message,
            context_json: JSON.stringify({
              action: 'SETTLE_BOOKING',
              booking_id: bookingId,
              error: err.message,
            }),
          },
        });
      } catch (alertError) {
        logger.error('Failed to write LedgerAuditAlert in settlement:', alertError);
      }
      throw err;
    }
  }

  /**
   * Đưa đơn giải ngân lỗi vào hàng đợi thử lại (D26: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định])
   * Tối đa 3 lần sau 1, 5, 15 phút với CÙNG idempotency_key
   */
  async queueSettlementRetry(bookingId: string, errorMsg: string, clock?: Date) {
    const now = clock || new Date();
    const existing = await prisma.settlementRetryQueue.findUnique({
      where: { booking_id: bookingId },
    });

    if (!existing) {
      // Lần thử 1: Sau 1 phút
      const nextRetry = new Date(now.getTime() + 1 * 60 * 1000);
      return await prisma.settlementRetryQueue.create({
        data: {
          booking_id: bookingId,
          attempts: 0,
          max_attempts: 3,
          next_retry_at: nextRetry,
          idempotency_key: `SETTLE-BOOKING-${bookingId}`,
          last_error: errorMsg,
          status: 'PENDING',
        },
      });
    }

    return existing;
  }
}

export const settlementService = new SettlementService();
