import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { CURRENT_TERMS_VERSION } from '../../server/src/modules/legal/legal.catalog.js';

/** G6 — Pháp lý thực thi được (TERMS_AND_CONTRACTS.md Phần B, C). */
describe('Legal module: terms acceptance gate & violation sanctions (G6)', () => {
  const PREFIX = 'test-legal-';
  let csToken: string;
  let renterToken: string;
  let renterId: string;
  let companionUserId: string;
  let companionProfileId: string;

  const cleanup = async () => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { user_id: true } });
    const uids = users.map((u) => u.user_id);
    if (!uids.length) return;
    await prisma.violationRecord.deleteMany({ where: { user_id: { in: uids } } });
    await prisma.auditLog.deleteMany({ where: { entity_id: { in: uids } } });
    await prisma.notification.deleteMany({ where: { user_id: { in: uids } } });
    await prisma.termsAcceptance.deleteMany({ where: { user_id: { in: uids } } });
    await prisma.bookingStatusHistory.deleteMany({ where: { booking: { renter_id: { in: uids } } } });
    await prisma.booking.deleteMany({ where: { renter_id: { in: uids } } });
    await prisma.slotCalendar.deleteMany({ where: { slot_id: { startsWith: PREFIX } } });
    await prisma.trustScoreLog.deleteMany({ where: { profile: { user_id: { in: uids } } } });
    await prisma.companionProfile.deleteMany({ where: { user_id: { in: uids } } });
    await prisma.wallet.deleteMany({ where: { user_id: { in: uids } } });
    await prisma.user.deleteMany({ where: { user_id: { in: uids } } });
  };

  beforeAll(async () => {
    await cleanup();
    const hash = await bcrypt.hash('Demo@123456', 4);
    const renter = await prisma.user.create({
      data: { email: `${PREFIX}renter@instasquad.test`, password_hash: hash, display_name: 'Legal Renter', role: 'RENTER', is_email_verified: true },
    });
    renterId = renter.user_id;
    await prisma.wallet.create({ data: { user_id: renterId } });

    const comp = await prisma.user.create({
      data: { email: `${PREFIX}companion@instasquad.test`, password_hash: hash, display_name: 'Legal Companion', role: 'COMPANION', is_email_verified: true },
    });
    companionUserId = comp.user_id;
    const profile = await prisma.companionProfile.create({
      data: { user_id: comp.user_id, game_id: 'LMHT', hourly_rate: 80000, profile_status: 'ACTIVE', verification_status: 'VERIFIED', availability: 'ONLINE', trust_score: 60 },
    });
    companionProfileId = profile.profile_id;
    await prisma.wallet.create({ data: { user_id: comp.user_id } });

    renterToken = (await request(app).post('/api/auth/login').send({ email: `${PREFIX}renter@instasquad.test`, password: 'Demo@123456' })).body.data.token;
    csToken = (await request(app).post('/api/auth/login').send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' })).body.data.token;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('GET /api/legal/terms is public and exposes current version + V01..V08 catalog', async () => {
    const res = await request(app).get('/api/legal/terms');
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(CURRENT_TERMS_VERSION);
    expect(res.body.data.violations.map((v: { code: string }) => v.code)).toEqual(['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08']);
  });

  it('blocks booking with 403 TERMS_NOT_ACCEPTED before acceptance', async () => {
    const d = new Date(); d.setDate(d.getDate() + 6); d.setHours(10, 0, 0, 0);
    const e = new Date(d); e.setHours(11);
    await prisma.slotCalendar.create({ data: { slot_id: `${PREFIX}slot-1`, profile_id: 'prof-comp-01', start_time: d, end_time: e } });

    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${renterToken}`)
      .send({ slot_id: `${PREFIX}slot-1`, request_key: `${PREFIX}req-1` });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TERMS_NOT_ACCEPTED');
    expect(await prisma.booking.count({ where: { request_key: `${PREFIX}req-1` } })).toBe(0);
  });

  it('rejects an outdated terms version', async () => {
    const res = await request(app).post('/api/legal/accept').set('Authorization', `Bearer ${renterToken}`)
      .send({ terms_version: 'TOS-2020.01', channel: 'MOBILE' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('TERMS_VERSION_MISMATCH');
  });

  it('accepts current terms idempotently, then booking succeeds', async () => {
    const a1 = await request(app).post('/api/legal/accept').set('Authorization', `Bearer ${renterToken}`)
      .send({ terms_version: CURRENT_TERMS_VERSION, channel: 'MOBILE' });
    const a2 = await request(app).post('/api/legal/accept').set('Authorization', `Bearer ${renterToken}`)
      .send({ terms_version: CURRENT_TERMS_VERSION, channel: 'MOBILE' });
    expect(a1.status).toBe(201);
    expect(a2.status).toBe(201);
    expect(await prisma.termsAcceptance.count({ where: { user_id: renterId } })).toBe(1);

    const status = await request(app).get('/api/legal/acceptance').set('Authorization', `Bearer ${renterToken}`);
    expect(status.body.data).toMatchObject({ accepted: true, channel: 'MOBILE', current_version: CURRENT_TERMS_VERSION });

    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${renterToken}`)
      .send({ slot_id: `${PREFIX}slot-1`, request_key: `${PREFIX}req-1` });
    expect(res.status).toBe(201);
  });

  it('non-CS users cannot record violations (403)', async () => {
    const res = await request(app).post('/api/legal/violations').set('Authorization', `Bearer ${renterToken}`)
      .send({ user_id: companionUserId, code: 'V01', note: 'Thử ghi nhận trái phép' });
    expect(res.status).toBe(403);
  });

  it('V01 first offense: −10 TrustScore with PENALTY_ log, no suspension', async () => {
    const res = await request(app).post('/api/legal/violations').set('Authorization', `Bearer ${csToken}`)
      .send({ user_id: companionUserId, code: 'V01', note: 'Gửi số điện thoại trong phòng chat để hẹn giao dịch riêng.' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ occurrence: 1, new_trust_score: 50, account_status: 'ACTIVE' });

    const log = await prisma.trustScoreLog.findFirst({ where: { profile_id: companionProfileId, reason_code: 'PENALTY_VIOLATION_V01' } });
    expect(log?.delta).toBe(-10);
  });

  it('V01 second offense escalates to 7-day suspension and blocks login with ACCOUNT_SUSPENDED', async () => {
    const res = await request(app).post('/api/legal/violations').set('Authorization', `Bearer ${csToken}`)
      .send({ user_id: companionUserId, code: 'V01', note: 'Tái phạm: gửi link mạng xã hội để giao dịch ngoài sàn.' });
    expect(res.status).toBe(201);
    expect(res.body.data.occurrence).toBe(2);
    expect(res.body.data.account_status).toBe('SUSPENDED');
    expect(res.body.data.new_trust_score).toBe(40);

    const login = await request(app).post('/api/auth/login').send({ email: `${PREFIX}companion@instasquad.test`, password: 'Demo@123456' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('expired suspension is lifted automatically at next login', async () => {
    await prisma.user.update({ where: { user_id: companionUserId }, data: { suspended_until: new Date(Date.now() - 1000) } });
    const login = await request(app).post('/api/auth/login').send({ email: `${PREFIX}companion@instasquad.test`, password: 'Demo@123456' });
    expect(login.status).toBe(200);
    const u = await prisma.user.findUnique({ where: { user_id: companionUserId } });
    expect(u?.status).toBe('ACTIVE');
  });

  it('CRITICAL V08 bans permanently; companion-only code cannot target a renter', async () => {
    const wrong = await request(app).post('/api/legal/violations').set('Authorization', `Bearer ${csToken}`)
      .send({ user_id: renterId, code: 'V02', note: 'Renter không thể bị ghi vắng mặt Companion.' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe('VIOLATION_NOT_APPLICABLE');

    const res = await request(app).post('/api/legal/violations').set('Authorization', `Bearer ${csToken}`)
      .send({ user_id: companionUserId, code: 'V08', note: 'Đề nghị gặp mặt ngoài đời trong dịch vụ trò chuyện.' });
    expect(res.status).toBe(201);
    expect(res.body.data.account_status).toBe('BANNED');
    const profile = await prisma.companionProfile.findUnique({ where: { profile_id: companionProfileId } });
    expect(profile?.trust_score).toBe(10);
    expect(profile?.verification_status).toBe('SUSPENDED');
  });

  it('a user sees their own violations; CS sees the list filtered by user', async () => {
    const list = await request(app).get(`/api/legal/violations?user_id=${companionUserId}`).set('Authorization', `Bearer ${csToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(3);
    const mine = await request(app).get('/api/legal/violations/me').set('Authorization', `Bearer ${renterToken}`);
    expect(mine.body.data).toHaveLength(0);
  });
});
