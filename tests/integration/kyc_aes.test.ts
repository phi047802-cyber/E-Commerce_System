import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';

describe('eKYC Simulated Verification & AES-256-GCM Encryption (UC01, NFR-002)', () => {
  let adminToken = '';
  let companion1Token = '';
  let companion2Token = '';
  let createdKycId = '';
  let frontEncPath = '';

  // Valid 11-byte JPEG magic bytes
  const validJpegBase64 = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
  ]).toString('base64');

  // Valid 10-byte PNG magic bytes
  const validPngBase64 = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00,
  ]).toString('base64');

  beforeAll(async () => {
    // 1. Login Admin
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = resAdmin.body.data.token;

    // 2. Login Companion 1
    const resC1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companion1Token = resC1.body.data.token;

    // 3. Login Companion 2
    const resC2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion2@instasquad.test', password: 'Demo@123456' });
    companion2Token = resC2.body.data.token;
  });

  it('1. Rejects submission with invalid magic bytes (fake image file)', async () => {
    const fakeTextBase64 = Buffer.from('NOT_AN_IMAGE_CONTENT_HERE').toString('base64');

    const res = await request(app)
      .post('/api/companion/kyc/submit')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({
        idFrontBase64: fakeTextBase64,
        idBackBase64: validJpegBase64,
        selfieBase64: validJpegBase64,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('2. Companion submits 3 valid images: encrypted on disk with AES-256-GCM', async () => {
    const res = await request(app)
      .post('/api/companion/kyc/submit')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({
        idFrontBase64: validJpegBase64,
        idBackBase64: validPngBase64,
        selfieBase64: validJpegBase64,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.kyc_id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');

    createdKycId = res.body.data.kyc_id;

    // Verify record in database
    const kyc = await prisma.kycRecord.findUnique({ where: { kyc_id: createdKycId } });
    expect(kyc).toBeDefined();
    expect(kyc?.status).toBe('PENDING');
    expect(kyc?.id_front_iv).toBeDefined();
    expect(kyc?.id_front_tag).toBeDefined();

    frontEncPath = kyc!.id_front_path;
    expect(fs.existsSync(frontEncPath)).toBe(true);

    // Verify file on disk is encrypted (ciphertext does NOT match plain bytes)
    const diskContent = fs.readFileSync(frontEncPath);
    expect(diskContent.toString('base64')).not.toBe(validJpegBase64);
  });

  it('3. Another companion or unauthorized user CANNOT view eKYC images (403)', async () => {
    const res = await request(app)
      .get(`/api/admin/kyc/${createdKycId}/image/front`)
      .set('Authorization', `Bearer ${companion2Token}`);

    expect(res.status).toBe(403);
  });

  it('4. Admin can inspect pending KYC list', async () => {
    const res = await request(app)
      .get('/api/admin/kyc/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((k: any) => k.kyc_id === createdKycId);
    expect(found).toBeDefined();
  });

  it('5. Admin decrypts and views image in-memory; audit log is recorded', async () => {
    const res = await request(app)
      .get(`/api/admin/kyc/${createdKycId}/image/front`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('image/jpeg');

    // Decrypted bytes match original JPEG magic bytes FF D8 FF
    const buffer = Buffer.from(res.body);
    expect(buffer[0]).toBe(0xFF);
    expect(buffer[1]).toBe(0xD8);
    expect(buffer[2]).toBe(0xFF);

    // Audit log check
    const audit = await prisma.auditLog.findFirst({
      where: {
        entity_id: createdKycId,
        action: 'VIEW_EKYC_IMAGE',
      },
    });
    expect(audit).toBeDefined();
  });

  it('6. Admin reviews and approves KYC: status updated to VERIFIED and profile updated', async () => {
    const res = await request(app)
      .post(`/api/admin/kyc/${createdKycId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'VERIFIED',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('VERIFIED');

    // Companion profile verification_status is now VERIFIED
    const companion = await prisma.companionProfile.findUnique({
      where: { user_id: 'u-comp-01' },
    });
    expect(companion?.verification_status).toBe('VERIFIED');
  });
});
