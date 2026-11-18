import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { ledgerService } from '../../server/src/modules/ledger/ledger.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { BusinessError } from '../../server/src/common/errors.js';

describe('Session, Game Room, Chat Censorship & 15-Minute Acceptance (M6 - PROMPT 09, BR-14, BR-20, BR-26, TC32-TC46)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let csToken: string;

  const TEST_PREFIX = 'test-sf-';

  const cleanupTestData = async () => {
    // 1. Xóa chat messages, disputes, alerts, sessions, escrows, histories, bookings, slots
    await prisma.chatMessage.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.ledgerAuditAlert.deleteMany();
    await prisma.platformRevenue.deleteMany();
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.trustScoreLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });
    await prisma.payment.deleteMany();

    // 2. Xóa các ledger transactions ngoại trừ giao dịch khởi tạo ban đầu
    await prisma.ledgerEntry.deleteMany({
      where: {
        transaction: {
          idempotency_key: {
            not: 'INIT-SEED-RENTER-01',
          },
        },
      },
    });
    await prisma.ledgerTransaction.deleteMany({
      where: {
        idempotency_key: {
          not: 'INIT-SEED-RENTER-01',
        },
      },
    });

    // 3. Khôi phục số dư chuẩn xác
    await prisma.wallet.updateMany({
      data: { available_balance: 0, escrow_balance: 0, penalty_debt: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-01' },
      data: { available_balance: 500000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID },
      data: { available_balance: -500000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      data: { available_balance: 0, escrow_balance: 0 },
    });
  };

  beforeAll(async () => {
    await cleanupTestData();

    // Đăng nhập các vai trò
    const resRenter1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renter1Token = resRenter1.body.data.token;

    const resRenter2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter2@instasquad.test', password: 'Demo@123456' });
    renter2Token = resRenter2.body.data.token;

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companion1Token = resComp.body.data.token;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    // Nạp tiền mô phỏng 3.000.000 VND cho Renter 1 để đảm bảo số dư dồi dào
    const topupRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 3000000, provider: 'MOCK_VNPAY' });

    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupRes.body.data.payment_id, outcome: 'SUCCESS' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Helper tạo booking đã được Companion chấp nhận và có Session
  let sequenceIndex = 1;
  const createAcceptedBookingWithSession = async (keySuffix: string) => {
    sequenceIndex++;
    const slotId = `${TEST_PREFIX}slot-${keySuffix}`;
    const requestKey = `${TEST_PREFIX}req-${keySuffix}`;
    // Mỗi slot cách nhau 1 ngày để không bị chạm ngưỡng 10 giờ/ngày của Companion
    const startTime = new Date(Date.now() + sequenceIndex * 86400 * 1000);
    const endTime = new Date(startTime.getTime() + 3600 * 1000);

    // 1. Tạo slot
    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: 'prof-comp-01',
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    // 2. Tạo booking
    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 1,
      });

    const bookingId = resBooking.body.data.booking_id;

    // 3. Ký quỹ Escrow
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    // 4. Companion chấp nhận -> Tạo Session
    const resAccept = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);

    return {
      bookingId,
      session: resAccept.body.data.session,
    };
  };

  describe('1. Session Lifecycle & Start (TC32, TC33)', () => {
    it('TC32: Session is created in SCHEDULED state upon Companion acceptance and can be started to ACTIVE', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc32');

      expect(session).toBeDefined();
      expect(session.status).toBe('SCHEDULED');
      expect(session.booking_id).toBe(bookingId);
      expect(session.room_token).toBeDefined();

      // Bắt đầu phiên chơi (start session)
      const resStart = await request(app)
        .post(`/api/sessions/${session.session_id}/start`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resStart.status).toBe(200);
      expect(resStart.body.data.session.status).toBe('ACTIVE');

      // Kiểm tra Booking đã chuyển sang IN_SESSION
      const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
      });
      expect(booking?.status).toBe('IN_SESSION');

      // Gọi lại start (idempotent replay)
      const resStartAgain = await request(app)
        .post(`/api/sessions/${session.session_id}/start`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resStartAgain.status).toBe(200);
      expect(resStartAgain.body.meta.is_idempotent_replay).toBe(true);
    });

    it('TC33: Database strictly prevents duplicate Sessions for the same booking (One-to-One)', async () => {
      const { bookingId } = await createAcceptedBookingWithSession('tc33');

      // Cố tình tạo thêm Session thứ 2 cho cùng 1 booking_id
      await expect(
        prisma.session.create({
          data: {
            booking_id: bookingId,
            status: 'SCHEDULED',
            start_time: new Date(),
            end_time: new Date(Date.now() + 3600000),
            room_token: 'duplicate-token-test',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Room Chat, Censorship & RBAC Authorization (TC34, TC35, TC36)', () => {
    it('TC34: Participants can send text messages and poll recent messages via afterId', async () => {
      const { session } = await createAcceptedBookingWithSession('tc34');

      // Bắt đầu phiên
      await request(app)
        .post(`/api/sessions/${session.session_id}/start`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // 1. Renter gửi tin nhắn
      const msgRes1 = await request(app)
        .post(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ content: 'Chào bạn, mình đã vào Discord rồi nhé.' });

      expect(msgRes1.status).toBe(201);
      expect(msgRes1.body.data.content).toBe('Chào bạn, mình đã vào Discord rồi nhé.');
      expect(msgRes1.body.data.is_censored).toBe(false);

      // 2. Companion gửi tin nhắn phản hồi
      const msgRes2 = await request(app)
        .post(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${companion1Token}`)
        .send({ content: 'Oke bạn, mình mời bạn vào party ingame ngay.' });

      expect(msgRes2.status).toBe(201);

      // 3. Polling tất cả tin nhắn
      const listRes = await request(app)
        .get(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);

      // 4. Polling với afterId
      const afterId = msgRes1.body.data.message_id;
      const filteredRes = await request(app)
        .get(`/api/sessions/${session.session_id}/messages?afterId=${afterId}`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data.length).toBe(1);
      expect(filteredRes.body.data[0].content).toContain('Oke bạn');
    });

    it('TC35: Chat privacy: Non-participants are rejected (403), CS Agent is authorized', async () => {
      const { session } = await createAcceptedBookingWithSession('tc35');

      // Renter 2 (người ngoài) cố tình xem tin nhắn phòng -> 403 Forbidden
      const resOutsiderGet = await request(app)
        .get(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${renter2Token}`);

      expect(resOutsiderGet.status).toBe(403);

      // Renter 2 cố tình gửi tin nhắn vào phòng -> 403 Forbidden
      const resOutsiderSend = await request(app)
        .post(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${renter2Token}`)
        .send({ content: 'Tin nhắn kẻ lạ mặt' });

      expect(resOutsiderSend.status).toBe(403);

      // CS Agent có quyền xem phòng phục vụ giải quyết khiếu nại -> 200 OK
      const resCSGet = await request(app)
        .get(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(resCSGet.status).toBe(200);
    });

    it('TC36: Sensitive word filter & contact info censorship masks content and protects audit log', async () => {
      const { session } = await createAcceptedBookingWithSession('tc36');

      // Renter gửi số điện thoại và mời giao dịch ngoài sàn (vi phạm chính sách)
      const resCensored = await request(app)
        .post(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ content: 'SĐT của mình là 0912345678, add zalo giao dịch ngoài nhé' });

      expect(resCensored.status).toBe(201);
      expect(resCensored.body.data.is_censored).toBe(true);
      expect(resCensored.body.data.content).toContain('***[NỘI DUNG ĐÃ BỊ KIỂM DUYỆT]***');
      // Người dùng không được xem original_content
      expect(resCensored.body.data.original_content).toBeUndefined();

      // CS Agent kiểm tra phòng chat: CS Agent thấy original_content phục vụ kiểm toán
      const csAuditRes = await request(app)
        .get(`/api/sessions/${session.session_id}/messages`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(csAuditRes.status).toBe(200);
      const flaggedMsg = csAuditRes.body.data.find((m: any) => m.is_censored);
      expect(flaggedMsg).toBeDefined();
      expect(flaggedMsg.original_content).toBe('SĐT của mình là 0912345678, add zalo giao dịch ngoài nhé');
    });
  });

  describe('3. Session End & 15-Minute Acceptance Window (TC37, TC38, TC39)', () => {
    it('TC37: Ending session marks status ENDED and sets 15-minute confirm_deadline', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc37');

      await request(app)
        .post(`/api/sessions/${session.session_id}/start`)
        .set('Authorization', `Bearer ${renter1Token}`);

      const resEnd = await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resEnd.status).toBe(200);
      expect(resEnd.body.data.session.status).toBe('ENDED');
      expect(resEnd.body.data.confirm_deadline).toBeDefined();

      const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
      });
      expect(booking?.confirm_deadline).toBeDefined();
      const diffMinutes =
        (new Date(booking!.confirm_deadline!).getTime() - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThanOrEqual(15.1);
    });

    it('TC38: Renter manually accepts fulfillment: Settles 88/12, credits Companion & Platform, releases Escrow', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc38');

      // Kết thúc phiên chơi
      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletBefore = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });
      const renterWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

      // Renter xác nhận nghiệm thu hoàn tất
      const resAccept = await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resAccept.status).toBe(200);
      expect(resAccept.body.data.booking.status).toBe('COMPLETED');
      expect(resAccept.body.data.settlement.companion_received).toBe(88000); // 88%
      expect(resAccept.body.data.settlement.platform_fee).toBe(12000); // 12%

      // Kiểm tra biến động số dư qua Sổ cái kép
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletAfter = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });
      const renterWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

      expect(compWalletAfter!.available_balance - compWalletBefore!.available_balance).toBe(88000);
      expect(platWalletAfter!.available_balance - platWalletBefore!.available_balance).toBe(12000);
      expect(renterWalletBefore!.escrow_balance - renterWalletAfter!.escrow_balance).toBe(100000);

      // Escrow chuyển sang RELEASED
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('RELEASED');
      expect(escrow?.released_at).toBeDefined();

      // Session được đóng hoàn toàn
      const updatedSession = await prisma.session.findUnique({ where: { booking_id: bookingId } });
      expect(updatedSession?.status).toBe('CLOSED');
    });

    it('TC39: Idempotent re-acceptance returns 200 without duplicate ledger entries', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc39');

      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Lần 1: Nghiệm thu thành công
      await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      const entryCountBefore = await prisma.ledgerEntry.count();

      // Lần 2: Gọi lại
      const resAgain = await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resAgain.status).toBe(200);
      expect(resAgain.body.meta.is_idempotent_replay).toBe(true);

      const entryCountAfter = await prisma.ledgerEntry.count();
      expect(entryCountAfter).toBe(entryCountBefore); // Không sinh thêm bút toán trùng
    });
  });

  describe('4. Automated Acceptance after 15 Minutes Timeout (TC40, TC41)', () => {
    it('TC40: Auto-accept triggers 88/12 settlement when 15-minute deadline has elapsed', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc40');

      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Giả lập thời gian đã trôi qua 16 phút (quá confirm_deadline)
      const pastDeadline = new Date(Date.now() - 60 * 1000);
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { confirm_deadline: pastDeadline },
      });

      const resAuto = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({});

      expect(resAuto.status).toBe(200);
      expect(resAuto.body.data.booking.status).toBe('COMPLETED');
      expect(resAuto.body.data.settlement.companion_received).toBe(88000);
      expect(resAuto.body.data.settlement.platform_fee).toBe(12000);

      // Kiểm tra Status History ghi nhận chính sách demo auto-accept
      const history = await prisma.bookingStatusHistory.findFirst({
        where: { booking_id: bookingId, to_status: 'COMPLETED' },
      });
      expect(history?.reason).toContain('Tự động nghiệm thu sau 15 phút');
    });

    it('TC41: Auto-accept is rejected if 15-minute deadline has not elapsed', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc41');

      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Hạn chót vẫn còn trong tương lai
      const resAuto = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({});

      expect(resAuto.status).toBe(422);
      expect(resAuto.body.error.code).toBe('ACCEPTANCE_DEADLINE_NOT_REACHED');
    });
  });

  describe('5. Dispute Flow & Mutual Exclusion with Settlement (TC42, TC43, TC44)', () => {
    it('TC42: Report Issue creates DisputeCase, freezes Escrow (FROZEN), updates booking to DISPUTED', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc42');

      await request(app)
        .post(`/api/sessions/${session.session_id}/start`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Renter báo sự cố
      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'NO_SHOW',
          description: 'Companion không vào game và không phản hồi tin nhắn trong phòng.',
        });

      expect(resDispute.status).toBe(201);
      expect(resDispute.body.data.dispute.status).toBe('OPENED');
      expect(resDispute.body.data.booking.status).toBe('DISPUTED');
      expect(resDispute.body.data.escrow.status).toBe('FROZEN');

      // Kiểm tra trong database
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('FROZEN');
      expect(escrow?.frozen_at).toBeDefined();

      // Idempotent reporting với cùng payload
      const resDisputeAgain = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'NO_SHOW',
          description: 'Companion không vào game và không phản hồi tin nhắn trong phòng.',
        });

      expect(resDisputeAgain.status).toBe(200);
      expect(resDisputeAgain.body.meta.is_idempotent_replay).toBe(true);
    });

    it('TC43: Settlement is strictly BLOCKED when Escrow is FROZEN or Booking is DISPUTED', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc43');

      // Mở khiếu nại đóng băng Escrow
      await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'HARASSMENT',
          description: 'Companion có hành vi độc hại, xúc phạm trong trận đấu.',
        });

      // 1. Cố tình gọi nghiệm thu thủ công -> Bị chặn
      const resManualSettle = await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resManualSettle.status).toBe(422);
      expect(resManualSettle.body.error.code).toBe('ESCROW_FROZEN');

      // 2. Cố tình gọi tự động nghiệm thu -> Bị chặn
      const resAutoSettle = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ simulated_now: new Date(Date.now() + 86400000).toISOString() });

      expect(resAutoSettle.status).toBe(422);
      expect(resAutoSettle.body.error.code).toBe('ESCROW_FROZEN');
    });

    it('TC44: Race condition: Concurrent accept-fulfillment vs report-issue results in exactly one winner', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc44');

      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Bắn đồng thời 2 thao tác đối lập
      const [resAccept, resReport] = await Promise.all([
        request(app)
          .post(`/api/bookings/${bookingId}/accept-fulfillment`)
          .set('Authorization', `Bearer ${renter1Token}`),
        request(app)
          .post(`/api/bookings/${bookingId}/report-issue`)
          .set('Authorization', `Bearer ${renter1Token}`)
          .send({
            reason_category: 'TECHNICAL_ISSUE',
            description: 'Mất kết nối game nghiêm trọng không chơi được.',
          }),
      ]);

      const statuses = [resAccept.status, resReport.status];
      // Một bên thành công (200 hoặc 201), một bên bị chặn do xung đột trạng thái (409 hoặc 400)
      const successCount = statuses.filter((s) => s === 200 || s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409 || s === 400).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);

      // Đảm bảo trạng thái cuối cùng nhất quán
      const finalBooking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });

      if (finalBooking?.status === 'COMPLETED') {
        expect(finalBooking.escrow?.status).toBe('RELEASED');
      } else if (finalBooking?.status === 'DISPUTED') {
        expect(finalBooking.escrow?.status).toBe('FROZEN');
      }
    });
  });

  describe('6. Financial Integrity, Circuit Breaker & Sổ cái kép (TC45, TC46)', () => {
    it('TC45: Double-entry ledger reconciliation audit passes with 100% Debit = Credit parity', async () => {
      const report = await reconciliationService.runReconciliation();

      expect(report.is_balanced).toBe(true);
      expect(report.wallet_mismatches.length).toBe(0);
      expect(report.system_conservation.is_equation_satisfied).toBe(true);
      expect(report.escrow_audit.is_escrow_aligned).toBe(true);
    });

    it('TC46: Simulated ledger error triggers circuit breaker (LedgerAuditAlert) and rolls back cleanly', async () => {
      const { bookingId, session } = await createAcceptedBookingWithSession('tc46');

      await request(app)
        .post(`/api/sessions/${session.session_id}/end`)
        .set('Authorization', `Bearer ${renter1Token}`);

      // Mock ledgerService.postTransaction để giả lập lỗi cơ sở dữ liệu / phân vùng mạng
      const spyPost = vi
        .spyOn(ledgerService, 'postTransaction')
        .mockRejectedValueOnce(new BusinessError('MOCK_LEDGER_CRASH', 'Giả lập sập database sổ cái'));

      const resFail = await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resFail.status).toBe(422);

      // Kiểm tra Circuit Breaker đã ghi LedgerAuditAlert
      const alert = await prisma.ledgerAuditAlert.findFirst({
        where: { error_code: 'MOCK_LEDGER_CRASH' },
      });
      expect(alert).toBeDefined();
      expect(alert?.error_message).toContain('Giả lập sập database sổ cái');

      // Đảm bảo trạng thái Booking không bị thay đổi dở dang (Rollback bảo vệ trạng thái)
      const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
      });
      expect(booking?.status).not.toBe('COMPLETED');

      spyPost.mockRestore();
    });
  });
});
