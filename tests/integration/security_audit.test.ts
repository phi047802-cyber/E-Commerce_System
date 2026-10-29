import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/src/config/env.js';

describe('Security Audit & Penetration Hardening Tests (Requirement 4)', () => {
  let renterToken: string;
  let companionToken: string;
  let csToken: string;
  let renter2Token: string;

  beforeAll(async () => {
    // 1. Login renter1
    const resRenter1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter1.body.data.token;

    // 2. Login renter2
    const resRenter2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter2@instasquad.test', password: 'Demo@123456' });
    renter2Token = resRenter2.body.data.token;

    // 3. Login companion1
    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = resComp.body.data.token;

    // 4. Login CS agent
    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;
  });

  describe('1. Injection Hardening (SQL / ORM Parameter Tampering)', () => {
    it('should resist SQL injection in query parameters and return safe results', async () => {
      const maliciousQueries = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1 UNION SELECT * FROM users --",
        "admin'--",
      ];

      for (const query of maliciousQueries) {
        const res = await request(app)
          .get('/api/companions')
          .query({ search: query, game_id: query });

        // Must either succeed with empty/filtered list or return 400 validation error, never 500 crash
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        }
      }
    });

    it('should resist SQL injection in route params', async () => {
      const res = await request(app)
        .get("/api/bookings/' OR 1=1 --")
        .set('Authorization', `Bearer ${renterToken}`);

      expect([400, 404, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Insecure Direct Object Reference (IDOR) Protection', () => {
    it('should prevent Renter 2 from accessing Renter 1 booking details (TC67)', async () => {
      // First, get or create a booking for Renter 1
      const bookingsRes = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${renterToken}`);

      if (bookingsRes.body.data && bookingsRes.body.data.length > 0) {
        const bookingId = bookingsRes.body.data[0].booking_id;

        // Renter 2 attempts to access Renter 1's booking
        const idorRes = await request(app)
          .get(`/api/bookings/${bookingId}`)
          .set('Authorization', `Bearer ${renter2Token}`);

        expect(idorRes.status).toBe(403);
        expect(idorRes.body.success).toBe(false);
        expect(idorRes.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('should prevent unauthorized user from viewing another user withdrawal request', async () => {
      const res = await request(app)
        .get('/api/withdrawals')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent unauthorized user from posting evidence to an unowned dispute', async () => {
      const res = await request(app)
        .post('/api/disputes/fake-dispute-9999/evidences')
        .set('Authorization', `Bearer ${renter2Token}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_name: 'evidence.png',
          file_content_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=',
        });

      // Should be 404 (if not found) or 403 (if forbidden), never 200 or 500
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Secret Leaks & Information Disclosure', () => {
    it('should never expose password_hash or salt in login response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.salt).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('$2b$10$');
      expect(JSON.stringify(res.body)).not.toContain('$2a$');
    });

    it('should never expose password_hash in GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.password_hash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
    });

    it('should never expose raw server stack trace in client error responses', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({ invalid_field: 'malformed_payload' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('4. File Upload & Input Validation Security', () => {
    it('should reject dangerous executable / script files in dispute evidence', async () => {
      const res = await request(app)
        .post('/api/disputes/disp-12345/evidences')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          file_type: 'EXECUTABLE_EXE', // Dangerous disallowed type
          file_name: 'malware.exe',
          file_content_base64: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA...',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error)).toContain('Định dạng tệp không được hỗ trợ');
    });

    it('should reject evidence files exceeding 2MB size limit', async () => {
      const res = await request(app)
        .post('/api/disputes/disp-12345/evidences')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_name: 'huge_screenshot.png',
          file_size_bytes: 3 * 1024 * 1024, // 3MB > 2MB limit
          file_content_base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error)).toContain('Kích thước tệp không được vượt quá 2MB');
    });
  });

  describe('5. Authentication & JWT Integrity', () => {
    it('should reject tampered JWT signatures with 401 UNAUTHORIZED', async () => {
      const forgedToken = jwt.sign(
        { user_id: 'u-admin-01', role: 'ADMIN', email: 'admin@instasquad.test' },
        'WRONG_FORGED_SECRET_KEY'
      );

      const res = await request(app)
        .get('/api/wallet/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject malformed Authorization headers', async () => {
      const res = await request(app)
        .get('/api/wallet/me')
        .set('Authorization', 'InvalidBearerPrefix 123456');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
