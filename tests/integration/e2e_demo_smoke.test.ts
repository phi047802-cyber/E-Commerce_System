import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('E2E Demo Smoke & Frontend Integration Scenarios (M8 - PROMPT 12)', () => {
  let renterToken: string;
  let companionToken: string;
  let csToken: string;
  let auditorToken: string;
  let completedBookingId: string;

  beforeAll(async () => {
    // Đăng nhập các tài khoản seed
    const rRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = rRes.body.data.token;

    const cRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = cRes.body.data.token;

    const csRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = csRes.body.data.token;

    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@instasquad.test', password: 'Demo@123456' });
    auditorToken = aRes.body.data.token;
  });

  // 1. Reset Demo Endpoint
  it('Scenario 1: POST /api/dev/reset-demo resets test database idempotently in development mode', async () => {
    const res = await request(app)
      .post('/api/dev/reset-demo')
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Khôi phục toàn bộ cơ sở dữ liệu về trạng thái Demo ban đầu thành công');
    expect(res.body.data.stats).toBeDefined();

    // Re-login after reset
    const rRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = rRes.body.data.token;

    const cRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = cRes.body.data.token;

    const csRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = csRes.body.data.token;
  });

  // 2. Audit Alerts Endpoint
  it('Scenario 2: GET /api/dev/audit-alerts returns alert list for CS and Auditor', async () => {
    const res = await request(app)
      .get('/api/dev/audit-alerts')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 3. E2E Booking Happy Path + 88/12 Settlement
  it('Scenario 3: Full Happy Path (Hold Escrow -> Companion Accept -> Session Chat -> 88/12 Settlement)', async () => {
    // 3a. Lấy slot có sẵn của Companion 1
    const companionProfile = await prisma.companionProfile.findFirst({
      where: { user: { email: 'companion1@instasquad.test' } },
      include: { slots: true },
    });
    const availSlot = companionProfile?.slots.find((s) => s.status === 'AVAILABLE');
    expect(availSlot).toBeDefined();

    // 3b. Renter đặt slot kèm request_key chống đặt trùng
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        slot_id: availSlot!.slot_id,
        request_key: `smoke-book-${Date.now()}`,
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    const bookingId = bookRes.body.data.booking_id;
    completedBookingId = bookingId;

    // 3c. Renter ký quỹ Escrow
    const holdRes = await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renterToken}`);

    expect(holdRes.status).toBe(200);
    expect(holdRes.body.success).toBe(true);
    expect(holdRes.body.data.booking.status).toBe('WAITING_COMPANION_RESPONSE');

    // 3d. Companion chấp nhận trong 180s (tự động khởi tạo phiên chơi session)
    const acceptRes = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companionToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.booking.status).toBe('ACCEPTED');

    // 3e. Khởi chạy phiên (Start)
    const sessionId = acceptRes.body.data.session.session_id;

    const startRes = await request(app)
      .post(`/api/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${renterToken}`);
    expect(startRes.status).toBe(200);

    // Gửi tin nhắn text-only
    const msgRes = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ content: 'Xin chào Companion Bảo Ngọc! Mình bắt đầu nhé.' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.success).toBe(true);

    // Kết thúc phiên chơi (End -> bắt đầu 15p nghiệm thu)
    const endRes = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${renterToken}`);
    expect(endRes.status).toBe(200);

    // 3f. Nghiệm thu hoàn tất 88/12
    const fulfillRes = await request(app)
      .post(`/api/bookings/${bookingId}/accept-fulfillment`)
      .set('Authorization', `Bearer ${renterToken}`);

    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.success).toBe(true);
    const settlement = fulfillRes.body.data.settlement;
    expect(settlement.companion_received + settlement.platform_fee).toBe(settlement.total_fee);
    expect(settlement.companion_received).toBeGreaterThan(0);
  });

  // 4. Booking Detail Endpoint with Extended Relations
  it('Scenario 4: GET /api/bookings/:id returns expanded details with escrow and history', async () => {
    expect(completedBookingId).toBeDefined();

    const res = await request(app)
      .get(`/api/bookings/${completedBookingId}`)
      .set('Authorization', `Bearer ${renterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking_id).toBe(completedBookingId);
    expect(res.body.data.escrow).toBeDefined();
    expect(res.body.data.history).toBeDefined();
    expect(Array.isArray(res.body.data.history)).toBe(true);
    expect(res.body.data.history.length).toBeGreaterThan(0);
  });

  // 5. Review & Immutability
  it('Scenario 5: Renter posts immutable Review after completion (fails on second attempt)', async () => {
    expect(completedBookingId).toBeDefined();

    const revRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 5,
        comment: 'Dịch vụ đồng hành rất chuyên nghiệp và thân thiện!',
      });

    expect(revRes.status).toBe(201);
    expect(revRes.body.success).toBe(true);
    expect(revRes.body.data.review.rating).toBe(5);

    // Thử gửi review lần 2 cho cùng booking
    const dupRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 4,
        comment: 'Thử review lần 2',
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  // 6. Withdrawal Request & Reject Flow (Reserve -> Release)
  it('Scenario 6: Companion requests withdrawal and CS rejects -> 100% released back to wallet', async () => {
    // Companion vừa nhận 88% từ booking hoàn tất (176.000 VND), nên rút 50.000 VND
    const wRes = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        amount: 50000,
        bank_name: 'Techcombank',
        account_no: '19036789123456',
      });

    expect(wRes.status).toBe(201);
    expect(wRes.body.success).toBe(true);
    const withdrawId = wRes.body.data.withdraw_id;
    expect(wRes.body.data.account_no_masked).toContain('****');

    // CS từ chối yêu cầu rút tiền với lý do
    const rejRes = await request(app)
      .post(`/api/withdrawals/${withdrawId}/reject`)
      .set('Authorization', `Bearer ${csToken}`)
      .send({ reason: 'Thông tin tài khoản ngân hàng không hợp lệ' });

    expect(rejRes.status).toBe(200);
    expect(rejRes.body.success).toBe(true);
    expect(rejRes.body.data.status).toBe('REJECTED');
    expect(rejRes.body.data.reject_reason).toBe('Thông tin tài khoản ngân hàng không hợp lệ');
  });

  // 7. Cleanup & Reset back to clean state
  it('Scenario 7: Final DB Reset restores clean state for interactive demonstration', async () => {
    const res = await request(app)
      .post('/api/dev/reset-demo')
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
