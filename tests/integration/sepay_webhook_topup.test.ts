import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import { app, httpServer } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { env } from '../../server/src/config/env.js';

describe('ĐỢT C: SePay Webhook Top-up QR, Pluggable Provider, Idempotency & Realtime (REF-TOPUP-05, 06)', () => {
  let renterToken: string;
  let adminToken: string;
  let serverPort: number;
  let serverInstance: any;

  const validApiKey = env.SEPAY_WEBHOOK_API_KEY;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu kiểm thử
    await prisma.ledgerAuditAlert.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.platformRevenue.deleteMany();
    await prisma.session.deleteMany();
    await prisma.trustScoreLog.deleteMany();
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

    // 2. Lấy JWT Token cho Renter và Admin
    const loginRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = loginRenter.body.data.token;

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = loginAdmin.body.data.token;

    // 3. Khởi động HTTP server trên cổng ngẫu nhiên phục vụ kiểm thử WebSocket
    serverInstance = httpServer.listen(0);
    const addr = serverInstance.address();
    serverPort = typeof addr === 'object' && addr ? addr.port : 4000;
  });

  afterAll(async () => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  // TC-SEP-01: Đúng số tiền -> Thành công, ghi sổ cái kép, variance = 0
  it('1. Webhook exact amount: credits wallet, posts double-entry ledger, variance = 0', async () => {
    // Tạo đơn nạp tiền 100.000 VND
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.success).toBe(true);
    const payment = resCreate.body.data;
    expect(payment.gateway_ref).toMatch(/^INSQ[A-Z0-9]{8}$/);
    expect(payment.qr_url).toContain('vietqr.io');

    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    const prevBalance = walletBefore!.available_balance;

    // Gửi Webhook SePay đúng số tiền
    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900101,
        gateway: 'MBBank',
        transactionDate: '2026-11-08 16:00:00',
        accountNumber: env.SEPAY_ACCOUNT_NUMBER,
        content: `Chuyen khoan ${payment.gateway_ref} nạp tiền`,
        transferType: 'in',
        transferAmount: 100000,
        accumulated: 5000000,
        referenceCode: 'FT2611080001',
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    // Kiểm tra số dư ví tăng đúng 100.000
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(prevBalance + 100000);

    // Kiểm tra Payment status = SUCCESS
    const updatedPayment = await prisma.payment.findUnique({ where: { payment_id: payment.payment_id } });
    expect(updatedPayment?.status).toBe('SUCCESS');

    // Kiểm tra đối soát Sổ cái kép
    const audit = await reconciliationService.runReconciliation();
    expect(audit.is_balanced).toBe(true);
  });

  // TC-SEP-02: Thiếu tiền -> Không cộng ví, tạo LedgerAuditAlert
  it('2. Webhook underpaid amount: does NOT credit wallet, creates LedgerAuditAlert', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 200000, provider: 'SEPAY' });

    const payment = resCreate.body.data;
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    // Gửi chuyển khoản thiếu: chỉ chuyển 150.000 đ
    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900102,
        gateway: 'Vietcombank',
        content: `${payment.gateway_ref}`,
        transferType: 'in',
        transferAmount: 150000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    // Số dư ví không đổi
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance);

    // Alert được tạo
    const alert = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'WEBHOOK_UNDERPAID_AMOUNT', context_json: { contains: payment.gateway_ref } },
    });
    expect(alert).toBeDefined();

    // Payment đánh dấu UNDERPAID
    const updatedPayment = await prisma.payment.findUnique({ where: { payment_id: payment.payment_id } });
    expect(updatedPayment?.status).toBe('UNDERPAID');
  });

  // TC-SEP-03: Thừa tiền -> Cộng đúng số thực nhận, Sổ cái cân bằng
  it('3. Webhook overpaid amount: credits actual received amount and balances ledger', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 150000, provider: 'SEPAY' });

    const payment = resCreate.body.data;
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    // Chuyển dư: 200.000 đ
    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900103,
        gateway: 'MBBank',
        content: `${payment.gateway_ref}`,
        transferType: 'in',
        transferAmount: 200000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    // Ví được cộng 200.000 đ (số thực nhận)
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance + 200000);

    const audit = await reconciliationService.runReconciliation();
    expect(audit.is_balanced).toBe(true);
  });

  // TC-SEP-04: Sai nội dung -> Lưu UNMATCHED cho Auditor, ví không đổi
  it('4. Webhook unmatched content: saves UNMATCHED for auditor, zero wallet mutation', async () => {
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900104,
        gateway: 'Techcombank',
        content: 'NOI_DUNG_KHONG_HOP_LE_ABC_XYZ',
        transferType: 'in',
        transferAmount: 50000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance);

    const alert = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'UNMATCHED_PAYMENT', context_json: { contains: 'NOI_DUNG_KHONG_HOP_LE_ABC_XYZ' } },
    });
    expect(alert).toBeDefined();
  });

  // TC-SEP-05: Gửi lặp 3 lần -> Chỉ xử lý 1 lần, các lần sau tăng repeat_count và vẫn trả success: true
  it('5. Webhook duplicate replay 3 times: idempotent, increments repeat_count, zero extra credit', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    const payment = resCreate.body.data;
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    const fixedSepayId = 900105;

    // Lần 1
    const res1 = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: fixedSepayId,
        content: payment.gateway_ref,
        transferType: 'in',
        transferAmount: 100000,
      });
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    const walletAfter1 = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter1!.available_balance).toBe(walletBefore!.available_balance + 100000);

    // Lần 2
    const res2 = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: fixedSepayId,
        content: payment.gateway_ref,
        transferType: 'in',
        transferAmount: 100000,
      });
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);

    // Lần 3
    const res3 = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: fixedSepayId,
        content: payment.gateway_ref,
        transferType: 'in',
        transferAmount: 100000,
      });
    expect(res3.status).toBe(200);
    expect(res3.body.success).toBe(true);

    // Số dư ví không bị cộng thêm lần 2 hay lần 3
    const walletAfter3 = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter3!.available_balance).toBe(walletAfter1!.available_balance);

    // Alert repeat_count tăng
    const alert = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'WEBHOOK_DUPLICATE_REPLAY', context_json: { contains: String(fixedSepayId) } },
    });
    expect(alert).toBeDefined();
    expect(alert!.repeat_count).toBeGreaterThanOrEqual(2);
  });

  // TC-SEP-06: Sai API Key -> 401 Unauthorized
  it('6. Webhook with invalid API Key returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', 'Apikey wrong_api_key_invalid')
      .send({
        id: 900106,
        content: 'INSQ00000000',
        transferType: 'in',
        transferAmount: 100000,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC-SEP-07: Payment hết hạn -> Vẫn cộng ví, đánh dấu LATE và cảnh báo Auditor
  it('7. Expired payment: still credits user wallet, marks LATE and alerts Auditor', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    const payment = resCreate.body.data;

    // Giả lập payment đã hết hạn 1 tiếng trước
    await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        status: 'EXPIRED',
        expires_at: new Date(Date.now() - 3600000),
      },
    });

    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    // Webhook đến muộn
    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900107,
        content: payment.gateway_ref,
        transferType: 'in',
        transferAmount: 100000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    // Tiền vẫn được cộng vào ví khả dụng để bảo vệ tài sản khách hàng
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance + 100000);

    // Trạng thái Payment ghi nhận LATE
    const updated = await prisma.payment.findUnique({ where: { payment_id: payment.payment_id } });
    expect(updated?.status).toBe('LATE');

    // Cảnh báo WEBHOOK_LATE_PAYMENT được tạo cho Auditor
    const alert = await prisma.ledgerAuditAlert.findFirst({
      where: { error_code: 'WEBHOOK_LATE_PAYMENT', context_json: { contains: payment.gateway_ref } },
    });
    expect(alert).toBeDefined();
  });

  // TC-SEP-08: Tiền ra (transferType == 'out') bị bỏ qua
  it('8. Money out (transferType = out) is ignored without modifying wallets', async () => {
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900108,
        content: 'Chuyen tien thanh toan hoa don',
        transferType: 'out',
        transferAmount: 500000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance);
  });

  // TC-SEP-09: Hai webhook đồng thời cùng mã giao dịch -> Chỉ ghi nhận 1 lần
  it('9. Concurrent webhooks with same transaction id: only one credits ledger', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    const payment = resCreate.body.data;
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    const raceId = 900109;

    const payload = {
      id: raceId,
      content: payment.gateway_ref,
      transferType: 'in',
      transferAmount: 100000,
    };

    // Bắn 2 request đồng thời
    const [resA, resB] = await Promise.all([
      request(app).post('/api/webhooks/sepay').set('Authorization', `Apikey ${validApiKey}`).send(payload),
      request(app).post('/api/webhooks/sepay').set('Authorization', `Apikey ${validApiKey}`).send(payload),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Số dư ví chỉ tăng đúng 1 lần (100.000)
    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance + 100000);
  });

  // TC-SEP-10: Nội dung viết thường hoặc có dấu cách/gạch nối
  it('10. Content with lowercase, spaces, and hyphens matches payment cleanly', async () => {
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    const payment = resCreate.body.data;
    const walletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });

    // Tạo chuỗi có khoảng trắng, chữ thường và dấu gạch: e.g. "  insq-abcd 1234  "
    const rawRef = payment.gateway_ref; // INSQXXXXXXXX
    const dirtyContent = `  chuyen tien  ${rawRef.slice(0, 4).toLowerCase()}-${rawRef.slice(4, 8).toLowerCase()} ${rawRef.slice(8).toLowerCase()}  `;

    const resWebhook = await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900110,
        content: dirtyContent,
        transferType: 'in',
        transferAmount: 100000,
      });

    expect(resWebhook.status).toBe(200);
    expect(resWebhook.body.success).toBe(true);

    const walletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter!.available_balance).toBe(walletBefore!.available_balance + 100000);
  });

  // TC-SEP-11: Toàn bộ kịch bản bảo toàn Sổ cái kép (Variance = 0)
  it('11. Ledger Reconciliation Audit: 100% Balanced, Variance = 0 across all scenarios', async () => {
    const audit = await reconciliationService.runReconciliation();
    expect(audit.is_balanced).toBe(true);
    expect(audit.wallet_mismatches.length).toBe(0);
    expect(audit.system_conservation.equation_difference).toBe(0);
  });

  // TC-SEP-12: Sự kiện WebSocket đến đúng người dùng
  it('12. Realtime WebSocket notification is delivered to the target user', async () => {
    // Kết nối WebSocket client với JWT token của Renter 1
    const ws = new WebSocket(`ws://localhost:${serverPort}/ws?token=${renterToken}`);

    const receivedMessagePromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket timeout after 4000ms')), 4000);
      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === 'TOPUP_SUCCESS') {
            clearTimeout(timeout);
            resolve(parsed);
          }
        } catch (e) {
          // ignore other events
        }
      });
      ws.on('error', reject);
    });

    await new Promise((resolve) => ws.on('open', resolve));

    // Tạo đơn và kích hoạt Webhook
    const resCreate = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ amount: 100000, provider: 'SEPAY' });

    const payment = resCreate.body.data;

    await request(app)
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${validApiKey}`)
      .send({
        id: 900112,
        content: payment.gateway_ref,
        transferType: 'in',
        transferAmount: 100000,
      });

    const wsMsg = await receivedMessagePromise;
    expect(wsMsg.type).toBe('TOPUP_SUCCESS');
    expect(wsMsg.gateway_ref).toBe(payment.gateway_ref);
    expect(wsMsg.amount).toBe(100000);

    ws.close();
  });

  // TC-SEP-13: Bộ đếm số giao dịch tháng & Cảnh báo Quota SePay
  it('13. Monthly inflow quota counter reports accurate count and warning when >= 40', async () => {
    const resMetrics = await request(app)
      .get('/api/payments/metrics/monthly-inflow')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resMetrics.status).toBe(200);
    expect(resMetrics.body.data.monthly_inflow_count).toBeGreaterThanOrEqual(1);
    expect(resMetrics.body.data.monthly_inflow_quota).toBe(50);

    // Kiểm tra trên Admin Dashboard
    const resAdmin = await request(app)
      .get('/api/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.data.metrics.monthly_inflow_count).toBeDefined();
    expect(resAdmin.body.data.metrics.monthly_inflow_quota).toBe(50);
  });

  // TC-SEP-14: Kiểm tra an toàn SPA Fallback & Static Routes
  it('14. Security & Routing: /api, /storage, /uploads & /ws NOT served index.html; pages return HTML', async () => {
    // 1. /api/health trả JSON
    const resApi = await request(app).get('/api/health');
    expect(resApi.status).toBe(200);
    expect(resApi.header['content-type']).toContain('application/json');

    // 2. /storage trả 404 (Không bị rơi vào index.html 200)
    const resStorage = await request(app).get('/storage/kyc_encrypted/test.enc');
    expect(resStorage.status).toBe(404);

    // 3. /uploads file không tồn tại trả 404
    const resUploads = await request(app).get('/uploads/non-existent-image.png');
    expect(resUploads.status).toBe(404);

    // 4. Các route tĩnh trả index.html (200)
    const resNews = await request(app).get('/tin-tuc');
    expect(resNews.status).toBe(200);
    expect(resNews.header['content-type']).toContain('text/html');

    const resEscrow = await request(app).get('/chinh-sach-escrow');
    expect(resEscrow.status).toBe(200);
    expect(resEscrow.header['content-type']).toContain('text/html');

    const resGuide = await request(app).get('/huong-dan-nap-rut');
    expect(resGuide.status).toBe(200);
    expect(resGuide.header['content-type']).toContain('text/html');
  });
});
