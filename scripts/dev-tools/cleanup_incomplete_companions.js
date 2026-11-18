/**
 * INSTASQUAD Dev Tools - One-Time Cleanup for Auto-Healed Companion Profiles (Section B.5)
 * 
 * Chuyển các hồ sơ Companion do auto-heal cũ (mã in-game dạng ID_ + 8 ký tự, chưa eKYC, chưa có đơn nào)
 * về trạng thái INCOMPLETE và xóa toàn bộ giá trị bịa (game, rank, đơn giá, mã in-game).
 * Giữ nguyên các tài khoản seed chính thức ở trạng thái ACTIVE.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupIncompleteCompanions() {
  console.log('🔍 Bắt đầu quét các hồ sơ Companion do auto-heal cũ...');

  const companions = await prisma.companionProfile.findMany({
    where: {
      game_account_id: { startsWith: 'ID_' },
      verification_status: { not: 'VERIFIED' },
      bookings: { none: {} },
    },
    include: {
      user: {
        select: { user_id: true, email: true, display_name: true },
      },
    },
  });

  console.log(`📋 Phát hiện ${companions.length} hồ sơ auto-heal có mã in-game bịa.`);

  let updatedCount = 0;
  for (const comp of companions) {
    // Kiểm tra định dạng ID_ + 8 ký tự
    if (/^ID_[a-zA-Z0-9]{8}$/.test(comp.game_account_id || '')) {
      await prisma.companionProfile.update({
        where: { profile_id: comp.profile_id },
        data: {
          profile_status: 'INCOMPLETE',
          game_id: null,
          verified_tier_id: null,
          hourly_rate: null,
          game_account_id: null,
          availability: 'OFFLINE',
        },
      });
      console.log(`  - Đã chuyển hồ sơ ${comp.profile_id} (User: ${comp.user.display_name} - ${comp.user.email}) về INCOMPLETE.`);
      updatedCount++;
    }
  }

  console.log(`✅ Hoàn thành: Đã dọn dẹp ${updatedCount} hồ sơ về trạng thái INCOMPLETE.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  cleanupIncompleteCompanions().catch((err) => {
    console.error('❌ Lỗi dọn dẹp hồ sơ Companion:', err);
    process.exit(1);
  });
}

module.exports = { cleanupIncompleteCompanions };
