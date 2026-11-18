import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { bookingAutomationService } from '../../server/src/modules/booking/booking-automation.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';

describe('Background Automation Engine: 180s Timeout & 15m Auto-Accept (Worker & Scheduler)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;

  const TEST_PREFIX = 'test-auto-';

  const cleanupTestData = async () => {
    // 1. Dọn dẹp dữ liệu kiểm thử
    await prisma.ledgerAuditAlert.deleteMany();
    await prisma.platformRevenue.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.trustScoreLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });
    await prisma.payment.deleteMany();

    // 2. Xóa các ledger transactions ngoại trừ init seed
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

    // 3. Khôi phục số dư ví chuẩn
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
    await prisma.wallet.deleteMany({
      where: {
        wallet_id: {
          notIn: [
            'w-renter-01',
            'w-renter-02',
            'w-comp-01',
            'w-comp-02',
            SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
            SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID,
          ],
        },
      },
    });

    // 4. Khôi phục TrustScore cho Companion
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
  };

  beforeAll(async () => {
    await cleanupTestData();

    // Đăng nhập tài khoản Renter 1 và Companion 1
    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renter1Token = resRenter.body.data.token;

    const resRenter2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter2@instasquad.test', password: 'Demo@123456' });
    renter2Token = resRenter2.body.data.token;

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companion1Token = resComp.body.data.token;

    // Nạp tiền 3.000.000 VND cho Renter 1
    const topupRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 3000000, provider: 'MOCK_VNPAY' });

    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupRes.body.data.payment_id, outcome: 'SUCCESS' });

    // Nạp tiền 1.000.000 VND cho Renter 2
    const topupRes2 = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({ amount: 1000000, provider: 'MOCK_VNPAY' });

    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupRes2.body.data.payment_id, outcome: 'SUCCESS' });
  });

  afterAll(async () => {
    bookingAutomationService.stop();
    await cleanupTestData();
  });

  let seq = 100;
  const createBookingInState = async (
    keySuffix: string,
    state: 'WAITING_RESPONSE' | 'SESSION_ENDED',
    options?: {
      responseDeadline?: Date;
      confirmDeadline?: Date;
      customRenterToken?: string;
    }
  ) => {
    seq++;
    const slotId = `${TEST_PREFIX}slot-${keySuffix}`;
    const requestKey = `${TEST_PREFIX}req-${keySuffix}`;
    const startTime = new Date(Date.now() + seq * 86400 * 1000);
    const endTime = new Date(startTime.getTime() + 3600 * 1000);
    const rToken = options?.customRenterToken || renter1Token;

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
      .set('Authorization', `Bearer ${rToken}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 1,
      });

    const bookingId = resBooking.body.data.booking_id;

    // Giữ Escrow
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${rToken}`);

    if (state === 'WAITING_RESPONSE') {
      if (options?.responseDeadline) {
        await prisma.booking.update({
          where: { booking_id: bookingId },
          data: { response_deadline: options.responseDeadline },
        });
      }
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

    // Kết thúc session -> kích hoạt confirm_deadline
    await request(app)
      .post(`/api/sessions/${session.session_id}/end`)
      .set('Authorization', `Bearer ${renter1Token}`);

    if (options?.confirmDeadline) {
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { confirm_deadline: options.confirmDeadline },
      });
    }

    return { bookingId, slotId, session };
  };

  // =========================================================================
  // 1. Kiểm thử Timeout 180s tự động
  // =========================================================================
  it('TC-AUTO-01: Unexpired booking is NOT processed by timeout or auto-accept worker', async () => {
    // Tạo 1 booking còn 120s response deadline
    const futureResponse = new Date(Date.now() + 120 * 1000);
    const { bookingId: bTimeoutId } = await createBookingInState('t1-unexp-time', 'WAITING_RESPONSE', {
      responseDeadline: futureResponse,
    });

    // Tạo 1 booking còn 10 phút confirm deadline
    const futureConfirm = new Date(Date.now() + 10 * 60 * 1000);
    const { bookingId: bAcceptId } = await createBookingInState('t1-unexp-acc', 'SESSION_ENDED', {
      confirmDeadline: futureConfirm,
    });

    // Chạy worker cycle
    const cycleResult = await bookingAutomationService.runAutomationCycle();

    // Xác minh không có đơn nào bị xử lý
    expect(cycleResult.timeout.processed).toBe(0);
    expect(cycleResult.autoAccept.processed).toBe(0);

    const bTimeout = await prisma.booking.findUnique({ where: { booking_id: bTimeoutId } });
    expect(bTimeout?.status).toBe('WAITING_COMPANION_RESPONSE');

    const bAccept = await prisma.booking.findUnique({ where: { booking_id: bAcceptId } });
    expect(bAccept?.status).not.toBe('COMPLETED');
  });

  it('TC-AUTO-02: Booking past 180s is timed out and refunded exactly once by worker', async () => {
    // Đặt deadline quá hạn 10 giây
    const pastResponse = new Date(Date.now() - 10 * 1000);
    const { bookingId, slotId } = await createBookingInState('t2-exp-time', 'WAITING_RESPONSE', {
      responseDeadline: pastResponse,
    });

    const compProfileBefore = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
    const scoreBefore = compProfileBefore?.trust_score ?? 95.0;

    // Chạy automation cycle
    const cycleResult = await bookingAutomationService.runAutomationCycle();
    expect(cycleResult.timeout.processed).toBeGreaterThanOrEqual(1);

    // Xác minh trạng thái Booking và Escrow
    const bAfter = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true, slot: true },
    });
    expect(bAfter?.status).toBe('CANCELLED');
    expect(bAfter?.escrow?.status).toBe('REFUNDED');
    expect(bAfter?.slot.status).toBe('AVAILABLE');

    // Xác minh điểm uy tín bị trừ 3.0
    const compProfileAfter = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
    expect(compProfileAfter?.trust_score).toBe(scoreBefore - 3.0);

    // Xác minh log lịch sử trạng thái
    const history = await prisma.bookingStatusHistory.findFirst({
      where: { booking_id: bookingId, to_status: 'CANCELLED' },
    });
    expect(history?.reason).toContain('Companion Timeout');
  });

  // =========================================================================
  // 2. Kiểm thử Auto-Accept 15 phút tự động
  // =========================================================================
  it('TC-AUTO-03: Booking not yet past 15m is NOT auto-accepted', async () => {
    const futureConfirm = new Date(Date.now() + 5 * 60 * 1000);
    const { bookingId } = await createBookingInState('t3-notyet-acc', 'SESSION_ENDED', {
      confirmDeadline: futureConfirm,
    });

    const cycleResult = await bookingAutomationService.runAutomationCycle();
    expect(cycleResult.autoAccept.processed).toBe(0);

    const bAfter = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(bAfter?.status).not.toBe('COMPLETED');
    expect(bAfter?.escrow?.status).toBe('HELD');
  });

  it('TC-AUTO-04: Booking past 15m is auto-accepted and paid out 88/12', async () => {
    const pastConfirm = new Date(Date.now() - 30 * 1000);
    const { bookingId } = await createBookingInState('t4-exp-acc', 'SESSION_ENDED', {
      confirmDeadline: pastConfirm,
    });

    const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
    const compBalBefore = compWalletBefore?.available_balance ?? 0;

    const cycleResult = await bookingAutomationService.runAutomationCycle();
    expect(cycleResult.autoAccept.processed).toBeGreaterThanOrEqual(1);

    const bAfter = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(bAfter?.status).toBe('COMPLETED');
    expect(bAfter?.escrow?.status).toBe('RELEASED');

    // Phân bổ 88/12: 1 giờ = 100.000 VND -> Companion nhận 88.000 VND
    const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
    expect(compWalletAfter?.available_balance).toBe(compBalBefore + 88000);

    // Xác minh status history ghi nhận trigger
    const history = await prisma.bookingStatusHistory.findFirst({
      where: { booking_id: bookingId, to_status: 'COMPLETED' },
    });
    expect(history?.reason).toContain('Tự động nghiệm thu sau 15 phút');
  });

  // =========================================================================
  // 3. Idempotency & Concurrency: Chạy lặp và đồng thời với User API
  // =========================================================================
  it('TC-AUTO-05: Worker running repeatedly does NOT create duplicate ledger entries or double-settle', async () => {
    const pastConfirm = new Date(Date.now() - 60 * 1000);
    const { bookingId } = await createBookingInState('t5-repeat', 'SESSION_ENDED', {
      confirmDeadline: pastConfirm,
    });

    // Lần 1: Thực thi auto-accept
    const run1 = await bookingAutomationService.runAutomationCycle();
    expect(run1.autoAccept.processed).toBeGreaterThanOrEqual(1);

    const ledgerCountAfterRun1 = await prisma.ledgerTransaction.count();

    // Lần 2 và Lần 3: Chạy lặp lại
    const run2 = await bookingAutomationService.runAutomationCycle();
    const run3 = await bookingAutomationService.runAutomationCycle();

    expect(run2.autoAccept.processed).toBe(0);
    expect(run3.autoAccept.processed).toBe(0);

    const ledgerCountAfterRun3 = await prisma.ledgerTransaction.count();
    expect(ledgerCountAfterRun3).toBe(ledgerCountAfterRun1);

    // Đối soát kế toán toàn sàn
    const recon = await reconciliationService.runReconciliation();
    expect(recon.is_balanced).toBe(true);
    expect(recon.wallet_mismatches.length).toBe(0);
  });

  it('TC-AUTO-06: API and worker processing the same booking concurrently do not corrupt balances', async () => {
    const pastConfirm = new Date(Date.now() - 60 * 1000);
    const { bookingId } = await createBookingInState('t6-concurrent', 'SESSION_ENDED', {
      confirmDeadline: pastConfirm,
    });

    // Bắn đồng thời: 1 worker cycle và 1 user HTTP API call
    const [workerRes, apiRes] = await Promise.all([
      bookingAutomationService.runAutomationCycle(),
      request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${companion1Token}`),
    ]);

    // Một bên sẽ xử lý, bên kia là idempotent replay hoặc conflict handled
    expect([200, 409]).toContain(apiRes.status);

    const bAfter = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(bAfter?.status).toBe('COMPLETED');
    expect(bAfter?.escrow?.status).toBe('RELEASED');

    // Đối soát kế toán toàn sàn
    const recon = await reconciliationService.runReconciliation();
    expect(recon.is_balanced).toBe(true);
    expect(recon.wallet_mismatches.length).toBe(0);
  });

  // =========================================================================
  // 4. Bảo vệ Đơn tranh chấp & Khả năng chịu lỗi độc lập từng Booking
  // =========================================================================
  it('TC-AUTO-07: Disputed booking or FROZEN escrow is NEVER auto-accepted by worker', async () => {
    const pastConfirm = new Date(Date.now() - 60 * 1000);
    const { bookingId } = await createBookingInState('t7-dispute', 'SESSION_ENDED', {
      confirmDeadline: pastConfirm,
    });

    // Renter báo sự cố tranh chấp -> Escrow chuyển sang FROZEN
    const resDispute = await request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        reason_category: 'NO_SHOW',
        description: 'Companion AFK không tham gia buổi chơi theo lịch hẹn',
      });
    expect(resDispute.status).toBe(201);

    const bBefore = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(bBefore?.status).toBe('DISPUTED');
    expect(bBefore?.escrow?.status).toBe('FROZEN');

    // Chạy worker cycle
    const cycleResult = await bookingAutomationService.runAutomationCycle();
    expect(cycleResult.autoAccept.processed).toBe(0);

    // Xác minh trạng thái và tiền ký quỹ vẫn giữ nguyên FROZEN
    const bAfter = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(bAfter?.status).toBe('DISPUTED');
    expect(bAfter?.escrow?.status).toBe('FROZEN');
  });

  it('TC-AUTO-08: Error in one booking does NOT prevent other bookings from being processed', async () => {
    const pastResponse = new Date(Date.now() - 15 * 1000);

    // Booking 1: Sử dụng tài khoản Renter 2 và làm cạn kiệt escrow_balance để gây lỗi INSUFFICIENT_ESCROW_BALANCE khi hoàn tiền
    const { bookingId: errorBookingId } = await createBookingInState('t8-err', 'WAITING_RESPONSE', {
      responseDeadline: pastResponse,
      customRenterToken: renter2Token,
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-02' },
      data: { escrow_balance: 0 },
    });

    // Booking 2: Sử dụng tài khoản Renter 1, hoàn toàn bình thường và hợp lệ
    const { bookingId: validBookingId } = await createBookingInState('t8-valid', 'WAITING_RESPONSE', {
      responseDeadline: pastResponse,
      customRenterToken: renter1Token,
    });

    // Chạy worker cycle
    const cycleResult = await bookingAutomationService.runAutomationCycle();

    // Booking 1 bị lỗi, Booking 2 vẫn được xử lý thành công!
    expect(cycleResult.timeout.errors).toBeGreaterThanOrEqual(1);
    expect(cycleResult.timeout.processed).toBeGreaterThanOrEqual(1);

    const bValid = await prisma.booking.findUnique({
      where: { booking_id: validBookingId },
      include: { escrow: true },
    });
    expect(bValid?.status).toBe('CANCELLED');
    expect(bValid?.escrow?.status).toBe('REFUNDED');
  });

  // =========================================================================
  // 5. Kiểm thử Vòng đời Scheduler (Start / Stop)
  // =========================================================================
  it('TC-AUTO-09: Background scheduler start / stop lifecycle manages single timer instance safely', () => {
    // 1. Dừng nếu đang có
    bookingAutomationService.stop();
    expect(bookingAutomationService.isStarted()).toBe(false);

    // 2. Khởi động với chu kỳ 1000ms
    bookingAutomationService.start(1000);
    expect(bookingAutomationService.isStarted()).toBe(true);

    // 3. Gọi start lần thứ hai không tạo thêm timer trùng lặp
    bookingAutomationService.start(1000);
    expect(bookingAutomationService.isStarted()).toBe(true);

    // 4. Dừng an toàn
    bookingAutomationService.stop();
    expect(bookingAutomationService.isStarted()).toBe(false);
  });

  // =========================================================================
  // 6. Hardening: Cấu hình chu kỳ Worker & Fallback an toàn (Interval Validation)
  // =========================================================================
  it('TC-AUTO-10: Configuration & interval safety handles negative, zero, sub-1000ms and invalid values safely', () => {
    bookingAutomationService.stop();

    // 1. Chu kỳ hợp lệ 1000ms và 5000ms
    expect(bookingAutomationService.normalizeInterval(1000)).toBe(1000);
    expect(bookingAutomationService.normalizeInterval(5000)).toBe(5000);

    // 2. Chu kỳ nhỏ hơn 1000ms (ví dụ 500ms) được clamped về 1000ms
    expect(bookingAutomationService.normalizeInterval(500)).toBe(1000);
    expect(bookingAutomationService.normalizeInterval(10)).toBe(1000);

    // 3. Chu kỳ âm hoặc 0 được fallback về 5000ms an toàn
    expect(bookingAutomationService.normalizeInterval(-1000)).toBe(5000);
    expect(bookingAutomationService.normalizeInterval(0)).toBe(5000);

    // 4. Chuỗi số và giá trị bất thường (NaN, null, undefined, 'abc')
    expect(bookingAutomationService.normalizeInterval('3000')).toBe(3000);
    expect(bookingAutomationService.normalizeInterval('abc')).toBe(5000);
    expect(bookingAutomationService.normalizeInterval(NaN)).toBe(5000);
    expect(bookingAutomationService.normalizeInterval(null)).toBe(5000);
    expect(bookingAutomationService.normalizeInterval(undefined)).toBe(5000);

    // 5. Số cực lớn (ví dụ 60.000ms) được chấp nhận nguyên bản
    expect(bookingAutomationService.normalizeInterval(60000)).toBe(60000);

    // 6. Khởi động với giá trị âm thực tế -> Worker chạy ở 5000ms
    bookingAutomationService.start(-500);
    expect(bookingAutomationService.isStarted()).toBe(true);
    expect(bookingAutomationService.getCurrentInterval()).toBe(5000);
    bookingAutomationService.stop();

    // 7. Khởi động với giá trị 200ms -> Worker clamped về 1000ms
    bookingAutomationService.start(200);
    expect(bookingAutomationService.isStarted()).toBe(true);
    expect(bookingAutomationService.getCurrentInterval()).toBe(1000);
    bookingAutomationService.stop();
  });

  // =========================================================================
  // 7. Security Hardening: Chống giả mạo danh tính SYSTEM qua HTTP API
  // =========================================================================
  it('TC-AUTO-11: Client cannot forge actorId=SYSTEM or actorRole=SYSTEM via body, query, or headers', async () => {
    // Tạo 1 booking ở trạng thái WAITING_RESPONSE quá hạn
    const pastResponse = new Date(Date.now() - 5000);
    const { bookingId } = await createBookingInState('t11-sec', 'WAITING_RESPONSE', {
      responseDeadline: pastResponse,
    });

    // 1. Renter 2 (người lạ không thuộc đơn) cố tình gửi actorId: 'SYSTEM' trong body
    const resBodyTimeout = await request(app)
      .post(`/api/bookings/${bookingId}/timeout`)
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({ actorId: 'SYSTEM', actorRole: 'SYSTEM' });

    expect(resBodyTimeout.status).toBe(403);
    expect(resBodyTimeout.body.error.code).toBe('FORBIDDEN');

    // 2. Cố tình gửi qua query string
    const resQueryTimeout = await request(app)
      .post(`/api/bookings/${bookingId}/timeout?actorId=SYSTEM&actorRole=SYSTEM`)
      .set('Authorization', `Bearer ${renter2Token}`);

    expect(resQueryTimeout.status).toBe(403);

    // 3. Cố tình gửi qua custom headers
    const resHeaderTimeout = await request(app)
      .post(`/api/bookings/${bookingId}/timeout`)
      .set('Authorization', `Bearer ${renter2Token}`)
      .set('X-Actor-Id', 'SYSTEM')
      .set('X-Actor-Role', 'SYSTEM');

    expect(resHeaderTimeout.status).toBe(403);

    // 4. Kiểm tra tương tự trên endpoint auto-accept
    const pastConfirm = new Date(Date.now() - 60 * 1000);
    const { bookingId: accBookingId } = await createBookingInState('t11-sec-acc', 'SESSION_ENDED', {
      confirmDeadline: pastConfirm,
    });

    const resBodyAutoAccept = await request(app)
      .post(`/api/bookings/${accBookingId}/auto-accept`)
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({ actorId: 'SYSTEM', actorRole: 'SYSTEM' });

    expect(resBodyAutoAccept.status).toBe(403);
    expect(resBodyAutoAccept.body.error.code).toBe('FORBIDDEN');

    // 5. Request hoàn toàn không có JWT token -> 401
    const resNoAuth = await request(app)
      .post(`/api/bookings/${bookingId}/timeout`)
      .send({ actorId: 'SYSTEM' });

    expect(resNoAuth.status).toBe(401);
  });
});
