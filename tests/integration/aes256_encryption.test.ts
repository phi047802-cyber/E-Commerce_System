import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';
import { runDataEncryptionMigration } from '../../scripts/dev-tools/migrate_encrypt_data.js';
import {
  encryptText,
  decryptText,
  encryptFileBuffer,
  decryptFileBuffer,
  isEncryptedText,
  isEncryptedFile,
} from '../../server/src/common/crypto.js';

describe('F3 - AES-256-GCM Data Encryption (NFR-002)', () => {
  let renterToken: string;
  let csToken: string;
  let adminToken: string;

  let renterId: string;
  let companionUserId: string;
  let csId: string;
  let adminId: string;

  let testBookingId: string;
  let testSessionId: string;
  let testDisputeId: string;
  let testEvidenceId: string;
  let testEvidenceDiskPath: string;

  const PLAIN_DISPUTE_DESC = 'Bằng chứng khiếu nại bí mật: Companion bỏ trận giữa chừng lúc phút 15.';
  const PLAIN_CHAT_MESSAGE = 'Nội dung tin nhắn phòng chơi mật giữa Renter và Companion.';
  const PLAIN_FILE_CONTENT = 'HEADER_LOG_CHUNG_CU_TRANH_CHAP_2026_TEST_FILE_CONTENT';

  beforeAll(async () => {
    const renter = await prisma.user.findFirst({ where: { role: 'RENTER' } });
    const companionUser = await prisma.user.findFirst({ where: { role: 'COMPANION' } });
    const cs = await prisma.user.findFirst({ where: { role: 'CS_AGENT' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!renter || !companionUser || !cs || !admin) {
      throw new Error('Thiếu dữ liệu seed cần thiết');
    }

    renterId = renter.user_id;
    companionUserId = companionUser.user_id;
    csId = cs.user_id;
    adminId = admin.user_id;

    renterToken = jwt.sign({ user_id: renterId, email: renter.email, role: renter.role }, env.JWT_SECRET);
    csToken = jwt.sign({ user_id: csId, email: cs.email, role: cs.role }, env.JWT_SECRET);
    adminToken = jwt.sign({ user_id: adminId, email: admin.email, role: admin.role }, env.JWT_SECRET);

    const companionProfile = await prisma.companionProfile.findUnique({
      where: { user_id: companionUserId },
    });
    if (!companionProfile) throw new Error('Không tìm thấy companion profile');

    const testSlot = await prisma.slotCalendar.create({
      data: {
        profile_id: companionProfile.profile_id,
        start_time: new Date(),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        status: 'BOOKED',
      },
    });

    const testBooking = await prisma.booking.create({
      data: {
        request_key: `req-enc-${Date.now()}`,
        renter_id: renterId,
        profile_id: companionProfile.profile_id,
        slot_id: testSlot.slot_id,
        start_time: new Date(),
        duration_hours: 1,
        total_fee_snapshot: 200000,
        status: 'IN_SESSION',
        response_deadline: new Date(Date.now() + 180 * 1000),
      },
    });
    testBookingId = testBooking.booking_id;

    await prisma.escrow.create({
      data: {
        booking_id: testBookingId,
        amount: 200000,
        status: 'HELD',
      },
    });

    const testSession = await prisma.session.create({
      data: {
        booking_id: testBookingId,
        status: 'ACTIVE',
        start_time: new Date(),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        room_token: `token-enc-${Date.now()}`,
      },
    });
    testSessionId = testSession.session_id;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    if (testEvidenceDiskPath && fs.existsSync(testEvidenceDiskPath)) {
      try {
        fs.unlinkSync(testEvidenceDiskPath);
      } catch {}
    }
    await prisma.disputeEvidence.deleteMany({ where: { dispute: { booking_id: testBookingId } } });
    await prisma.disputeCase.deleteMany({ where: { booking_id: testBookingId } });
    await prisma.chatMessage.deleteMany({ where: { session_id: testSessionId } });
    await prisma.session.deleteMany({ where: { session_id: testSessionId } });
    await prisma.escrow.deleteMany({ where: { booking_id: testBookingId } });
    await prisma.booking.deleteMany({ where: { booking_id: testBookingId } });
  });

  describe('1. Mã hóa văn bản và tệp tin tự động khi lưu (Ciphertext on Disk & DB)', () => {
    it('Tạo khiếu nại: description được mã hóa AES-256-GCM trong DB với tiền tố v1:', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'NO_SHOW',
          description: PLAIN_DISPUTE_DESC,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testDisputeId = res.body.data.dispute.dispute_id;

      // Đọc trực tiếp từ Database (Raw DB Record)
      const rawDispute = await prisma.disputeCase.findUnique({
        where: { dispute_id: testDisputeId },
      });
      expect(rawDispute).not.toBeNull();
      // Văn bản trong cơ sở dữ liệu KHÔNG đọc được bằng mắt
      expect(rawDispute?.description).not.toBe(PLAIN_DISPUTE_DESC);
      expect(rawDispute?.description.startsWith('v1:')).toBe(true);
      expect(isEncryptedText(rawDispute?.description)).toBe(true);
    });

    it('Gửi tin nhắn chat: content và original_content được mã hóa trong DB', async () => {
      const res = await request(app)
        .post(`/api/sessions/${testSessionId}/messages`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({ content: PLAIN_CHAT_MESSAGE });

      expect(res.status).toBe(201);
      const msgId = res.body.data.message_id;

      // Đọc trực tiếp từ Database
      const rawMsg = await prisma.chatMessage.findUnique({
        where: { message_id: msgId },
      });
      expect(rawMsg).not.toBeNull();
      expect(rawMsg?.content).not.toBe(PLAIN_CHAT_MESSAGE);
      expect(rawMsg?.content.startsWith('v1:')).toBe(true);
      expect(isEncryptedText(rawMsg?.content)).toBe(true);
    });

    it('Tải lên bằng chứng tệp: File ghi xuống đĩa có header ENC1 và ciphertext không đọc được bằng mắt', async () => {
      const fileBase64 = Buffer.from(PLAIN_FILE_CONTENT, 'utf8').toString('base64');

      const res = await request(app)
        .post(`/api/disputes/${testDisputeId}/evidences`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          file_type: 'LOG_TEXT',
          file_content_base64: fileBase64,
          file_name: 'evidence_log_test.txt',
          description: 'Mô tả bằng chứng văn bản',
        });

      expect(res.status).toBe(201);
      testEvidenceId = res.body.data.evidence_id;

      const rawEvidence = await prisma.disputeEvidence.findUnique({
        where: { evidence_id: testEvidenceId },
      });
      expect(rawEvidence).not.toBeNull();

      testEvidenceDiskPath = path.resolve(process.cwd(), rawEvidence!.file_url.replace(/^\//, ''));
      expect(fs.existsSync(testEvidenceDiskPath)).toBe(true);

      // Đọc trực tiếp tệp trên đĩa
      const diskBytes = fs.readFileSync(testEvidenceDiskPath);
      // Có header ENC1
      expect(isEncryptedFile(diskBytes)).toBe(true);
      // Nội dung trên đĩa không khớp chuỗi gốc
      expect(diskBytes.toString('utf8')).not.toContain(PLAIN_FILE_CONTENT);
    });
  });

  describe('2. Giải mã trong bộ nhớ khi truy cập qua API được cấp quyền', () => {
    it('CS Agent xem chi tiết khiếu nại qua API: Server giải mã trả về nội dung nguyên bản', async () => {
      const res = await request(app)
        .get(`/api/disputes/${testDisputeId}`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // API trả về nội dung đã giải mã minh bạch
      expect(res.body.data.description).toBe(PLAIN_DISPUTE_DESC);
    });

    it('Người dùng trong phòng phiên chơi đọc lịch sử chat: Trả về nội dung đã giải mã', async () => {
      const res = await request(app)
        .get(`/api/sessions/${testSessionId}/messages`)
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const msg = res.body.data.find((m: any) => m.content === PLAIN_CHAT_MESSAGE);
      expect(msg).toBeDefined();
    });

    it('Tải tệp chứng cứ qua API bảo mật: Server giải mã in-memory trả về đúng dữ liệu gốc', async () => {
      // 1. Lấy signed_download_url từ hồ sơ
      const dossierRes = await request(app)
        .get(`/api/disputes/${testDisputeId}`)
        .set('Authorization', `Bearer ${csToken}`);

      const ev = dossierRes.body.data.evidence[0];
      expect(ev.signed_download_url).toBeDefined();

      // 2. Tải tệp qua signed URL
      const fileRes = await request(app).get(ev.signed_download_url);

      expect(fileRes.status).toBe(200);
      expect(fileRes.text).toBe(PLAIN_FILE_CONTENT);
    });
  });

  describe('3. Tính toàn vẹn dữ liệu: Phát hiện chỉnh sửa giả mạo 1 bit (Auth Tag Tampering)', () => {
    it('Sửa đổi 1 bit của tệp mã hóa trên đĩa: Phát hiện lỗi xác thực Auth Tag', async () => {
      expect(fs.existsSync(testEvidenceDiskPath)).toBe(true);
      const originalBytes = fs.readFileSync(testEvidenceDiskPath);

      // Đảo 1 bit ở byte cuối cùng
      const tamperedBytes = Buffer.from(originalBytes);
      tamperedBytes[tamperedBytes.length - 1] ^= 0x01;
      fs.writeFileSync(testEvidenceDiskPath, tamperedBytes);

      // Thử giải mã tệp đã bị chỉnh sửa
      expect(() => {
        decryptFileBuffer(tamperedBytes);
      }).toThrow(/Auth tag validation failed/i);

      // Khôi phục lại tệp gốc
      fs.writeFileSync(testEvidenceDiskPath, originalBytes);
    });

    it('Sửa đổi chuỗi mã hóa v1:: Phát hiện lỗi xác thực', () => {
      const encrypted = encryptText('Bí mật cần bảo vệ');
      const tampered = encrypted.slice(0, -2) + '00';

      expect(() => {
        decryptText(tampered);
      }).toThrow(/Auth tag validation failed/i);
    });
  });

  describe('4. Migration Idempotent (Mã hóa lại dữ liệu cũ)', () => {
    it('Chạy migration: Mã hóa dữ liệu cũ chưa có v1:/ENC1 và an toàn khi chạy lại nhiều lần', async () => {
      // Giả lập tạo 1 message cũ chưa mã hóa trong DB
      const legacyMsg = await prisma.chatMessage.create({
        data: {
          session_id: testSessionId,
          sender_id: renterId,
          content: 'Tin nhắn cũ chưa mã hóa năm 2025',
          is_censored: false,
        },
      });

      // Chạy migration lần 1
      const result1 = await runDataEncryptionMigration();
      expect(result1.chatMessagesMigrated).toBeGreaterThanOrEqual(1);

      // Kiểm tra DB: Bản ghi cũ đã được mã hóa v1:
      const updatedMsg = await prisma.chatMessage.findUnique({
        where: { message_id: legacyMsg.message_id },
      });
      expect(updatedMsg?.content.startsWith('v1:')).toBe(true);
      expect(decryptText(updatedMsg?.content)).toBe('Tin nhắn cũ chưa mã hóa năm 2025');

      // Chạy migration lần 2 (Kiểm tra tính Idempotent)
      const result2 = await runDataEncryptionMigration();
      // Không mã hóa lại bản ghi đã có v1:
      expect(result2.chatMessagesMigrated).toBe(0);
    });
  });

  describe('5. Ngoại lệ Avatar công khai không mã hóa', () => {
    it('Avatar là dữ liệu công khai phục vụ CDN/Browser Cache nên không áp dụng mã hóa ENC1', async () => {
      const avatarDir = path.resolve(process.cwd(), 'uploads', 'avatars');
      if (fs.existsSync(avatarDir)) {
        const avatarFiles = fs.readdirSync(avatarDir);
        if (avatarFiles.length > 0) {
          const sampleAvatar = path.join(avatarDir, avatarFiles[0]);
          const buffer = fs.readFileSync(sampleAvatar);
          // Avatar công khai KHÔNG được có header ENC1
          expect(isEncryptedFile(buffer)).toBe(false);
        }
      }
    });
  });
});
