import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { trustScoreService } from '../../server/src/modules/companion/trust-score.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';

describe('Review, TrustScore Engine & Simulated Withdrawal Lifecycle (M7 - PROMPT 11, TC62-TC80)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let companion2Token: string;
  let adminToken: string;
  let csToken: string;

  const TEST_PREFIX = 'test-m7-';
  let sequenceIndex = 200;

  const cleanupTestData = async () => {
    // 1. Xóa toàn bộ dữ liệu phụ thuộc
    await prisma.review.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.disputeDecision.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.chatMessage.deleteMany();
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

    // 2. Xóa các ledger transactions ngoại trừ giao dịch khởi tạo seed
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
      where: { wallet_id: 'w-comp-02' },
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

    // Khởi tạo lại trạng thái Companion 1 & 2
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: {
        trust_score: 80.0,
        verification_status: 'VERIFIED',
        availability: 'ONLINE',
      },
    });
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-02' },
      data: {
        trust_score: 80.0,
        verification_status: 'VERIFIED',
        availability: 'ONLINE',
      },
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

    const resComp2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion2@instasquad.test', password: 'Demo@123456' });
    companion2Token = resComp2.body.data.token;

    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = resAdmin.body.data.token;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    // Nạp thêm 3.000.000 VND cho Renter 1 để đảm bảo số dư đặt lịch
    const topupRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 3000000 });
    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupRes.body.data.payment_id, outcome: 'SUCCESS' });

    // Nạp thêm 1.000.000 VND cho Companion 1 để đảm bảo số dư cho các test rút tiền
    const topupComp = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({ amount: 1000000 });
    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupComp.body.data.payment_id, outcome: 'SUCCESS' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Helper tạo booking hoàn tất (COMPLETED) nhanh
  const createCompletedBooking = async (fee: number = 100000) => {
    sequenceIndex += 1;
    const slotId = `${TEST_PREFIX}slot-${sequenceIndex}`;
    const startTime = new Date(Date.now() + 86400000 * 2 + sequenceIndex * 3600000);
    const endTime = new Date(startTime.getTime() + 3600000);

    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: 'prof-comp-01',
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    const reqKey = `req-book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .set('Idempotency-Key', reqKey)
      .send({ slot_id: slotId, request_key: reqKey });
    const bookingId = bookRes.body.data.booking_id;

    // Ký quỹ
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    // Companion chấp nhận
    await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);

    // Renter nghiệm thu 88/12 -> chuyển sang COMPLETED
    await request(app)
      .post(`/api/bookings/${bookingId}/accept-fulfillment`)
      .set('Authorization', `Bearer ${renter1Token}`);

    return { bookingId, slotId };
  };

  describe('1. Review Management & Immutability (TC62 - TC67)', () => {
    it('TC62: Non-participant cannot review booking (HTTP 403 Forbidden)', async () => {
      const { bookingId } = await createCompletedBooking();

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter2Token}`) // Renter 2 không thuộc booking
        .send({
          booking_id: bookingId,
          rating: 5,
          comment: 'Chơi rất hay!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('không thuộc đơn đặt lịch này');
    });

    it('TC63: Cannot review booking that is not completed (HTTP 422 BOOKING_NOT_COMPLETED)', async () => {
      // Tạo booking mới nhưng chưa hoàn thành (mới ở PENDING_ACCEPTANCE)
      sequenceIndex += 1;
      const slotId = `${TEST_PREFIX}slot-pending-${sequenceIndex}`;
      await prisma.slotCalendar.create({
        data: {
          slot_id: slotId,
          profile_id: 'prof-comp-01',
          start_time: new Date(Date.now() + 86400000 * 3),
          end_time: new Date(Date.now() + 86400000 * 3 + 3600000),
          status: 'AVAILABLE',
        },
      });

      const reqKey = `req-book-pending-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renter1Token}`)
        .set('Idempotency-Key', reqKey)
        .send({ slot_id: slotId, request_key: reqKey });
      const pendingBookingId = bookRes.body.data.booking_id;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: pendingBookingId,
          rating: 4,
          comment: 'Đang chờ chơi',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('BOOKING_NOT_COMPLETED');
    });

    it('TC64: Review validation: Rating < 1 or > 5 is rejected (HTTP 400 VALIDATION_ERROR)', async () => {
      const { bookingId } = await createCompletedBooking();

      const res0 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: bookingId,
          rating: 0,
        });
      expect(res0.status).toBe(400);

      const res6 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: bookingId,
          rating: 6,
        });
      expect(res6.status).toBe(400);
    });

    it('TC65: Renter successfully submits review (5 stars) -> Review created & does NOT modify financial balances', async () => {
      const { bookingId } = await createCompletedBooking();

      const compBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: bookingId,
          rating: 5,
          comment: 'Companion kỹ năng xuất sắc, hỗ trợ nhiệt tình!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.comment).toBe('Companion kỹ năng xuất sắc, hỗ trợ nhiệt tình!');
      expect(res.body.data.review.reviewee_id).toBe('u-comp-01');

      // Bất biến tài chính: Số dư ví Companion và Escrow không hề bị thay đổi
      const compAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      expect(compAfter!.available_balance).toBe(compBefore!.available_balance);
      expect(compAfter!.escrow_balance).toBe(0);
    });

    it('TC66: Duplicate review on same booking by same user is rejected (HTTP 409 REVIEW_ALREADY_EXISTS)', async () => {
      const { bookingId } = await createCompletedBooking();

      // Gửi review lần 1
      const res1 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: bookingId,
          rating: 5,
          comment: 'Lần 1',
        });
      expect(res1.status).toBe(201);

      // Gửi review lần 2 cho cùng booking
      const res2 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          booking_id: bookingId,
          rating: 4,
          comment: 'Lần 2 cố ý sửa',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
    });

    it('TC67: Public inquiry: Can query reviews by bookingId and companion profileId', async () => {
      const resComp = await request(app).get('/api/reviews/companion/prof-comp-01');
      expect(resComp.status).toBe(200);
      expect(resComp.body.data.reviews.length).toBeGreaterThanOrEqual(1);
      expect(resComp.body.data.average_rating).toBeGreaterThan(0);
    });
  });

  describe('2. TrustScore Engine, Hand Calculation & Suspension Threshold (TC68 - TC71)', () => {
    it('TC68: Formula hand calculation: 0.40 * Rating100 + 0.40 * CompletionRate - 1.20 * DisputeRate - directPenalties', async () => {
      // Lấy chi tiết breakdown hiện tại của Companion 1
      const breakdown = await trustScoreService.getScoreBreakdown('prof-comp-01');

      const expectedRaw =
        0.4 * breakdown.rating_100 +
        0.4 * breakdown.completion_rate -
        1.2 * breakdown.dispute_rate -
        breakdown.direct_penalties;
      const expectedClamped = Math.max(0.0, Math.min(100.0, Math.round(expectedRaw * 100) / 100));

      expect(breakdown.current_score).toBe(expectedClamped);
    });

    it('TC69: TrustScore drops below 40 -> Profile is automatically SUSPENDED and OFFLINE', async () => {
      // Phạt nặng Companion 2 để điểm rơi xuống dưới 40
      const resPenalty = await trustScoreService.applyDirectPenalty(
        'prof-comp-02',
        null,
        'PENALTY_SEVERE_MISCONDUCT',
        65 // 80 - 65 = 15 (< 40)
      );

      expect(resPenalty.new_score).toBe(15.0);
      expect(resPenalty.is_suspended).toBe(true);

      const comp2Profile = await prisma.companionProfile.findUnique({
        where: { profile_id: 'prof-comp-02' },
      });
      expect(comp2Profile!.trust_score).toBe(15.0);
      expect(comp2Profile!.verification_status).toBe('SUSPENDED');
      expect(comp2Profile!.availability).toBe('OFFLINE');
    });

    it('TC70: Idempotency of TrustScore: Replay with same booking & reason does NOT deduct twice', async () => {
      const replay = await trustScoreService.applyDirectPenalty(
        'prof-comp-02',
        null,
        'PENALTY_SEVERE_MISCONDUCT',
        65
      );

      expect(replay.is_idempotent_replay).toBe(true);
      expect(replay.delta).toBe(0);
      expect(replay.new_score).toBe(15.0); // Vẫn giữ nguyên 15.0, không bị trừ thêm lần 2
    });

    it('TC71: GET /api/companion/trust-score returns score breakdown for authenticated companion', async () => {
      const res = await request(app)
        .get('/api/companion/trust-score')
        .set('Authorization', `Bearer ${companion1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current_score');
      expect(res.body.data).toHaveProperty('rating_100');
      expect(res.body.data).toHaveProperty('completion_rate');
      expect(res.body.data).toHaveProperty('dispute_rate');
    });
  });

  describe('3. Simulated Withdrawal Lifecycle & Double-Entry Ledger (TC72 - TC80)', () => {
    it('TC72: Non-companion (e.g. Renter) cannot request withdrawal (HTTP 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          amount: 100000,
          bank_name: 'MBBank',
          account_no: '0912345678',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Chỉ tài khoản Companion');
    });

    it('TC73: Companion cannot withdraw more than available balance (HTTP 422 INSUFFICIENT_BALANCE)', async () => {
      const compWallet = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const excessiveAmount = compWallet!.available_balance + 5000000;

      const res = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${companion1Token}`)
        .send({
          amount: excessiveAmount,
          bank_name: 'Vietcombank',
          account_no: '1029384756',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('TC74: Companion requests valid withdrawal (100.000 VND) -> Ledger posts WITHDRAW_RESERVE, status PENDING, masked account', async () => {
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const withdrawAmount = 100000;

      const res = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${companion1Token}`)
        .set('Idempotency-Key', 'req-withdraw-tc74')
        .send({
          amount: withdrawAmount,
          bank_name: 'Techcombank',
          account_no: '19034567891234',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(withdrawAmount);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.bank_name).toBe('Techcombank');
      expect(res.body.data.account_no_masked).toBe('**********1234'); // 10 sao + 4 số cuối

      // Số dư khả dụng của Companion phải giảm đúng 100.000 VND qua bút toán Sổ cái
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      expect(compWalletAfter!.available_balance).toBe(compWalletBefore!.available_balance - withdrawAmount);

      // Kiểm tra có AuditLog ghi nhận
      const audit = await prisma.auditLog.findFirst({
        where: { entity_id: res.body.data.withdraw_id, action: 'WITHDRAW_RESERVE' },
      });
      expect(audit).not.toBeNull();
    });

    it('TC75: Idempotent withdrawal replay: Resending with same key returns existing without reserving twice', async () => {
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      const res = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${companion1Token}`)
        .set('Idempotency-Key', 'req-withdraw-tc74') // Gửi lại cùng key
        .send({
          amount: 100000,
          bank_name: 'Techcombank',
          account_no: '19034567891234',
        });

      expect(res.status).toBe(201);
      expect(res.body.meta.is_idempotent_replay).toBe(true);

      // Số dư ví không hề bị trừ lần 2
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      expect(compWalletAfter!.available_balance).toBe(compWalletBefore!.available_balance);
    });

    it('TC76: Non-admin/CS cannot process or reject withdrawal (HTTP 403 Forbidden)', async () => {
      // Lấy withdrawal đang PENDING
      const pendingWithdraw = await prisma.withdrawalRequest.findFirst({
        where: { status: 'PENDING' },
      });

      const resProcess = await request(app)
        .post(`/api/withdrawals/${pendingWithdraw!.withdraw_id}/process`)
        .set('Authorization', `Bearer ${companion1Token}`); // Companion không có quyền
      expect(resProcess.status).toBe(403);

      const resReject = await request(app)
        .post(`/api/withdrawals/${pendingWithdraw!.withdraw_id}/reject`)
        .set('Authorization', `Bearer ${renter1Token}`) // Renter không có quyền
        .send({ reason: 'Sai số tài khoản' });
      expect(resReject.status).toBe(403);
    });

    it('TC77: Admin moves withdrawal to PROCESSING -> Double processing throws 409 Conflict', async () => {
      const pendingWithdraw = await prisma.withdrawalRequest.findFirst({
        where: { status: 'PENDING' },
      });

      const res = await request(app)
        .post(`/api/withdrawals/${pendingWithdraw!.withdraw_id}/process`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROCESSING');
      expect(res.body.data.processed_by).toBe('u-admin-01');

      // Gọi lại lần 2 khi đã PROCESSING -> 409 Conflict
      const resDup = await request(app)
        .post(`/api/withdrawals/${pendingWithdraw!.withdraw_id}/process`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDup.status).toBe(409);
      expect(resDup.body.error.code).toBe('ALREADY_PROCESSING');
    });

    it('TC78: Admin rejects withdrawal with reason -> Sổ cái posts WITHDRAW_REJECT, refunds available balance', async () => {
      // Tạo một withdrawal mới để kiểm thử nhánh Reject
      const reqRes = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${companion1Token}`)
        .send({
          amount: 50000,
          bank_name: 'VietinBank',
          account_no: '888899990000',
        });

      const withdrawId = reqRes.body.data.withdraw_id;
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      // Admin bấm từ chối với lý do rõ ràng
      const rejectRes = await request(app)
        .post(`/api/withdrawals/${withdrawId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Số tài khoản ngân hàng không chính chủ' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');
      expect(rejectRes.body.data.reject_reason).toBe('Số tài khoản ngân hàng không chính chủ');

      // Số dư ví Companion được hoàn trả 100% (+50.000 VND) qua Sổ cái kép
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      expect(compWalletAfter!.available_balance).toBe(compWalletBefore!.available_balance + 50000);
    });

    it('TC79: Admin completes withdrawal -> Generates mock payout code, status COMPLETED, double completion is idempotent', async () => {
      // Lấy withdrawal đang ở PROCESSING từ TC77
      const processingWithdraw = await prisma.withdrawalRequest.findFirst({
        where: { status: 'PROCESSING' },
      });

      const res = await request(app)
        .post(`/api/withdrawals/${processingWithdraw!.withdraw_id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.payout_code).toMatch(/^SIM-PO-/);

      // Gọi lại lần 2 -> Idempotent replay an toàn
      const resReplay = await request(app)
        .post(`/api/withdrawals/${processingWithdraw!.withdraw_id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resReplay.status).toBe(200);
      expect(resReplay.body.meta.is_idempotent_replay).toBe(true);
    });

    it('TC80: Double-entry reconciliation: System money conservation equation holds 100% across wallets, escrow, and withdrawals', async () => {
      const report = await reconciliationService.runReconciliation();

      expect(report.is_balanced).toBe(true);
      expect(report.wallet_mismatches.length).toBe(0);
      expect(report.system_conservation.is_equation_satisfied).toBe(true);
      expect(report.system_conservation.equation_difference).toBe(0);
      expect(report.escrow_audit.is_escrow_aligned).toBe(true);
    });
  });
});
