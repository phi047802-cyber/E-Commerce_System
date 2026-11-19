import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { bookingAutomationService } from '../../server/src/modules/booking/booking-automation.service.js';
import { vnWeekStart } from '../../server/src/modules/dispute/dispute-sla.report.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';

/**
 * G9 — conversion theo kênh nguồn (first-touch lúc đăng ký) và G10 — SLA khiếu nại theo tuần + nhắc đánh giá sau phiên.
 * DB test dùng chung với các file khác nên số liệu tổng được đối chiếu với truy vấn trực tiếp; phần SLA dùng một tuần
 * trong quá khứ chỉ chứa dữ liệu mẫu của file này để kiểm tra con số chính xác.
 */
describe('G9 / G10 — kênh nguồn, SLA khiếu nại theo tuần, nhắc đánh giá', () => {
  const RUN = `test-g9-${Date.now()}-`;
  let admin: string;
  let cs: string;
  let renter1: string;
  let companion1: string;
  let seq = 0;

  const login = async (email: string, password = 'Demo@123456') =>
    (await request(app).post('/api/auth/login').send({ email, password })).body.data.token as string;

  const fixtureSlot = async (daysAhead: number) => {
    seq += 1;
    const start = new Date();
    start.setDate(start.getDate() + daysAhead);
    start.setHours(8, 0, 0, 0);
    return prisma.slotCalendar.create({
      data: { slot_id: `${RUN}slot-${seq}`, profile_id: 'prof-comp-01', start_time: start, end_time: new Date(start.getTime() + 3600_000), status: 'BOOKED' },
    });
  };

  const fixtureBooking = async (status: string) => {
    const slot = await fixtureSlot(70 + seq);
    return prisma.booking.create({
      data: {
        renter_id: 'u-renter-02',
        profile_id: 'prof-comp-01',
        slot_id: slot.slot_id,
        request_key: `${RUN}bk-${seq}`,
        start_time: slot.start_time,
        duration_hours: 1,
        total_fee_snapshot: 100000,
        status,
        response_deadline: new Date(),
      },
    });
  };

  beforeAll(async () => {
    admin = await login('admin@instasquad.test');
    cs = await login('cs_agent@instasquad.test');
    renter1 = await login('renter1@instasquad.test');
    companion1 = await login('companion1@instasquad.test');
    await prisma.companionProfile.update({ where: { profile_id: 'prof-comp-01' }, data: { trust_score: 95, profile_status: 'ACTIVE' } });
  });

  // ───────────────────────────── G9 ─────────────────────────────
  it('G9-01: đăng ký lưu kênh nguồn first-touch đã làm sạch (chữ thường, bỏ ký tự lạ)', async () => {
    const email = `${RUN}signup@instasquad.test`;
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'G9#test2026', display_name: 'G9 Signup', role: 'RENTER', is_over_18: true,
      utm_source: 'TikTok', utm_medium: 'Social Video', utm_campaign: 'xem-phim<script>',
    });
    expect(res.status).toBe(201);
    const u = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(u.signup_utm_source).toBe('tiktok');
    expect(u.signup_utm_medium).toBe('socialvideo');
    expect(u.signup_utm_campaign).toBe('xem-phimscript');
  });

  it('G9-02: lượt truy cập Web ghi nhận utm_source', async () => {
    const key = `${RUN}visit-1`;
    const res = await request(app)
      .post('/api/analytics/visit')
      .set('User-Agent', 'Mozilla/5.0 (G9 test)')
      .send({ session_key: key, utm_source: 'Facebook', utm_campaign: 'g9', landing_path: '/' });
    expect(res.status).toBe(200);
    const v = await prisma.siteVisit.findUniqueOrThrow({ where: { session_key: key } });
    expect(v.utm_source).toBe('facebook');
  });

  it('G9-03: dashboard Admin trả bảng kênh khớp dữ liệu DB; đơn ký quỹ quy về kênh đăng ký của Renter', async () => {
    // Renter seed (u-renter-02) gắn kênh TikTok (fixture) → nạp tiền → đặt & ký quỹ.
    // Không tạo tài khoản mới có tiền: các file test cũ dọn sổ cái và đặt lại số dư chỉ cho ví seed (D42),
    // ví lạ còn tiền sẽ làm đối soát của chúng báo lệch. Luồng đăng ký kèm kênh đã được G9-01 và E2E kiểm tra.
    await prisma.user.update({ where: { user_id: 'u-renter-02' }, data: { signup_utm_source: 'tiktok' } });
    const buyer = await login('renter2@instasquad.test');
    const topup = await request(app).post('/api/payments/create-topup').set('Authorization', `Bearer ${buyer}`).send({ amount: 200000, provider: 'SIMULATOR' });
    await request(app).post('/api/payments/simulate').send({ payment_id: topup.body.data.payment_id, outcome: 'SUCCESS' });
    const start = new Date();
    start.setDate(start.getDate() + 90);
    start.setHours(15, 0, 0, 0);
    const slot = await prisma.slotCalendar.create({
      data: { slot_id: `${RUN}buy-slot`, profile_id: 'prof-comp-01', start_time: start, end_time: new Date(start.getTime() + 3600_000), status: 'AVAILABLE' },
    });
    const bk = await request(app).post('/api/bookings').set('Authorization', `Bearer ${buyer}`).send({ slot_id: slot.slot_id, request_key: `${RUN}buy` });
    expect(bk.status).toBe(201);
    expect((await request(app).post(`/api/bookings/${bk.body.data.booking_id}/hold-escrow`).set('Authorization', `Bearer ${buyer}`)).status).toBe(200);

    const res = await request(app).get('/api/admin/dashboard/metrics').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const ch = res.body.data.channels;

    // Đối chiếu với truy vấn trực tiếp
    const visitsTiktok = await prisma.siteVisit.count({ where: { utm_source: 'tiktok' } });
    const signupsTiktok = await prisma.user.count({ where: { signup_utm_source: 'tiktok', role: { in: ['RENTER', 'COMPANION'] } } });
    const escrowTiktok = await prisma.escrow.count({ where: { booking: { renter: { signup_utm_source: 'tiktok' } } } });
    const tiktok = ch.breakdown.find((r: { source: string }) => r.source === 'tiktok');
    expect(tiktok).toMatchObject({ visits: visitsTiktok, signups: signupsTiktok, escrow_bookings: escrowTiktok, is_social: true });
    expect(escrowTiktok).toBeGreaterThanOrEqual(1);
    expect(tiktok.conversion_pct).toBe(visitsTiktok > 0 ? Number(((escrowTiktok / visitsTiktok) * 100).toFixed(2)) : null);

    // Tổng phiên = tổng site_visits; mọi đơn ký quỹ được quy về đúng 1 kênh
    expect(ch.total_visits).toBe(await prisma.siteVisit.count());
    const sumEscrow = ch.breakdown.reduce((s: number, r: { escrow_bookings: number }) => s + r.escrow_bookings, 0);
    expect(sumEscrow).toBe(await prisma.escrow.count());
    expect(res.body.data.metrics.successful_escrow_bookings).toBe(sumEscrow);
    const social = await prisma.siteVisit.count({ where: { utm_source: { in: ['tiktok', 'facebook', 'instagram', 'threads'] } } });
    expect(ch.social_visits).toBe(social);
    expect(ch.social_visit_share_target_pct).toBe(40);
  });

  it('G9-04: open_rma_count đếm cả khiếu nại OPENED (trước đây chỉ đếm OPEN)', async () => {
    const b = await fixtureBooking('DISPUTED');
    await prisma.disputeCase.create({
      data: { booking_id: b.booking_id, renter_id: 'u-renter-02', reason_category: 'NO_SHOW', description: 'fixture G9-04', status: 'OPENED' },
    });
    const res = await request(app).get('/api/admin/dashboard/metrics').set('Authorization', `Bearer ${admin}`);
    const expected = await prisma.disputeCase.count({ where: { status: { in: ['OPENED', 'OPEN', 'EVIDENCE_PENDING', 'UNDER_REVIEW'] } } });
    expect(res.body.data.metrics.open_rma_count).toBe(expected);
    expect(expected).toBeGreaterThanOrEqual(1);
  });

  it('G9-05: chỉ Admin xem được dashboard metrics', async () => {
    expect((await request(app).get('/api/admin/dashboard/metrics').set('Authorization', `Bearer ${renter1}`)).status).toBe(403);
    expect((await request(app).get('/api/admin/dashboard/metrics').set('Authorization', `Bearer ${cs}`)).status).toBe(403);
  });

  // ───────────────────────────── G10: SLA ─────────────────────────────
  it('G10-01: tuần bắt đầu thứ Hai 00:00 giờ Việt Nam', () => {
    // Chủ nhật 23:30 (UTC+7) = 16:30 UTC thuộc tuần trước; thứ Hai 00:30 (UTC+7) = CN 17:30 UTC thuộc tuần mới
    const sundayLate = new Date('2026-11-15T16:30:00Z');
    const mondayEarly = new Date('2026-11-15T17:30:00Z');
    expect(vnWeekStart(sundayLate).toISOString()).toBe('2026-11-08T17:00:00.000Z');
    expect(vnWeekStart(mondayEarly).toISOString()).toBe('2026-11-15T17:00:00.000Z');
  });

  it('G10-02: báo cáo SLA theo tuần tính đúng số mở / xử lý / đúng SLA / quá SLA / còn mở / trung vị', async () => {
    // Tuần mẫu: 10 tuần trước, chỉ chứa dữ liệu của test này
    const weekStart = new Date(vnWeekStart(new Date()).getTime() - 10 * 7 * 86400_000);
    const at = (h: number) => new Date(weekStart.getTime() + (24 + h) * 3600_000); // thứ Ba
    const cases: { created: Date; mins: number | null; pausedMin: number }[] = [
      { created: at(1), mins: 30, pausedMin: 0 }, // đúng SLA
      { created: at(2), mins: 60, pausedMin: 20 }, // 60 − 20 = 40 phút → đúng SLA
      { created: at(3), mins: 90, pausedMin: 0 }, // quá SLA
      { created: at(4), mins: null, pausedMin: 0 }, // còn mở
    ];
    for (const c of cases) {
      const b = await fixtureBooking('DISPUTED');
      await prisma.disputeCase.create({
        data: {
          booking_id: b.booking_id,
          renter_id: 'u-renter-02',
          reason_category: 'TECHNICAL_ISSUE',
          description: 'fixture G10-02',
          status: c.mins === null ? 'UNDER_REVIEW' : 'RESOLVED',
          created_at: c.created,
          resolved_at: c.mins === null ? null : new Date(c.created.getTime() + c.mins * 60_000),
          paused_sla_ms: c.pausedMin * 60_000,
        },
      });
    }

    const res = await request(app).get('/api/cs/reports/dispute-sla?weeks=12').set('Authorization', `Bearer ${cs}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sla_target_minutes).toBe(45);
    const row = res.body.data.weeks.find((w: { week_start: string }) => w.week_start === weekStart.toISOString());
    expect(row).toMatchObject({
      opened: 4,
      resolved: 3,
      within_sla: 2,
      breached: 1,
      still_open: 1,
      within_sla_pct: 66.7,
      avg_resolution_minutes: 53.3,
      median_resolution_minutes: 40,
    });
    expect(res.body.data.weeks[0].week_start).toBe(vnWeekStart(new Date()).toISOString()); // tuần gần nhất trước
    expect(res.body.data.weeks).toHaveLength(12);
  });

  it('G10-03: chỉ CS / Admin xem được báo cáo SLA; tham số weeks bị giới hạn 1..26', async () => {
    expect((await request(app).get('/api/cs/reports/dispute-sla').set('Authorization', `Bearer ${renter1}`)).status).toBe(403);
    expect((await request(app).get('/api/cs/reports/dispute-sla').set('Authorization', `Bearer ${companion1}`)).status).toBe(403);
    const big = await request(app).get('/api/cs/reports/dispute-sla?weeks=999').set('Authorization', `Bearer ${admin}`);
    expect(big.status).toBe(200);
    expect(big.body.data.weeks).toHaveLength(26);
  });

  // ───────────────────────────── G10: nhắc đánh giá ─────────────────────────────
  it('G10-04: nhắc đánh giá — chỉ bên chưa đánh giá, đúng 1 lần, chỉ đơn hoàn tất trong khoảng 60 phút … 7 ngày', async () => {
    const now = new Date();
    const completed = async (releasedMinutesAgo: number) => {
      const b = await fixtureBooking('COMPLETED');
      await prisma.escrow.create({
        data: {
          booking_id: b.booking_id,
          amount: 100000,
          status: 'RELEASED',
          held_at: new Date(now.getTime() - (releasedMinutesAgo + 90) * 60_000),
          released_at: new Date(now.getTime() - releasedMinutesAgo * 60_000),
        },
      });
      return b;
    };
    const due = await completed(120); // đủ hạn nhắc
    const tooEarly = await completed(10); // chưa tới 60 phút
    const tooOld = await completed(8 * 24 * 60); // quá 7 ngày
    // Renter đã đánh giá đơn `due` → chỉ Companion được nhắc
    await prisma.review.create({ data: { booking_id: due.booking_id, reviewer_id: 'u-renter-02', reviewee_id: 'u-comp-01', rating: 5 } });

    const countFor = (bookingId: string, userId: string) =>
      prisma.notification.count({ where: { user_id: userId, type: 'REVIEW_REMINDER', target_url: `/don-hang/${bookingId}` } });

    await bookingAutomationService.processReviewReminders(now);
    expect(await countFor(due.booking_id, 'u-comp-01')).toBe(1);
    expect(await countFor(due.booking_id, 'u-renter-02')).toBe(0);
    expect(await countFor(tooEarly.booking_id, 'u-comp-01')).toBe(0);
    expect(await countFor(tooOld.booking_id, 'u-comp-01')).toBe(0);
    expect(await countFor(tooOld.booking_id, 'u-renter-02')).toBe(0);

    // Chạy lại → không gửi trùng
    await bookingAutomationService.processReviewReminders(new Date(now.getTime() + 60_000));
    expect(await countFor(due.booking_id, 'u-comp-01')).toBe(1);

    // Đơn `tooEarly` tới hạn sau 60 phút → cả hai bên chưa đánh giá đều được nhắc
    await bookingAutomationService.processReviewReminders(new Date(now.getTime() + 55 * 60_000));
    expect(await countFor(tooEarly.booking_id, 'u-comp-01')).toBe(1);
    expect(await countFor(tooEarly.booking_id, 'u-renter-02')).toBe(1);
  });

  it('G10-05: nội dung nhắc nêu tên người cần đánh giá', async () => {
    const n = await prisma.notification.findFirst({
      where: { user_id: 'u-comp-01', type: 'REVIEW_REMINDER' },
      orderBy: { created_at: 'desc' },
    });
    expect(n?.title).toBe('Bạn chưa đánh giá buổi hẹn');
    expect(n?.message).toContain('Khánh Vy'); // display_name của u-renter-02
  });

  it('G10-06: dọn escrow mẫu (không có bút toán) → sổ cái DB test vẫn cân bằng cho các file chạy sau', async () => {
    // Escrow mẫu của G10-04 gắn với booking `${RUN}bk-*` và không đi qua LedgerService → phải xóa,
    // nếu không đối soát của các file test sau sẽ báo lệch escrow ↔ sổ cái. Escrow thật của G9-03 (`${RUN}buy`) giữ nguyên.
    await prisma.escrow.deleteMany({ where: { booking: { request_key: { startsWith: `${RUN}bk-` } } } });
    await prisma.user.update({ where: { user_id: 'u-renter-02' }, data: { signup_utm_source: null } });
    const report = await reconciliationService.runReconciliation();
    expect(report.is_balanced).toBe(true);
    expect(report.wallet_mismatches.length).toBe(0);
    expect(report.system_conservation.is_equation_satisfied).toBe(true);
  });
});
