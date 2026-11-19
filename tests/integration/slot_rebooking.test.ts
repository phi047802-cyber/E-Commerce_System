import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

/**
 * D45 — Đặt lại slot đã được giải phóng.
 * Trước đây `bookings.slot_id` UNIQUE toàn cột: slot trở về AVAILABLE sau khi từ chối / hủy nhưng đặt lại → HTTP 500.
 * Nay: filtered unique index (status <> 'CANCELLED') + xử lý đơn giữ chỗ quá hạn trong transaction đặt lịch.
 * Dữ liệu tạo qua API thật (nạp tiền qua Payment Simulator) để sổ cái luôn nhất quán; không xóa khi kết thúc.
 */
describe('D45 — Đặt lại slot đã giải phóng (reject / cancel / giữ chỗ hết hạn)', () => {
  const RUN = `test-rb-${Date.now()}-`;
  let renter1: string;
  let renter2: string;
  let companion1: string;
  let companion2: string;
  let slotSeq = 0;

  const login = async (email: string) =>
    (await request(app).post('/api/auth/login').send({ email, password: 'Demo@123456' })).body.data.token as string;

  /** Slot 1 giờ của Companion 1, mỗi slot một ngày khác nhau để không chạm trần 10 giờ/ngày. */
  const newSlot = async () => {
    slotSeq += 1;
    const start = new Date();
    start.setDate(start.getDate() + 20 + slotSeq);
    start.setHours(10, 0, 0, 0);
    const slot = await prisma.slotCalendar.create({
      data: {
        slot_id: `${RUN}slot-${slotSeq}`,
        profile_id: 'prof-comp-01',
        start_time: start,
        end_time: new Date(start.getTime() + 3600_000),
        status: 'AVAILABLE',
      },
    });
    return slot.slot_id;
  };

  const book = (token: string, slotId: string, tag: string) =>
    request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ slot_id: slotId, request_key: `${RUN}${tag}-${Math.random().toString(36).slice(2, 8)}` });

  const hold = (token: string, bookingId: string) =>
    request(app).post(`/api/bookings/${bookingId}/hold-escrow`).set('Authorization', `Bearer ${token}`);

  const topup = async (token: string, amount: number) => {
    const p = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount, provider: 'SIMULATOR' });
    expect(p.status).toBe(201);
    const s = await request(app).post('/api/payments/simulate').send({ payment_id: p.body.data.payment_id, outcome: 'SUCCESS' });
    expect(s.status).toBe(200);
  };

  const activeBookingsOnSlot = (slotId: string) =>
    prisma.booking.findMany({ where: { slot_id: slotId, status: { not: 'CANCELLED' } } });

  beforeAll(async () => {
    renter1 = await login('renter1@instasquad.test');
    renter2 = await login('renter2@instasquad.test');
    companion1 = await login('companion1@instasquad.test');
    companion2 = await login('companion2@instasquad.test');
    await prisma.companionProfile.update({ where: { profile_id: 'prof-comp-01' }, data: { trust_score: 95, profile_status: 'ACTIVE' } });
    await topup(renter1, 1_000_000);
    await topup(renter2, 1_000_000);
  });

  it('RB-01: Companion từ chối → slot AVAILABLE → Renter khác đặt lại được (trước đây 500)', async () => {
    const slotId = await newSlot();
    const b1 = await book(renter1, slotId, 'rb01a');
    expect(b1.status).toBe(201);
    expect((await hold(renter1, b1.body.data.booking_id)).status).toBe(200);

    // Ký quỹ giữ slot tới hết hạn phản hồi 180s (không để hết hạn giữ chỗ 10 phút trong lúc chờ Companion)
    const afterHold = await prisma.booking.findUniqueOrThrow({ where: { booking_id: b1.body.data.booking_id }, include: { slot: true } });
    expect(afterHold.slot.status).toBe('HELD');
    expect(afterHold.slot.held_until!.getTime()).toBeGreaterThanOrEqual(afterHold.response_deadline.getTime());

    const rej = await request(app)
      .post(`/api/bookings/${b1.body.data.booking_id}/reject`)
      .set('Authorization', `Bearer ${companion1}`)
      .send({ reason: 'Bận đột xuất' });
    expect(rej.status).toBe(200);
    expect((await prisma.slotCalendar.findUniqueOrThrow({ where: { slot_id: slotId } })).status).toBe('AVAILABLE');

    const b2 = await book(renter2, slotId, 'rb01b');
    expect(b2.status).toBe(201);
    expect(b2.body.data.status).toBe('PENDING_ACCEPTANCE');
    expect((await hold(renter2, b2.body.data.booking_id)).status).toBe(200);

    const all = await prisma.booking.findMany({ where: { slot_id: slotId }, orderBy: { created_at: 'asc' } });
    expect(all.map((b) => b.status)).toEqual(['CANCELLED', 'WAITING_COMPANION_RESPONSE']);
  });

  it('RB-02: Renter hủy ≥ 30 phút → đặt lại được', async () => {
    const slotId = await newSlot();
    const b1 = await book(renter1, slotId, 'rb02a');
    expect((await hold(renter1, b1.body.data.booking_id)).status).toBe(200);
    const cancel = await request(app)
      .post(`/api/bookings/${b1.body.data.booking_id}/cancel`)
      .set('Authorization', `Bearer ${renter1}`)
      .send({ reason: 'Đổi lịch' });
    expect(cancel.status).toBe(200);

    const b2 = await book(renter2, slotId, 'rb02b');
    expect(b2.status).toBe(201);
    expect(await activeBookingsOnSlot(slotId)).toHaveLength(1);
  });

  it('RB-03: Giữ chỗ hết hạn khi CHƯA ký quỹ → người sau đặt được, đơn cũ bị hủy (HOLD_EXPIRED) và không ký quỹ được nữa', async () => {
    const slotId = await newSlot();
    const b1 = await book(renter1, slotId, 'rb03a');
    expect(b1.status).toBe(201);
    // Mô phỏng 10 phút giữ chỗ đã trôi qua
    await prisma.slotCalendar.update({ where: { slot_id: slotId }, data: { held_until: new Date(Date.now() - 1000) } });

    const b2 = await book(renter2, slotId, 'rb03b');
    expect(b2.status).toBe(201);

    const old = await prisma.booking.findUniqueOrThrow({
      where: { booking_id: b1.body.data.booking_id },
      include: { history: { orderBy: { changed_at: 'desc' }, take: 1 } },
    });
    expect(old.status).toBe('CANCELLED');
    expect(old.history[0].reason).toContain('HOLD_EXPIRED');

    // Người giữ chỗ cũ cố ký quỹ → bị chặn, ví không đổi, không tạo escrow / bút toán
    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { wallet_id: 'w-renter-01' } });
    const late = await hold(renter1, b1.body.data.booking_id);
    expect(late.status).toBeGreaterThanOrEqual(400);
    expect(late.status).toBeLessThan(500);
    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { wallet_id: 'w-renter-01' } });
    expect(walletAfter.available_balance).toBe(walletBefore.available_balance);
    expect(await prisma.escrow.findUnique({ where: { booking_id: b1.body.data.booking_id } })).toBeNull();
    expect(await prisma.ledgerTransaction.count({ where: { booking_id: b1.body.data.booking_id } })).toBe(0);
  });

  it('RB-04: Đơn ĐÃ ký quỹ không bị chiếm slot kể cả khi hạn giữ chỗ đã qua → 409, không đặt trùng', async () => {
    const slotId = await newSlot();
    const b1 = await book(renter1, slotId, 'rb04a');
    expect((await hold(renter1, b1.body.data.booking_id)).status).toBe(200);
    // Ép hạn giữ chỗ về quá khứ (lớp bảo vệ thứ hai: transaction đặt lịch kiểm tra đơn đã ký quỹ)
    await prisma.slotCalendar.update({ where: { slot_id: slotId }, data: { held_until: new Date(Date.now() - 1000) } });

    const b2 = await book(renter2, slotId, 'rb04b');
    expect(b2.status).toBe(409);
    expect(b2.body.error.code).toBe('SLOT_ALREADY_HELD');
    const active = await activeBookingsOnSlot(slotId);
    expect(active).toHaveLength(1);
    expect(active[0].booking_id).toBe(b1.body.data.booking_id);
    expect(active[0].status).toBe('WAITING_COMPANION_RESPONSE');
  });

  it('RB-05: Tầng DB chặn 2 đơn chưa hủy trên cùng slot (filtered unique index), cho phép nhiều đơn đã hủy', async () => {
    const slotId = await newSlot();
    const base = {
      renter_id: 'u-renter-02',
      profile_id: 'prof-comp-01',
      slot_id: slotId,
      start_time: new Date(Date.now() + 40 * 86400_000),
      duration_hours: 1,
      total_fee_snapshot: 100000,
      response_deadline: new Date(Date.now() + 180_000),
    };
    await prisma.booking.create({ data: { ...base, request_key: `${RUN}db-c1`, status: 'CANCELLED' } });
    await prisma.booking.create({ data: { ...base, request_key: `${RUN}db-c2`, status: 'CANCELLED' } });
    await prisma.booking.create({ data: { ...base, request_key: `${RUN}db-a1`, status: 'PENDING_ACCEPTANCE' } });
    await expect(
      prisma.booking.create({ data: { ...base, request_key: `${RUN}db-a2`, status: 'WAITING_COMPANION_RESPONSE' } })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('RB-06: Nhiều người cùng đặt lại một slot vừa giải phóng → đúng 1 thành công, không có lỗi 500', async () => {
    const slotId = await newSlot();
    const b1 = await book(renter1, slotId, 'rb06a');
    expect((await hold(renter1, b1.body.data.booking_id)).status).toBe(200);
    await request(app)
      .post(`/api/bookings/${b1.body.data.booking_id}/reject`)
      .set('Authorization', `Bearer ${companion1}`)
      .send({ reason: 'Từ chối để kiểm tra tranh chấp' });

    const results = await Promise.all([
      book(renter1, slotId, 'rb06-r1'),
      book(renter2, slotId, 'rb06-r2'),
      book(companion2, slotId, 'rb06-c2'),
    ]);
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.every((s) => s < 500)).toBe(true);
    expect(await activeBookingsOnSlot(slotId)).toHaveLength(1);
  });
});
