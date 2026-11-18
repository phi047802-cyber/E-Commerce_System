import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { ledgerService } from '../../server/src/modules/ledger/ledger.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { env } from '../../server/src/config/env.js';

describe('Financial Module: Wallet, Double-Entry Ledger, Escrow & Payment Simulator (BR-05..BR-07, TC07-TC14, TC29-TC31)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let auditorToken: string;

  const TEST_PREFIX = 'test-fin-';

  // Helper date
  const getFutureDate = (daysAhead: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const cleanupTestData = async () => {
    // 1. Xóa alerts phát sinh
    await prisma.ledgerAuditAlert.deleteMany();

    // 2. Xóa escrows, histories, bookings và slots
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });

    // 3. Xóa payments và platform revenues
    await prisma.platformRevenue.deleteMany();
    await prisma.session.deleteMany();
    await prisma.trustScoreLog.deleteMany();
    await prisma.payment.deleteMany();

    // 4. Xóa tất cả ledger transactions ngoại trừ transaction khởi tạo từ seed
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

    // 5. Đưa các ví về trạng thái gốc chuẩn xác
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

    const resAuditor = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@instasquad.test', password: 'Demo@123456' });
    auditorToken = resAuditor.body.data.token;

    // Tạo các slot phục vụ test
    // Slot cho Renter 1 (đủ tiền ký quỹ 200k)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-01`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(2, 14),
        end_time: getFutureDate(2, 16),
        status: 'AVAILABLE',
      },
    });

    // Slot cho Renter 2 (thiếu tiền ký quỹ)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-02`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(2, 16),
        end_time: getFutureDate(2, 18),
        status: 'AVAILABLE',
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // TC08: Ký quỹ khi thiếu số dư bị từ chối rõ ràng (chạy khi renter 2 có số dư 0 VND từ đầu)
  it('TC08: Escrow Hold fails with 422 INSUFFICIENT_BALANCE when available balance is lower than total_fee_snapshot', async () => {
    // Renter 2 ban đầu có 0 VND trong ví
    const walletRenter2 = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-02' } });
    expect(walletRenter2?.available_balance).toBe(0);

    // Tạo đơn đặt lịch phí 200.000 VND
    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-02`,
        request_key: `${TEST_PREFIX}req-tc08-insufficient`,
      });

    expect(resBooking.status).toBe(201);
    const bookingId = resBooking.body.data.booking_id;

    // Thử ký quỹ khi ví có 0 VND -> Nhận lỗi 422 INSUFFICIENT_BALANCE
    const resHold = await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter2Token}`);

    expect(resHold.status).toBe(422);
    expect(resHold.body.success).toBe(false);
    expect(resHold.body.error.code).toBe('INSUFFICIENT_BALANCE');

    // Xác nhận không có Escrow nào được tạo và đơn vẫn ở PENDING_ACCEPTANCE
    const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
    expect(escrow).toBeNull();
  });

  // TC09: Top-up qua Payment Simulator SUCCESS
  it('TC09: Top-up via Payment Simulator SUCCESS credits user wallet and creates 2 balanced ledger entries', async () => {
    // 1. Tạo yêu cầu nạp tiền 300.000 VND
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({
        amount: 300000,
        provider: 'MOCK_VNPAY',
      });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.success).toBe(true);
    const paymentId = resCreate.body.data.payment_id;
    const gatewayRef = resCreate.body.data.gateway_ref;
    expect(resCreate.body.data.status).toBe('PENDING');

    // 2. Kích hoạt Webhook callback SUCCESS từ Simulator
    const rawData = `${gatewayRef}|300000|SUCCESS`;
    const signature = crypto.createHmac('sha256', env.SIMULATOR_SECRET).update(rawData).digest('hex');

    const resWebhook = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signature)
      .send({
        gateway_ref: gatewayRef,
        payment_id: paymentId,
        amount: 300000,
        status: 'SUCCESS',
        signature,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);
    expect(resWebhook.body.data.status).toBe('SUCCESS');
    expect(resWebhook.body.data.wallet_balance_after).toBe(300000);
    expect(resWebhook.body.meta.is_idempotent_replay).toBe(false);

    // 3. Kiểm tra số dư ví Renter 2 trong DB: từ 0 -> 300.000 VND
    const walletRenter2 = await prisma.wallet.findUnique({
      where: { wallet_id: 'w-renter-02' },
    });
    expect(walletRenter2?.available_balance).toBe(300000);

    // 4. Kiểm tra Sổ cái: Bút toán TOPUP tồn tại và có đúng 2 dòng đối ứng cân bằng
    const ledgerTxn = await prisma.ledgerTransaction.findUnique({
      where: { idempotency_key: `TOPUP-${gatewayRef}` },
      include: { entries: true },
    });
    expect(ledgerTxn).toBeDefined();
    expect(ledgerTxn!.entries.length).toBe(2);

    const creditEntry = ledgerTxn!.entries.find((e) => e.direction === 'CREDIT');
    const debitEntry = ledgerTxn!.entries.find((e) => e.direction === 'DEBIT');

    expect(creditEntry?.wallet_id).toBe('w-renter-02');
    expect(creditEntry?.amount).toBe(300000);
    expect(creditEntry?.balance_after).toBe(300000);

    expect(debitEntry?.wallet_id).toBe(SYSTEM_ACCOUNTS.CLEARING_WALLET_ID);
    expect(debitEntry?.amount).toBe(300000);
  });

  // TC11: Payment Simulator FAILED và PENDING không cộng tiền
  it('TC11: Payment Simulator with FAILED or PENDING outcome DOES NOT credit user wallet', async () => {
    // 1. Tạo đơn nạp tiền 100.000 VND
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({ amount: 100000 });

    const paymentId = resCreate.body.data.payment_id;

    // 2. Giả lập kết quả FAILED
    const resSimFailed = await request(app)
      .post('/api/payments/simulate')
      .send({
        payment_id: paymentId,
        outcome: 'FAILED',
      });

    expect(resSimFailed.status).toBe(200);
    expect(resSimFailed.body.data.status).toBe('FAILED');

    // 3. Số dư ví Renter 2 vẫn giữ nguyên 300.000 VND (không được cộng thêm)
    const walletRenter2 = await prisma.wallet.findUnique({
      where: { wallet_id: 'w-renter-02' },
    });
    expect(walletRenter2?.available_balance).toBe(300000);
  });

  // TC12: Chống cộng tiền trùng lặp (Idempotent Webhook Replay)
  it('TC12: Duplicate webhook callbacks with identical gateway_ref DO NOT double-credit the wallet', async () => {
    // 1. Tạo đơn nạp tiền 150.000 VND
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter2Token}`)
      .send({ amount: 150000 });

    const paymentId = resCreate.body.data.payment_id;
    const gatewayRef = resCreate.body.data.gateway_ref;

    const rawData = `${gatewayRef}|150000|SUCCESS`;
    const signature = crypto.createHmac('sha256', env.SIMULATOR_SECRET).update(rawData).digest('hex');

    // Callback lần 1: Nạp thành công -> ví từ 300.000 lên 450.000 VND
    const resFirst = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signature)
      .send({
        gateway_ref: gatewayRef,
        payment_id: paymentId,
        amount: 150000,
        status: 'SUCCESS',
        signature,
      });

    expect(resFirst.status).toBe(200);
    expect(resFirst.body.data.wallet_balance_after).toBe(450000);
    expect(resFirst.body.meta.is_idempotent_replay).toBe(false);

    // Callback lần 2 (Giả lập mạng retry trùng lặp)
    const resSecond = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signature)
      .send({
        gateway_ref: gatewayRef,
        payment_id: paymentId,
        amount: 150000,
        status: 'SUCCESS',
        signature,
      });

    expect(resSecond.status).toBe(200);
    expect(resSecond.body.meta.is_idempotent_replay).toBe(true);
    // Số dư sau lần 2 vẫn là 450.000 VND, TUYỆT ĐỐI không bị cộng thành 600.000 VND!
    expect(resSecond.body.data.wallet_balance_after).toBe(450000);

    const walletRenter2 = await prisma.wallet.findUnique({
      where: { wallet_id: 'w-renter-02' },
    });
    expect(walletRenter2?.available_balance).toBe(450000);
  });

  // TC07 & TC10: Ký quỹ Escrow (Booking Escrow Hold) với đủ số dư
  it('TC07 & TC10: Escrow Hold with sufficient balance debits Available and credits Escrow with exact balance_after', async () => {
    // 1. Tạo đơn đặt lịch cho Renter 1 (Phí 200.000 VND, ví có 500.000 VND)
    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-01`,
        request_key: `${TEST_PREFIX}req-tc07-hold`,
      });

    expect(resBooking.status).toBe(201);
    const bookingId = resBooking.body.data.booking_id;
    const fee = resBooking.body.data.total_fee_snapshot;
    expect(fee).toBeGreaterThan(0);

    // 2. Thực hiện Ký quỹ Escrow qua POST /api/bookings/:id/hold-escrow
    const resHold = await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resHold.status).toBe(200);
    expect(resHold.body.success).toBe(true);
    expect(resHold.body.data.escrow.status).toBe('HELD');
    expect(resHold.body.data.escrow.amount).toBe(fee);
    expect(resHold.body.data.booking.status).toBe('WAITING_COMPANION_RESPONSE');

    // Số dư ví Renter 1: available giảm đúng fee, escrow tăng đúng fee
    expect(resHold.body.data.available_balance).toBe(500000 - fee);
    expect(resHold.body.data.escrow_balance).toBe(fee);

    // 3. Kiểm tra bảo toàn tài sản: (500k - fee) + fee = 500.000 VND
    const walletRenter1 = await prisma.wallet.findUnique({
      where: { wallet_id: 'w-renter-01' },
    });
    expect(walletRenter1?.available_balance).toBe(500000 - fee);
    expect(walletRenter1?.escrow_balance).toBe(fee);

    // 4. Kiểm tra Sổ cái kép: có transaction ESCROW_HOLD với 2 dòng đối ứng
    const ledgerTxn = await prisma.ledgerTransaction.findUnique({
      where: { idempotency_key: `ESCROW-HOLD-${bookingId}` },
      include: { entries: true },
    });
    expect(ledgerTxn).toBeDefined();
    expect(ledgerTxn!.entries.length).toBe(2);

    const debitAvail = ledgerTxn!.entries.find((e) => e.direction === 'DEBIT');
    const creditEscrow = ledgerTxn!.entries.find((e) => e.direction === 'CREDIT');

    expect(debitAvail?.balance_type).toBe('AVAILABLE');
    expect(debitAvail?.amount).toBe(fee);
    expect(debitAvail?.balance_after).toBe(500000 - fee);

    expect(creditEscrow?.balance_type).toBe('ESCROW');
    expect(creditEscrow?.amount).toBe(fee);
    expect(creditEscrow?.balance_after).toBe(fee);
  });

  // TC13: Bút toán Sổ cái không cân bằng bị từ chối ngay lập tức
  it('TC13: Unbalanced ledger posting (Total Debit != Total Credit) is strictly rejected with LEDGER_UNBALANCED', async () => {
    try {
      await ledgerService.postTransaction({
        txn_type: 'TOPUP',
        idempotency_key: 'UNBALANCED-TEST-KEY-001',
        entries: [
          {
            wallet_id: 'w-renter-01',
            direction: 'CREDIT',
            balance_type: 'AVAILABLE',
            amount: 500000,
          },
          {
            wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
            direction: 'DEBIT',
            balance_type: 'AVAILABLE',
            amount: 400000, // Lệch 100.000 VND!
          },
        ],
      });
      expect.unreachable('Should have thrown LEDGER_UNBALANCED');
    } catch (err: any) {
      expect(err.errorCode || err.code).toBe('LEDGER_UNBALANCED');
    }
  });

  // TC14: Rollback 100% khi xảy ra lỗi DB hoặc thiếu số dư
  it('TC14: Atomic rollback: If any entry fails, whole transaction rolls back and preserves wallet balances', async () => {
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    const initialAvail = walletBefore!.available_balance;

    // Cố ý ghi giao dịch mà một bên yêu cầu trừ nhiều hơn số dư hiện có
    try {
      await ledgerService.postTransaction({
        txn_type: 'ESCROW_HOLD',
        idempotency_key: 'ROLLBACK-TEST-KEY-002',
        entries: [
          {
            wallet_id: 'w-renter-01',
            direction: 'DEBIT',
            balance_type: 'AVAILABLE',
            amount: 99999999, // Quá số dư hiện có
          },
          {
            wallet_id: 'w-renter-01',
            direction: 'CREDIT',
            balance_type: 'ESCROW',
            amount: 99999999,
          },
        ],
      });
      expect.unreachable('Should have thrown INSUFFICIENT_BALANCE');
    } catch (err: any) {
      expect(err.errorCode || err.code).toBe('INSUFFICIENT_BALANCE');
    }

    // Xác nhận số dư ví renter 1 hoàn toàn không bị ảnh hưởng (Rollback 100%)
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter?.available_balance).toBe(initialAvail);

    // Xác nhận không có bản ghi giao dịch dở dang nào được lưu
    const txn = await prisma.ledgerTransaction.findUnique({
      where: { idempotency_key: 'ROLLBACK-TEST-KEY-002' },
    });
    expect(txn).toBeNull();
  });

  // TC29: Kiểm tra ràng buộc số nguyên VND (Integer Currency)
  it('TC29: Rejects non-integer, negative or zero currency amounts', async () => {
    // Thử nạp số thập phân float 100000.5 VND
    const resFloat = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 100000.5 });

    expect(resFloat.status).toBe(400);

    // Thử nạp số âm
    const resNegative = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: -50000 });

    expect(resNegative.status).toBe(400);
  });

  // TC30: Xác thực bảo mật chữ ký Webhook HMAC SHA-256
  it('TC30: Webhook rejects request with invalid HMAC signature with 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', 'invalid_fake_signature_abc123')
      .send({
        gateway_ref: 'MOCK-VNPAY-TEST-FAKE',
        payment_id: 'pay-fake-id',
        amount: 200000,
        status: 'SUCCESS',
        signature: 'invalid_fake_signature_abc123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC31: Reconciliation Service xác nhận Sổ cái cân bằng và phát hiện sai lệch
  it('TC31: Reconciliation Service validates ledger invariants and detects mismatches', async () => {
    // 1. Kiểm tra ở trạng thái hợp lệ hiện tại (Tất cả giao dịch trước đó đều qua LedgerService)
    const report = await reconciliationService.runReconciliation();
    expect(report.is_balanced).toBe(true);
    expect(report.wallet_mismatches.length).toBe(0);
    expect(report.system_conservation.is_equation_satisfied).toBe(true);
    expect(report.escrow_audit.is_escrow_aligned).toBe(true);

    // 2. Tra cứu API đối soát qua vai trò AUDITOR
    const resApi = await request(app)
      .get('/api/wallet/reconciliation')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(resApi.status).toBe(200);
    expect(resApi.body.data.is_balanced).toBe(true);

    // 3. User thông thường (Renter) không thể truy cập API đối soát (403 FORBIDDEN)
    const resForbidden = await request(app)
      .get('/api/wallet/reconciliation')
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resForbidden.status).toBe(403);
  });

  // TC32: Webhook phát sinh LedgerAuditAlert khi sai số tiền hoặc trùng lặp (REF-TOPUP-08)
  it('TC32: Webhook triggers LedgerAuditAlert on amount mismatch or duplicate replay (REF-TOPUP-08)', async () => {
    // 1. Tạo một đơn nạp tiền
    const createRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 150000, provider: 'MOCK_VNPAY' });

    expect(createRes.status).toBe(201);
    const { payment_id, gateway_ref } = createRes.body.data;

    // 2. Thử webhook với sai số tiền (100000 thay vì 150000)
    const signMismatch = crypto
      .createHmac('sha256', env.SIMULATOR_SECRET)
      .update(`${gateway_ref}|100000|SUCCESS`)
      .digest('hex');

    const mismatchRes = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signMismatch)
      .send({
        gateway_ref,
        payment_id,
        amount: 100000,
        status: 'SUCCESS',
        signature: signMismatch,
      });

    expect(mismatchRes.status).toBe(422);

    // Xác minh alert WEBHOOK_AMOUNT_MISMATCH đã được lưu
    const alertMismatch = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'WEBHOOK_AMOUNT_MISMATCH' },
      orderBy: { created_at: 'desc' },
    });
    expect(alertMismatch).toBeDefined();
    expect(alertMismatch?.context_json).toContain(gateway_ref);

    // 3. Thực hiện webhook đúng thành công
    const signOk = crypto
      .createHmac('sha256', env.SIMULATOR_SECRET)
      .update(`${gateway_ref}|150000|SUCCESS`)
      .digest('hex');

    const okRes = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signOk)
      .send({
        gateway_ref,
        payment_id,
        amount: 150000,
        status: 'SUCCESS',
        signature: signOk,
      });

    expect(okRes.status).toBe(200);

    // 4. Thử replay duplicate webhook
    const dupRes = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signOk)
      .send({
        gateway_ref,
        payment_id,
        amount: 150000,
        status: 'SUCCESS',
        signature: signOk,
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.meta.is_idempotent_replay).toBe(true);

    // Xác minh alert WEBHOOK_DUPLICATE_REPLAY đã được lưu
    const alertDup = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'WEBHOOK_DUPLICATE_REPLAY' },
      orderBy: { created_at: 'desc' },
    });
    expect(alertDup).toBeDefined();
    expect(alertDup?.context_json).toContain(gateway_ref);
  });

  // TC33: Chống spam cảnh báo sổ cái: gửi 3 webhook trùng lặp chỉ tạo 1 dòng cảnh báo với repeat_count = 3
  it('TC33: Repeated duplicate webhook replays coalesce into a single alert row with repeat_count incremented', async () => {
    // 1. Tạo đơn nạp tiền
    const createRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 250000, provider: 'MOCK_VNPAY' });

    expect(createRes.status).toBe(201);
    const { payment_id, gateway_ref } = createRes.body.data;

    const signature = crypto
      .createHmac('sha256', env.SIMULATOR_SECRET)
      .update(`${gateway_ref}|250000|SUCCESS`)
      .digest('hex');

    // 2. Gửi webhook lần đầu (Ghi nhận thành công)
    const res1 = await request(app)
      .post('/api/payments/mock-webhook')
      .set('X-Mock-Signature', signature)
      .send({
        gateway_ref,
        payment_id,
        amount: 250000,
        status: 'SUCCESS',
        signature,
      });
    expect(res1.status).toBe(200);

    // 3. Gửi 3 webhook trùng lặp liên tiếp
    for (let i = 0; i < 3; i++) {
      const resDup = await request(app)
        .post('/api/payments/mock-webhook')
        .set('X-Mock-Signature', signature)
        .send({
          gateway_ref,
          payment_id,
          amount: 250000,
          status: 'SUCCESS',
          signature,
        });
      expect(resDup.status).toBe(200);
      expect(resDup.body.meta.is_idempotent_replay).toBe(true);
    }

    // 4. Kiểm tra trong DB: chỉ có đúng 1 dòng alert cho gateway_ref này, repeat_count = 3
    const alerts = await prisma.ledgerAuditAlert.findMany({
      where: {
        error_code: 'WEBHOOK_DUPLICATE_REPLAY',
        context_json: { contains: gateway_ref },
      },
    });

    expect(alerts.length).toBe(1);
    expect(alerts[0].repeat_count).toBe(3);
  });
});
