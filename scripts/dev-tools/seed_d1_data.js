const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding D1 Dispute scenario data with exact schema...');

  // Clean up any old demo records
  await prisma.disputeEvidence.deleteMany({
    where: { dispute_id: { in: ['dsp-demo-01', 'dsp-demo-02'] } }
  });
  await prisma.disputeCase.deleteMany({
    where: { dispute_id: { in: ['dsp-demo-01', 'dsp-demo-02'] } }
  });
  await prisma.chatMessage.deleteMany({
    where: { session_id: 'sess-demo-01' }
  });
  await prisma.session.deleteMany({
    where: { session_id: 'sess-demo-01' }
  });
  await prisma.escrow.deleteMany({
    where: { escrow_id: { in: ['esc-demo-01', 'esc-demo-02'] } }
  });
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking_id: { in: ['bk-dispute-demo-01', 'bk-active-demo-02'] } }
  });
  await prisma.booking.deleteMany({
    where: { booking_id: { in: ['bk-dispute-demo-01', 'bk-active-demo-02'] } }
  });
  await prisma.slotCalendar.deleteMany({
    where: { slot_id: { in: ['slot-demo-01', 'slot-demo-02'] } }
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fortyFiveMinAgo = new Date(now.getTime() - 45 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in55Min = new Date(now.getTime() + 55 * 60 * 1000);

  // 1. Create Slots
  await prisma.slotCalendar.create({
    data: {
      slot_id: 'slot-demo-01',
      profile_id: 'prof-comp-01',
      start_time: oneHourAgo,
      end_time: now,
      status: 'BOOKED',
    }
  });

  await prisma.slotCalendar.create({
    data: {
      slot_id: 'slot-demo-02',
      profile_id: 'prof-comp-01',
      start_time: fiveMinAgo,
      end_time: in55Min,
      status: 'BOOKED',
    }
  });

  // 2. Create Disputed Booking
  const booking1 = await prisma.booking.create({
    data: {
      booking_id: 'bk-dispute-demo-01',
      renter_id: 'u-renter-01',
      profile_id: 'prof-comp-01',
      slot_id: 'slot-demo-01',
      request_key: 'req-demo-01',
      start_time: oneHourAgo,
      duration_hours: 1,
      total_fee_snapshot: 100000,
      status: 'DISPUTED',
      response_deadline: oneHourAgo,
      confirm_deadline: fortyFiveMinAgo,
      created_at: oneHourAgo,
      escrow: {
        create: {
          escrow_id: 'esc-demo-01',
          amount: 100000,
          status: 'FROZEN',
          held_at: oneHourAgo,
        }
      },
      session: {
        create: {
          session_id: 'sess-demo-01',
          status: 'CLOSED',
          start_time: oneHourAgo,
          end_time: fortyFiveMinAgo,
          room_token: 'room-token-demo-01',
          messages: {
            create: [
              {
                sender_id: 'u-renter-01',
                content: 'Chào bạn, mình đã vào room Discord rồi nha!',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 60000),
              },
              {
                sender_id: 'u-comp-01',
                content: 'Ok bạn ơi, add số Zalo mình 0912***678 để vào phòng game nhé!',
                original_content: 'Ok bạn ơi, add số Zalo mình 0912345678 để vào phòng game nhé!',
                is_censored: true,
                created_at: new Date(oneHourAgo.getTime() + 120000),
              },
              {
                sender_id: 'u-renter-01',
                content: 'Ủa sao bạn out trận sớm vậy? Mới được 15 phút mà!',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 900000),
              },
              {
                sender_id: 'u-renter-01',
                content: 'Bạn không vào lại nên mình báo sự cố để CS hỗ trợ nha.',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 1200000),
              }
            ]
          }
        }
      }
    }
  });

  // 3. Create Dispute Case
  const dispute = await prisma.disputeCase.create({
    data: {
      dispute_id: 'dsp-demo-01',
      booking_id: 'bk-dispute-demo-01',
      renter_id: 'u-renter-01',
      reason_category: 'MISCONDUCT',
      description: 'Companion thoát trận sau 15 phút và yêu cầu liên hệ Zalo cá nhân ngoài sàn (vi phạm BR-20).',
      status: 'EVIDENCE_PENDING',
      created_at: thirtyMinAgo,
      evidence_requested_at: tenMinAgo,
      evidence_requested_by: 'u-cs-01',
      evidence_request_note: 'Yêu cầu Renter bổ sung hình ảnh chụp màn hình phòng game và chi tiết tin nhắn.',
      evidence_deadline: in24Hours,
      paused_sla_ms: 600000,
      companion_explanation: 'Tôi bị mất kết nối mạng đột ngột do đứt cáp quang, đã quay lại sau 5 phút nhưng khách đã offline.',
      companion_explained_at: fiveMinAgo,
      evidences: {
        create: [
          {
            evidence_id: 'ev-demo-01',
            uploader_id: 'u-renter-01',
            file_url: '/uploads/evidences/demo-match-result-evidence.png',
            file_type: 'IMAGE_PNG',
            description: 'Ảnh chụp màn hình phòng game và lịch sử thoát trận của Companion',
            created_at: new Date(now.getTime() - 20 * 60 * 1000),
          },
          {
            evidence_id: 'ev-demo-02',
            uploader_id: 'u-comp-01',
            file_url: '/uploads/evidences/demo-companion-proof.png',
            file_type: 'IMAGE_PNG',
            description: 'Ảnh chụp màn hình gián đoạn đường truyền cáp quang từ phía Companion',
            created_at: new Date(now.getTime() - 5 * 60 * 1000),
          }
        ]
      }
    }
  });

  // Tạo thông báo in-app cho CS Agent và Admin (Đợt D1b)
  await prisma.notification.deleteMany({
    where: { user_id: { in: ['u-cs-01', 'u-admin-01'] } }
  });
  await prisma.notification.createMany({
    data: [
      {
        user_id: 'u-cs-01',
        title: 'Chứng cứ khiếu nại mới được nộp',
        message: 'Bên tham gia (Renter) đã nộp chứng cứ mới cho khiếu nại #dsp-demo-01.',
        type: 'DISPUTE_EVIDENCE_SUBMITTED',
        is_read: false,
        created_at: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        user_id: 'u-cs-01',
        title: 'Companion đã gửi giải trình khiếu nại',
        message: 'Companion đã gửi phản hồi giải trình (D29) cho khiếu nại #dsp-demo-01.',
        type: 'DISPUTE_EXPLANATION_SUBMITTED',
        is_read: false,
        created_at: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        user_id: 'u-admin-01',
        title: 'Chứng cứ khiếu nại mới được nộp',
        message: 'Bên tham gia (Renter) đã nộp chứng cứ mới cho khiếu nại #dsp-demo-01.',
        type: 'DISPUTE_EVIDENCE_SUBMITTED',
        is_read: false,
        created_at: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        user_id: 'u-admin-01',
        title: 'Companion đã gửi giải trình khiếu nại',
        message: 'Companion đã gửi phản hồi giải trình (D29) cho khiếu nại #dsp-demo-01.',
        type: 'DISPUTE_EXPLANATION_SUBMITTED',
        is_read: false,
        created_at: new Date(now.getTime() - 5 * 60 * 1000),
      }
    ]
  });

  // 4. Create Active Booking for Companion (showing Renter name in Urgent Booking banner)
  const booking2 = await prisma.booking.create({
    data: {
      booking_id: 'bk-active-demo-02',
      renter_id: 'u-renter-02',
      profile_id: 'prof-comp-01',
      slot_id: 'slot-demo-02',
      request_key: 'req-demo-02',
      start_time: fiveMinAgo,
      duration_hours: 1,
      total_fee_snapshot: 100000,
      status: 'ACCEPTED',
      response_deadline: fiveMinAgo,
      created_at: fiveMinAgo,
      escrow: {
        create: {
          escrow_id: 'esc-demo-02',
          amount: 100000,
          status: 'HELD',
          held_at: fiveMinAgo,
        }
      }
    }
  });

  console.log('✅ Seed completed successfully:');
  console.log(' - Disputed Booking:', booking1.booking_id);
  console.log(' - Dispute Case:', dispute.dispute_id);
  console.log(' - Active Booking for Companion:', booking2.booking_id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
