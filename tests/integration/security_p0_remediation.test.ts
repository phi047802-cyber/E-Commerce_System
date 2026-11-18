import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { bookingService } from '../../server/src/modules/booking/booking.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { BusinessError, UnauthorizedError, ForbiddenError } from '../../server/src/common/errors.js';

describe('Security Remediation P0-1 & P0-2 Verification (Stage 1A)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let csToken: string;
  let auditorToken: string;
  let adminToken: string;

  const TEST_PREFIX = 'sec-p0-';

  const cleanupTestData = async () => {
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

    await prisma.wallet.updateMany({ data: { penalty_debt: 0 } });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-01' },
      data: { available_balance: 500000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-02' },
      data: { available_balance: 0, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-01' },
      data: { available_balance: 0, escrow_balance: 0 },
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

    const resAuditor = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@instasquad.test', password: 'Demo@123456' });
    auditorToken = resAuditor.body.data.token;

    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = resAdmin.body.data.token;

    // Nạp tiền mô phỏng 3.000.000 VND cho Renter 1
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

  let seq = 1;
  const createBookingInState = async (
    keySuffix: string,
    state: 'WAITING_RESPONSE' | 'SESSION_ENDED',
    customConfirmDeadline?: Date
  ) => {
    seq++;
    const slotId = `${TEST_PREFIX}slot-${keySuffix}`;
    const requestKey = `${TEST_PREFIX}req-${keySuffix}`;
    const startTime = new Date(Date.now() + seq * 86400 * 1000);
    const endTime = new Date(startTime.getTime() + 3600 * 1000);

    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: 'prof-comp-01',
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 1,
      });

    const bookingId = resBooking.body.data.booking_id;

    // Ký quỹ
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    if (state === 'WAITING_RESPONSE') {
      return { bookingId, slotId };
    }

    // Companion chấp nhận đơn
    const resAccept = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);

    const session = resAccept.body.data.session;

    // Bắt đầu session
    await request(app)
      .post(`/api/sessions/${session.session_id}/start`)
      .set('Authorization', `Bearer ${companion1Token}`);

    // Kết thúc session -> kích hoạt confirm_deadline (15 phút nghiệm thu)
    await request(app)
      .post(`/api/sessions/${session.session_id}/end`)
      .set('Authorization', `Bearer ${renter1Token}`);

    if (customConfirmDeadline) {
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { confirm_deadline: customConfirmDeadline },
      });
    }

    return { bookingId, slotId, session };
  };

  // =========================================================================
  // 1. P0-1: Loại bỏ simulated_now khỏi client control, ngăn ngừa bypass
  // =========================================================================
  describe('P0-1: Elimination of Client-Controlled simulated_now & Fake Clock Protection', () => {
    it('TC-SEC-01: Client cannot trigger early auto-accept by sending simulated_now in the future', async () => {
      const { bookingId } = await createBookingInState('sec01', 'SESSION_ENDED');

      // Client cố tình gửi simulated_now +24h trong request body để ép giải ngân sớm
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ simulated_now: new Date(Date.now() + 86400000).toISOString() });

      // Controller PHẢI bỏ qua simulated_now từ body và dùng clock thực của server -> Vẫn chưa hết 15 phút -> 422
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ACCEPTANCE_DEADLINE_NOT_REACHED');

      // Xác minh booking vẫn ở trạng thái chờ xác nhận, Escrow vẫn HELD
      const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      expect(booking?.status).not.toBe('COMPLETED');
      expect(booking?.escrow?.status).toBe('HELD');
    });

    it('TC-SEC-02: Client sending invalid date format does not cause NaN bypass', async () => {
      const { bookingId } = await createBookingInState('sec02', 'SESSION_ENDED');

      // Client cố tình gửi invalid string để tạo NaN
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ simulated_now: 'not-a-valid-date' });

      // Không thể bypass được; thời gian server thực được dùng và trả 422 do deadline chưa tới
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ACCEPTANCE_DEADLINE_NOT_REACHED');
    });

    it('TC-SEC-03: bookingService.autoAccept rejects Invalid Date if passed internally', async () => {
      const { bookingId } = await createBookingInState('sec03', 'SESSION_ENDED');

      // Gọi trực tiếp service với Invalid Date
      await expect(
        bookingService.autoAccept(bookingId, 'u-renter-01', 'RENTER', new Date('invalid_clock'))
      ).rejects.toThrow(BusinessError);

      try {
        await bookingService.autoAccept(bookingId, 'u-renter-01', 'RENTER', new Date('invalid_clock'));
      } catch (err: any) {
        expect(err.errorCode).toBe('INVALID_DATETIME');
      }
    });
  });

  // =========================================================================
  // 2. P0-2: Kiểm tra phân quyền (Authorization) cho Timeout & Auto-Accept
  // =========================================================================
  describe('P0-2: Strict Endpoint Authorization for Timeout & Auto-Accept', () => {
    it('TC-SEC-04: POST /api/bookings/:id/timeout requires authentication (401)', async () => {
      const { bookingId } = await createBookingInState('sec04', 'WAITING_RESPONSE');

      const res = await request(app).post(`/api/bookings/${bookingId}/timeout`);
      expect(res.status).toBe(401);
    });

    it('TC-SEC-05: POST /api/bookings/:id/timeout blocks unrelated 3rd party with 403 Forbidden', async () => {
      const { bookingId } = await createBookingInState('sec05', 'WAITING_RESPONSE');

      // Renter 2 (người lạ không liên quan đến đơn) cố tình gọi timeout
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/timeout`)
        .set('Authorization', `Bearer ${renter2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('TC-SEC-06: POST /api/bookings/:id/timeout allows booking Renter to trigger timeout when expired', async () => {
      const { bookingId } = await createBookingInState('sec06', 'WAITING_RESPONSE');

      // Đặt response_deadline vào quá khứ
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { response_deadline: new Date(Date.now() - 5000) },
      });

      // Renter 1 (người tạo đơn) gọi timeout
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/timeout`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('CANCELLED');
      expect(res.body.data.booking.escrow.status).toBe('REFUNDED');
    });

    it('TC-SEC-07: POST /api/bookings/:id/timeout blocks CS_AGENT (403 Forbidden) as no business basis exists', async () => {
      const { bookingId } = await createBookingInState('sec07', 'WAITING_RESPONSE');

      // Đặt response_deadline vào quá khứ
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { response_deadline: new Date(Date.now() - 5000) },
      });

      // CS Staff gọi timeout -> Phải bị chặn 403 do không có căn cứ trong docs/REQUIREMENTS.md
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/timeout`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('TC-SEC-07C: POST /api/bookings/:id/timeout allows Companion in booking to trigger timeout when expired', async () => {
      const { bookingId } = await createBookingInState('sec07c', 'WAITING_RESPONSE');

      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { response_deadline: new Date(Date.now() - 5000) },
      });

      // Companion trong đơn gọi timeout
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/timeout`)
        .set('Authorization', `Bearer ${companion1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('CANCELLED');
    });

    it('TC-SEC-07B: POST /api/bookings/:id/timeout blocks AUDITOR (403 Forbidden) and mutates zero state', async () => {
      const { bookingId } = await createBookingInState('sec07b', 'WAITING_RESPONSE');

      // Đặt response_deadline vào quá khứ
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { response_deadline: new Date(Date.now() - 5000) },
      });

      const compProfileBefore = await prisma.companionProfile.findUnique({
        where: { profile_id: 'prof-comp-01' },
      });
      const scoreBefore = compProfileBefore?.trust_score;
      const ledgerCountBefore = await prisma.ledgerTransaction.count();

      // Auditor gọi timeout -> Phải bị từ chối 403 Forbidden (nguyên tắc SoD)
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/timeout`)
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Xác minh tuyệt đối không có dữ liệu tài chính/trạng thái nào bị biến động
      const bookingAfter = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      expect(bookingAfter?.status).toBe('WAITING_COMPANION_RESPONSE');
      expect(bookingAfter?.escrow?.status).toBe('HELD');

      const compProfileAfter = await prisma.companionProfile.findUnique({
        where: { profile_id: 'prof-comp-01' },
      });
      expect(compProfileAfter?.trust_score).toBe(scoreBefore);

      const ledgerCountAfter = await prisma.ledgerTransaction.count();
      expect(ledgerCountAfter).toBe(ledgerCountBefore);
    });

    it('TC-SEC-08: POST /api/bookings/:id/auto-accept requires authentication (401)', async () => {
      const { bookingId } = await createBookingInState('sec08', 'SESSION_ENDED');

      const res = await request(app).post(`/api/bookings/${bookingId}/auto-accept`);
      expect(res.status).toBe(401);
    });

    it('TC-SEC-09: POST /api/bookings/:id/auto-accept blocks unrelated 3rd party with 403 Forbidden', async () => {
      const { bookingId } = await createBookingInState('sec09', 'SESSION_ENDED');

      // Renter 2 (người lạ) cố tình gọi auto-accept
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('TC-SEC-10: POST /api/bookings/:id/auto-accept allows Companion in booking when deadline expired', async () => {
      // Giả lập confirm_deadline đã qua 15 phút
      const pastConfirmDeadline = new Date(Date.now() - 60 * 1000);
      const { bookingId } = await createBookingInState('sec10', 'SESSION_ENDED', pastConfirmDeadline);

      // Companion trong đơn gọi auto-accept
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${companion1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('COMPLETED');
      expect(res.body.data.settlement.companion_received).toBe(88000);
      expect(res.body.data.settlement.platform_fee).toBe(12000);
    });

    it('TC-SEC-11: POST /api/bookings/:id/auto-accept blocks CS_AGENT (403 Forbidden) and prevents unauthorized settlement', async () => {
      const pastConfirmDeadline = new Date(Date.now() - 60 * 1000);
      const { bookingId } = await createBookingInState('sec11', 'SESSION_ENDED', pastConfirmDeadline);

      const walletCompBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const ledgerCountBefore = await prisma.ledgerTransaction.count();

      // CS Agent cố tình gọi auto-accept -> Phải bị chặn 403 Forbidden
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Trạng thái đơn, Escrow và Ví tiền của Companion phải nguyên vẹn
      const bookingAfter = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      expect(bookingAfter?.status).not.toBe('COMPLETED');
      expect(bookingAfter?.escrow?.status).toBe('HELD');

      const walletCompAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      expect(walletCompAfter?.available_balance).toBe(walletCompBefore?.available_balance);

      const ledgerCountAfter = await prisma.ledgerTransaction.count();
      expect(ledgerCountAfter).toBe(ledgerCountBefore);
    });

    it('TC-SEC-11B: POST /api/bookings/:id/auto-accept blocks AUDITOR (403 Forbidden) and mutates zero state', async () => {
      const pastConfirmDeadline = new Date(Date.now() - 60 * 1000);
      const { bookingId } = await createBookingInState('sec11b', 'SESSION_ENDED', pastConfirmDeadline);

      const ledgerCountBefore = await prisma.ledgerTransaction.count();

      // Auditor cố tình gọi auto-accept -> Phải bị chặn 403 Forbidden
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      const bookingAfter = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      expect(bookingAfter?.status).not.toBe('COMPLETED');
      expect(bookingAfter?.escrow?.status).toBe('HELD');

      const ledgerCountAfter = await prisma.ledgerTransaction.count();
      expect(ledgerCountAfter).toBe(ledgerCountBefore);
    });
  });

  // =========================================================================
  // 3. Idempotency & Invariants tài chính
  // =========================================================================
  describe('Financial Invariants & Idempotency under Remediation', () => {
    it('TC-SEC-12: Repeated / Concurrent auto-accept is strictly idempotent and preserves zero ledger variance', async () => {
      const pastConfirmDeadline = new Date(Date.now() - 60 * 1000);
      const { bookingId } = await createBookingInState('sec12', 'SESSION_ENDED', pastConfirmDeadline);

      // Bắn 2 request đồng thời
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/bookings/${bookingId}/auto-accept`)
          .set('Authorization', `Bearer ${renter1Token}`),
        request(app)
          .post(`/api/bookings/${bookingId}/auto-accept`)
          .set('Authorization', `Bearer ${companion1Token}`),
      ]);

      // Cả 2 đều thành công (1 call thực thi, 1 call idempotent replay)
      expect([200, 409]).toContain(res1.status);
      expect([200, 409]).toContain(res2.status);

      const successResponses = [res1, res2].filter((r) => r.status === 200);
      expect(successResponses.length).toBeGreaterThanOrEqual(1);

      // Đối soát kế toán toàn sàn: Phương sai phải luôn bằng 0 và cân bằng tuyệt đối
      const recon = await reconciliationService.runReconciliation();
      expect(recon.is_balanced).toBe(true);
      expect(recon.total_wallets_checked).toBeGreaterThan(0);
      expect(recon.wallet_mismatches.length).toBe(0);
    });

    it('TC-SEC-13: Fail-closed validation: handleTimeout and autoAccept reject when actorId is missing', async () => {
      const { bookingId } = await createBookingInState('sec13', 'WAITING_RESPONSE');

      // 1. handleTimeout thiếu actorId -> Ném UnauthorizedError
      await expect(
        bookingService.handleTimeout(bookingId, undefined)
      ).rejects.toThrow(UnauthorizedError);

      // 2. autoAccept thiếu actorId -> Ném UnauthorizedError
      await expect(
        bookingService.autoAccept(bookingId, undefined)
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
