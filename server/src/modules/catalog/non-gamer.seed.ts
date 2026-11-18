import type { PrismaClient } from '@prisma/client';

/**
 * Dữ liệu dịch vụ Non-gamer (category SOCIAL, D35 — NON_GAMER_GROWTH_STRATEGY.md).
 * Dùng chung cho `prisma/seed.ts` và Demo Reset (`dev.service.ts`) để hai nơi không lệch nhau.
 */
export const SOCIAL_SERVICES = [
  { game_id: 'SOCIAL_TALK', game_name: 'Tâm sự & Lắng nghe', publisher: 'INSTASQUAD', genre: 'Trò chuyện', category: 'SOCIAL', description: 'Trò chuyện, chia sẻ áp lực học tập/công việc qua phòng chat an toàn. Không thay thế tư vấn tâm lý chuyên môn.' },
  { game_id: 'SOCIAL_MOVIE', game_name: 'Xem phim cùng', publisher: 'INSTASQUAD', genre: 'Giải trí', category: 'SOCIAL', description: 'Mỗi người mở phim trên nền tảng hợp pháp của mình, cùng bình luận theo thời gian thực.' },
  { game_id: 'SOCIAL_MUSIC', game_name: 'Nghe nhạc cùng', publisher: 'INSTASQUAD', genre: 'Giải trí', category: 'SOCIAL', description: 'Chia sẻ playlist, bình luận và giao lưu âm nhạc.' },
  { game_id: 'SOCIAL_PARTY', game_name: 'Party game nhẹ', publisher: 'INSTASQUAD', genre: 'Party', category: 'SOCIAL', description: 'Đố vui, vẽ đoán chữ, Ma Sói online, không cần kỹ năng chơi game.' },
];

/** Xóa dữ liệu nghiệp vụ theo thứ tự con → cha (FK NO ACTION trên SQL Server, D34). */
export async function wipeAllBusinessData(
  prisma: PrismaClient,
  opts: { keepPublicContent?: boolean } = {}
): Promise<void> {
  await prisma.violationRecord.deleteMany();
  await prisma.termsAcceptance.deleteMany();
  await prisma.settlementRetryQueue.deleteMany();
  await prisma.callLog.deleteMany();
  // Demo Reset giữ nguyên tin tức, lượt truy cập và OTP (không phụ thuộc user) như hành vi cũ
  if (!opts.keepPublicContent) {
    await prisma.news.deleteMany();
    await prisma.siteVisit.deleteMany();
    await prisma.authOtp.deleteMany();
  }
  await prisma.kycRecord.deleteMany();
  await prisma.ledgerAuditAlert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trustScoreLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.disputeDecision.deleteMany();
  await prisma.disputeEvidence.deleteMany();
  await prisma.disputeCase.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.session.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slotCalendar.deleteMany();
  await prisma.platformRevenue.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.companionProfile.deleteMany();
  await prisma.skillRankTier.deleteMany();
  await prisma.gameCatalog.deleteMany();
  await prisma.user.deleteMany();
}

/** Ghi nhận chấp thuận điều khoản hiện hành cho mọi Renter/Companion đã seed (tài khoản demo). */
export async function seedTermsAcceptances(prisma: PrismaClient, termsVersion: string): Promise<number> {
  const users = await prisma.user.findMany({ where: { role: { in: ['RENTER', 'COMPANION'] } }, select: { user_id: true } });
  await prisma.termsAcceptance.createMany({
    data: users.map((u) => ({ user_id: u.user_id, terms_version: termsVersion, channel: 'WEB' })),
  });
  return users.length;
}

/** Tạo danh mục SOCIAL + 2 Companion Non-gamer (Lan Chi, Quang Huy) kèm ví và slot ngày mai. */
export async function seedNonGamerServices(prisma: PrismaClient, passwordHash: string): Promise<void> {
  await prisma.gameCatalog.createMany({ data: SOCIAL_SERVICES });

  const companions = [
    {
      user_id: 'u-comp-03', email: 'companion3@instasquad.test', display_name: 'Lan Chi', phone: '0905678901', fav: 'Đọc sách, Podcast',
      bio: 'Companion dịch vụ Tâm sự & Lắng nghe: kiên nhẫn, tôn trọng, giữ bí mật câu chuyện của bạn.',
      profile_id: 'prof-comp-03', game_id: 'SOCIAL_TALK', rate: 60000, trust: 90.0, wallet_id: 'w-comp-03',
    },
    {
      user_id: 'u-comp-04', email: 'companion4@instasquad.test', display_name: 'Quang Huy', phone: '0906789012', fav: 'Phim, Âm nhạc',
      bio: 'Companion Xem phim cùng: mê phim hoạt hình và phim tài liệu, bình luận vui vẻ.',
      profile_id: 'prof-comp-04', game_id: 'SOCIAL_MOVIE', rate: 70000, trust: 85.0, wallet_id: 'w-comp-04',
    },
  ];
  for (const c of companions) {
    await prisma.user.create({
      data: {
        user_id: c.user_id, email: c.email, password_hash: passwordHash, display_name: c.display_name,
        bio: c.bio, favorite_games: c.fav, role: 'COMPANION', phone_number: c.phone,
      },
    });
    await prisma.companionProfile.create({
      data: {
        profile_id: c.profile_id, user_id: c.user_id, game_id: c.game_id, hourly_rate: c.rate,
        profile_status: 'ACTIVE', verification_status: 'VERIFIED', availability: 'ONLINE', trust_score: c.trust, max_hours_per_day: 8,
      },
    });
    await prisma.wallet.create({ data: { wallet_id: c.wallet_id, user_id: c.user_id } });
  }

  const tomorrowHour = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  await prisma.slotCalendar.createMany({
    data: [
      { slot_id: 'slot-c3-01', profile_id: 'prof-comp-03', start_time: tomorrowHour(20), end_time: tomorrowHour(21), status: 'AVAILABLE' },
      { slot_id: 'slot-c3-02', profile_id: 'prof-comp-03', start_time: tomorrowHour(21), end_time: tomorrowHour(22), status: 'AVAILABLE' },
      { slot_id: 'slot-c4-01', profile_id: 'prof-comp-04', start_time: tomorrowHour(19), end_time: tomorrowHour(21), status: 'AVAILABLE' },
    ],
  });
}
