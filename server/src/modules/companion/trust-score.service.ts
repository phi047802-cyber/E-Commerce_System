import { prisma } from '../../common/prisma.js';
import { NotFoundError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';

export interface TrustScoreBreakdown {
  profile_id: string;
  current_score: number;
  rating_100: number;
  avg_stars: number;
  review_count: number;
  completion_rate: number;
  completed_bookings: number;
  dispute_rate: number;
  faulted_disputes: number;
  total_bookings_accepted: number;
  direct_penalties: number;
  is_suspended: boolean;
}

export class TrustScoreService {
  /**
   * Tính toán lại toàn diện điểm uy tín theo công thức chuẩn hóa trong DEMO_POLICY.md:
   * TrustScore = 0.40 * Rating100 + 0.40 * CompletionRate - 1.20 * DisputeRate - DirectPenalties
   * Phạm vi giá trị: [0.00, 100.00].
   * Nếu điểm < 40.0: tự động chuyển trạng thái sang SUSPENDED và OFFLINE.
   */
  async recalculateTrustScore(
    profileId: string,
    bookingId?: string,
    reasonCode?: string
  ): Promise<{
    profile_id: string;
    old_score: number;
    new_score: number;
    delta: number;
    is_suspended: boolean;
    is_idempotent_replay: boolean;
    breakdown: TrustScoreBreakdown;
  }> {
    // 1. Kiểm tra Companion Profile
    const profile = await prisma.companionProfile.findUnique({
      where: { profile_id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundError(`Không tìm thấy hồ sơ Companion với ID '${profileId}'.`);
    }

    const oldScore = profile.trust_score;

    // 2. Kiểm tra Idempotency nếu có bookingId và reasonCode
    if (bookingId && reasonCode) {
      const existingLog = await prisma.trustScoreLog.findFirst({
        where: {
          profile_id: profileId,
          booking_id: bookingId,
          reason_code: reasonCode,
        },
      });

      if (existingLog) {
        logger.info(`[TrustScore] Idempotent replay for ${reasonCode} on booking ${bookingId}`);
        const breakdown = await this.getScoreBreakdown(profileId);
        return {
          profile_id: profileId,
          old_score: oldScore,
          new_score: oldScore,
          delta: 0,
          is_suspended: profile.verification_status === 'SUSPENDED',
          is_idempotent_replay: true,
          breakdown,
        };
      }
    }

    // 3. Tính toán Rating100 từ Reviews nhận được
    const reviews = await prisma.review.findMany({
      where: { reviewee_id: profile.user_id },
    });

    let avgStars = 4.0; // Baseline cho Companion mới (80 điểm)
    let rating100 = 80.0;
    if (reviews.length > 0) {
      const totalStars = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgStars = totalStars / reviews.length;
      rating100 = (avgStars / 5.0) * 100;
    }

    // 4. Tính toán CompletionRate và DisputeRate từ Bookings đã nhận (Accepted/InSession/Completed/Disputed)
    const acceptedBookings = await prisma.booking.findMany({
      where: {
        profile_id: profileId,
        status: { in: ['ACCEPTED', 'IN_SESSION', 'COMPLETED', 'DISPUTED'] },
      },
      include: {
        dispute: {
          include: { decision: true },
        },
      },
    });

    const totalAccepted = acceptedBookings.length;
    let completionRate = 100.0;
    let disputeRate = 0.0;
    let completedCount = 0;
    let faultedDisputeCount = 0;

    if (totalAccepted > 0) {
      completedCount = acceptedBookings.filter((b) => b.status === 'COMPLETED').length;
      completionRate = (completedCount / totalAccepted) * 100;

      // Đơn bị phán quyết lỗi Companion >= 80%
      faultedDisputeCount = acceptedBookings.filter(
        (b) => b.dispute?.decision && b.dispute.decision.fault_percent >= 80
      ).length;
      disputeRate = (faultedDisputeCount / totalAccepted) * 100;
    }

    // 5. Tính tổng DirectPenalties từ các vi phạm đã ghi log trước đó (như timeout 180s)
    const penaltyLogs = await prisma.trustScoreLog.findMany({
      where: {
        profile_id: profileId,
        delta: { lt: 0 },
        reason_code: { startsWith: 'PENALTY_' },
      },
    });
    const directPenalties = penaltyLogs.reduce((sum, l) => sum + Math.abs(l.delta), 0);

    // 6. Áp dụng công thức chuẩn: 0.40 * Rating100 + 0.40 * CompletionRate - 1.20 * DisputeRate - directPenalties
    let rawScore =
      0.4 * rating100 + 0.4 * completionRate - 1.2 * disputeRate - directPenalties;

    // Làm tròn 2 chữ số thập phân và kẹp trong khoảng [0.00, 100.00]
    const clampedScore = Math.max(0.0, Math.min(100.0, Math.round(rawScore * 100) / 100));
    const delta = Math.round((clampedScore - oldScore) * 100) / 100;

    // 7. Kiểm tra điều kiện Tạm khóa dưới ngưỡng (< 40 điểm)
    const isSuspended = clampedScore < 40.0;
    const newVerificationStatus = isSuspended ? 'SUSPENDED' : profile.verification_status === 'SUSPENDED' ? 'VERIFIED' : profile.verification_status;
    const newAvailability = isSuspended ? 'OFFLINE' : profile.availability;

    // 8. Cập nhật vào DB và ghi log kiểm toán
    await prisma.$transaction(async (tx) => {
      await tx.companionProfile.update({
        where: { profile_id: profileId },
        data: {
          trust_score: clampedScore,
          verification_status: newVerificationStatus,
          availability: newAvailability,
        },
      });

      await tx.trustScoreLog.create({
        data: {
          profile_id: profileId,
          booking_id: bookingId || null,
          reason_code: reasonCode || 'SCORE_RECALCULATION',
          delta,
          score_after: clampedScore,
        },
      });
    });

    logger.info(`[TrustScore] Updated score for Companion ${profileId}: ${oldScore} -> ${clampedScore} (delta: ${delta}, suspended: ${isSuspended})`);

    const breakdown: TrustScoreBreakdown = {
      profile_id: profileId,
      current_score: clampedScore,
      rating_100: Math.round(rating100 * 100) / 100,
      avg_stars: Math.round(avgStars * 100) / 100,
      review_count: reviews.length,
      completion_rate: Math.round(completionRate * 100) / 100,
      completed_bookings: completedCount,
      dispute_rate: Math.round(disputeRate * 100) / 100,
      faulted_disputes: faultedDisputeCount,
      total_bookings_accepted: totalAccepted,
      direct_penalties: directPenalties,
      is_suspended: isSuspended,
    };

    return {
      profile_id: profileId,
      old_score: oldScore,
      new_score: clampedScore,
      delta,
      is_suspended: isSuspended,
      is_idempotent_replay: false,
      breakdown,
    };
  }

  /**
   * Trừ điểm phạt trực tiếp (Direct Penalty) do sự cố như 180s Timeout hoặc RMA phán quyết.
   */
  async applyDirectPenalty(
    profileId: string,
    bookingId: string | null,
    reasonCode: string,
    penaltyPoints: number
  ): Promise<{
    old_score: number;
    new_score: number;
    delta: number;
    is_suspended: boolean;
    is_idempotent_replay: boolean;
  }> {
    const profile = await prisma.companionProfile.findUnique({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new NotFoundError(`Không tìm thấy hồ sơ Companion '${profileId}'.`);
    }

    const oldScore = profile.trust_score;

    // Idempotency check: Tránh trừ 2 lần cho cùng một sự kiện vi phạm
    const existingLog = await prisma.trustScoreLog.findFirst({
      where: {
        profile_id: profileId,
        booking_id: bookingId,
        reason_code: reasonCode,
      },
    });

    if (existingLog) {
      logger.info(`[TrustScore] Direct penalty idempotent replay for ${reasonCode} on booking ${bookingId}`);
      return {
        old_score: oldScore,
        new_score: oldScore,
        delta: 0,
        is_suspended: profile.verification_status === 'SUSPENDED',
        is_idempotent_replay: true,
      };
    }

    const newScore = Math.max(0.0, Math.min(100.0, Math.round((oldScore - penaltyPoints) * 100) / 100));
    const delta = -penaltyPoints;
    const isSuspended = newScore < 40.0;

    await prisma.$transaction(async (tx) => {
      await tx.companionProfile.update({
        where: { profile_id: profileId },
        data: {
          trust_score: newScore,
          verification_status: isSuspended ? 'SUSPENDED' : profile.verification_status,
          availability: isSuspended ? 'OFFLINE' : profile.availability,
        },
      });

      await tx.trustScoreLog.create({
        data: {
          profile_id: profileId,
          booking_id: bookingId,
          reason_code: reasonCode,
          delta,
          score_after: newScore,
        },
      });
    });

    logger.info(`[TrustScore] Applied penalty ${penaltyPoints} points for ${reasonCode}: ${oldScore} -> ${newScore}`);

    return {
      old_score: oldScore,
      new_score: newScore,
      delta,
      is_suspended: isSuspended,
      is_idempotent_replay: false,
    };
  }

  /**
   * Lấy chi tiết thông số cấu thành điểm TrustScore phục vụ giao diện & kiểm toán.
   */
  async getScoreBreakdown(profileId: string): Promise<TrustScoreBreakdown> {
    const profile = await prisma.companionProfile.findUnique({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new NotFoundError(`Không tìm thấy Companion '${profileId}'.`);
    }

    const reviews = await prisma.review.findMany({
      where: { reviewee_id: profile.user_id },
    });

    let avgStars = 4.0;
    let rating100 = 80.0;
    if (reviews.length > 0) {
      avgStars = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      rating100 = (avgStars / 5.0) * 100;
    }

    const acceptedBookings = await prisma.booking.findMany({
      where: {
        profile_id: profileId,
        status: { in: ['ACCEPTED', 'IN_SESSION', 'COMPLETED', 'DISPUTED'] },
      },
      include: {
        dispute: { include: { decision: true } },
      },
    });

    const totalAccepted = acceptedBookings.length;
    let completionRate = 100.0;
    let disputeRate = 0.0;
    let completedCount = 0;
    let faultedCount = 0;

    if (totalAccepted > 0) {
      completedCount = acceptedBookings.filter((b) => b.status === 'COMPLETED').length;
      completionRate = (completedCount / totalAccepted) * 100;
      faultedCount = acceptedBookings.filter(
        (b) => b.dispute?.decision && b.dispute.decision.fault_percent >= 80
      ).length;
      disputeRate = (faultedCount / totalAccepted) * 100;
    }

    const penaltyLogs = await prisma.trustScoreLog.findMany({
      where: {
        profile_id: profileId,
        delta: { lt: 0 },
        reason_code: { startsWith: 'PENALTY_' },
      },
    });
    const directPenalties = penaltyLogs.reduce((sum, l) => sum + Math.abs(l.delta), 0);

    return {
      profile_id: profileId,
      current_score: profile.trust_score,
      rating_100: Math.round(rating100 * 100) / 100,
      avg_stars: Math.round(avgStars * 100) / 100,
      review_count: reviews.length,
      completion_rate: Math.round(completionRate * 100) / 100,
      completed_bookings: completedCount,
      dispute_rate: Math.round(disputeRate * 100) / 100,
      faulted_disputes: faultedCount,
      total_bookings_accepted: totalAccepted,
      direct_penalties: directPenalties,
      is_suspended: profile.trust_score < 40.0,
    };
  }
}

export const trustScoreService = new TrustScoreService();
