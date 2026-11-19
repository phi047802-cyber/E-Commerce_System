import { prisma } from '../../common/prisma.js';
import { paymentService } from '../payment/payment.service.js';
import { DIRECT_SOURCE, SOCIAL_SOURCES } from '../../common/utm.js';

export class AdminService {
  async getDashboardMetrics() {
    // 1. Số booking hoàn thành & mục tiêu 10.000
    const totalBookingsCompleted = await prisma.booking.count({
      where: { status: 'COMPLETED' },
    });
    const bookingGoal = 10000;
    const bookingGoalProgressPct = Number(((totalBookingsCompleted / bookingGoal) * 100).toFixed(2));

    // 2. Tổng số yêu cầu đặt lịch (Tất cả booking requests)
    const totalBookingRequests = await prisma.booking.count();

    // 3. Tỉ lệ hoàn tất đơn = (đơn hoàn tất) / (tổng yêu cầu đặt) [Chỉ số vận hành đơn]
    const orderCompletionRatePct = totalBookingRequests > 0 
      ? Number(((totalBookingsCompleted / totalBookingRequests) * 100).toFixed(2))
      : 0;

    // 4. Số đơn ký quỹ thành công & Số phiên truy cập ẩn danh sàn
    const successfulEscrowBookings = await prisma.escrow.count();
    const totalSiteVisits = await prisma.siteVisit.count();

    // 5. Tỉ lệ chuyển đổi toàn sàn (Funnel Conversion Rate) = đơn ký quỹ thành công / số phiên truy cập
    const funnelConversionRatePct = totalSiteVisits > 0
      ? Number(((successfulEscrowBookings / totalSiteVisits) * 100).toFixed(2))
      : 0;

    // 6. Người dùng mới (User RENTER & COMPANION)
    const totalUsers = await prisma.user.count({
      where: {
        role: { in: ['RENTER', 'COMPANION'] },
      },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await prisma.user.count({
      where: {
        role: { in: ['RENTER', 'COMPANION'] },
        created_at: { gte: thirtyDaysAgo },
      },
    });

    // 5. Số Companion đang hoạt động (ONLINE hoặc BUSY)
    const activeCompanions = await prisma.companionProfile.count({
      where: {
        availability: { in: ['ONLINE', 'BUSY'] },
      },
    });
    const totalCompanions = await prisma.companionProfile.count();

    // 6. Doanh thu nền tảng 12% (từ ví w-platform-revenue trong Sổ cái kép)
    const platformWallet = await prisma.wallet.findUnique({
      where: { wallet_id: 'w-platform-revenue' },
    });
    const platformRevenue = platformWallet ? platformWallet.available_balance : 0;

    // 7. Thống kê số lượng nạp tiền tháng & Cảnh báo Quota gói Free SePay (Đợt C)
    const inflowMetrics = await paymentService.getMonthlyInflowMetrics();

    // 8. Các chỉ số vận hành mở rộng (Đợt E1)
    const activeBookingsCount = await prisma.booking.count({
      where: {
        // Gồm cả đơn đã ký quỹ đang chờ Companion (WAITING_COMPANION_RESPONSE) — trước đây bị bỏ sót
        status: { in: ['PENDING_ACCEPTANCE', 'WAITING_COMPANION_RESPONSE', 'ACCEPTED', 'IN_SESSION', 'WAITING_RENTER_CONFIRM', 'DISPUTED'] },
      },
    });

    const openRmaCount = await prisma.disputeCase.count({
      where: {
        // Khiếu nại mới có trạng thái OPENED (dispute.service) — trước đây đếm 'OPEN' nên thiếu
        status: { in: ['OPENED', 'OPEN', 'EVIDENCE_PENDING', 'UNDER_REVIEW'] },
      },
    });

    const pendingKycCount = await prisma.kycRecord.count({
      where: { status: 'PENDING' },
    });

    const pendingWithdrawalsCount = await prisma.withdrawalRequest.count({
      where: { status: 'PENDING' },
    });

    // 9. Biểu đồ theo ngày (7 ngày gần nhất)
    const dailyChart: { date: string; bookings_count: number; revenue_vnd: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      const completedInDay = await prisma.booking.count({
        where: {
          status: 'COMPLETED',
          created_at: { gte: startOfDay, lte: endOfDay },
        },
      });

      const bookingsInDay = await prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          created_at: { gte: startOfDay, lte: endOfDay },
        },
        select: { total_fee_snapshot: true },
      });
      const dayRev = bookingsInDay.reduce((sum, b) => sum + Math.round(b.total_fee_snapshot * 0.12), 0);

      dailyChart.push({
        date: dateStr,
        bookings_count: completedInDay,
        revenue_vnd: dayRev,
      });
    }

