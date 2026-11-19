import { prisma } from '../../common/prisma.js';
import { logger } from '../../common/logger.js';
import { env } from '../../config/env.js';
import { bookingService } from './booking.service.js';
import { settlementService } from '../ledger/settlement.service.js';
import { userMessages, formatShortId } from '../../common/messages.vi.js';

export interface AutomationCycleResult {
  timestamp: Date;
  timeout: {
    scanned: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  autoAccept: {
    scanned: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  settlementRetry?: {
    scanned: number;
    processed: number;
    skipped: number;
    errors: number;
    exhausted: number;
  };
  disputeEvidence?: {
    scanned: number;
    processed: number;
    errors: number;
  };
  reviewReminder?: {
    scanned: number;
    sent: number;
    errors: number;
  };
}

export class BookingAutomationService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private currentInterval: number | null = null;

  /**
   * Chuẩn hóa và bảo vệ chu kỳ chạy (Interval), bảo đảm tối thiểu 1000ms.
   * Xử lý an toàn các giá trị undefined, null, NaN, số âm, số 0 hoặc chuỗi.
   */
  normalizeInterval(intervalInput?: any): number {
    const raw = intervalInput !== undefined && intervalInput !== null ? intervalInput : env.BACKGROUND_WORKER_INTERVAL_MS;
    const num = Number(raw);
    if (isNaN(num) || !isFinite(num) || num <= 0) {
      return 5000;
    }
    return Math.max(1000, Math.floor(num));
  }

  /**
   * Quét và xử lý tự động các booking quá hạn 180s chờ Companion phản hồi (BR-16)
   */
  async processExpiredTimeouts(clock?: Date): Promise<{ scanned: number; processed: number; skipped: number; errors: number }> {
    const now = clock || new Date();
    const stats = { scanned: 0, processed: 0, skipped: 0, errors: 0 };

    try {
      // 1. Tìm các booking đang chờ phản hồi và đã quá hạn
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: 'WAITING_COMPANION_RESPONSE',
          response_deadline: {
            lte: now,
          },
        },
        select: {
          booking_id: true,
          response_deadline: true,
        },
        take: 50, // Batch limit để chống quá tải
      });

      stats.scanned = expiredBookings.length;

