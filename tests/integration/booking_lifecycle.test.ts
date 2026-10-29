import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { ledgerService } from '../../server/src/modules/ledger/ledger.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { BusinessError } from '../../server/src/common/errors.js';

describe('Booking Lifecycle & Response Deadlines: 180s Timeout & Pre-Session Cancellation (BR-16..BR-18, D10, D11, TC16-TC30)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let csToken: string;

  const TEST_PREFIX = 'test-lc-';

  const cleanupTestData = async () => {
    // 1. Xóa alerts phát sinh trong test
    await prisma.ledgerAuditAlert.deleteMany();
    await prisma.platformRevenue.deleteMany();

    // 2. Xóa sessions, escrows, histories, bookings và slots
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.trustScoreLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });
    await prisma.payment.deleteMany();

    // 3. Xóa các transactions ngoại trừ giao dịch khởi tạo
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

    // 4. Khôi phục số dư chuẩn xác
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

    // Reset Companion Profile về điểm 95.0 và rate 100k
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: {
        hourly_rate: 100000,
        trust_score: 95.0,
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

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    // Nạp thêm 3.000.000 VND cho Renter 1 qua cổng thanh toán mô phỏng để đảm bảo đủ số dư cho tất cả các ca kiểm thử
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

  // Helper để tạo slot và booking có ký quỹ Escrow HELD
  const createBookingWithEscrow = async (
    keySuffix: string,
    startTime: Date,
    durationHours = 1,
    customDeadline?: Date
  ) => {
    const slotId = `${TEST_PREFIX}slot-${keySuffix}`;
    const requestKey = `${TEST_PREFIX}req-${keySuffix}`;
    const endTime = new Date(startTime.getTime() + durationHours * 3600 * 1000);

    // Tạo slot
    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: 'prof-comp-01',
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    // Tạo booking
    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: durationHours,
      });

    const bookingId = resBooking.body.data.booking_id;

    // Ký quỹ Escrow
    const resEscrow = await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    if (customDeadline) {
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { response_deadline: customDeadline },
      });
    }

    return {
      slotId,
      bookingId,
      totalFee: resBooking.body.data.total_fee_snapshot,
      resEscrow,
    };
  };

  // =========================================================================
  // 1. NHÁNH COMPANION PHẢN HỒI: ACCEPT VÀ REJECT
  // =========================================================================

  it('TC16: Companion accepts booking within 180s: moves to ACCEPTED, slot to BOOKED, creates Session with room_token', async () => {
    const startTime = new Date(Date.now() + 48 * 3600 * 1000); // 2 ngày sau
    const { bookingId, slotId } = await createBookingWithEscrow('tc16', startTime);

    // Companion Accept
    const resAccept = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);

    expect(resAccept.status).toBe(200);
    expect(resAccept.body.success).toBe(true);
    expect(resAccept.body.data.booking.status).toBe('ACCEPTED');
    expect(resAccept.body.data.session).toBeDefined();
    expect(resAccept.body.data.session.status).toBe('SCHEDULED');
    expect(resAccept.body.data.session.room_token).toBeDefined();

    // Kiểm tra slot đã chuyển sang BOOKED
    const slot = await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } });
    expect(slot?.status).toBe('BOOKED');

    // Kiểm tra BOOKING_STATUS_HISTORY
    const history = await prisma.bookingStatusHistory.findMany({
      where: { booking_id: bookingId },
      orderBy: { changed_at: 'asc' },
    });
    const lastHistory = history[history.length - 1];
    expect(lastHistory.to_status).toBe('ACCEPTED');
    expect(lastHistory.changed_by).toBe('u-comp-01');

    // Kiểm tra Notification cho Renter
    const notifs = await prisma.notification.findMany({
      where: { user_id: 'u-renter-01', type: 'BOOKING_ACCEPTED' },
    });
    expect(notifs.length).toBeGreaterThan(0);
  });

  it('TC17: Idempotent re-acceptance returns 200 with existing session without side effects', async () => {
    const startTime = new Date(Date.now() + 49 * 3600 * 1000);
    const { bookingId } = await createBookingWithEscrow('tc17', startTime);

    const res1 = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.is_idempotent_replay).toBe(true);
    expect(res2.body.data.session.session_id).toBe(res1.body.data.session.session_id);
  });

  it('TC18: Non-companion user is rejected with 403 Forbidden when attempting to accept', async () => {
    const startTime = new Date(Date.now() + 50 * 3600 * 1000);
    const { bookingId } = await createBookingWithEscrow('tc18', startTime);

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${renter2Token}`);

    expect(res.status).toBe(403);
  });

  it('TC19: Acceptance after 180s response deadline fails with 422 COMPANION_RESPONSE_TIMEOUT', async () => {
    const startTime = new Date(Date.now() + 51 * 3600 * 1000);
    const expiredDeadline = new Date(Date.now() - 30 * 1000); // Đã hết hạn 30s trước
    const { bookingId } = await createBookingWithEscrow('tc19', startTime, 1, expiredDeadline);

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companion1Token}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COMPANION_RESPONSE_TIMEOUT');
  });

  it('TC20: Companion rejects booking: 100% Escrow refund in single ledger transaction, slot back to AVAILABLE', async () => {
    const startTime = new Date(Date.now() + 52 * 3600 * 1000);
    const { bookingId, slotId, totalFee } = await createBookingWithEscrow('tc20', startTime);

    const walletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });

    // Companion Reject
    const resReject = await request(app)
      .post(`/api/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({ reason: 'Bận đột xuất vào khung giờ này' });

    expect(resReject.status).toBe(200);
    expect(resReject.body.data.booking.status).toBe('CANCELLED');
    expect(resReject.body.data.booking.escrow.status).toBe('REFUNDED');

    // Slot mở lại AVAILABLE
    const slot = await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } });
    expect(slot?.status).toBe('AVAILABLE');

    // Ví của Renter được hoàn 100%
    const walletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    expect(walletAfter?.available_balance).toBe((walletBefore?.available_balance ?? 0) + totalFee);
    expect(walletAfter?.escrow_balance).toBe((walletBefore?.escrow_balance ?? 0) - totalFee);

    // Kiểm tra giao dịch sổ cái ESCROW_REFUND
    const refundTxn = await prisma.ledgerTransaction.findFirst({
      where: {
        booking_id: bookingId,
        txn_type: 'ESCROW_REFUND',
      },
      include: { entries: true },
    });
    expect(refundTxn).toBeDefined();
    expect(refundTxn?.entries.length).toBe(2);
    const debitEntry = refundTxn?.entries.find((e) => e.direction === 'DEBIT');
    const creditEntry = refundTxn?.entries.find((e) => e.direction === 'CREDIT');
    expect(debitEntry?.balance_type).toBe('ESCROW');
    expect(creditEntry?.balance_type).toBe('AVAILABLE');
    expect(debitEntry?.amount).toBe(totalFee);
    expect(creditEntry?.amount).toBe(totalFee);
  });

  it('TC21: Idempotent re-rejection returns 200 without duplicate refund', async () => {
    const startTime = new Date(Date.now() + 53 * 3600 * 1000);
    const { bookingId } = await createBookingWithEscrow('tc21', startTime);

    await request(app)
      .post(`/api/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({ reason: 'Trùng lịch' });

    const res2 = await request(app)
      .post(`/api/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${companion1Token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.is_idempotent_replay).toBe(true);
  });

  // =========================================================================
  // 2. NHÁNH TIMEOUT 180S (BPMN TIMEOUT & PHẠT TRUSTSCORE)
  // =========================================================================

  it('TC22: 180s Timeout endpoint rejects trigger if deadline has NOT expired yet', async () => {
    const startTime = new Date(Date.now() + 54 * 3600 * 1000);
    const futureDeadline = new Date(Date.now() + 150 * 1000); // Còn 150s
    const { bookingId } = await createBookingWithEscrow('tc22', startTime, 1, futureDeadline);

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/timeout`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('DEADLINE_NOT_REACHED');
  });

  it('TC23: 180s Timeout triggers: 100% refund to Renter, slot AVAILABLE, -3.0 TrustScore to Companion', async () => {
    const startTime = new Date(Date.now() + 55 * 3600 * 1000);
    const pastDeadline = new Date(Date.now() - 5 * 1000); // Quá hạn 5s trước
    const { bookingId, slotId, totalFee } = await createBookingWithEscrow('tc23', startTime, 1, pastDeadline);

    const compProfileBefore = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
    const scoreBefore = compProfileBefore?.trust_score ?? 95.0;

    const resTimeout = await request(app)
      .post(`/api/bookings/${bookingId}/timeout`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resTimeout.status).toBe(200);
    expect(resTimeout.body.data.booking.status).toBe('CANCELLED');
    expect(resTimeout.body.data.booking.escrow.status).toBe('REFUNDED');

    // Slot mở lại
    const slot = await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } });
    expect(slot?.status).toBe('AVAILABLE');

    // TrustScore của Companion bị phạt đúng -3.0 điểm
    const compProfileAfter = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
    expect(compProfileAfter?.trust_score).toBe(scoreBefore - 3.0);

    // Có bản ghi TrustScoreLog
    const scoreLog = await prisma.trustScoreLog.findFirst({
      where: { booking_id: bookingId, reason_code: 'COMPANION_TIMEOUT' },
    });
    expect(scoreLog).toBeDefined();
    expect(scoreLog?.delta).toBe(-3.0);
    expect(scoreLog?.score_after).toBe(scoreBefore - 3.0);
  });

  // =========================================================================
  // 3. NHÁNH HỦY TRƯỚC GIỜ HẸN (PRE-SESSION CANCELLATION)
  // =========================================================================

  it('TC24: Cancel >= 30 mins before start: 100% refund to Renter, 0 to Companion, 0 to Platform', async () => {
    const startTime = new Date(Date.now() + 45 * 60 * 1000); // 45 phút trong tương lai (>= 30 phút)
    const { bookingId, slotId, totalFee } = await createBookingWithEscrow('tc24', startTime);

    const walletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    const compWalletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });

    const resCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ reason: 'Thay đổi kế hoạch trước 45 phút' });

    expect(resCancel.status).toBe(200);
    expect(resCancel.body.data.booking.status).toBe('CANCELLED');
    expect(resCancel.body.data.policy_applied).toBe('CANCEL_GE_30M');

    // Renter được hoàn 100%
    const walletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    expect(walletAfter?.available_balance).toBe((walletBefore?.available_balance ?? 0) + totalFee);

    // Companion không nhận tiền bồi thường
    const compWalletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });
    expect(compWalletAfter?.available_balance).toBe(compWalletBefore?.available_balance);

    // Slot mở lại
    const slot = await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } });
    expect(slot?.status).toBe('AVAILABLE');
  });

  it('TC25: Cancel between 10 and 29 mins before start: 70% refund to Renter, 30% to Companion in 1 transaction', async () => {
    const startTime = new Date(Date.now() + 20 * 60 * 1000); // 20 phút trong tương lai (10 đến < 30 phút)
    const { bookingId, slotId, totalFee } = await createBookingWithEscrow('tc25', startTime);

    const renterWalletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    const compWalletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });

    const resCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ reason: 'Hủy trước 20 phút' });

    expect(resCancel.status).toBe(200);
    expect(resCancel.body.data.booking.status).toBe('CANCELLED');
    expect(resCancel.body.data.policy_applied).toBe('CANCEL_10_30M');

    const expectedRenterRefund = Math.floor(totalFee * 0.70);
    const expectedCompanionComp = totalFee - expectedRenterRefund;

    // Kiểm tra số dư ví Renter & Companion
    const renterWalletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    const compWalletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });

    expect(renterWalletAfter?.available_balance).toBe((renterWalletBefore?.available_balance ?? 0) + expectedRenterRefund);
    expect(compWalletAfter?.available_balance).toBe((compWalletBefore?.available_balance ?? 0) + expectedCompanionComp);

    // Kiểm tra giao dịch sổ cái CANCEL_PENALTY có đúng 3 entries và Debit == Credit
    const txn = await prisma.ledgerTransaction.findFirst({
      where: { booking_id: bookingId, txn_type: 'CANCEL_PENALTY' },
      include: { entries: true },
    });
    expect(txn).toBeDefined();
    expect(txn?.entries.length).toBe(3);

    const totalDebit = txn!.entries.filter((e) => e.direction === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const totalCredit = txn!.entries.filter((e) => e.direction === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    expect(totalDebit).toBe(totalFee);
    expect(totalCredit).toBe(totalFee);
  });

  it('TC26: Cancel < 10 mins before start [DEMO_POLICY - APPROVED]: 100% penalty on Renter, 88% Companion, 12% Platform', async () => {
    const startTime = new Date(Date.now() + 5 * 60 * 1000); // 5 phút trong tương lai (< 10 phút)
    const { bookingId, slotId, totalFee } = await createBookingWithEscrow('tc26', startTime);

    const renterWalletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    const compWalletBefore = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });
    const platWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID } });

    const resCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ reason: 'Hủy sát giờ' });

    expect(resCancel.status).toBe(200);
    expect(resCancel.body.data.booking.status).toBe('CANCELLED');
    expect(resCancel.body.data.policy_applied).toBe('CANCEL_LT_10M');

    const expectedPlatformFee = Math.floor(totalFee * 0.12);
    const expectedCompanionShare = totalFee - expectedPlatformFee;

    // Renter nhận về 0 VND từ Escrow
    const renterWalletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-renter-01' } });
    expect(renterWalletAfter?.available_balance).toBe(renterWalletBefore?.available_balance);

    // Companion nhận 88%
    const compWalletAfter = await prisma.wallet.findUnique({ where: { user_id: 'u-comp-01' } });
    expect(compWalletAfter?.available_balance).toBe((compWalletBefore?.available_balance ?? 0) + expectedCompanionShare);

    // Platform nhận 12%
    const platWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID } });
    expect(platWalletAfter?.available_balance).toBe((platWalletBefore?.available_balance ?? 0) + expectedPlatformFee);

    // Kiểm tra bản ghi PlatformRevenue
    const platRev = await prisma.platformRevenue.findFirst({
      where: { amount: expectedPlatformFee },
    });
    expect(platRev).toBeDefined();

    // Lịch sử ghi nhận nhãn [DEMO_POLICY - APPROVED]
    const history = await prisma.bookingStatusHistory.findFirst({
      where: { booking_id: bookingId, to_status: 'CANCELLED' },
    });
    expect(history?.reason).toContain('[DEMO_POLICY - APPROVED]');
  });

  it('TC27: Cancel after start time is strictly forbidden with 422 SESSION_ALREADY_STARTED (Demo Policy 11)', async () => {
    // Tạo slot trong tương lai để vượt qua validation của createBooking
    const futureTime = new Date(Date.now() + 2 * 3600 * 1000);
    const { bookingId, slotId } = await createBookingWithEscrow('tc27', futureTime);

    // Sau đó chỉnh lùi start_time về quá khứ để mô phỏng phiên chơi đã bắt đầu
    const pastStartTime = new Date(Date.now() - 5 * 60 * 1000); // Đã bắt đầu 5 phút trước
    await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { start_time: pastStartTime },
    });
    await prisma.slotCalendar.update({
      where: { slot_id: slotId },
      data: { start_time: pastStartTime },
    });

    const resCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resCancel.status).toBe(422);
    expect(resCancel.body.error.code).toBe('SESSION_ALREADY_STARTED');
  });

  it('TC28: Concurrency safety: simultaneous Accept and Cancel results in exactly one state winning', async () => {
    const startTime = new Date(Date.now() + 56 * 3600 * 1000);
    const { bookingId } = await createBookingWithEscrow('tc28', startTime);

    // Gửi đồng thời hai yêu cầu Accept và Cancel
    const [resAccept, resCancel] = await Promise.all([
      request(app)
        .post(`/api/bookings/${bookingId}/accept`)
        .set('Authorization', `Bearer ${companion1Token}`),
      request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({ reason: 'Hủy đồng thời' }),
    ]);

    const statuses = [resAccept.status, resCancel.status];
    expect(statuses).toContain(200);

    const finalBooking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
    expect(['ACCEPTED', 'CANCELLED']).toContain(finalBooking?.status);
  });

  // =========================================================================
  // 4. KIỂM TOÁN VẬN HÀNH & ĐỐI SOÁT BẢO TOÀN SỔ CÁI
  // =========================================================================

  it('TC29: Operational Alert: Ledger failure triggers transaction rollback and writes LedgerAuditAlert', async () => {
    const startTime = new Date(Date.now() + 57 * 3600 * 1000);
    const { bookingId } = await createBookingWithEscrow('tc29', startTime);

    // Giả lập sự cố hệ thống sổ cái bằng vi.spyOn trên ledgerService.postTransaction
    // Đảm bảo không làm bẩn dữ liệu ví thật trong cơ sở dữ liệu
    const spy = vi.spyOn(ledgerService, 'postTransaction').mockRejectedValueOnce(
      new BusinessError('MOCK_LEDGER_CRASH', 'Lỗi giả lập sự cố hệ thống kế toán ghi sổ')
    );

    const resCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resCancel.status).toBe(422);
    expect(resCancel.body.error.code).toBe('MOCK_LEDGER_CRASH');

    // Kiểm tra booking VẪN GIỮ NGUYÊN trạng thái WAITING_COMPANION_RESPONSE (Rollback thành công)
    const bookingAfter = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
    expect(bookingAfter?.status).toBe('WAITING_COMPANION_RESPONSE');

    // Bản ghi LedgerAuditAlert được lưu vào DB
    const alert = await prisma.ledgerAuditAlert.findFirst({
      where: { context_json: { contains: bookingId } },
    });
    expect(alert).toBeDefined();
    expect(alert?.error_code).toBe('MOCK_LEDGER_CRASH');

    spy.mockRestore();
  });

  it('TC30: Comprehensive Double-Entry Ledger Reconciliation audit passes 100%', async () => {
    const report = await reconciliationService.runReconciliation();
    if (!report.is_balanced) {
      console.log('RECONCILIATION MISMATCHES:', JSON.stringify(report.wallet_mismatches, null, 2));
      console.log('SYSTEM CONSERVATION:', JSON.stringify(report.system_conservation, null, 2));
    }

    expect(report.is_balanced).toBe(true);
    expect(report.system_conservation.is_equation_satisfied).toBe(true);
    expect(report.escrow_audit.is_escrow_aligned).toBe(true);
    expect(report.wallet_mismatches.length).toBe(0);
  });
});
