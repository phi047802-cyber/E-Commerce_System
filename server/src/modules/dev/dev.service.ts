import bcrypt from 'bcryptjs';
import { prisma } from '../../common/prisma.js';
import { ForbiddenError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';

export class DevService {
  /**
   * Khôi phục toàn bộ cơ sở dữ liệu về trạng thái demo ban đầu (Seed data sạch).
   * Yêu cầu an toàn: Chỉ chạy khi KHÔNG PHẢI môi trường Production!
   */
  async resetDemoDatabase(): Promise<{ message: string; timestamp: string; stats?: Record<string, number> }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Chức năng Demo Reset bị vô hiệu hóa tuyệt đối trên môi trường Production.');
    }

    logger.info('🔄 [DevService] Resetting demo database to clean seed state...');

    // 1. Dọn dẹp toàn bộ dữ liệu nghiệp vụ theo thứ tự khóa ngoại
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

    // 2. Mật khẩu mặc định băm
    const defaultPassword = await bcrypt.hash('Demo@123456', 10);

    // 3. Danh mục game
    await prisma.gameCatalog.createMany({
      data: [
        { game_id: 'LMHT', game_name: 'Liên Minh Huyền Thoại', publisher: 'Riot Games / VNG', genre: 'MOBA' },
        { game_id: 'VALORANT', game_name: 'VALORANT', publisher: 'Riot Games / VNG', genre: 'FPS' },
        { game_id: 'TFT', game_name: 'Đấu Trường Chân Lý', publisher: 'Riot Games / VNG', genre: 'Auto-battler' },
      ],
    });

    // 4. Rank Tiers
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

    // 5. Users
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
        display_name: 'Tuấn Kiệt (Companion Uy Tín 80)',
        role: 'COMPANION',
        phone_number: '0904567890',
      },
    });

    await prisma.user.create({
      data: {
        user_id: 'u-cs-01',
        email: 'cs_agent@instasquad.test',
        password_hash: defaultPassword,
        display_name: 'Thu Trang (CS Agent Trực Ban)',
        role: 'CS_AGENT',
        phone_number: '0905678901',
      },
    });

    await prisma.user.create({
      data: {
        user_id: 'u-admin-01',
        email: 'admin@instasquad.test',
        password_hash: defaultPassword,
        display_name: 'Quản Trị Viên Hệ Thống',
        role: 'ADMIN',
        phone_number: '0906789012',
      },
    });

    await prisma.user.create({
      data: {
        user_id: 'u-auditor-01',
        email: 'auditor@instasquad.test',
        password_hash: defaultPassword,
        display_name: 'Lê Minh (Kiểm Toán Viên Sổ Cái)',
        role: 'AUDITOR',
        phone_number: '0907890123',
      },
    });

    // 6. Companion Profiles
    const compProfile1 = await prisma.companionProfile.create({
      data: {
        profile_id: 'prof-comp-01',
        user_id: userCompanion1.user_id,
        game_id: 'LMHT',
        verified_tier_id: 'LMHT_CHALLENGER',
        hourly_rate: 100000,
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
        hourly_rate: 150000,
        verification_status: 'VERIFIED',
        availability: 'ONLINE',
        trust_score: 80.0,
        audio_bio_url: 'https://example.com/audio/bio-companion2.mp3',
        game_account_id: 'TenZFan#VN1',
      },
    });

    // 7. Slots (Tạo các khung giờ luôn nằm trong tương lai để có thể đặt lịch ngay)
    const createSlotTime = (hoursAhead: number, duration: number = 2) => {
      const start = new Date(Date.now() + hoursAhead * 3600 * 1000);
      start.setMinutes(0, 0, 0);
      const end = new Date(start.getTime() + duration * 3600 * 1000);
      return { start_time: start, end_time: end };
    };

    const s1 = createSlotTime(1);
    const s2 = createSlotTime(4);
    const s3 = createSlotTime(24);
    const s4 = createSlotTime(2);
    const s5 = createSlotTime(5);

    await prisma.slotCalendar.createMany({
      data: [
        { slot_id: 'slot-c1-01', profile_id: compProfile1.profile_id, start_time: s1.start_time, end_time: s1.end_time, status: 'AVAILABLE' },
        { slot_id: 'slot-c1-02', profile_id: compProfile1.profile_id, start_time: s2.start_time, end_time: s2.end_time, status: 'AVAILABLE' },
        { slot_id: 'slot-c1-03', profile_id: compProfile1.profile_id, start_time: s3.start_time, end_time: s3.end_time, status: 'AVAILABLE' },
        { slot_id: 'slot-c2-01', profile_id: compProfile2.profile_id, start_time: s4.start_time, end_time: s4.end_time, status: 'AVAILABLE' },
        { slot_id: 'slot-c2-02', profile_id: compProfile2.profile_id, start_time: s5.start_time, end_time: s5.end_time, status: 'AVAILABLE' },
      ],
    });

    // 8. Wallets & Init Ledger Transaction
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

    // Bút toán kép khởi tạo số dư cho Renter 1 (Debit = Credit = 500.000)
    const initTxn = await prisma.ledgerTransaction.create({
      data: {
        txn_id: 'txn-init-renter-01',
        txn_type: 'TOPUP',
        idempotency_key: 'INIT-SEED-RENTER-01',
      },
    });

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

    logger.info('✅ [DevService] Demo database reset successfully to clean state.');

    return {
      message: 'Khôi phục toàn bộ cơ sở dữ liệu về trạng thái Demo ban đầu thành công!',
      timestamp: new Date().toISOString(),
      stats: {
        users: 5,
        games: 4,
        profiles: 2,
        slots: 5,
        wallets: 5,
      },
    };
  }

  /**
   * Lấy danh sách cảnh báo sự cố lỗi Sổ cái (Ledger Audit Alerts).
   */
  async listAuditAlerts() {
    return prisma.ledgerAuditAlert.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        transaction: true,
      },
    });
  }
}

export const devService = new DevService();