    return {
      metrics: {
        total_bookings_completed: totalBookingsCompleted,
        booking_goal: bookingGoal,
        booking_goal_progress_pct: bookingGoalProgressPct,
        total_booking_requests: totalBookingRequests,
        order_completion_rate_pct: orderCompletionRatePct,
        order_completion_rate_formula: 'Tỉ lệ hoàn tất đơn = (số đơn hoàn tất) / (tổng số yêu cầu đặt) [chỉ số vận hành đơn]',
        successful_escrow_bookings: successfulEscrowBookings,
        total_site_visits: totalSiteVisits,
        conversion_rate_pct: funnelConversionRatePct,
        funnel_conversion_rate_pct: funnelConversionRatePct,
        conversion_rate_formula: 'Tỉ lệ chuyển đổi = (đơn ký quỹ thành công / số phiên truy cập duy nhất) [Quy tắc tính toán chuyển đổi]',
        total_users: totalUsers,
        new_users_30d: newUsersLast30Days,
        active_companions: activeCompanions,
        total_companions: totalCompanions,
        platform_revenue_12_pct: platformRevenue,
        active_bookings_count: activeBookingsCount,
        open_rma_count: openRmaCount,
        pending_kyc_count: pendingKycCount,
        pending_withdrawals_count: pendingWithdrawalsCount,
        monthly_inflow_count: inflowMetrics.monthly_inflow_count,
        monthly_inflow_quota: inflowMetrics.monthly_inflow_quota,
        is_quota_warning: inflowMetrics.is_quota_warning,
        quota_warning_message: inflowMetrics.warning_message,
      },
      daily_chart: dailyChart,
      channels: await this.getChannelBreakdown(),
    };
  }

  /**
   * G8/G9 — Phân tích theo kênh nguồn (utm_source, first-touch).
   * - visits: phiên truy cập duy nhất (`site_visits`), không có utm_source → "direct".
   * - signups: tài khoản Renter/Companion theo `users.signup_utm_source`.
   * - escrow_bookings: đơn ký quỹ thành công của Renter có kênh đăng ký tương ứng.
   * - conversion_pct = escrow_bookings / visits (D27, theo từng kênh); null khi kênh không có phiên ghi nhận.
   * Ghi chú: người dùng đăng ký trước khi có ghi nhận kênh (G9) được tính vào "direct".
   */
  async getChannelBreakdown() {
    const [visitGroups, signupGroups, escrowRows] = await Promise.all([
      prisma.siteVisit.groupBy({ by: ['utm_source'], _count: { _all: true } }),
      prisma.user.groupBy({
        by: ['signup_utm_source'],
        where: { role: { in: ['RENTER', 'COMPANION'] } },
        _count: { _all: true },
      }),
      prisma.escrow.findMany({ select: { booking: { select: { renter: { select: { signup_utm_source: true } } } } } }),
    ]);

    const key = (v: string | null | undefined) => (v && v.trim() ? v : DIRECT_SOURCE);
    const rows = new Map<string, { source: string; visits: number; signups: number; escrow_bookings: number }>();
    const row = (source: string) => {
      if (!rows.has(source)) rows.set(source, { source, visits: 0, signups: 0, escrow_bookings: 0 });
      return rows.get(source)!;
    };
    for (const g of visitGroups) row(key(g.utm_source)).visits += g._count._all;
    for (const g of signupGroups) row(key(g.signup_utm_source)).signups += g._count._all;
    for (const e of escrowRows) row(key(e.booking.renter.signup_utm_source)).escrow_bookings += 1;

    const totalVisits = [...rows.values()].reduce((sum, r) => sum + r.visits, 0);
    const socialVisits = [...rows.values()]
      .filter((r) => (SOCIAL_SOURCES as readonly string[]).includes(r.source))
      .reduce((sum, r) => sum + r.visits, 0);
    const pct = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : null);

    const breakdown = [...rows.values()]
      .map((r) => ({
        ...r,
        is_social: (SOCIAL_SOURCES as readonly string[]).includes(r.source),
        visit_share_pct: pct(r.visits, totalVisits),
        conversion_pct: pct(r.escrow_bookings, r.visits),
      }))
      .sort((a, b) => b.visits - a.visits || b.escrow_bookings - a.escrow_bookings || a.source.localeCompare(b.source));

    return {
      breakdown,
      total_visits: totalVisits,
      social_visits: socialVisits,
      social_visit_share_pct: pct(socialVisits, totalVisits),
      social_visit_share_target_pct: 40,
      attribution: 'first-touch: kênh của lượt truy cập/deep link đầu tiên, lưu lúc đăng ký',
    };
  }

  /**
   * Danh sách toàn bộ đơn hàng trên sàn cho màn hình Quản lý đơn hàng Admin (Đợt E1)
   */
  async listAllBookings(statusFilter?: string) {
    const where: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }
    return prisma.booking.findMany({
      where,
      include: {
        slot: true,
        companion: {
          include: {
            user: { select: { display_name: true, email: true } },
            game: true,
          },
        },
        renter: {
          select: { display_name: true, email: true },
        },
        dispute: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

export const adminService = new AdminService();
