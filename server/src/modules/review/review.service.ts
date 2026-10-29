import { prisma } from '../../common/prisma.js';
import { BusinessError, ConflictError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';
import { CreateReviewInput } from './review.dto.js';
import { trustScoreService } from '../companion/trust-score.service.js';

export class ReviewService {
  /**
   * Tạo đánh giá cho đối tác sau khi đơn đặt lịch hoàn tất (Prompt 11 - Requirement 1).
   * - Chỉ người thuộc Booking đã hoàn thành mới được review.
   * - Mỗi người chỉ review 1 lần cho 1 booking.
   * - Tuyệt đối không thay đổi ngược quyết toán tiền của booking.
   */
  async createReview(userId: string, input: CreateReviewInput) {
    const { booking_id, rating, comment } = input;

    // 1. Kiểm tra Booking
    const booking = await prisma.booking.findUnique({
      where: { booking_id },
      include: {
        companion: {
          include: {
            user: { select: { user_id: true, display_name: true, email: true } },
          },
        },
        renter: {
          select: { user_id: true, display_name: true, email: true },
        },
        escrow: true,
      },
    });

    if (!booking) {
      throw new NotFoundError(`Không tìm thấy đơn đặt lịch với ID '${booking_id}'.`);
    }

    // 2. Kiểm tra quyền thuộc đơn đặt lịch (Participant check)
    const isRenter = booking.renter_id === userId;
    const isCompanion = booking.companion.user_id === userId;

    if (!isRenter && !isCompanion) {
      throw new ForbiddenError('Bạn không thuộc đơn đặt lịch này, không có quyền gửi đánh giá.');
    }

    // 3. Kiểm tra trạng thái đơn đặt lịch: Bắt buộc phải là COMPLETED
    if (booking.status !== 'COMPLETED') {
      throw new BusinessError(
        'BOOKING_NOT_COMPLETED',
        `Chỉ đơn đặt lịch đã hoàn tất dịch vụ (COMPLETED) mới được phép gửi đánh giá. Trạng thái hiện tại: ${booking.status}.`
      );
    }

    // 4. Xác định đối tượng được đánh giá (Reviewee)
    const reviewerId = userId;
    const revieweeId = isRenter ? booking.companion.user_id : booking.renter_id;

    if (reviewerId === revieweeId) {
      throw new BusinessError('CANNOT_REVIEW_SELF', 'Bạn không thể tự gửi đánh giá cho chính mình.');
    }

    // 5. Kiểm tra ràng buộc mỗi người chỉ review 1 lần cho 1 booking (@@unique([booking_id, reviewer_id]))
    const existingReview = await prisma.review.findUnique({
      where: {
        booking_id_reviewer_id: {
          booking_id,
          reviewer_id: reviewerId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictError(
        'REVIEW_ALREADY_EXISTS',
        'Bạn đã gửi đánh giá cho đơn đặt lịch này rồi. Đánh giá là bất biến, không cho phép gửi lại hoặc chỉnh sửa.'
      );
    }

    // 6. Ghi nhận bản ghi Review trong database (Không đụng đến Escrow hay Sổ cái Ledger)
    const review = await prisma.review.create({
      data: {
        booking_id,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        comment: comment || null,
      },
      include: {
        reviewer: { select: { user_id: true, display_name: true, role: true } },
        reviewee: { select: { user_id: true, display_name: true, role: true } },
      },
    });

    logger.info(`[Review] Review #${review.review_id} created by user ${reviewerId} for user ${revieweeId} (Rating: ${rating}*).`);

    // 7. Nếu đối tượng được review là Companion -> Tự động tính toán lại điểm TrustScore theo công thức chuẩn
    let trustScoreResult = null;
    if (isRenter) {
      trustScoreResult = await trustScoreService.recalculateTrustScore(
        booking.profile_id,
        booking_id,
        `REVIEW_SUBMITTED_RATING_${rating}`
      );
    }

    return {
      review,
      trust_score_update: trustScoreResult,
    };
  }

  /**
   * Lấy danh sách đánh giá nhận được của một Companion Profile
   */
  async getReviewsForCompanion(profileId: string) {
    const profile = await prisma.companionProfile.findUnique({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new NotFoundError(`Không tìm thấy Companion '${profileId}'.`);
    }

    const reviews = await prisma.review.findMany({
      where: { reviewee_id: profile.user_id },
      include: {
        reviewer: { select: { user_id: true, display_name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    return {
      profile_id: profileId,
      total_reviews: reviews.length,
      average_rating: averageRating,
      reviews,
    };
  }

  /**
   * Lấy danh sách đánh giá của một đơn đặt lịch (cả 2 bên nếu có)
   */
  async getReviewsForBooking(bookingId: string) {
    const reviews = await prisma.review.findMany({
      where: { booking_id: bookingId },
      include: {
        reviewer: { select: { user_id: true, display_name: true, role: true } },
        reviewee: { select: { user_id: true, display_name: true, role: true } },
      },
    });

    return reviews;
  }
}

export const reviewService = new ReviewService();
