import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

/**
 * D46 — Companion xóa khung giờ từng có đơn đặt lịch.
 * Trước đây xóa cứng → lỗi khóa ngoại tầng DB (bookings.slot_id → slot_calendar, ON DELETE NO ACTION) khi slot có đơn cũ.
 * Nay: chưa từng có đơn → xóa cứng; có đơn đã hủy → xóa mềm (REMOVED); có đơn chưa kết thúc → từ chối.
 */
describe('D46 — Xóa khung giờ có lịch sử đơn đặt lịch', () => {
  const RUN = `test-sd-${Date.now()}-`;
  let companion1: string;
  let renter2: string;
  let seq = 0;

  const login = async (email: string) =>
    (await request(app).post('/api/auth/login').send({ email, password: 'Demo@123456' })).body.data.token as string;

  const slotTimes = () => {
    seq += 1;
    const start = new Date();
    start.setDate(start.getDate() + 45 + seq);
    start.setHours(9, 0, 0, 0);
    return { start, end: new Date(start.getTime() + 3600_000) };
  };

  const fixtureSlot = async () => {
    const { start, end } = slotTimes();
    return (
      await prisma.slotCalendar.create({
        data: { slot_id: `${RUN}slot-${seq}`, profile_id: 'prof-comp-01', start_time: start, end_time: end, status: 'AVAILABLE' },
      })
    ).slot_id;
  };

  const fixtureBooking = (slotId: string, status: string, tag: string) =>
    prisma.booking.create({
      data: {
        renter_id: 'u-renter-02',
        profile_id: 'prof-comp-01',
        slot_id: slotId,
        request_key: `${RUN}${tag}`,
        start_time: new Date(Date.now() + 50 * 86400_000),
        duration_hours: 1,
        total_fee_snapshot: 100000,
        status,
        response_deadline: new Date(Date.now() + 180_000),
      },
    });

  const del = (slotId: string) =>
    request(app).delete(`/api/companion/slots/${slotId}`).set('Authorization', `Bearer ${companion1}`);

  beforeAll(async () => {
    companion1 = await login('companion1@instasquad.test');
    renter2 = await login('renter2@instasquad.test');
    await prisma.companionProfile.update({ where: { profile_id: 'prof-comp-01' }, data: { trust_score: 95, profile_status: 'ACTIVE' } });
  });

  it('SD-01: slot chưa từng có đơn → xóa hẳn', async () => {
    const slotId = await fixtureSlot();
    const res = await del(slotId);
    expect(res.status).toBe(200);
    expect(res.body.data.soft_deleted).toBe(false);
    expect(await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } })).toBeNull();
  });

  it('SD-02: slot có đơn đã hủy → xóa mềm: giữ lịch sử, ẩn khỏi mọi danh sách, không đặt được, tạo lại trùng giờ được', async () => {
    const slotId = await fixtureSlot();
    const cancelled = await fixtureBooking(slotId, 'CANCELLED', 'sd02');

    const res = await del(slotId);
    expect(res.status).toBe(200);
    expect(res.body.data.soft_deleted).toBe(true);
    expect((await prisma.slotCalendar.findUniqueOrThrow({ where: { slot_id: slotId } })).status).toBe('REMOVED');
    expect(await prisma.booking.findUnique({ where: { booking_id: cancelled.booking_id } })).not.toBeNull();

    const publicSlots = await request(app).get('/api/companions/prof-comp-01/slots');
    expect(publicSlots.body.data.some((s: { slot_id: string }) => s.slot_id === slotId)).toBe(false);
    const detail = await request(app).get('/api/companions/prof-comp-01');
    expect(detail.body.data.slots.some((s: { slot_id: string }) => s.slot_id === slotId)).toBe(false);
    const mine = await request(app).get('/api/companion/slots').set('Authorization', `Bearer ${companion1}`);
    expect(mine.body.data.some((s: { slot_id: string }) => s.slot_id === slotId)).toBe(false);

    const book = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter2}`)
      .send({ slot_id: slotId, request_key: `${RUN}sd02-book` });
    expect(book.status).toBe(404);

    const removedSlot = await prisma.slotCalendar.findUniqueOrThrow({ where: { slot_id: slotId } });
    const recreate = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companion1}`)
      .send({ start_time: removedSlot.start_time.toISOString(), end_time: removedSlot.end_time.toISOString() });
    expect(recreate.status).toBe(201);
  });

  it('SD-03: slot có đơn chưa kết thúc → từ chối xóa, slot giữ nguyên', async () => {
    const slotId = await fixtureSlot();
    await fixtureBooking(slotId, 'CANCELLED', 'sd03-old');
    await fixtureBooking(slotId, 'PENDING_ACCEPTANCE', 'sd03-live');
    // Giữ chỗ đã quá hạn nhưng đơn chưa bị hủy → vẫn không được xóa
    await prisma.slotCalendar.update({ where: { slot_id: slotId }, data: { status: 'HELD', held_until: new Date(Date.now() - 1000) } });

    const res = await del(slotId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('SLOT_HAS_ACTIVE_BOOKING');
    expect((await prisma.slotCalendar.findUniqueOrThrow({ where: { slot_id: slotId } })).status).toBe('HELD');
  });

  it('SD-04: xóa lại slot đã xóa mềm → idempotent, không lỗi', async () => {
    const slotId = await fixtureSlot();
    await fixtureBooking(slotId, 'CANCELLED', 'sd04');
    expect((await del(slotId)).status).toBe(200);
    const again = await del(slotId);
    expect(again.status).toBe(200);
    expect(again.body.data.soft_deleted).toBe(true);
  });
});
