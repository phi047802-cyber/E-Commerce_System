import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedNonGamerServices, seedTermsAcceptances, wipeAllBusinessData } from '../server/src/modules/catalog/non-gamer.seed.js';
import { CURRENT_TERMS_VERSION } from '../server/src/modules/legal/legal.catalog.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting INSTASQUAD database seeding...');

  // 1. Dọn dẹp dữ liệu cũ (Idempotent seed) — thứ tự con → cha (SQL Server FK NO ACTION, D34)
  await wipeAllBusinessData(prisma);

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

  // 4. Tạo Users mẫu đầy đủ 5 vai trò (tên tự nhiên, bio chứa mô tả demo)
  const userRenter1 = await prisma.user.create({
    data: {
      user_id: 'u-renter-01',
      email: 'renter1@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Minh Hoàng',
      bio: 'Renter có sẵn số dư ví để kiểm thử các luồng đặt lịch nhanh.',
      favorite_games: 'LMHT, VALORANT',
      role: 'RENTER',
      phone_number: '0901234567',
    },
  });

  const userRenter2 = await prisma.user.create({
    data: {
      user_id: 'u-renter-02',
      email: 'renter2@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Khánh Vy',
      bio: 'Renter ví 0đ để thử nghiệm luồng nạp tiền tự động QR SePay / Simulator.',
      favorite_games: 'TFT',
      role: 'RENTER',
      phone_number: '0902345678',
    },
  });

  const userCompanion1 = await prisma.user.create({
    data: {
      user_id: 'u-comp-01',
      email: 'companion1@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Bảo Ngọc',
      bio: 'Companion LMHT Kim Cương, điểm uy tín 95, hỗ trợ nhiệt tình leo rank và giao lưu vui vẻ.',
      favorite_games: 'LMHT',
      role: 'COMPANION',
      phone_number: '0903456789',
    },
  });

  const userCompanion2 = await prisma.user.create({
    data: {
      user_id: 'u-comp-02',
      email: 'companion2@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Tuấn Anh',
      bio: 'Companion VALORANT Radiant, điểm uy tín 80, kỹ năng cao và phản xạ nhanh.',
      favorite_games: 'VALORANT',
      role: 'COMPANION',
      phone_number: '0904567890',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-cs-01',
      email: 'cs_agent@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Thu Hà',
      bio: 'Chuyên viên Chăm sóc Khách hàng (CS Agent), xử lý khiếu nại và bảo vệ quyền lợi người dùng.',
      role: 'CS_AGENT',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-auditor-01',
      email: 'auditor@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Kiểm Toán Viên',
      bio: 'Kiểm toán viên độc lập giám sát tính toàn vẹn hệ thống Sổ cái kép.',
      role: 'AUDITOR',
    },
  });

  await prisma.user.create({
    data: {
      user_id: 'u-admin-01',
      email: 'admin@instasquad.test',
      password_hash: defaultPassword,
      display_name: 'Quản Trị Viên',
      bio: 'Quản trị viên vận hành nền tảng INSTASQUAD.',
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
      profile_status: 'ACTIVE',
      verification_status: 'VERIFIED',
      availability: 'ONLINE',
      trust_score: 95.0,
      audio_bio_url: 'https://example.com/audio/bio-companion1.mp3',
      game_account_id: 'FakerFan#VN2',
      max_hours_per_day: 10,
    },
  });

  const compProfile2 = await prisma.companionProfile.create({
    data: {
      profile_id: 'prof-comp-02',
      user_id: userCompanion2.user_id,
      game_id: 'VALORANT',
      verified_tier_id: 'VAL_RADIANT',
      hourly_rate: 150000, // 150.000 VND / giờ
      profile_status: 'ACTIVE',
      verification_status: 'VERIFIED',
      availability: 'ONLINE',
      trust_score: 80.0,
      audio_bio_url: 'https://example.com/audio/bio-companion2.mp3',
      game_account_id: 'TenZFan#VN1',
      max_hours_per_day: 10,
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

  await seedNonGamerServices(prisma, defaultPassword);
  console.log('💬 Seeded 4 SOCIAL services + 2 Non-gamer Companions (D35).');
  await seedTermsAcceptances(prisma, CURRENT_TERMS_VERSION);

  // 11. Seed initial anonymous SiteVisits for conversion rate demo
  await prisma.siteVisit.createMany({
    data: [
      { visit_id: 'visit-demo-01', session_key: 'sess-init-001' },
      { visit_id: 'visit-demo-02', session_key: 'sess-init-002' },
      { visit_id: 'visit-demo-03', session_key: 'sess-init-003' },
      { visit_id: 'visit-demo-04', session_key: 'sess-init-004' },
      { visit_id: 'visit-demo-05', session_key: 'sess-init-005' },
    ],
  });
  console.log('📊 Seeded anonymous site visits.');

  // 12. Seed 4 Official News Articles
  await prisma.news.createMany({
    data: [
      {
        news_id: 'news-01',
        slug: 'co-che-ky-quy-escrow-va-so-cai-kep',
        title: 'Cơ chế Ký quỹ Escrow và Sổ cái kép: Minh bạch tài chính thời gian thực',
        summary: 'Mọi dòng tiền đặt đơn đều được bảo đảm trong ví ký quỹ độc lập, giải ngân chính xác 88% cho Companion và 12% cho sàn sau nghiệm thu.',
        content: `### 1. Bản chất cơ chế Ký quỹ Escrow tại INSTASQUAD
Tại INSTASQUAD, bảo đảm an toàn giao dịch giữa người thuê (Renter) và bạn đồng hành (Companion) là ưu tiên nền tảng. Khi Renter đặt lịch, tiền thuê sẽ được chuyển từ ví khả dụng sang trạng thái Ký quỹ Escrow độc lập. Tiền này hoàn toàn không thuộc về Companion hay sàn cho đến khi phiên chơi hoàn thành và được nghiệm thu hợp lệ.

### 2. Mô hình Sổ cái kép bất biến (Double-Entry General Ledger)
Mỗi sự kiện tài chính trên sàn đều sinh ra đồng thời hai bút toán đối ứng Nợ (DEBIT) và Có (CREDIT) với tổng đại số bằng 0. Hệ thống chạy kiểm toán định kỳ 24/7 để đảm bảo số dư ví ký quỹ luôn khớp với tổng giá trị các đơn hàng đang hoạt động, không phát sinh chênh lệch hay thất thoát tiền tệ.

### 3. Tỷ lệ giải ngân 88 / 12 và làm tròn tiền tệ
Khi phiên chơi hoàn tất thành công:
- 88% giá trị đơn hàng được giải ngân ngay lập tức vào ví khả dụng của Companion.
- 12% được ghi nhận là phí dịch vụ nền tảng (Platform Commission Revenue).
- Mọi phép toán sử dụng số nguyên VND (zero-cent rounding) loại bỏ hoàn toàn rủi ro sai số thập phân.`,
        category: 'Hệ thống',
        image_url: '/images/news/news-escrow.webp',
        author: 'Ban Quản Trị INSTASQUAD',
        published_at: new Date('2026-11-04T08:00:00Z'),
      },
      {
        news_id: 'news-02',
        slug: 'chinh-sach-huy-don-va-hoan-tien-bac-thang',
        title: 'Chính sách hủy đơn bậc thang và bảo vệ quyền lợi hai chiều',
        summary: 'Quy định chi tiết các mốc hoàn 100% trước 30 phút, hoàn 70% từ 10-29 phút và xử lý phạt 100% tiền ký quỹ khi hủy gấp dưới 10 phút.',
        content: `### 1. Lý do áp dụng chính sách hủy đơn bậc thang
Để bảo vệ thời gian chuẩn bị của Companion đồng thời vẫn đem lại sự linh hoạt tối đa cho Renter, INSTASQUAD áp dụng chính sách hoàn trả bậc thang theo thời gian báo trước:

### 2. Các mốc thời gian cụ thể
- Hủy trước giờ hẹn từ 30 phút trở lên: Renter nhận lại 100% tiền ký quỹ về ví khả dụng. Companion và sàn không nhận phí.
- Hủy trong khoảng 10 đến 29 phút trước giờ hẹn: Renter nhận hoàn 70% tiền ký quỹ; 30% còn lại được bồi thường trực tiếp cho Companion nhằm bù đắp thời gian giữ slot. Sàn không thu phí hoa hồng ở trường hợp này.
- Hủy gấp dưới 10 phút: Phạt 100% tiền ký quỹ của Renter. Khoản phạt này được phân bổ 88% bồi thường cho Companion và 12% cho nền tảng theo thuật toán chia tỷ lệ đối ứng kép.`,
        category: 'Chính sách',
        image_url: '/images/news/news-cancellation.webp',
        author: 'Ban Quản Trị INSTASQUAD',
        published_at: new Date('2026-11-05T09:30:00Z'),
      },
      {
        news_id: 'news-03',
        slug: 'thuat-toan-trustscore-va-ty-le-hoan-thanh',
        title: 'Hệ thống tính điểm uy tín TrustScore và tỷ lệ hoàn thành đơn minh bạch',
        summary: 'Bộ tiêu chí đo lường hiệu suất thực chiến giúp người thuê lựa chọn bạn chơi chuẩn xác và xây dựng cộng đồng gaming văn minh.',
        content: `### 1. Chỉ số TrustScore là gì?
TrustScore là điểm số uy tín tích lũy của mỗi tài khoản Companion trên INSTASQUAD (thang điểm chuẩn từ 0 đến 100). Điểm khởi tạo mặc định cho Companion mới là 100 điểm.

### 2. Công thức biến thiên điểm số
- Cộng điểm thưởng (+2 điểm): Mỗi khi hoàn tất xuất sắc một đơn đặt lịch và nhận đánh giá tích cực từ Renter.
- Trừ điểm phạt (-10 điểm): Khi Companion tự ý hủy đơn không lý do chính đáng hoặc có hành vi vi phạm bị CS Agent xác nhận lỗi từ 80% trở lên.
- Chế tài tạm ngưng: Companion có TrustScore giảm xuống dưới 50 điểm sẽ bị hệ thống tự động khóa tính năng nhận đơn để kiểm tra chất lượng dịch vụ.

### 3. Tỷ lệ hoàn thành đơn (Completion Rate)
Tỷ lệ này được tính dựa trên số đơn hoàn thành thành công chia cho tổng số đơn đã nhận, hiển thị trực tiếp trên trang hồ sơ công khai giúp Renter an tâm khi lựa chọn đồng đội.`,
        category: 'Tính năng',
        image_url: '/images/news/news-trustscore.webp',
        author: 'Ban Quản Trị INSTASQUAD',
        published_at: new Date('2026-11-06T14:15:00Z'),
      },
      {
        news_id: 'news-04',
        slug: 'quy-trinh-phan-xu-khieu-nai-rma',
        title: 'Quy trình phân xử khiếu nại RMA và đóng băng Escrow tự động',
        summary: 'Khi có khiếu nại, tiền ký quỹ lập tức chuyển sang trạng thái FROZEN. Đội ngũ CS Agent đánh giá nhật ký và chứng cứ hình ảnh khách quan.',
        content: `### 1. Thời hạn và điều kiện gửi khiếu nại
Sau khi phiên chơi kết thúc, Renter có 24 giờ để báo cáo sự cố hoặc khiếu nại chất lượng dịch vụ (RMA) thông qua giao diện chi tiết đơn hàng.

### 2. Trạng thái đóng băng Escrow tự động (FROZEN)
Ngay khi khiếu nại được tạo, toàn bộ số tiền đang ký quỹ cho đơn hàng đó sẽ lập tức chuyển sang trạng thái FROZEN. Cả Renter và Companion đều không thể rút hoặc chuyển dịch khoản tiền này trong suốt thời gian tranh chấp.

### 3. Quy trình thẩm định của CS Agent và Chế tài xử phạt vi phạm
- CS Agent kiểm tra lịch sử chat, tin nhắn phòng chơi và các ảnh chụp màn hình bằng chứng do hai bên cung cấp.
- Nếu xác định lỗi thuộc về Companion từ 80% trở lên:
  - Renter được hoàn lại 100% tiền ký quỹ.
  - Companion bị phạt 20% giá trị đơn hàng trừ từ ví khả dụng (ghi Có doanh thu xử phạt cho sàn).
  - Nếu số dư khả dụng của Companion không đủ, hệ thống khấu trừ tối đa số hiện có và ghi nhận nợ vi phạm tự động cấn trừ vào các đơn tiếp theo.`,
        category: 'Hỗ trợ',
        image_url: '/images/news/news-dispute.webp',
        author: 'Ban Quản Trị INSTASQUAD',
        published_at: new Date('2026-11-07T10:00:00Z'),
      },
    ],
  });
  console.log('📰 Seeded 4 official news articles.');

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
