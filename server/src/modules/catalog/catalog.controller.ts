import { Request, Response } from 'express';
import { extractUtm } from '../../common/utm.js';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { sendSuccess } from '../../common/response.js';
import { NotFoundError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { mockGameRankProvider } from '../companion/game-rank-provider.js';

const SERVICE_CATEGORIES = ['GAME', 'SOCIAL'] as const;

function parseCategory(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw === '' || raw.toUpperCase() === 'ALL') return undefined;
  const upper = raw.toUpperCase();
  return (SERVICE_CATEGORIES as readonly string[]).includes(upper) ? upper : '__INVALID__';
}

/** GET /api/games?category=GAME|SOCIAL — danh mục dịch vụ (Game + Non-gamer, D35). */
export async function getGames(req: Request, res: Response): Promise<void> {
  const category = parseCategory(req.query.category);
  const games = await prisma.gameCatalog.findMany({
    where: { is_active: true, ...(category ? { category } : {}) },
    include: {
      tiers: {
        orderBy: { rank_weight: 'asc' },
      },
    },
  });

  sendSuccess(res, games);
}

export async function getCompanions(req: Request, res: Response): Promise<void> {
  const query = req.query;
  const game_id = (query.game_id || query.gameId) as string | undefined;
  const tier_id = (query.tier_id || query.tierId) as string | undefined;
  const min_price = query.min_price !== undefined ? Number(query.min_price) : undefined;
  const max_price = query.max_price !== undefined ? Number(query.max_price) : undefined;
  const min_trust_score = (query.min_trust_score || query.minTrustScore) !== undefined
    ? Number(query.min_trust_score || query.minTrustScore)
    : undefined;
  const availability = query.availability as string | undefined;
  const dateStr = query.date as string | undefined;
  const time_slot = query.time_slot as string | undefined; // 'morning' | 'afternoon' | 'evening'
  const slot_start = query.slot_start as string | undefined;
  const slot_end = query.slot_end as string | undefined;
  const sort_by = query.sort_by as string | undefined; // 'rating' | 'price_asc' | 'price_desc' | 'trust_score' | 'online' | 'match_score'
  const page = query.page !== undefined ? Math.max(1, parseInt(query.page as string, 10) || 1) : undefined;
  const limit = query.limit !== undefined ? Math.max(1, parseInt(query.limit as string, 10) || 10) : undefined;
  const paginated = query.paginated === 'true' || (page !== undefined && limit !== undefined);
  const target_price = query.target_price !== undefined ? Number(query.target_price) : undefined;

  const whereClause: any = {
    user: { status: 'ACTIVE' },
    profile_status: 'ACTIVE',
  };

  // 1. Tiêu chí Game (FR-002, UC02)
  if (game_id && game_id !== 'ALL') {
    whereClause.game_id = game_id;
  }

  // 1b. Nhóm dịch vụ GAME / SOCIAL (Non-gamer, D35)
  const category = parseCategory(query.category);
  if (category) {
    whereClause.game = { category };
  }

  // 2. Tiêu chí Rank / Bậc kỹ năng (FR-002, UC02)
  if (tier_id && tier_id !== 'ALL') {
    whereClause.verified_tier_id = tier_id;
  }

  // 3. Tiêu chí Mức giá theo giờ (FR-002, UC02)
  if (min_price !== undefined || max_price !== undefined) {
    whereClause.hourly_rate = {};
    if (min_price !== undefined && !isNaN(min_price)) {
      whereClause.hourly_rate.gte = min_price;
    }
    if (max_price !== undefined && !isNaN(max_price)) {
      whereClause.hourly_rate.lte = max_price;
    }
  }

  // 4. Tiêu chí Điểm tín nhiệm TrustScore tối thiểu (FR-002, UC02)
  if (min_trust_score !== undefined && !isNaN(min_trust_score)) {
    whereClause.trust_score = { gte: min_trust_score };
  }

  // 5. Trạng thái hoạt động
  if (availability && availability !== 'ALL') {
    whereClause.availability = availability;
  }

  // 6. Tiêu chí Thời gian rảnh theo ngày & khung giờ (FR-002, UC02)
  const now = new Date();
  if (dateStr || time_slot || slot_start || slot_end) {
    let slotStartTimeGte = now;
    let slotEndTimeLte: Date | undefined;

    if (dateStr) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
      if (dayStart > now) {
        slotStartTimeGte = dayStart;
      }
      slotEndTimeLte = dayEnd;

      if (time_slot === 'morning') {
        const morningStart = new Date(`${dateStr}T06:00:00.000Z`);
        const morningEnd = new Date(`${dateStr}T12:00:00.000Z`);
        if (morningStart > slotStartTimeGte) slotStartTimeGte = morningStart;
        slotEndTimeLte = morningEnd;
      } else if (time_slot === 'afternoon') {
        const afternoonStart = new Date(`${dateStr}T12:00:00.000Z`);
        const afternoonEnd = new Date(`${dateStr}T18:00:00.000Z`);
        if (afternoonStart > slotStartTimeGte) slotStartTimeGte = afternoonStart;
        slotEndTimeLte = afternoonEnd;
      } else if (time_slot === 'evening') {
        const eveningStart = new Date(`${dateStr}T18:00:00.000Z`);
        const eveningEnd = new Date(`${dateStr}T23:59:59.999Z`);
        if (eveningStart > slotStartTimeGte) slotStartTimeGte = eveningStart;
        slotEndTimeLte = eveningEnd;
      }
    }

    if (slot_start) {
      const parsedStart = new Date(slot_start);
      if (!isNaN(parsedStart.getTime()) && parsedStart > slotStartTimeGte) {
        slotStartTimeGte = parsedStart;
      }
    }
    if (slot_end) {
      const parsedEnd = new Date(slot_end);
      if (!isNaN(parsedEnd.getTime())) {
        slotEndTimeLte = parsedEnd;
      }
    }

    const slotWhere: any = {
      status: 'AVAILABLE',
      start_time: { gte: slotStartTimeGte },
    };
    if (slotEndTimeLte) {
      slotWhere.start_time.lte = slotEndTimeLte;
    }

    whereClause.slots = { some: slotWhere };
  }

  // Tự động giải phóng các slot HELD đã quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const companions = await prisma.companionProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          display_name: true,
          email: true,
          avatar_url: true,
          kyc_records: {
            where: { status: 'VERIFIED' },
            select: { kyc_id: true, status: true },
          },
        },
      },
      game: true,
      tier: true,
      slots: {
        where: {
          start_time: { gte: now },
          status: { not: 'REMOVED' },
        },
        orderBy: { start_time: 'asc' },
      },
    },
    orderBy: { trust_score: 'desc' },
  });

  const profileIds = companions.map((c) => c.profile_id);
  const userIds = companions.map((c) => c.user_id);

  // Lấy toàn bộ bookings đã nhận của các companions để tính tỷ lệ hoàn thành thực tế
  const allBookings = await prisma.booking.findMany({
    where: {
      profile_id: { in: profileIds },
      status: { in: ['ACCEPTED', 'IN_SESSION', 'COMPLETED', 'DISPUTED', 'REFUNDED'] },
    },
    select: {
      profile_id: true,
      status: true,
    },
  });

  // Lấy toàn bộ reviews để tính điểm đánh giá sao trung bình thực tế
  const allReviews = await prisma.review.findMany({
    where: {
      reviewee_id: { in: userIds },
    },
    select: {
      reviewee_id: true,
      rating: true,
    },
  });

  const enrichedCompanions = await Promise.all(
    companions.map(async (comp) => {
      const compBookings = allBookings.filter((b) => b.profile_id === comp.profile_id);
      const totalAccepted = compBookings.length;
      const completedCount = compBookings.filter((b) => b.status === 'COMPLETED').length;
      const completionRate = totalAccepted > 0
        ? Math.round((completedCount / totalAccepted) * 1000) / 10
        : 100.0;

      const compReviews = allReviews.filter((r) => r.reviewee_id === comp.user_id);
      const reviewCount = compReviews.length;
      const avgRating = reviewCount > 0
        ? Math.round((compReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
        : 5.0;

      // Trạng thái xác thực eKYC
      const isKycVerified =
        comp.verification_status === 'VERIFIED' ||
        (Boolean(comp.user?.kyc_records && comp.user.kyc_records.length > 0));

      // Đối chiếu Rank với MockGameRankProvider (FR-002, UC02)
      const rankVerification = await mockGameRankProvider.verifyRank(
        comp.game_account_id || '',
        comp.game_id || '',
        comp.verified_tier_id || ''
      );

      // Thuật toán chấm điểm ghép cặp (Matchmaking recommendation score 0-100)
      let gameScore = 15;
      if (game_id && game_id !== 'ALL') {
        gameScore = comp.game_id === game_id ? 30 : 0;
      }
      let rankScore = 15;
      if (tier_id && tier_id !== 'ALL') {
        rankScore = comp.verified_tier_id === tier_id ? 25 : 5;
      }
      let priceScore = 15;
      const hourlyRate = comp.hourly_rate ?? 0;
      if (target_price !== undefined && target_price > 0) {
        const diff = Math.abs(hourlyRate - target_price);
        priceScore = Math.max(0, Math.round(20 - (diff / target_price) * 20));
      } else if (min_price !== undefined || max_price !== undefined) {
        const minP = min_price ?? 0;
        const maxP = max_price ?? Infinity;
        if (hourlyRate >= minP && hourlyRate <= maxP) {
          priceScore = 20;
        } else {
          priceScore = 5;
        }
      }
      const hasSlotNow = comp.slots.some((s) => s.status === 'AVAILABLE');
      const slotScore = hasSlotNow ? 15 : (comp.availability === 'ONLINE' ? 10 : 0);
      const trustScoreWeight = Math.min(10, Math.round(((comp.trust_score || 80) / 100) * 10));
      const totalMatchScore = Math.min(100, gameScore + rankScore + priceScore + slotScore + trustScoreWeight);

      const explanationParts: string[] = [];
      if (game_id && game_id !== 'ALL' && comp.game_id === game_id) {
        explanationParts.push(`Khớp tựa game ${comp.game?.game_name || comp.game_id}`);
      }
      if (tier_id && tier_id !== 'ALL' && comp.verified_tier_id === tier_id) {
        explanationParts.push(`Đúng bậc xếp hạng ${comp.tier?.tier_name || comp.verified_tier_id}`);
      }
      if (priceScore >= 15) {
        explanationParts.push(`Mức giá ${hourlyRate.toLocaleString('vi-VN')}đ/h phù hợp ngân sách`);
      }
      if (hasSlotNow) {
        explanationParts.push('Có lịch rảnh khả dụng');
      }
      if (comp.trust_score >= 85) {
        explanationParts.push(`Điểm tín nhiệm cao (${comp.trust_score})`);
      }

      return {
        ...comp,
        avatar_url: comp.user?.avatar_url,
        completion_rate: completionRate,
        rating: avgRating,
        review_count: reviewCount,
        is_kyc_verified: isKycVerified,
        kyc_badge: isKycVerified ? 'VERIFIED' : 'UNVERIFIED',
        rank_verification: rankVerification,
        match_score: totalMatchScore,
        match_breakdown: {
          game: gameScore,
          rank: rankScore,
          price: priceScore,
          slot: slotScore,
          trust: trustScoreWeight,
          explanation: explanationParts.join('; ') || 'Đồng đội đề xuất theo tiêu chí phù hợp.',
        },
      };
    })
  );

  // Sắp xếp kết quả (Sort)
  if (sort_by === 'rating') {
    enrichedCompanions.sort((a, b) => b.rating - a.rating);
  } else if (sort_by === 'price_asc') {
    enrichedCompanions.sort((a, b) => (a.hourly_rate ?? 0) - (b.hourly_rate ?? 0));
  } else if (sort_by === 'price_desc') {
    enrichedCompanions.sort((a, b) => (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0));
  } else if (sort_by === 'trust_score') {
    enrichedCompanions.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));
  } else if (sort_by === 'online') {
    enrichedCompanions.sort((a, b) => {
      if (a.availability === 'ONLINE' && b.availability !== 'ONLINE') return -1;
      if (a.availability !== 'ONLINE' && b.availability === 'ONLINE') return 1;
      return (b.trust_score || 0) - (a.trust_score || 0);
    });
  } else if (sort_by === 'match_score') {
    enrichedCompanions.sort((a, b) => b.match_score - a.match_score);
  }

  const emptyMessage = 'Không tìm thấy đồng đội phù hợp với bộ lọc hiện tại. Vui lòng thử nới lỏng điều kiện tìm kiếm.';
  const totalCount = enrichedCompanions.length;

  res.set('X-Total-Count', String(totalCount));

  if (paginated) {
    const p = page || 1;
    const l = limit || 10;
    const totalPages = Math.ceil(totalCount / l) || 1;
    const startIndex = (p - 1) * l;
    const items = enrichedCompanions.slice(startIndex, startIndex + l);

    res.set('X-Page', String(p));
    res.set('X-Total-Pages', String(totalPages));

    sendSuccess(res, {
      items,
      pagination: {
        page: p,
        limit: l,
        total: totalCount,
        total_pages: totalPages,
      },
      empty_message: totalCount === 0 ? emptyMessage : null,
    });
    return;
  }

  sendSuccess(res, enrichedCompanions);
}

