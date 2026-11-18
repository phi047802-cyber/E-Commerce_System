import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';

describe('ĐỢT D1: Kiểm thử tích hợp toàn diện luồng khiếu nại (RMA) khi test bằng tay', () => {
  let renterToken: string;
  let companionToken: string;
  let csToken: string;
  let outsiderToken: string;
  let bookingId: string;
  let disputeId: string;
  let sessionId: string;
  let renterEvidenceId: string;
  let companionEvidenceId: string;

  beforeAll(async () => {
    // 1. Dọn dẹp DB
    await prisma.auditLog.deleteMany();
    await prisma.disputeDecision.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.ledgerAuditAlert.deleteMany();
    await prisma.platformRevenue.deleteMany();
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.trustScoreLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: 'test-d1-' } },
    });
    await prisma.payment.deleteMany();

    await prisma.wallet.updateMany({ data: { penalty_debt: 0 } });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-01' },
      data: { available_balance: 500000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-01' },
      data: { available_balance: 0, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID },
      data: { available_balance: -500000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      data: { available_balance: 0, escrow_balance: 0 },
    });

    // 2. Lấy Token 3 vai trò + User ngoài cuộc (outsider)
    const resRenter = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter1@instasquad.test', password: 'Demo@123456' });
    renterToken = resRenter.body.data.token;

    const resComp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion1@instasquad.test', password: 'Demo@123456' });
    companionToken = resComp.body.data.token;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    const resOutsider = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renter2@instasquad.test', password: 'Demo@123456' });
    outsiderToken = resOutsider.body.data.token;

    // 3. Tạo slot và đơn đặt lịch
    const now = new Date();
    const start = new Date(now.getTime() + 3600 * 1000);
    const end = new Date(now.getTime() + 7200 * 1000);

    await prisma.slotCalendar.create({
      data: {
        slot_id: 'test-d1-slot-01',
        profile_id: 'prof-comp-01',
        start_time: start,
        end_time: end,
        status: 'AVAILABLE',
      },
    });

    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        slot_id: 'test-d1-slot-01',
        request_key: 'req-d1-repro-01',
      });
    bookingId = resBooking.body.data.booking_id;

    // Ký quỹ
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renterToken}`);

    // Companion chấp nhận
    await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${companionToken}`);

    // Bắt đầu session và gửi tin nhắn
    const resSession = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${renterToken}`);
    sessionId = resSession.body.data.session.session_id;

    await request(app)
      .post(`/api/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${companionToken}`);

    await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({ content: 'Chào bạn, vào game nhé!' });

    await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${companionToken}`)
      .send({ content: 'Ok bạn ơi, add nick mình 0912345678 nhé' }); // SĐT sẽ bị che

    await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${companionToken}`);

    // Renter báo sự cố mở khiếu nại
    const resDispute = await request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        reason_category: 'HARASSMENT',
        description: 'Companion có thái độ không đúng mực trong trận đấu và chia sẻ thông tin ngoài sàn.',
      });
    disputeId = resDispute.body.data.dispute.dispute_id;
  });

  // TÁI HIỆN LỖI 1 & KIỂM TRA SỬA LỖI: CS gửi thiếu/sai trường nhận 422 có thông điệp rõ
  it('TEST 1: CS request additional evidence returns 422 with specific field error message when notes is empty', async () => {
    const res = await request(app)
      .post(`/api/cs/disputes/${disputeId}/request-evidence`)
      .set('Authorization', `Bearer ${csToken}`)
      .send({
        deadline_hours: 24,
        notes: '', // trống
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("notes");
  });

  it('TEST 2: CS request additional evidence succeeds with 200 and accepts either notes or request_note', async () => {
    const res = await request(app)
      .post(`/api/cs/disputes/${disputeId}/request-evidence`)
      .set('Authorization', `Bearer ${csToken}`)
      .send({
        deadline_hours: 24,
        request_note: 'Yêu cầu Companion giải trình về nội dung chat trong trận.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const disputeInDb = await prisma.disputeCase.findUnique({
      where: { dispute_id: disputeId },
    });
    expect(disputeInDb?.status).toBe('EVIDENCE_PENDING');
    expect(disputeInDb?.evidence_requested_by).toBeDefined();
    expect(disputeInDb?.evidence_request_note).toBe('Yêu cầu Companion giải trình về nội dung chat trong trận.');
    expect(disputeInDb?.evidence_deadline).toBeDefined();
  });

  // KIỂM TRA QUYẾT ĐỊNH D29: Companion gửi giải trình kèm file minh chứng
  it('TEST 3: Companion submits explanation and evidence under Decision D29', async () => {
    const res = await request(app)
      .post(`/api/disputes/${disputeId}/explanation`)
      .set('Authorization', `Bearer ${companionToken}`)
      .send({
        explanation: 'Tôi chia sẻ nick in-game để mời vào sảnh nhanh hơn, hoàn toàn không có ý định giao dịch ngoài sàn.',
        file_type: 'IMAGE_PNG',
        file_content_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        file_name: 'screenshot_ingame.png',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dispute.companion_explanation).toContain('hoàn toàn không có ý định');
    expect(res.body.data.dispute.status).toBe('UNDER_REVIEW'); // Đã chuyển về UNDER_REVIEW và tích lũy SLA
    expect(res.body.data.evidence).toBeDefined();
    companionEvidenceId = res.body.data.evidence.evidence_id;
  });

  // KIỂM TRA RENTER NỘP CHỨNG CỨ BỔ SUNG (Hỗ trợ tra cứu theo dispute_id hoặc booking_id)
  it('TEST 4: Renter submits evidence using booking_id or dispute_id', async () => {
    const res = await request(app)
      .post(`/api/disputes/${bookingId}/evidences`)
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        file_type: 'IMAGE_PNG',
        file_content_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        file_name: 'renter_proof.png',
        description: 'Ảnh chụp tin nhắn đòi chia sẻ thông tin liên lạc',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    renterEvidenceId = res.body.data.evidence_id;
  });

  // KIỂM TRA CS DOSSIER ĐẦY ĐỦ VÀ NHẬT KÝ CHAT BẢO MẬT (BPMN Hình 2C bước 4)
  it('TEST 5: CS Agent gets complete Dossier with frozen escrow, evidence list, SLA metrics and chat logs', async () => {
    const res = await request(app)
      .get(`/api/cs/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const dossier = res.body.data;

    // Escrow FROZEN
    expect(dossier.booking.escrow.status).toBe('FROZEN');

    // Evidences list có cả uploader
    expect(dossier.evidences.length).toBeGreaterThanOrEqual(2);
    expect(dossier.evidences[0].uploader).toBeDefined();

    // SLA Metrics
    expect(dossier.sla_metrics).toBeDefined();
    expect(dossier.sla_metrics.target_minutes).toBe(45);
    expect(dossier.sla_metrics.paused_ms).toBeGreaterThanOrEqual(0);

    // Chat Messages và CS original content view
    expect(dossier.chat_messages.length).toBe(2);
    const phoneMsg = dossier.chat_messages.find((m: any) => m.is_censored);
    expect(phoneMsg).toBeDefined();
    expect(phoneMsg.content).toContain('***');
    expect(phoneMsg.original_content).toContain('0912345678'); // CS được xem nội dung gốc
  });

  // KIỂM TRA BẢO MẬT TỆP BẰNG CHỨNG VÀ AUDIT LOG (Không truy cập tĩnh công khai)
  it('TEST 6: Direct static access to uploads/evidences is blocked with 403', async () => {
    const res = await request(app).get('/uploads/evidences/renter_proof.png');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_STATIC_ACCESS');
  });

  it('TEST 7: CS Agent views evidence via secure API and generates AuditLog', async () => {
    const res = await request(app)
      .get(`/api/cs/disputes/${disputeId}/evidences/${renterEvidenceId}/file`)
      .set('Authorization', `Bearer ${csToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');

    // Kiểm tra AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'VIEW_DISPUTE_EVIDENCE',
        entity_id: renterEvidenceId,
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.actor_id).toBe('u-cs-01');
  });

  it('TEST 8: Outsider is blocked with 403 when trying to access evidence file or chat messages', async () => {
    const resFile = await request(app)
      .get(`/api/disputes/${disputeId}/evidences/${renterEvidenceId}/file`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(resFile.status).toBe(403);

    const resChat = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(resChat.status).toBe(403);
  });

  // KIỂM TRA CHẶN COMPANION TỰ THUÊ CHÍNH MÌNH
  it('TEST 9: Companion cannot book own profile/slot', async () => {
    const now = new Date();
    await prisma.slotCalendar.create({
      data: {
        slot_id: 'test-d1-slot-self',
        profile_id: 'prof-comp-01',
        start_time: new Date(now.getTime() + 8000 * 1000),
        end_time: new Date(now.getTime() + 11600 * 1000),
        status: 'AVAILABLE',
      },
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${companionToken}`) // Companion đặt chính slot của mình
      .send({
        slot_id: 'test-d1-slot-self',
        request_key: 'req-d1-self-rent',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANNOT_RENT_SELF');
  });

  // KIỂM TRA PHÁN QUYẾT CS (Lỗi Companion >= 80% hoàn 100% + phạt 20% + bảo toàn Sổ cái Variance = 0)
  it('TEST 10: CS resolves dispute with fault >= 80%: 100% refund, 20% penalty, Variance = 0', async () => {
    const res = await request(app)
      .post(`/api/cs/disputes/${disputeId}/decision`)
      .set('Authorization', `Bearer ${csToken}`)
      .send({
        fault_percent: 85,
        decision_reason: 'Companion đã có hành vi vi phạm quy chế sàn và chia sẻ số điện thoại cá nhân.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { escrow: true },
    });
    expect(booking?.status).toBe('REFUNDED');
    expect(booking?.escrow?.status).toBe('REFUNDED');

    // Kiểm tra bảo toàn Sổ cái kép (Total Debits == Total Credits)
    const allEntries = await prisma.ledgerEntry.findMany();
    const debits = allEntries.filter((e) => e.direction === 'DEBIT').reduce((acc, e) => acc + e.amount, 0);
    const credits = allEntries.filter((e) => e.direction === 'CREDIT').reduce((acc, e) => acc + e.amount, 0);
    expect(debits - credits).toBe(0);
  });

  afterAll(async () => {
    await prisma.wallet.updateMany({ data: { penalty_debt: 0 } });
  });
});
