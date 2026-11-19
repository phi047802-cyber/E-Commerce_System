import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { CURRENT_TERMS_VERSION } from '../../server/src/modules/legal/legal.catalog.js';

/**
 * G2 — Không đặt trùng slot, chạy trực tiếp trên SQL Server thật (D33).
 * N Renter khác nhau bắn đồng thời POST /api/bookings vào CÙNG một slot: đúng 1 thành công.
 */
describe('SQL Server: Concurrency Slot Lock under N parallel renters (G2, BR-01, TC04)', () => {
  const PREFIX = 'test-mssql-cc-';
  const N_RENTERS = 10;
  const ROUNDS = 3;
  const tokens: string[] = [];

  const futureHour = (daysAhead: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const cleanup = async () => {
    const bookings = await prisma.booking.findMany({ where: { request_key: { startsWith: PREFIX } }, select: { booking_id: true } });
    const ids = bookings.map((b) => b.booking_id);
    if (ids.length) {
      await prisma.bookingStatusHistory.deleteMany({ where: { booking_id: { in: ids } } });
      await prisma.booking.deleteMany({ where: { booking_id: { in: ids } } });
    }
    await prisma.slotCalendar.deleteMany({ where: { slot_id: { startsWith: PREFIX } } });
    const users = await prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { user_id: true } });
    const uids = users.map((u) => u.user_id);
    if (uids.length) {
      await prisma.termsAcceptance.deleteMany({ where: { user_id: { in: uids } } });
      await prisma.notification.deleteMany({ where: { user_id: { in: uids } } });
      await prisma.wallet.deleteMany({ where: { user_id: { in: uids } } });
      await prisma.user.deleteMany({ where: { user_id: { in: uids } } });
    }
  };

  beforeAll(async () => {
    await cleanup();
    const hash = await bcrypt.hash('Demo@123456', 4);
    for (let i = 0; i < N_RENTERS; i++) {
      const email = `${PREFIX}renter${i}@instasquad.test`;
      const user = await prisma.user.create({
        data: { email, password_hash: hash, display_name: `Race Renter ${i}`, role: 'RENTER', is_email_verified: true },
      });
      await prisma.wallet.create({ data: { user_id: user.user_id } });
      await prisma.termsAcceptance.create({ data: { user_id: user.user_id, terms_version: CURRENT_TERMS_VERSION } });
      const login = await request(app).post('/api/auth/login').send({ email, password: 'Demo@123456' });
      tokens.push(login.body.data.token);
    }
    for (let r = 0; r < ROUNDS; r++) {
      await prisma.slotCalendar.create({
        data: {
          slot_id: `${PREFIX}slot-${r}`,
          profile_id: 'prof-comp-01',
          start_time: futureHour(5, 8 + r),
          end_time: futureHour(5, 9 + r),
          status: 'AVAILABLE',
        },
      });
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  it('runs against Microsoft SQL Server (not SQLite)', async () => {
    const rows = await prisma.$queryRawUnsafe<{ v: string }[]>('SELECT @@VERSION AS v');
    expect(rows[0].v).toContain('Microsoft SQL Server');
  });

  for (let r = 0; r < ROUNDS; r++) {
    it(`round ${r + 1}: ${N_RENTERS} concurrent renters on one slot → exactly 1 booking (201), others 409`, async () => {
      const slotId = `${PREFIX}slot-${r}`;
      const responses = await Promise.all(
        tokens.map((t, i) =>
          request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${t}`)
            .send({ slot_id: slotId, request_key: `${PREFIX}r${r}-u${i}` })
        )
      );
      const created = responses.filter((x) => x.status === 201);
      const conflicts = responses.filter((x) => x.status === 409);
      expect(created).toHaveLength(1);
      expect(conflicts).toHaveLength(N_RENTERS - 1);
      for (const c of conflicts) expect(c.body.error.code).toBe('SLOT_ALREADY_HELD');

      const count = await prisma.booking.count({ where: { slot_id: slotId } });
      expect(count).toBe(1);
      const slot = await prisma.slotCalendar.findUnique({ where: { slot_id: slotId } });
      expect(slot?.status).toBe('HELD');
    });
  }
});
