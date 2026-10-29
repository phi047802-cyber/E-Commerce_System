import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('Booking & Slot Hold Module (BR-01, BR-03, BR-04, TC01-TC06, TC15)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let csToken: string;

  const TEST_PREFIX = 'test-bk-';

  // Future dates helper
  const getFutureDate = (daysAhead: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const cleanupData = async () => {
    // Xóa booking status history liên quan đến test bookings
    const testBookings = await prisma.booking.findMany({
      where: { request_key: { startsWith: TEST_PREFIX } },
      select: { booking_id: true },
    });
    const bookingIds = testBookings.map((b) => b.booking_id);

    if (bookingIds.length > 0) {
      await prisma.bookingStatusHistory.deleteMany({
        where: { booking_id: { in: bookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { booking_id: { in: bookingIds } },
      });
    }

    // Xóa các slots tạo phục vụ test
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });

    // Reset lại hourly rate cho companion 1
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: {
        hourly_rate: 100000,
        trust_score: 95.0,
      },
    });
  };

  beforeAll(async () => {
    await cleanupData();

    // 1. Đăng nhập các vai trò
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

    // 2. Tạo các test slots cố định trong tương lai
    // Slot 1: Dùng cho TC01 & TC01b (Ngày +2, 14:00 - 16:00, 2 tiếng)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-01`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(2, 14),
        end_time: getFutureDate(2, 16),
        status: 'AVAILABLE',
      },
    });

    // Slot 2: Dùng cho TC02 (Ngày +2, 16:00 - 18:00, 2 tiếng)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-02`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(2, 16),
        end_time: getFutureDate(2, 18),
        status: 'AVAILABLE',
      },
    });

    // Slot 3: Dùng cho TC04 Concurrency Race (Ngày +2, 19:00 - 21:00, 2 tiếng)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-race`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(2, 19),
        end_time: getFutureDate(2, 21),
        status: 'AVAILABLE',
      },
    });

    // Slot 4: Dùng cho TC05 Fee Snapshot (Ngày +3, 10:00 - 12:00, 2 tiếng)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-snapshot`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(3, 10),
        end_time: getFutureDate(3, 12),
        status: 'AVAILABLE',
      },
    });

    // Slot 5: Dùng cho TC06 Expired Hold Reclaim (Ngày +3, 14:00 - 16:00, HELD nhưng expired)
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-expired`,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(3, 14),
        end_time: getFutureDate(3, 16),
        status: 'HELD',
        held_until: new Date(Date.now() - 15 * 60 * 1000), // hết hạn từ 15 phút trước
      },
    });

    // Slot 6: Dùng cho kiểm tra slot trong quá khứ
    await prisma.slotCalendar.create({
      data: {
        slot_id: `${TEST_PREFIX}slot-past`,
        profile_id: 'prof-comp-01',
        start_time: new Date(Date.now() - 7200 * 1000),
        end_time: new Date(Date.now() - 3600 * 1000),
        status: 'AVAILABLE',
      },
    });
  });

  afterAll(async () => {
    await cleanupData();
  });

  // TC01: Idempotency with exact key and payload
  it('TC01: Re-sending identical request_key and payload returns existing booking with is_idempotent_replay: true', async () => {
    const requestKey = `${TEST_PREFIX}req-tc01-alpha`;
    const slotId = `${TEST_PREFIX}slot-01`;

    // Lần gọi 1: Tạo mới thành công -> 201 Created
    const resFirst = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 2,
      });

    expect(resFirst.status).toBe(201);
    expect(resFirst.body.success).toBe(true);
    expect(resFirst.body.data.booking_id).toBeDefined();
    expect(resFirst.body.data.status).toBe('PENDING_ACCEPTANCE');
    expect(resFirst.body.data.total_fee_snapshot).toBe(200000); // 100k * 2h
    expect(resFirst.body.meta.is_idempotent_replay).toBe(false);

    const firstBookingId = resFirst.body.data.booking_id;

    // Lần gọi 2: Gửi lại cùng key và payload -> Trả về 200 OK với cùng bookingId
    const resSecond = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .set('Idempotency-Key', requestKey)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 2,
      });

    expect(resSecond.status).toBe(200);
    expect(resSecond.body.success).toBe(true);
    expect(resSecond.body.data.booking_id).toBe(firstBookingId);
    expect(resSecond.body.meta.is_idempotent_replay).toBe(true);

    // Xác nhận trong DB chỉ tồn tại duy nhất 1 booking record
    const countInDb = await prisma.booking.count({
      where: { request_key: requestKey },
    });
    expect(countInDb).toBe(1);
  });

  // TC01b: Same request_key with mismatched payload -> 409 Conflict
  it('TC01b: Re-using request_key with a different slot_id returns 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH', async () => {
    const requestKey = `${TEST_PREFIX}req-tc01-alpha`;

    const resMismatch = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-02`, // khác slot
        request_key: requestKey,
      });

    expect(resMismatch.status).toBe(409);
    expect(resMismatch.body.success).toBe(false);
    expect(resMismatch.body.error.code).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
  });

  // TC02: New request_key creates independent booking
  it('TC02: Different request_key creates an independent new booking', async () => {
    const requestKey = `${TEST_PREFIX}req-tc02-beta`;
    const slotId = `${TEST_PREFIX}slot-02`;

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking_id).toBeDefined();
    expect(res.body.data.request_key).toBe(requestKey);
    expect(res.body.meta.is_idempotent_replay).toBe(false);
  });

  // TC03: Booking validation and business rule rejections
  it('TC03A: Rejects booking a slot in the past with 422 SLOT_TIME_IN_PAST', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-past`,
        request_key: `${TEST_PREFIX}req-tc03-past`,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SLOT_TIME_IN_PAST');
  });

  it('TC03B: Rejects companion attempting to rent their own slot with 422 CANNOT_RENT_SELF', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-snapshot`,
        request_key: `${TEST_PREFIX}req-tc03-self`,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_RENT_SELF');
  });

  it('TC03C: Rejects booking if companion is suspended due to low trust score (< 40)', async () => {
    // Tạm thời hạ trust score xuống 35
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 35.0 },
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: `${TEST_PREFIX}slot-snapshot`,
        request_key: `${TEST_PREFIX}req-tc03-suspended`,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('COMPANION_SUSPENDED');

    // Khôi phục lại trust score
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 95.0 },
    });
  });

  // TC04: Atomic Concurrency (Race Condition Protection)
  it('TC04: When two concurrent requests target the same slot, exactly ONE succeeds (201) and the other fails (409 SLOT_ALREADY_HELD)', async () => {
    const raceSlotId = `${TEST_PREFIX}slot-race`;

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          slot_id: raceSlotId,
          request_key: `${TEST_PREFIX}req-race-renter1`,
        }),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renter2Token}`)
        .send({
          slot_id: raceSlotId,
          request_key: `${TEST_PREFIX}req-race-renter2`,
        }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe('SLOT_ALREADY_HELD');

    // Kiểm tra slot trong DB được chuyển sang trạng thái HELD
    const slotInDb = await prisma.slotCalendar.findUnique({
      where: { slot_id: raceSlotId },
    });
    expect(slotInDb?.status).toBe('HELD');
  });

  // TC05: Price Snapshot Immutability
  it('TC05: total_fee_snapshot is fixed at booking time and does not change even if companion alters hourly_rate', async () => {
    const slotId = `${TEST_PREFIX}slot-snapshot`;
    const requestKey = `${TEST_PREFIX}req-tc05-snapshot`;

    // Companion 1 hourly_rate đang là 100.000 VND, duration 2h -> snapshot fee là 200.000 VND
    const resCreate = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
      });

    expect(resCreate.status).toBe(201);
    const bookingId = resCreate.body.data.booking_id;
    expect(resCreate.body.data.total_fee_snapshot).toBe(200000);

    // Companion 1 đổi giá lên 180.000 VND/giờ
    const resUpdateProfile = await request(app)
      .put('/api/companion/profile')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({
        hourly_rate: 180000,
      });
    expect(resUpdateProfile.status).toBe(200);

    // Renter truy vấn lại booking chi tiết
    const resGet = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${renter1Token}`);

    expect(resGet.status).toBe(200);
    // Phí snapshot của đơn booking cũ PHẢI giữ nguyên 200.000 VND
    expect(resGet.body.data.total_fee_snapshot).toBe(200000);
  });

  // TC06: Expired slot hold is safely reclaimed by a new booking request
  it('TC06: An expired HELD slot is automatically reclaimed and booked by a new valid request', async () => {
    const expiredSlotId = `${TEST_PREFIX}slot-expired`;
    const requestKey = `${TEST_PREFIX}req-tc06-reclaim`;

    // Slot này trước khi gọi có status HELD nhưng held_until ở quá khứ
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: expiredSlotId,
        request_key: requestKey,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING_ACCEPTANCE');

    // Kiểm tra slot trong DB được gia hạn held_until trong tương lai
    const updatedSlot = await prisma.slotCalendar.findUnique({
      where: { slot_id: expiredSlotId },
    });
    expect(updatedSlot?.status).toBe('HELD');
    expect(new Date(updatedSlot!.held_until!).getTime()).toBeGreaterThan(Date.now());
  });

  // TC15: Booking Status History Audit Trail
  it('TC15: BOOKING_STATUS_HISTORY accurately records initial PENDING_ACCEPTANCE transition', async () => {
    const booking = await prisma.booking.findFirst({
      where: { request_key: `${TEST_PREFIX}req-tc01-alpha` },
      include: { history: true },
    });

    expect(booking).toBeDefined();
    expect(booking!.history.length).toBeGreaterThanOrEqual(1);

    const initialHistory = booking!.history[0];
    expect(initialHistory.from_status).toBeNull();
    expect(initialHistory.to_status).toBe('PENDING_ACCEPTANCE');
    expect(initialHistory.changed_by).toBe('u-renter-01');
    expect(initialHistory.reason).toContain('Khởi tạo đơn đặt lịch');
  });

  // 10h/Day Limit Check (BR-03, D08, TC68)
  it('Enforces 10h/day limit: rejects booking when cumulative companion hours exceed 10 hours in Vietnam timezone', async () => {
    const dayAhead = 5; // Ngày +5

    // Tạo sẵn 2 slot BOOKED tổng cộng 9 tiếng trong ngày +5: 8:00 - 13:00 (5h) và 14:00 - 18:00 (4h)
    await prisma.slotCalendar.createMany({
      data: [
        {
          slot_id: `${TEST_PREFIX}slot-limit-1`,
          profile_id: 'prof-comp-01',
          start_time: getFutureDate(dayAhead, 8),
          end_time: getFutureDate(dayAhead, 13),
          status: 'BOOKED',
        },
        {
          slot_id: `${TEST_PREFIX}slot-limit-2`,
          profile_id: 'prof-comp-01',
          start_time: getFutureDate(dayAhead, 14),
          end_time: getFutureDate(dayAhead, 18),
          status: 'BOOKED',
        },
      ],
    });

    // Tạo thêm 1 slot AVAILABLE 2 tiếng (19:00 - 21:00) trong cùng ngày
    const candidateSlotId = `${TEST_PREFIX}slot-limit-candidate`;
    await prisma.slotCalendar.create({
      data: {
        slot_id: candidateSlotId,
        profile_id: 'prof-comp-01',
        start_time: getFutureDate(dayAhead, 19),
        end_time: getFutureDate(dayAhead, 21),
        status: 'AVAILABLE',
      },
    });

    // Thử đặt slot 2 tiếng này: 9h + 2h = 11h > 10h trần cho phép -> Bị từ chối
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: candidateSlotId,
        request_key: `${TEST_PREFIX}req-limit-exceeded`,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('COMPANION_DAILY_LIMIT_EXCEEDED');
  });

  // RBAC & Privacy Protection on GET /api/bookings/:id
  it('Privacy Protection: A 3rd party user cannot view another user booking (403 FORBIDDEN)', async () => {
    const booking = await prisma.booking.findFirst({
      where: { request_key: `${TEST_PREFIX}req-tc01-alpha` },
    });

    // renter2 (không phải người đặt và không phải companion trong đơn) truy cập
    const res = await request(app)
      .get(`/api/bookings/${booking!.booking_id}`)
      .set('Authorization', `Bearer ${renter2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Staff Access: CS Agent can inspect booking details for audit/support', async () => {
    const booking = await prisma.booking.findFirst({
      where: { request_key: `${TEST_PREFIX}req-tc01-alpha` },
    });

    const res = await request(app)
      .get(`/api/bookings/${booking!.booking_id}`)
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking_id).toBe(booking!.booking_id);
    expect(res.body.data.history).toBeDefined();
  });
});
