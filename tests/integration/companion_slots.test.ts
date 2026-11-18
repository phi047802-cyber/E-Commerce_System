import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('Companion Profile & Slot Management API (BR-02, BR-03, TC68, TC69)', () => {
  let companionToken: string;
  let renterToken: string;

  const resetTestData = async () => {
    // Đặt lại dữ liệu gốc cho companion 1
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: {
        hourly_rate: 100000,
        availability: 'ONLINE',
        game_account_id: 'FakerFan#VN2',
        trust_score: 95.0,
      },
    });

    // Dọn dẹp các slot tạo thêm trong quá trình test (sau 24h)
    await prisma.slotCalendar.deleteMany({
      where: {
        profile_id: 'prof-comp-01',
        start_time: { gte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
    });
  };

  beforeAll(async () => {
    await resetTestData();

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = resComp.body.data.token;

    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter.body.data.token;
  });

  afterAll(async () => {
    await resetTestData();
  });

  it('1. Companion can view their own profile via GET /api/companion/profile', async () => {
    const res = await request(app)
      .get('/api/companion/profile')
      .set('Authorization', `Bearer ${companionToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.game_id).toBe('LMHT');
    expect(res.body.data.hourly_rate).toBe(100000);
    expect(res.body.data.trust_score).toBe(95);
  });

  it('2. Companion can update their profile attributes via PUT /api/companion/profile', async () => {
    const res = await request(app)
      .put('/api/companion/profile')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        hourly_rate: 120000,
        availability: 'BUSY',
        game_account_id: 'FakerGod#VN1',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hourly_rate).toBe(120000);
    expect(res.body.data.availability).toBe('BUSY');
    expect(res.body.data.game_account_id).toBe('FakerGod#VN1');
  });

  it('3. Companion can view their discrete slots via GET /api/companion/slots', async () => {
    const res = await request(app)
      .get('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(['AVAILABLE', 'BOOKED', 'HELD']).toContain(res.body.data[0].status);
  });

  it('4. Server rejects creating a slot in the past with SLOT_TIME_IN_PAST', async () => {
    const pastStart = new Date(Date.now() - 3600000).toISOString();
    const pastEnd = new Date(Date.now() - 1800000).toISOString();

    const res = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        start_time: pastStart,
        end_time: pastEnd,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SLOT_TIME_IN_PAST');
  });

  it('5. Server rejects creating a slot where end_time <= start_time', async () => {
    const futureStart = new Date(Date.now() + 7200000).toISOString();
    const futureEnd = new Date(Date.now() + 3600000).toISOString();

    const res = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        start_time: futureStart,
        end_time: futureEnd,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('6. Companion can create a valid discrete slot in future', async () => {
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 2);
    slotDate.setHours(10, 0, 0, 0);
    const startStr = slotDate.toISOString();

    slotDate.setHours(12, 0, 0, 0);
    const endStr = slotDate.toISOString();

    const res = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        start_time: startStr,
        end_time: endStr,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('AVAILABLE');
  });

  it('7. Server rejects creating overlapping slot with SLOT_OVERLAPPING', async () => {
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 2);
    slotDate.setHours(10, 30, 0, 0);
    const startStr = slotDate.toISOString();

    slotDate.setHours(11, 30, 0, 0);
    const endStr = slotDate.toISOString();

    const res = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        start_time: startStr,
        end_time: endStr,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SLOT_OVERLAPPING');
  });

  it('8. Server rejects creating slots that exceed 10 hours/day limit (BR-03, TC68)', async () => {
    const d3 = new Date();
    d3.setDate(d3.getDate() + 3);

    d3.setHours(8, 0, 0, 0);
    const s1Start = d3.toISOString();
    d3.setHours(15, 0, 0, 0);
    const s1End = d3.toISOString();

    const res1 = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({ start_time: s1Start, end_time: s1End });
    expect(res1.status).toBe(201);

    d3.setHours(16, 0, 0, 0);
    const s2Start = d3.toISOString();
    d3.setHours(20, 0, 0, 0);
    const s2End = d3.toISOString();

    const res2 = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({ start_time: s2Start, end_time: s2End });

    expect(res2.status).toBe(422);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.code).toBe('COMPANION_DAILY_LIMIT_EXCEEDED');
    expect(res2.body.error.message).toContain('vượt quá trần quy định 10 giờ/ngày');
  });

  it('9. Companion can delete an available slot via DELETE /api/companion/slots/:id', async () => {
    const d4 = new Date();
    d4.setDate(d4.getDate() + 4);
    d4.setHours(14, 0, 0, 0);
    const sStart = d4.toISOString();
    d4.setHours(16, 0, 0, 0);
    const sEnd = d4.toISOString();

    const createRes = await request(app)
      .post('/api/companion/slots')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({ start_time: sStart, end_time: sEnd });

    const slotId = createRes.body.data.slot_id;

    const delRes = await request(app)
      .delete(`/api/companion/slots/${slotId}`)
      .set('Authorization', `Bearer ${companionToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.message).toContain('thành công');
  });

  it('10. Companion can upload a voice intro audio file <= 2MB (REF-PROF-01)', async () => {
    // 10a. Reject oversized file > 2MB
    const oversizedRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: 'huge_intro.mp3',
        file_type: 'audio/mp3',
        file_size_bytes: 3 * 1024 * 1024, // 3MB
        file_content_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
      });

    expect(oversizedRes.status).toBe(400);
    expect(oversizedRes.body.success).toBe(false);

    // 10b. Reject invalid file type
    const invalidTypeRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: 'intro.txt',
        file_type: 'text/plain',
        file_size_bytes: 1024,
        file_content_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
      });

    expect(invalidTypeRes.status).toBe(400);
    expect(invalidTypeRes.body.success).toBe(false);

    // 10c. Reject file with invalid magic bytes (fake audio header)
    const fakeMagicRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: 'fake_audio.mp3',
        file_type: 'audio/mp3',
        file_size_bytes: 128,
        file_content_base64: Buffer.from('MZ_EXECUTABLE_BINARY_DATA_NOT_AUDIO').toString('base64'),
      });

    expect(fakeMagicRes.status).toBe(400);
    expect(fakeMagicRes.body.success).toBe(false);

    // 10d. Reject path traversal in file_name
    const pathTraversalRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: '../../etc/passwd.mp3',
        file_type: 'audio/mp3',
        file_size_bytes: 128,
        file_content_base64: Buffer.from('ID3_VALID_MP3_DATA_HEADER').toString('base64'),
      });

    expect(pathTraversalRes.status).toBe(400);
    expect(pathTraversalRes.body.success).toBe(false);

    // 10e. Reject non-companion user trying to upload voice intro (403 FORBIDDEN)
    const renterUploadRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        file_name: 'renter_voice.mp3',
        file_type: 'audio/mp3',
        file_size_bytes: 128,
        file_content_base64: Buffer.from('ID3_VALID_MP3_DATA_HEADER').toString('base64'),
      });

    expect(renterUploadRes.status).toBe(403);

    // 10f. Accept valid webm audio with EBML or RIFF header
    const validRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: 'companion_intro.webm',
        file_type: 'audio/webm',
        file_size_bytes: 512,
        file_content_base64: Buffer.from('RIFF_MOCK_WEBM_AUDIO_DATA').toString('base64'),
      });

    expect(validRes.status).toBe(201);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data.audio_bio_url).toContain('/uploads/audios/voice-');

    // 10g. Reject fake extension file even if MIME type says audio
    const fakeExtRes = await request(app)
      .post('/api/companion/profile/voice')
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        file_name: 'trojan.exe',
        file_type: 'audio/mp3',
        file_size_bytes: 512,
        file_content_base64: Buffer.from('RIFF_MOCK_WEBM_AUDIO_DATA').toString('base64'),
      });

    expect(fakeExtRes.status).toBe(400);
    expect(fakeExtRes.body.success).toBe(false);
  });
});