      for (const item of expiredBookings) {
        try {
          const result = await bookingService.handleTimeout(item.booking_id, 'SYSTEM', 'SYSTEM', now);
          if (result.is_idempotent_replay) {
            stats.skipped++;
          } else {
            stats.processed++;
            logger.info(`[BookingAutomation] Auto-timeout executed successfully for booking ${item.booking_id}`);
          }
        } catch (err: any) {
          // Bỏ qua nếu đơn vừa được xử lý hoặc xung đột trạng thái
          if (
            err.code === 'BOOKING_STATE_CONFLICT' ||
            err.code === 'INVALID_BOOKING_STATUS' ||
            err.code === 'DEADLINE_NOT_REACHED'
          ) {
            stats.skipped++;
            logger.debug(`[BookingAutomation] Auto-timeout skipped for booking ${item.booking_id}: ${err.message}`);
          } else {
            stats.errors++;
            logger.error(`[BookingAutomation] Error during auto-timeout for booking ${item.booking_id}: ${err.message}`);
          }
        }
      }
    } catch (dbErr: any) {
      logger.error(`[BookingAutomation] Failed to query expired timeouts from database: ${dbErr.message}`);
    }

    return stats;
  }

  /**
   * Quét và xử lý tự động các booking đã kết thúc phiên quá 15 phút nghiệm thu (DEMO_POLICY #2)
   */
  async processExpiredAutoAccepts(clock?: Date): Promise<{ scanned: number; processed: number; skipped: number; errors: number }> {
    const now = clock || new Date();
    const stats = { scanned: 0, processed: 0, skipped: 0, errors: 0 };

    try {
      // 2. Tìm các booking đã qua confirm_deadline và đang có escrow HELD
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: { in: ['ACCEPTED', 'IN_SESSION'] },
          confirm_deadline: {
            lte: now,
          },
          escrow: {
            status: 'HELD', // Không chọn các đơn FROZEN hoặc đã RELEASED/REFUNDED
          },
        },
        select: {
          booking_id: true,
          confirm_deadline: true,
        },
        take: 50,
      });

      stats.scanned = expiredBookings.length;

      for (const item of expiredBookings) {
        try {
          const result = await bookingService.autoAccept(item.booking_id, 'SYSTEM', 'SYSTEM', now);
          if (result.is_idempotent_replay) {
            stats.skipped++;
          } else {
            stats.processed++;
            logger.info(`[BookingAutomation] Auto-accept executed successfully for booking ${item.booking_id}`);
          }
        } catch (err: any) {
          if (
            err.code === 'BOOKING_STATE_CONFLICT' ||
            err.code === 'INVALID_BOOKING_STATUS' ||
            err.code === 'ESCROW_FROZEN' ||
            err.code === 'DISPUTE_IN_PROGRESS' ||
            err.code === 'ACCEPTANCE_DEADLINE_NOT_REACHED' ||
            err.code === 'NO_CONFIRM_DEADLINE'
          ) {
            stats.skipped++;
            logger.debug(`[BookingAutomation] Auto-accept skipped for booking ${item.booking_id}: ${err.message}`);
          } else {
            stats.errors++;
            logger.error(`[BookingAutomation] Error during auto-accept for booking ${item.booking_id}: ${err.message}`);
          }
        }
      }
    } catch (dbErr: any) {
      logger.error(`[BookingAutomation] Failed to query expired auto-accepts from database: ${dbErr.message}`);
    }

    return stats;
  }

  /**
   * Quét và xử lý tự động hàng đợi thử lại giải ngân Escrow (D26: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định])
   * Tối đa 3 lần sau 1, 5, 15 phút với CÙNG idempotency_key
   */
  async processSettlementRetries(clock?: Date): Promise<{ scanned: number; processed: number; skipped: number; errors: number; exhausted: number }> {
    const now = clock || new Date();
    const stats = { scanned: 0, processed: 0, skipped: 0, errors: 0, exhausted: 0 };

    try {
      const pendingRetries = await prisma.settlementRetryQueue.findMany({
        where: {
          status: 'PENDING',
          next_retry_at: { lte: now },
        },
        include: {
          booking: {
            include: {
              companion: { include: { user: true } },
              escrow: true,
            },
          },
        },
        take: 50,
      });

      stats.scanned = pendingRetries.length;

      for (const item of pendingRetries) {
        try {
          // Thử lại giải ngân với đúng idempotency_key gốc (SETTLE-BOOKING-${booking_id})
          await settlementService.settleBooking(item.booking_id, 'SYSTEM_SETTLEMENT_RETRY');
          await prisma.settlementRetryQueue.update({
            where: { retry_id: item.retry_id },
            data: { status: 'SUCCESS' },
          });
          stats.processed++;
          logger.info(`[BookingAutomation] Settlement retry succeeded for booking ${item.booking_id} on attempt ${item.attempts + 1}`);
        } catch (err: any) {
          const nextAttempt = item.attempts + 1;
          if (nextAttempt >= item.max_attempts) {
            // Sau 3 lần thử lại thất bại: Đánh dấu EXHAUSTED, giữ Escrow HELD, tạo LedgerAuditAlert, thông báo Companion
            await prisma.settlementRetryQueue.update({
              where: { retry_id: item.retry_id },
              data: {
                attempts: nextAttempt,
                status: 'EXHAUSTED',
                last_error: err.message,
              },
            });

            // Tạo LedgerAuditAlert yêu cầu Auditor xử lý thủ công trong 24 giờ
            await prisma.ledgerAuditAlert.create({
              data: {
                error_code: 'SETTLEMENT_RETRY_EXHAUSTED',
                error_message: `Giải ngân đơn #${item.booking_id} thất bại sau ${nextAttempt} lần thử lại. Escrow giữ HELD. Yêu cầu Auditor can thiệp trong 24h.`,
                context_json: JSON.stringify({
                  booking_id: item.booking_id,
                  attempts: nextAttempt,
                  idempotency_key: item.idempotency_key,
                  last_error: err.message,
                  policy: 'D26_EXHAUSTED_MANUAL_AUDIT',
                }),
              },
            });

            // Gửi thông báo cho Companion
            if (item.booking?.companion?.user_id) {
              const notifExhausted = userMessages.settlementRetryExhaustedStaff(item.booking_id);
              await prisma.notification.create({
                data: {
                  user_id: item.booking.companion.user_id,
                  title: notifExhausted.title,
                  message: notifExhausted.message,
                  type: notifExhausted.type,
                  target_url: notifExhausted.target_url,
                },
              });
            }

            stats.exhausted++;
            logger.warn(`[BookingAutomation] Settlement retry EXHAUSTED for booking ${item.booking_id} after ${nextAttempt} attempts.`);
          } else {
            // Lần 1 thất bại -> lần 2 sau 5 phút; Lần 2 thất bại -> lần 3 sau 15 phút
            const delayMinutes = nextAttempt === 1 ? 5 : 15;
            const nextRetryAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
            await prisma.settlementRetryQueue.update({
              where: { retry_id: item.retry_id },
              data: {
                attempts: nextAttempt,
                next_retry_at: nextRetryAt,
                last_error: err.message,
              },
            });
            stats.errors++;
            logger.info(`[BookingAutomation] Settlement retry #${nextAttempt} failed for booking ${item.booking_id}. Next retry scheduled at ${nextRetryAt.toISOString()}`);
          }
        }
      }
    } catch (dbErr: any) {
      logger.error(`[BookingAutomation] Failed to query settlement retries: ${dbErr.message}`);
    }

    return stats;
  }

  /**
   * Quét và xử lý tự động hồ sơ khiếu nại quá hạn 24 giờ bổ sung bằng chứng (D25: [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định])
   * Quá hạn: chuyển sang UNDER_REVIEW để CS phán quyết theo hồ sơ hiện có
   */
  async processExpiredDisputeEvidences(clock?: Date): Promise<{ scanned: number; processed: number; errors: number }> {
    const now = clock || new Date();
    const stats = { scanned: 0, processed: 0, errors: 0 };

    try {
      const expiredDisputes = await prisma.disputeCase.findMany({
        where: {
          status: 'EVIDENCE_PENDING',
          evidence_deadline: { lte: now },
        },
        include: {
          booking: {
            include: {
              companion: { include: { user: true } },
            },
          },
        },
        take: 50,
      });

      stats.scanned = expiredDisputes.length;

      for (const dispute of expiredDisputes) {
        try {
          let additionalPausedMs = 0;
          if (dispute.evidence_requested_at) {
            additionalPausedMs = Math.max(0, now.getTime() - new Date(dispute.evidence_requested_at).getTime());
          }

          await prisma.$transaction(async (tx) => {
            await tx.disputeCase.update({
              where: { dispute_id: dispute.dispute_id },
              data: {
                status: 'UNDER_REVIEW',
                paused_sla_ms: { increment: additionalPausedMs },
                evidence_requested_at: null,
              },
            });

            await tx.bookingStatusHistory.create({
              data: {
                booking_id: dispute.booking_id,
                from_status: 'DISPUTED',
                to_status: 'DISPUTED',
                reason: `Hết hạn 24 giờ nộp bổ sung bằng chứng. Hồ sơ tự động chuyển sang thẩm định để CS phán quyết theo hồ sơ hiện có.`,
                changed_by: null,
              },
            });

            const staffUsers = await tx.user.findMany({
              where: { role: { in: ['CS_AGENT', 'ADMIN'] } },
              select: { user_id: true },
            });

            const shortDsp = formatShortId('DSP', dispute.dispute_id);
            const staffNotifications = staffUsers.map((u) => ({
              user_id: u.user_id,
              title: 'Khiếu nại hết hạn bổ sung chứng cứ',
              message: `Khiếu nại ${shortDsp} đã hết hạn 24 giờ bổ sung bằng chứng và tự động chuyển sang thẩm định phán quyết. Vui lòng xem xét hồ sơ hiện có.`,
              type: 'DISPUTE_EVIDENCE_EXPIRED',
              target_url: `/cs/cases/${dispute.dispute_id}`,
            }));

            const notifUserExpired = userMessages.disputeEvidenceExpired(dispute.dispute_id);

            await tx.notification.createMany({
              data: [
                {
                  user_id: dispute.renter_id,
                  title: notifUserExpired.title,
                  message: notifUserExpired.message,
                  type: notifUserExpired.type,
                  target_url: notifUserExpired.target_url,
                },
                {
                  user_id: dispute.booking.companion.user_id,
                  title: notifUserExpired.title,
                  message: notifUserExpired.message,
                  type: notifUserExpired.type,
                  target_url: notifUserExpired.target_url,
                },
                ...staffNotifications,
              ],
            });
          });

          stats.processed++;
          logger.info(`[BookingAutomation] Dispute ${dispute.dispute_id} evidence deadline expired; moved to UNDER_REVIEW`);
        } catch (err: any) {
          stats.errors++;
          logger.error(`[BookingAutomation] Failed to expire evidence for dispute ${dispute.dispute_id}: ${err.message}`);
        }
      }
    } catch (dbErr: any) {
      logger.error(`[BookingAutomation] Failed to query expired dispute evidences: ${dbErr.message}`);
    }

    return stats;
  }

  /**
   * Thực hiện một chu kỳ quét đầy đủ (timeout + auto-accept + settlement retry + dispute evidence)
   */
  /**
   * G10 — Nhắc đánh giá sau phiên: đơn COMPLETED đã giải ngân ≥ REVIEW_REMINDER_DELAY_MINUTES và trong 7 ngày gần nhất,
   * bên nào (Renter / Companion) chưa gửi đánh giá và CHƯA từng được nhắc cho đơn này thì nhận 1 thông báo REVIEW_REMINDER.
   */
  async processReviewReminders(clock?: Date): Promise<{ scanned: number; sent: number; errors: number }> {
    const now = clock || new Date();
    const due = new Date(now.getTime() - env.REVIEW_REMINDER_DELAY_MINUTES * 60 * 1000);
    const oldest = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let sent = 0;
    let errors = 0;

    const bookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED', escrow: { released_at: { lte: due, gte: oldest } } },
      select: {
        booking_id: true,
        renter_id: true,
        renter: { select: { display_name: true } },
        companion: { select: { user_id: true, user: { select: { display_name: true } } } },
        reviews: { select: { reviewer_id: true } },
      },
      take: 200,
    });

    for (const b of bookings) {
      const reviewed = new Set(b.reviews.map((r) => r.reviewer_id));
      const parties = [
        { userId: b.renter_id, counterpart: b.companion.user.display_name },
        { userId: b.companion.user_id, counterpart: b.renter.display_name },
      ];
      for (const p of parties) {
        if (reviewed.has(p.userId)) continue;
        try {
          const notif = userMessages.reviewReminder(p.counterpart, b.booking_id);
          const already = await prisma.notification.count({
            where: { user_id: p.userId, type: notif.type, target_url: notif.target_url },
          });
          if (already > 0) continue;
          await prisma.notification.create({
            data: { user_id: p.userId, title: notif.title, message: notif.message, type: notif.type, target_url: notif.target_url },
          });
          sent += 1;
        } catch (err) {
          errors += 1;
          logger.error(`[BookingAutomation] Không gửi được nhắc đánh giá cho ${b.booking_id}: ${(err as Error).message}`);
        }
      }
    }
    if (sent > 0) logger.info(`[BookingAutomation] Đã gửi ${sent} nhắc đánh giá sau phiên.`);
    return { scanned: bookings.length, sent, errors };
  }

  async runAutomationCycle(clock?: Date): Promise<AutomationCycleResult> {
    const cycleNow = clock || new Date();

    // Concurrency guard: Nếu chu kỳ trước chưa kết thúc, bỏ qua tick đè
    if (this.isProcessing) {
      logger.debug('[BookingAutomation] Previous automation cycle still active, skipping overlapping tick.');
      return {
        timestamp: cycleNow,
        timeout: { scanned: 0, processed: 0, skipped: 0, errors: 0 },
        autoAccept: { scanned: 0, processed: 0, skipped: 0, errors: 0 },
      };
    }

    this.isProcessing = true;
    try {
      const timeoutStats = await this.processExpiredTimeouts(cycleNow);
      const autoAcceptStats = await this.processExpiredAutoAccepts(cycleNow);
      const retryStats = await this.processSettlementRetries(cycleNow);
      const evidenceStats = await this.processExpiredDisputeEvidences(cycleNow);
      const reviewStats = await this.processReviewReminders(cycleNow);

      if (
        timeoutStats.processed > 0 ||
        autoAcceptStats.processed > 0 ||
        retryStats.processed > 0 ||
        evidenceStats.processed > 0 ||
        timeoutStats.errors > 0 ||
        autoAcceptStats.errors > 0 ||
        retryStats.errors > 0 ||
        evidenceStats.errors > 0
      ) {
        logger.info(
          `[BookingAutomation] Cycle summary: Timeout (${timeoutStats.processed}/${timeoutStats.scanned}) | AutoAccept (${autoAcceptStats.processed}/${autoAcceptStats.scanned}) | SettlementRetry (${retryStats.processed}/${retryStats.scanned}) | EvidenceExpire (${evidenceStats.processed}/${evidenceStats.scanned})`
        );
      }

      return {
        timestamp: cycleNow,
        timeout: timeoutStats,
        autoAccept: autoAcceptStats,
        settlementRetry: retryStats,
        disputeEvidence: evidenceStats,
        reviewReminder: reviewStats,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Bắt đầu background worker scheduler định kỳ
   */
  start(intervalMs?: any): void {
    if (this.timer) {
      logger.warn('[BookingAutomation] Background worker already started. Ignoring redundant start call.');
      return;
    }

    const interval = this.normalizeInterval(intervalMs);
    this.currentInterval = interval;
    logger.info(`⏰ [BookingAutomation] Background worker started with interval: ${interval}ms`);

    this.timer = setInterval(() => {
      this.runAutomationCycle().catch((err) => {
        logger.error(`[BookingAutomation] Unhandled error in background worker cycle: ${err.message}`);
      });
    }, interval);

    // Không giữ process sống nếu đây là timer duy nhất
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Dừng background worker an toàn (Graceful stop)
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.currentInterval = null;
      logger.info('🛑 [BookingAutomation] Background worker stopped successfully.');
    }
  }

  /**
   * Kiểm tra trạng thái đang chạy của timer
   */
  isStarted(): boolean {
    return this.timer !== null;
  }

  /**
   * Lấy chu kỳ chạy hiện tại (ms)
   */
  getCurrentInterval(): number | null {
    return this.currentInterval;
  }
}

export const bookingAutomationService = new BookingAutomationService();