export async function getCompanionById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const now = new Date();

  // Tự động giải phóng slot quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      profile_id: id,
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const companion = await prisma.companionProfile.findUnique({
    where: { profile_id: id },
    include: {
      user: {
        select: {
          display_name: true,
          email: true,
          avatar_url: true,
          kyc_records: {
            where: { status: 'VERIFIED' },
            select: { kyc_id: true, status: true },
          },
        },
      },
      game: true,
      tier: true,
      slots: {
        where: {
          start_time: { gte: now },
          status: { not: 'REMOVED' },
        },
        orderBy: { start_time: 'asc' },
      },
    },
  });

  if (!companion || companion.profile_status === 'INCOMPLETE') {
    throw new NotFoundError('Không tìm thấy hồ sơ Companion.');
  }

  // Tính toán tỷ lệ hoàn thành và rating thực tế
  const compBookings = await prisma.booking.findMany({
    where: {
      profile_id: companion.profile_id,
      status: { in: ['ACCEPTED', 'IN_SESSION', 'COMPLETED', 'DISPUTED', 'REFUNDED'] },
    },
    select: { status: true },
  });
  const totalAccepted = compBookings.length;
  const completedCount = compBookings.filter((b) => b.status === 'COMPLETED').length;
  const completionRate = totalAccepted > 0
    ? Math.round((completedCount / totalAccepted) * 1000) / 10
    : 100.0;

  const compReviews = await prisma.review.findMany({
    where: { reviewee_id: companion.user_id },
    select: { rating: true },
  });
  const reviewCount = compReviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((compReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 5.0;

  const isKycVerified =
    companion.verification_status === 'VERIFIED' ||
    Boolean(companion.user?.kyc_records && companion.user.kyc_records.length > 0);

  const rankVerification = await mockGameRankProvider.verifyRank(
    companion.game_account_id || '',
    companion.game_id || '',
    companion.verified_tier_id || ''
  );

  sendSuccess(res, {
    ...companion,
    avatar_url: companion.user?.avatar_url,
    completion_rate: completionRate,
    rating: avgRating,
    review_count: reviewCount,
    is_kyc_verified: isKycVerified,
    kyc_badge: isKycVerified ? 'VERIFIED' : 'UNVERIFIED',
    rank_verification: rankVerification,
  });
}

export async function getCompanionSlots(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const now = new Date();

  // Tự động giải phóng các slot HELD đã quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      profile_id: id,
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const slots = await prisma.slotCalendar.findMany({
    where: {
      profile_id: id,
      start_time: { gte: now },
      status: { not: 'REMOVED' },
    },
    orderBy: { start_time: 'asc' },
  });

  sendSuccess(res, slots);
}

export async function recordVisit(req: Request, res: Response): Promise<void> {
  const { session_key } = req.body;
  const utm = extractUtm(req.body);
  if (!session_key || typeof session_key !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'session_key là bắt buộc để ghi nhận lượt truy cập ẩn danh.',
      },
    });
    return;
  }

  // 1. Lọc bot cơ bản theo User-Agent (googlebot, bing, crawler, spider, curl, headless...)
  const userAgent = (req.headers['user-agent'] as string) || '';
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|headless|wget|curl/i.test(userAgent);
  if (isBot) {
    sendSuccess(res, { session_key, recorded: false, is_bot: true });
    return;
  }

  // 2. Băm IP bằng HMAC với khóa bí mật máy chủ (không lưu trữ IP thô)
  const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()) || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHmac('sha256', env.JWT_SECRET).update(clientIp).digest('hex');

  // 3. Mỗi phiên tính một lượt (Idempotent theo session_key duy nhất)
  const existing = await prisma.siteVisit.findUnique({
    where: { session_key },
  });

  if (!existing) {
    await prisma.siteVisit.create({
      data: {
        session_key,
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 255),
        ...utm,
      },
    });
  }

  sendSuccess(res, { session_key, recorded: !existing, is_bot: false });
}


/** Chuẩn hóa tham số UTM (G8 — đo phễu theo kênh Social). Chỉ nhận chuỗi ngắn, chữ/số/-/_ . */
// extractUtm chuyển sang common/utm.ts (dùng chung với đăng ký — G9); re-export để giữ tương thích.
export { extractUtm } from '../../common/utm.js';
