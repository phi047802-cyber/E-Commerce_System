import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting INSTASQUAD database seeding...');

  // 1. Dọn dẹp dữ liệu cũ (Idempotent seed)
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
  await prisma.booking.deleteMany();
  await prisma.slotCalendar.deleteMany();
  await prisma.platformRevenue.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.companionProfile.deleteMany();
  await prisma.skillRankTier.deleteMany();
  await prisma.gameCatalog.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // Mật khẩu demo chung (đã băm bằng bcrypt)
  const defaultPassword = await bcrypt.hash('Demo@123456', 10);

  // 2. Tạo Danh mục Game
  await prisma.gameCatalog.createMany({
    data: [
      { game_id: 'LMHT', game_name: 'Liên Minh Huyền Thoại', publisher: 'Riot Games / VNG', genre: 'MOBA' },
      { game_id: 'VALORANT', game_name: 'VALORANT', publisher: 'Riot Games / VNG', genre: 'FPS' },
      { game_id: 'TFT', game_name: 'Đấu Trường Chân Lý', publisher: 'Riot Games / VNG', genre: 'Auto-battler' },
    ],
  });

  // 3. Tạo Bậc xếp hạng (Skill Rank Tiers)
  await prisma.skillRankTier.createMany({
    data: [
      { tier_id: 'LMHT_GOLD', game_id: 'LMHT', tier_name: 'Vàng', rank_weight: 1 },
      { tier_id: 'LMHT_DIAMOND', game_id: 'LMHT', tier_name: 'Kim Cương', rank_weight: 2 },
      { tier_id: 'LMHT_CHALLENGER', game_id: 'LMHT', tier_name: 'Thách Đấu', rank_weight: 3 },
      { tier_id: 'VAL_PLATINUM', game_id: 'VALORANT', tier_name: 'Bạch Kim', rank_weight: 1 },
      { tier_id: 'VAL_RADIANT', game_id: 'VALORANT', tier_name: 'Radiant', rank_weight: 2 },
      { tier_id: 'TFT_MASTER', game_id: 'TFT', tier_name: 'Cao Thủ', rank_weight: 1 },
    ],
  });

  console.log('🎮 Seeded Game Catalog & Rank Tiers.');

  // 4. Tạo Users mẫu đầy đủ 5 vai trò
  const userRenter1 = await prisma.user.create({
    data: {
      user_id: 'u-renter-01',
      email: 'renter1@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Minh Hoàng (Renter Có Sẵn Tiền)',
      role: 'RENTER',
      phone_number: '0901234567',
    },
  });

  const userRenter2 = await prisma.user.create({
    data: {
      user_id: 'u-renter-02',
      email: 'renter2@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Khánh Vy (Renter Ví 0đ Demo Nạp)',
      role: 'RENTER',
      phone_number: '0902345678',
    },
  });

  const userCompanion1 = await prisma.user.create({
    data: {
      user_id: 'u-comp-01',
      email: 'companion1@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Bảo Ngọc (Companion Uy Tín 95)',
      role: 'COMPANION',
      phone_number: '0903456789',
    },
  });

  const userCompanion2 = await prisma.user.create({
    data: {
      user_id: 'u-comp-02',
      email: 'companion2@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Tuấn Anh (Companion Mới 80)',
      role: 'COMPANION',
      phone_number: '0904567890',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-cs-01',
      email: 'cs_agent@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Nguyễn Văn CS (Nhân Viên CS)',
      role: 'CS_AGENT',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-auditor-01',
      email: 'auditor@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Trần Thị Kiểm Toán (Auditor)',
      role: 'AUDITOR',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-admin-01',
      email: 'admin@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Quản Trị Viên (Admin)',
      role: 'ADMIN',
    },
  });

  console.log('👤 Seeded 7 Test Users covering all 5 roles.');

  // 5. Tạo Companion Profiles
  const compProfile1 = await prisma.companionProfile.create({
    data: {
      profile_id: 'prof-comp-01',
      user_id: userCompanion1.user_id,
      game_id: 'LMHT',
      verified_tier_id: 'LMHT_DIAMOND',
      hourly_rate: 100000, // 100.000 VND / giờ
      verification_status: 'VERIFIED',
      availability: 'ONLINE',
      trust_score: 95.0,
      audio_bio_url: 'https://example.com/audio/bio-companion1.mp3',
      game_account_id: 'FakerFan#VN2',
    },
  });

  const compProfile2 = await prisma.companionProfile.create({
    data: {
      profile_id: 'prof-comp-02',
      user_id: userCompanion2.user_id,
      game_id: 'VALORANT',
      verified_tier_id: 'VAL_RADIANT',
      hourly_rate: 150000, // 150.000 VND / giờ
      verification_status: 'VERIFIED',
      availability: 'ONLINE',
      trust_score: 80.0,
      audio_bio_url: 'https://example.com/audio/bio-companion2.mp3',
      game_account_id: 'TenZFan#VN1',
    },
  });

  // 6. Tạo Khung giờ rảnh (Slots)
  const now = new Date();
  const todayHour = (hour: number) => {
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const tomorrowHour = (hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await prisma.slotCalendar.createMany({
    data: [
      // Companion 1 slots
      { slot_id: 'slot-c1-01', profile_id: compProfile1.profile_id, start_time: todayHour(14), end_time: todayHour(16), status: 'AVAILABLE' },
      { slot_id: 'slot-c1-02', profile_id: compProfile1.profile_id, start_time: todayHour(19), end_time: todayHour(21), status: 'AVAILABLE' },
      { slot_id: 'slot-c1-03', profile_id: compProfile1.profile_id, start_time: tomorrowHour(9), end_time: tomorrowHour(11), status: 'AVAILABLE' },
      // Companion 2 slots
      { slot_id: 'slot-c2-01', profile_id: compProfile2.profile_id, start_time: todayHour(15), end_time: todayHour(17), status: 'AVAILABLE' },
      { slot_id: 'slot-c2-02', profile_id: compProfile2.profile_id, start_time: todayHour(20), end_time: todayHour(22), status: 'AVAILABLE' },
    ],
  });

  console.log('📅 Seeded Companion Profiles & Slot Calendars.');

  // 7. Tạo Ví tiền & Bút toán Sổ cái khởi tạo cho Renter 1 (500.000 VND)
  const walletRenter1 = await prisma.wallet.create({
    data: {
      wallet_id: 'w-renter-01',
      user_id: userRenter1.user_id,
      available_balance: 500000,
      escrow_balance: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      wallet_id: 'w-renter-02',
      user_id: userRenter2.user_id,
      available_balance: 0,
      escrow_balance: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      wallet_id: 'w-comp-01',
      user_id: userCompanion1.user_id,
      available_balance: 0,
      escrow_balance: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      wallet_id: 'w-comp-02',
      user_id: userCompanion2.user_id,
      available_balance: 0,
      escrow_balance: 0,
    },
  });

  // Tạo ví hệ thống: Clearing trung gian và Platform Revenue
  const userClearing = await prisma.user.create({
    data: {
      user_id: 'u-system-clearing',
      email: 'clearing@system.internal',
      password_hash: defaultPassword,
      display_name: 'Payment Clearing Account (Hệ thống)',
      role: 'ADMIN',
    },
  });

  const walletClearing = await prisma.wallet.create({
    data: {
      wallet_id: 'w-system-clearing',
      user_id: userClearing.user_id,
      wallet_type: 'SYSTEM_CLEARING',
      available_balance: -500000,
      escrow_balance: 0,
    },
  });

  const userRevenue = await prisma.user.create({
    data: {
      user_id: 'u-system-platform',
      email: 'revenue@system.internal',
      password_hash: defaultPassword,
      display_name: 'Platform Revenue (Doanh thu sàn)',
      role: 'ADMIN',
    },
  });

  await prisma.wallet.create({
    data: {
      wallet_id: 'w-platform-revenue',
      user_id: userRevenue.user_id,
      wallet_type: 'PLATFORM_REVENUE',
      available_balance: 0,
      escrow_balance: 0,
    },
  });

  // Hạch toán bút toán khởi tạo số dư cho Renter 1 (Đúng nguyên tắc kép Debit = Credit = 500.000)
  const initTxn = await prisma.ledgerTransaction.create({
    data: {
      txn_id: 'txn-init-renter-01',
      txn_type: 'TOPUP',
      idempotency_key: 'INIT-SEED-RENTER-01',
    },
  });

  // Dòng 1: CREDIT ví khả dụng Renter 1 (+500.000 VND)
  await prisma.ledgerEntry.create({
    data: {
      entry_id: 'entry-init-01',
      txn_id: initTxn.txn_id,
      wallet_id: walletRenter1.wallet_id,
      direction: 'CREDIT',
      balance_type: 'AVAILABLE',
      amount: 500000,
      balance_after: 500000,
    },
  });

  // Dòng 2: DEBIT tài khoản trung gian clearing (-500.000 VND)
  await prisma.ledgerEntry.create({
    data: {
      entry_id: 'entry-init-02',
      txn_id: initTxn.txn_id,
      wallet_id: walletClearing.wallet_id,
      direction: 'DEBIT',
      balance_type: 'AVAILABLE',
      amount: 500000,
      balance_after: -500000,
    },
  });

  console.log('💰 Seeded Wallets and initial Ledger Transaction for Renter 1.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
