import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';

/**
 * `POST /api/payments/simulate` không yêu cầu đăng nhập và tự ký webhook hợp lệ → chỉ được hoạt động ở môi trường demo
 * (NODE_ENV ≠ production và PAYMENT_PROVIDER = simulator). Ngoài ra phải từ chối và không cộng tiền.
 */
describe('Chặn cổng thanh toán giả lập ngoài môi trường demo', () => {
  let renter1: string;
  const original = { NODE_ENV: env.NODE_ENV, PAYMENT_PROVIDER: env.PAYMENT_PROVIDER };

  beforeAll(async () => {
    renter1 = (await request(app).post('/api/auth/login').send({ email: 'renter1@instasquad.test', password: 'Demo@123456' })).body.data.token;
  });

  afterEach(() => {
    Object.assign(env, original);
  });

  const createTopup = async () => {
    const res = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1}`)
      .send({ amount: 50000, provider: 'SIMULATOR' });
    expect(res.status).toBe(201);
    return res.body.data.payment_id as string;
  };

  const balance = async () => (await prisma.wallet.findUniqueOrThrow({ where: { user_id: 'u-renter-01' } })).available_balance;

  it.each([
    ['NODE_ENV=production', { NODE_ENV: 'production' }],
    ['PAYMENT_PROVIDER=sepay', { PAYMENT_PROVIDER: 'sepay' }],
  ])('%s → 403 SIMULATOR_DISABLED, không cộng tiền', async (_label, override) => {
    const paymentId = await createTopup();
    const before = await balance();
    Object.assign(env, override);
    const res = await request(app).post('/api/payments/simulate').send({ payment_id: paymentId, outcome: 'SUCCESS' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SIMULATOR_DISABLED');
    expect(await balance()).toBe(before);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { payment_id: paymentId } });
    expect(payment.status).toBe('PENDING');
  });

  it('môi trường demo (simulator, không phải production) → vẫn giả lập được', async () => {
    // Dùng FAILED: chứng minh endpoint hoạt động mà không đổi số dư ví seed (các file test sau kỳ vọng số dư cố định).
    // Kịch bản SUCCESS cộng tiền đã được ledger_wallet_payment / sepay_webhook_topup kiểm tra.
    const paymentId = await createTopup();
    const before = await balance();
    const res = await request(app).post('/api/payments/simulate').send({ payment_id: paymentId, outcome: 'FAILED' });
    expect(res.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { payment_id: paymentId } })).status).toBe('FAILED');
    expect(await balance()).toBe(before);
  });
});
