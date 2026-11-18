import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';
import { bookingAutomationService } from '../../server/src/modules/booking/booking-automation.service.js';
import { generateEvidenceSignedToken } from '../../server/src/middleware/auth.js';

describe('ĐỢT D1b: Kiểm thử tích hợp An toàn, Bảo mật & Hoàn thiện Luồng khiếu nại (RMA)', () => {
  let renterToken: string;
  let companionToken: string;
  let csToken: string;
  let adminToken: string;
  let outsiderToken: string;

  let renterId = 'u-renter-01';
  let companionUserId = 'u-comp-01';
  let csAgentId = 'u-cs-01';
  let adminId = 'u-admin-01';

  let bookingId: string;
  let disputeId: string;
  let sessionId: string;
  let renterEvidenceId: string;
  let companionEvidenceId: string;

  beforeAll(async () => {
    // 1. Dọn dẹp cơ sở dữ liệu
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.disputeDecision.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: 'test-d1b-' } },
    });

    // 2. Lấy JWT Token cho các vai trò
    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter.body.data.token;
    renterId = resRenter.body.data.user.user_id;

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = resComp.body.data.token;
    companionUserId = resComp.body.data.user.user_id;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;
    csAgentId = resCS.body.data.user.user_id;

    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@instasquad.test', password: 'Demo@123456' });
    adminToken = resAdmin.body.data.token;
    adminId = resAdmin.body.data.user.user_id;

    const resOutsider = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter2@instasquad.test', password: 'Demo@123456' });
    outsiderToken = resOutsider.body.data.token;

    // 3. Chuẩn bị slot và quy trình đơn đặt
    const now = new Date();
    await prisma.slotCalendar.create({
      data: {
        slot_id: 'test-d1b-slot-01',
        profile_id: 'prof-comp-01',
        start_time: new Date(now.getTime() + 3600 * 1000),
        end_time: new Date(now.getTime() + 7200 * 1000),
        status: 'AVAILABLE',
      },
    });

    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        slot_id: 'test-d1b-slot-01',
        request_key: 'req-d1b-security-01',
      });
    bookingId = resBooking.body.data.booking_id;

    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renterToken}`);

    await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companionToken}`);

    // Bắt đầu phiên và gửi tin nhắn chứa nội dung nhạy cảm
    const resSession = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${renterToken}`);
    sessionId = resSession.body.data.session.session_id;

    await request(app)
      .post(`/api/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${companionToken}`);

    // Renter gửi tin bình thường
    await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ content: 'Chào bạn, chúng ta bắt đầu trận nhé' });

    // Companion gửi tin chứa số điện thoại để hệ thống che và lưu original_content
    await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${companionToken}`)
      .send({ content: 'Liên hệ qua Zalo số 0987654321 nhé bạn' });

    await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${companionToken}`);

    // Renter mở khiếu nại (Report Issue)
    const resDispute = await request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        reason_category: 'HARASSMENT',
        description: 'Companion gửi số điện thoại cá nhân và yêu cầu giao dịch ngoài sàn.',
      });
    disputeId = resDispute.body.data.dispute.dispute_id;

    // Renter nộp bằng chứng hợp lệ chuẩn magic bytes PNG
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const resEv = await request(app)
      .post(`/api/disputes/${disputeId}/evidences`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        file_type: 'IMAGE_PNG',
        file_content_base64: validPngBase64,
        file_name: 'renter_proof.png',
        description: 'Ảnh chụp màn hình tin nhắn chat',
      });
    renterEvidenceId = resEv.body.data.evidence_id;
  });

  // ==========================================
  // PHẦN B.1: BỎ TOKEN KHỎI URL QUERY & SIGNED URL
  // ==========================================
  describe('B.1: An toàn tệp bằng chứng và từ chối ?token= query', () => {
    it('B1.1: Request có ?token= trên query string bị từ chối 401 theo chính sách an toàn', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/file?token=${csToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('query string (?token=) bị nghiêm cấm');
    });

    it('B1.2: Request không có header Authorization và không có signed_token bị 401', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/file`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('B1.3: Người ngoài cuộc (outsider) gọi tệp bằng chứng bị từ chối 403', async () => {
      const res = await request(app)
        .get(`/api/disputes/${disputeId}/evidences/${renterEvidenceId}/file`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('B1.4: CS Agent xem tệp qua Authorization header thành công 200 và ghi nhận AuditLog', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/file`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'VIEW_DISPUTE_EVIDENCE',
          actor_id: csAgentId,
          entity_id: renterEvidenceId,
        },
      });
      expect(audit).toBeDefined();
    });

    it('B1.5: Admin xem tệp qua Authorization header thành công 200 và ghi nhận AuditLog', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/file`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'VIEW_DISPUTE_EVIDENCE',
          actor_id: adminId,
          entity_id: renterEvidenceId,
        },
      });
      expect(audit).toBeDefined();
    });

    it('B1.6: Lấy signed_url ngắn hạn 60s cho phép tải tệp trực tiếp', async () => {
      const resUrl = await request(app)
        .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/signed-url`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(resUrl.status).toBe(200);
      expect(resUrl.body.data.signed_token).toBeDefined();
      expect(resUrl.body.data.signed_url).toContain('signed_token=');
      expect(resUrl.body.data.expires_in).toBe(60);

      // Gọi tải file bằng signed_token hợp lệ
      const resDownload = await request(app)
        .get(resUrl.body.data.signed_url);

      expect(resDownload.status).toBe(200);
      expect(resDownload.headers['content-type']).toContain('image/png');
    });

    it('B1.7: signed_token đã hết hạn bị từ chối 401', async () => {
      // Giả lập token đã hết hạn (-10s)
      const expiredSignedToken = jwt.sign(
        {
          user_id: csAgentId,
          role: 'CS_AGENT',
          purpose: 'evidence_download',
          dispute_id: disputeId,
          evidence_id: renterEvidenceId,
        },
        env.JWT_SECRET,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .get(`/api/disputes/${disputeId}/evidences/${renterEvidenceId}/file?signed_token=${expiredSignedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('hết hạn');
    });
  });

  // ==========================================
  // PHẦN B.2: PHÂN QUYỀN NỘI DUNG CHAT
  // ==========================================
  describe('B.2: Phân quyền nội dung chat và bảo vệ original_content', () => {
    it('B2.1: Renter gọi API phòng chat thường KHÔNG nhận được original_content', async () => {
      const res = await request(app)
        .get(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      for (const msg of res.body.data) {
        expect(msg.original_content).toBeUndefined();
      }
    });

    it('B2.2: Companion gọi API phòng chat thường KHÔNG nhận được original_content', async () => {
      const res = await request(app)
        .get(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${companionToken}`);

      expect(res.status).toBe(200);
      for (const msg of res.body.data) {
        expect(msg.original_content).toBeUndefined();
      }
    });

    it('B2.3: Người ngoài cuộc gọi API chat bị từ chối 403', async () => {
      const res = await request(app)
        .get(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('B2.4: CS Agent xem hồ sơ Dossier nhận được original_content và sinh AuditLog(VIEW_DISPUTE_CHAT_AUDIT)', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(200);
      const chatMessages = res.body.data.chat_messages;
      expect(chatMessages).toBeDefined();
      const phoneMsg = chatMessages.find((m: any) => m.is_censored);
      expect(phoneMsg).toBeDefined();
      expect(phoneMsg.content).toContain('***');
      expect(phoneMsg.original_content).toContain('0987654321');

      // Kiểm tra AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'VIEW_DISPUTE_CHAT_AUDIT',
          actor_id: csAgentId,
          entity_id: disputeId,
        },
      });
      expect(audit).toBeDefined();
    });

    it('B2.5: Admin xem hồ sơ Dossier nhận được original_content và sinh AuditLog(VIEW_DISPUTE_CHAT_AUDIT)', async () => {
      const res = await request(app)
        .get(`/api/cs/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const phoneMsg = res.body.data.chat_messages.find((m: any) => m.is_censored);
      expect(phoneMsg.original_content).toContain('0987654321');

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'VIEW_DISPUTE_CHAT_AUDIT',
          actor_id: adminId,
          entity_id: disputeId,
        },
      });
      expect(audit).toBeDefined();
    });
  });

  // ==========================================
  // PHẦN C: HOÀN THIỆN ĐỢT D1B (MAGIC BYTES, NOTIFICATIONS, TIMEOUT 24H)
  // ==========================================
  describe('C: Kiểm tra Magic Bytes, In-App Notifications và Quá hạn 24 giờ', () => {
    it('C.1: Tải tệp không đúng magic bytes ảnh bị từ chối 400/ValidationError', async () => {
      // Buffer chuỗi văn bản không phải PNG magic bytes (89 50 4E 47)
      const fakePngBase64 = Buffer.from('day la file text doi duoi png').toString('base64');

      const res = await request(app)
        .post(`/api/disputes/${disputeId}/evidences`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_content_base64: fakePngBase64,
          file_name: 'fake.png',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('magic bytes');
    });

    it('C.2: Tải tệp vượt quá giới hạn 2MB bị từ chối với lỗi kích thước', async () => {
      // Buffer lớn hơn 2MB
      const hugeBuffer = Buffer.alloc(2.5 * 1024 * 1024);
      hugeBuffer[0] = 0x89;
      hugeBuffer[1] = 0x50;
      hugeBuffer[2] = 0x4e;
      hugeBuffer[3] = 0x47;

      const res = await request(app)
        .post(`/api/disputes/${disputeId}/evidences`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_content_base64: hugeBuffer.toString('base64'),
          file_name: 'huge.png',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('2MB');
    });

    it('C.3: Companion gửi giải trình D29 tạo thông báo in-app cho cả Renter và toàn bộ CS/Admin', async () => {
      const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(app)
        .post(`/api/disputes/${disputeId}/explanation`)
        .set('Authorization', `Bearer ${companionToken}`)
        .send({
          explanation: 'Tôi gửi Zalo vì game gián đoạn micro, hoàn toàn tuân thủ điều khoản không thanh toán ngoài sàn.',
          file_type: 'IMAGE_PNG',
          file_content_base64: validPngBase64,
          file_name: 'companion_proof.png',
        });

      expect(res.status).toBe(200);

      // Kiểm tra notification cho CS/Admin
      const staffNotifs = await prisma.notification.findMany({
        where: {
          type: 'DISPUTE_EXPLANATION_SUBMITTED',
          user_id: { in: [csAgentId, adminId] },
        },
      });
      expect(staffNotifs.length).toBeGreaterThanOrEqual(1);

      // Kiểm tra notification cho Renter
      const renterNotif = await prisma.notification.findFirst({
        where: {
          type: 'DISPUTE_EXPLANATION_SUBMITTED',
          user_id: renterId,
        },
      });
      expect(renterNotif).toBeDefined();
    });

    it('C.4: CS yêu cầu bổ sung bằng chứng tạo notification cho cả hai bên và chuyển sang EVIDENCE_PENDING', async () => {
      const res = await request(app)
        .post(`/api/cs/disputes/${disputeId}/request-evidence`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          deadline_hours: 24,
          notes: 'Yêu cầu cả hai bên cung cấp thêm log trao đổi trong sảnh chờ.',
        });

      expect(res.status).toBe(200);

      const disputeInDb = await prisma.disputeCase.findUnique({
        where: { dispute_id: disputeId },
      });
      expect(disputeInDb?.status).toBe('EVIDENCE_PENDING');
      expect(disputeInDb?.evidence_deadline).toBeDefined();

      const notifs = await prisma.notification.findMany({
        where: {
          type: 'DISPUTE_EVIDENCE_REQUESTED',
          user_id: { in: [renterId, companionUserId] },
        },
      });
      expect(notifs.length).toBe(2);
    });

    it('C.5: Quá hạn 24 giờ tự động chuyển UNDER_REVIEW và thông báo cho nhân viên CS/Admin', async () => {
      // Giả lập thời gian tương lai sau 25 giờ (clock quá hạn 24h)
      const futureClock = new Date(Date.now() + 25 * 3600 * 1000);

      const stats = await bookingAutomationService.processExpiredDisputeEvidences(futureClock);
      expect(stats.scanned).toBeGreaterThanOrEqual(1);
      expect(stats.processed).toBeGreaterThanOrEqual(1);

      // Kiểm tra trạng thái đã chuyển sang UNDER_REVIEW
      const disputeInDb = await prisma.disputeCase.findUnique({
        where: { dispute_id: disputeId },
      });
      expect(disputeInDb?.status).toBe('UNDER_REVIEW');
      expect(disputeInDb?.evidence_requested_at).toBeNull();

      // Kiểm tra notification thông báo quá hạn gửi cho CS Agent / Admin
      const staffExpiredNotifs = await prisma.notification.findMany({
        where: {
          type: 'DISPUTE_EVIDENCE_EXPIRED',
          user_id: { in: [csAgentId, adminId] },
        },
      });
      expect(staffExpiredNotifs.length).toBeGreaterThanOrEqual(1);
    });
  });

  afterAll(async () => {
    await prisma.wallet.updateMany({ data: { penalty_debt: 0 } });
  });
});
