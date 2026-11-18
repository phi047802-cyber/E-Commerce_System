import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { ledgerService } from '../../server/src/modules/ledger/ledger.service.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { BusinessError } from '../../server/src/common/errors.js';

describe('Dispute, RMA, Evidence Upload & CS Settlement Decisions (M7 - PROMPT 10, BR-26, D14, D15, TC47-TC61)', () => {
  let renter1Token: string;
  let renter2Token: string;
  let companion1Token: string;
  let companion2Token: string;
  let csToken: string;

  const TEST_PREFIX = 'test-dsp-';
  let sequenceIndex = 100;

  const cleanupTestData = async () => {
    // 1. Xóa toàn bộ dữ liệu phụ thuộc
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
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });
    await prisma.payment.deleteMany();

    // 2. Xóa các ledger transactions ngoại trừ giao dịch khởi tạo
    await prisma.ledgerEntry.deleteMany({
      where: {
        transaction: {
          idempotency_key: {
            not: 'INIT-SEED-RENTER-01',
          },
        },
      },
    });
    await prisma.ledgerTransaction.deleteMany({
      where: {
        idempotency_key: {
          not: 'INIT-SEED-RENTER-01',
        },
      },
    });

    // 3. Khôi phục số dư ví chuẩn xác và xóa nợ phạt
    await prisma.wallet.updateMany({
      data: { penalty_debt: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-01' },
      data: { available_balance: 500000, escrow_balance: 0, penalty_debt: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-02' },
      data: { available_balance: 0, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-01' },
      data: { available_balance: 0, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-02' },
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

    // Khởi tạo lại TrustScore ban đầu cho Companion
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
  };

  beforeAll(async () => {
    await cleanupTestData();

    // Đăng nhập các vai trò
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

    const resComp2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'companion2@instasquad.test', password: 'Demo@123456' });
    companion2Token = resComp2.body.data.token;

    const resCS = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' });
    csToken = resCS.body.data.token;

    // Nạp thêm 5.000.000 VND cho Renter 1 để đảm bảo số dư cho toàn bộ ca kiểm thử
    const topupRes = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({ amount: 5000000, provider: 'MOCK_VNPAY' });

    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupRes.body.data.payment_id, outcome: 'SUCCESS' });

    // Nạp thêm 300.000 VND cho Companion 1 qua simulator để phục vụ kiểm thử phạt 20%
    const topupComp1 = await request(app)
      .post('/api/payments/create-topup')
      .set('Authorization', `Bearer ${companion1Token}`)
      .send({ amount: 300000, provider: 'MOCK_VNPAY' });

    await request(app)
      .post('/api/payments/simulate')
      .send({ payment_id: topupComp1.body.data.payment_id, outcome: 'SUCCESS' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Helper tạo booking đã được Companion chấp nhận và có Session
  const createActiveBooking = async (keySuffix: string, profileId = 'prof-comp-01', compToken = companion1Token) => {
    sequenceIndex++;
    const slotId = `${TEST_PREFIX}slot-${keySuffix}`;
    const requestKey = `${TEST_PREFIX}req-${keySuffix}`;
    // Mỗi slot cách nhau 1 ngày để không bị chạm trần 10 giờ/ngày
    const startTime = new Date(Date.now() + sequenceIndex * 86400 * 1000);
    const endTime = new Date(startTime.getTime() + 3600 * 1000);

    // 1. Tạo slot
    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: profileId,
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    // 2. Tạo booking
    const resBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        slot_id: slotId,
        request_key: requestKey,
        duration_hours: 1,
      });

    const bookingId = resBooking.body.data.booking_id;

    // 3. Ký quỹ Escrow (100.000 VND)
    await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renter1Token}`);

    // 4. Companion chấp nhận -> Tạo Session
    const resAccept = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${compToken}`);

    return {
      bookingId,
      session: resAccept.body.data.session,
    };
  };

  // Helper tạo booking đã mở khiếu nại (DisputeCase OPENED, Escrow FROZEN)
  const createDisputedBooking = async (
    keySuffix: string,
    category: any = 'NO_SHOW',
    desc = 'Companion không vào game và không liên lạc được.',
    profileId = 'prof-comp-01',
    compToken = companion1Token
  ) => {
    const { bookingId, session } = await createActiveBooking(keySuffix, profileId, compToken);

    // Renter gửi báo cáo sự cố
    const resReport = await request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set('Authorization', `Bearer ${renter1Token}`)
      .send({
        reason_category: category,
        description: desc,
      });

    return {
      bookingId,
      session,
      dispute: resReport.body.data.dispute,
      escrow: resReport.body.data.escrow,
    };
  };

  describe('1. Dispute Creation, Single Case Constraint & Escrow Freeze (TC47, TC48)', () => {
    it('TC47: Single dispute constraint per booking: Idempotent replay for same payload, conflict for mismatch', async () => {
      const { bookingId } = await createActiveBooking('tc47');

      // Lần 1: Mở khiếu nại -> 201 Created
      const res1 = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'NO_SHOW',
          description: 'Companion không xuất hiện trong trận đấu đúng giờ.',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.dispute.status).toBe('OPENED');
      expect(res1.body.data.booking.status).toBe('DISPUTED');
      expect(res1.body.data.escrow.status).toBe('FROZEN');

      // Lần 2: Gửi lại cùng payload -> Idempotent replay 200 OK
      const res2 = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'NO_SHOW',
          description: 'Companion không xuất hiện trong trận đấu đúng giờ.',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.meta.is_idempotent_replay).toBe(true);

      // Lần 3: Gửi payload khác -> 409 Conflict
      const res3 = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          reason_category: 'HARASSMENT',
          description: 'Một lý do khiếu nại hoàn toàn khác.',
        });

      expect(res3.status).toBe(409);
      expect(res3.body.error.code).toBe('DISPUTE_ALREADY_EXISTS');
    });

    it('TC48: Escrow is strictly FROZEN and settlement (manual or auto) is blocked while dispute is open', async () => {
      const { bookingId, escrow } = await createDisputedBooking('tc48');

      expect(escrow.status).toBe('FROZEN');
      expect(escrow.frozen_at).toBeDefined();

      // Cố tình gọi nghiệm thu thủ công -> Chặn HTTP 422
      const resManual = await request(app)
        .post(`/api/bookings/${bookingId}/accept-fulfillment`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resManual.status).toBe(422);
      expect(resManual.body.error.code).toBe('ESCROW_FROZEN');

      // Cố tình gọi nghiệm thu tự động -> Chặn HTTP 422
      const resAuto = await request(app)
        .post(`/api/bookings/${bookingId}/auto-accept`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({});

      expect(resAuto.status).toBe(422);
      expect(resAuto.body.error.code).toBe('ESCROW_FROZEN');
    });
  });

  describe('2. Evidence Submission & Academic Boundary Validation (TC49, TC50, TC51)', () => {
    it('TC49: RBAC: Non-participants cannot view or submit evidence to the dispute (403 Forbidden)', async () => {
      const { dispute } = await createDisputedBooking('tc49');

      // Renter 2 (người ngoài) cố tình xem chi tiết khiếu nại
      const resGet = await request(app)
        .get(`/api/disputes/${dispute.dispute_id}`)
        .set('Authorization', `Bearer ${renter2Token}`);

      expect(resGet.status).toBe(403);

      // Renter 2 cố tình nộp bằng chứng vào khiếu nại
      const resPost = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter2Token}`)
        .send({
          file_type: 'IMAGE_PNG',
          description: 'Bằng chứng giả mạo của người ngoài',
        });

      expect(resPost.status).toBe(403);
    });

    it('TC50: Both Renter and Companion can submit valid evidence (image & text log)', async () => {
      const { dispute } = await createDisputedBooking('tc50');

      // 1. Renter nộp ảnh chụp màn hình
      const resRenterEvidence = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_name: 'screenshot_match_history.png',
          file_content_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          description: 'Ảnh chụp màn hình lịch sử trận đấu không thấy Companion vào sảnh.',
        });

      expect(resRenterEvidence.status).toBe(201);
      expect(resRenterEvidence.body.data.file_type).toBe('IMAGE_PNG');
      expect(resRenterEvidence.body.data.file_url).toContain('/uploads/evidences/');

      // 2. Companion nộp file nhật ký log game
      const resCompEvidence = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${companion1Token}`)
        .send({
          file_type: 'LOG_TEXT',
          file_name: 'client_connection.log',
          file_content_base64: Buffer.from('[2026-10-24 10:00:00] Connected to lobby').toString('base64'),
          description: 'Log kết nối hiển thị Companion đã vào sảnh chờ lúc 10:00.',
        });

      expect(resCompEvidence.status).toBe(201);
      expect(resCompEvidence.body.data.file_type).toBe('LOG_TEXT');

      // 3. Xem danh sách bằng chứng
      const resListEvidences = await request(app)
        .get(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter1Token}`);

      expect(resListEvidences.status).toBe(200);
      expect(resListEvidences.body.data.length).toBe(2);
    });

    it('TC51: Evidence validation rejects executable files, real audio/video files, and files exceeding 2MB', async () => {
      const { dispute } = await createDisputedBooking('tc51');

      // 1. Chặn file thực thi độc hại (.exe, .sh)
      const resExec = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          file_type: 'LOG_TEXT',
          file_name: 'malicious_script.exe',
          file_content_base64: Buffer.from('fake-exe').toString('base64'),
        });

      expect(resExec.status).toBe(400);
      expect(resExec.body.error.message).toContain('Tệp thực thi bị nghiêm cấm');

      // 2. Chặn file âm thanh/video thật (Ranh giới học thuật)
      const resAudio = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_name: 'voice_record.mp3',
          file_content_base64: Buffer.from('fake-audio').toString('base64'),
        });

      expect(resAudio.status).toBe(422);
      expect(resAudio.body.error.code).toBe('AUDIO_VIDEO_NOT_SUPPORTED');

      // 3. Chặn file vượt quá dung lượng 2MB
      const resBigFile = await request(app)
        .post(`/api/disputes/${dispute.dispute_id}/evidences`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          file_type: 'IMAGE_PNG',
          file_size_bytes: 3 * 1024 * 1024, // 3MB > 2MB
          description: 'File quá lớn',
        });

      expect(resBigFile.status).toBe(400);
    });
  });

  describe('3. CS Dossier View & Evidence Request Workflow (TC52, TC53, TC54)', () => {
    it('TC52: CS Agent can inspect full CS Dossier without exposing passwords or secret tokens', async () => {
      const { dispute } = await createDisputedBooking('tc52');

      const resDossier = await request(app)
        .get(`/api/cs/disputes/${dispute.dispute_id}`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(resDossier.status).toBe(200);
      const data = resDossier.body.data;

      // Đảm bảo có đủ thông tin đối chiếu
      expect(data.dispute.dispute_id).toBe(dispute.dispute_id);
      expect(data.dispute.booking).toBeDefined();
      expect(data.dispute.booking.escrow.status).toBe('FROZEN');
      expect(data.is_staff).toBe(true);

      // Đảm bảo BẢO MẬT: KHÔNG chứa mật khẩu hash của người dùng
      expect(data.dispute.booking.renter.password_hash).toBeUndefined();
      expect(data.dispute.booking.companion.user.password_hash).toBeUndefined();

      // CS xem danh sách khiếu nại qua /api/cs/disputes
      const resList = await request(app)
        .get('/api/cs/disputes')
        .set('Authorization', `Bearer ${csToken}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data.length).toBeGreaterThan(0);
    });

    it('TC53: CS Agent can request additional evidence; dispute transitions to EVIDENCE_PENDING, escrow stays FROZEN', async () => {
      const { dispute } = await createDisputedBooking('tc53');

      const resReq = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/request-evidence`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          notes: 'Yêu cầu Companion cung cấp ảnh chụp màn hình sảnh chờ in-game.',
          deadline_hours: 24,
        });

      expect(resReq.status).toBe(200);
      expect(resReq.body.data.status).toBe('EVIDENCE_PENDING');

      // Escrow vẫn giữ nguyên trạng thái FROZEN
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: dispute.booking_id } });
      expect(escrow?.status).toBe('FROZEN');
    });

    it('TC54: RBAC: Non-CS users are rejected from CS dispute management endpoints (403 Forbidden)', async () => {
      const { dispute } = await createDisputedBooking('tc54');

      // Renter cố tình gọi API ra phán quyết CS
      const resRenterDecision = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${renter1Token}`)
        .send({
          fault_percent: 100,
          decision_reason: 'Renter tự ý xử lý',
        });

      expect(resRenterDecision.status).toBe(403);

      // Companion cố tình gọi API yêu cầu bổ sung chứng cứ
      const resCompReq = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/request-evidence`)
        .set('Authorization', `Bearer ${companion1Token}`)
        .send({
          notes: 'Companion tự yêu cầu',
        });

      expect(resCompReq.status).toBe(403);
    });
  });

  describe('4. CS Decisions: Threshold >= 80% vs < 80%, Validation & Anti-Negative Balance (TC55, TC56, TC57, TC58, TC59)', () => {
    it('TC55: CS decision validation rejects missing reason or reason shorter than 10 characters', async () => {
      const { dispute } = await createDisputedBooking('tc55');

      const resShort = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 100,
          decision_reason: 'Quá ngắn', // < 10 ký tự
        });

      expect(resShort.status).toBe(400);
      expect(JSON.stringify(resShort.body.error)).toContain('tối thiểu 10 ký tự');
    });

    it('TC56: Threshold >= 80% (Companion fault >= 80%): 100% Escrow Refund to Renter, 20% Penalty from Companion, -10 TrustScore', async () => {
      const { bookingId, dispute } = await createDisputedBooking('tc56');

      const renterWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const compProfileBefore = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });

      // CS ra phán quyết: Companion lỗi 100%
      const resDecision = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 100,
          decision_reason: 'Companion hoàn toàn không xuất hiện trong suốt thời gian thuê, không có lý do chính đáng.',
        });

      expect(resDecision.status).toBe(200);
      expect(resDecision.body.data.decision.fault_percent).toBe(100);
      expect(resDecision.body.data.decision.refund_amount).toBe(100000); // 100% Escrow
      expect(resDecision.body.data.decision.penalty_amount).toBe(20000); // 20% Phạt

      // Kiểm tra biến động số dư ví
      const renterWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      // Renter nhận lại 100.000 đ ký quỹ Escrow (D22: Phạt vi phạm 20.000 đ nộp vào doanh thu nền tảng)
      expect(renterWalletAfter!.available_balance - renterWalletBefore!.available_balance).toBe(100000);
      expect(renterWalletBefore!.escrow_balance - renterWalletAfter!.escrow_balance).toBe(100000);

      // Companion bị trừ đúng 20.000 đ từ ví khả dụng
      expect(compWalletBefore!.available_balance - compWalletAfter!.available_balance).toBe(20000);

      // Escrow chuyển sang REFUNDED
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('REFUNDED');
      expect(escrow?.refunded_at).toBeDefined();

      // Booking chuyển sang REFUNDED
      const booking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
      expect(booking?.status).toBe('REFUNDED');

      // Điểm uy tín của Companion bị trừ 10 điểm kèm TrustScoreLog
      const compProfileAfter = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
      expect(compProfileBefore!.trust_score - compProfileAfter!.trust_score).toBe(10.0);

      const trustLog = await prisma.trustScoreLog.findFirst({
        where: { booking_id: bookingId, delta: -10.0 },
      });
      expect(trustLog).toBeDefined();
      expect(trustLog?.reason_code).toContain('DISPUTE_FAULT_GE_80');
    });

    it('TC57: Penalty Anti-Negative Balance: Companion wallet is never deducted below 0 if available balance is insufficient', async () => {
      const { bookingId, dispute } = await createDisputedBooking(
        'tc57',
        'HARASSMENT',
        'Companion có lời lẽ xúc phạm nghiêm trọng đối phương.',
        'prof-comp-02',
        companion2Token
      );

      // Companion 2 có available_balance = 0 ban đầu
      const comp2WalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-02' } });
      expect(comp2WalletBefore?.available_balance).toBe(0);

      const resDecision = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 90,
          decision_reason: 'Companion đến muộn 45 phút và có hành vi toxic nghiêm trọng.',
        });

      expect(resDecision.status).toBe(200);
      // Vì số dư khả dụng của Companion 2 là 0 VND, số tiền phạt trừ thực tế là 0 để chống âm ví
      expect(resDecision.body.data.decision.penalty_amount).toBe(0);

      const comp2WalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-02' } });
      expect(comp2WalletAfter?.available_balance).toBe(0);
      expect(comp2WalletAfter!.available_balance).toBeGreaterThanOrEqual(0); // BẢO VỆ CHỐNG ÂM VÍ TUYỆT ĐỐI
      expect(comp2WalletAfter?.penalty_debt).toBe(30000); // D22: Không đủ tiền thì ghi nợ phạt PENALTY_DEBT (20% của 150.000 đ = 30.000 đ)
    });

    it('TC58: Threshold < 80% (Companion fault < 80%): Service fundamentally completed -> Settles 88/12', async () => {
      const { bookingId, dispute } = await createDisputedBooking('tc58');

      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletBefore = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      // CS ra phán quyết: Companion chỉ lỗi 30% (gián đoạn mạng nhỏ)
      const resDecision = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 30,
          decision_reason: 'Lỗi gián đoạn đường truyền mạng khách quan trong 10 phút, hai bên đã hoàn thành 50 phút còn lại.',
        });

      expect(resDecision.status).toBe(200);
      expect(resDecision.body.data.decision.fault_percent).toBe(30);
      expect(resDecision.body.data.decision.refund_amount).toBe(0);
      expect(resDecision.body.data.decision.penalty_amount).toBe(0);

      // Giải ngân 88% cho Companion (88.000 đ) và 12% cho Sàn (12.000 đ)
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletAfter = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      expect(compWalletAfter!.available_balance - compWalletBefore!.available_balance).toBe(88000);
      expect(platWalletAfter!.available_balance - platWalletBefore!.available_balance).toBe(12000);

      // Escrow chuyển sang RELEASED, Booking chuyển sang COMPLETED
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('RELEASED');

      const booking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
      expect(booking?.status).toBe('COMPLETED');
    });

    it('TC59: Idempotent Decision: Calling decision again returns 200 without duplicate ledger entries', async () => {
      const { dispute } = await createDisputedBooking('tc59');

      // Lần 1: Ra phán quyết thành công
      await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 85,
          decision_reason: 'Companion vi phạm nghiêm trọng quy tắc ứng xử.',
        });

      const entryCountBefore = await prisma.ledgerEntry.count();

      // Lần 2: Gọi lại với cùng payload
      const resAgain = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 85,
          decision_reason: 'Companion vi phạm nghiêm trọng quy tắc ứng xử.',
        });

      expect(resAgain.status).toBe(200);
      expect(resAgain.body.meta.is_idempotent_replay).toBe(true);

      const entryCountAfter = await prisma.ledgerEntry.count();
      expect(entryCountAfter).toBe(entryCountBefore); // Không sinh thêm bút toán trùng
    });
  });

  describe('5. Circuit Breaker & Double-Entry Ledger Reconciliation (TC60, TC61)', () => {
    it('TC60: Simulated ledger error during dispute settlement rolls back cleanly and logs LedgerAuditAlert', async () => {
      const { dispute, bookingId } = await createDisputedBooking('tc60');

      // Mock ledgerService.postTransaction để giả lập sự cố kết nối sổ cái
      const spyPost = vi
        .spyOn(ledgerService, 'postTransaction')
        .mockRejectedValueOnce(new BusinessError('MOCK_DISPUTE_CRASH', 'Giả lập lỗi database trong giao dịch phân xử khiếu nại'));

      const resFail = await request(app)
        .post(`/api/cs/disputes/${dispute.dispute_id}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 100,
          decision_reason: 'Lỗi 100% của Companion cần bồi hoàn khẩn cấp.',
        });

      expect(resFail.status).toBe(422);

      // Kiểm tra Circuit Breaker đã ghi nhận LedgerAuditAlert
      const alert = await prisma.ledgerAuditAlert.findFirst({
        where: { error_code: 'MOCK_DISPUTE_CRASH' },
      });
      expect(alert).toBeDefined();
      expect(alert?.context_json).toContain(dispute.dispute_id);

      // Trạng thái Escrow vẫn phải giữ nguyên là FROZEN (không giải ngân/hoàn lửng lơ)
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('FROZEN');

      // Trạng thái Dispute vẫn chưa đóng
      const disputeCheck = await prisma.disputeCase.findUnique({ where: { dispute_id: dispute.dispute_id } });
      expect(disputeCheck?.status).not.toBe('RESOLVED');

      spyPost.mockRestore();
    });

    it('TC61: Full Double-Entry Ledger Reconciliation audit passes with 100% parity across all accounts', async () => {
      const report = await reconciliationService.runReconciliation();

      expect(report.is_balanced).toBe(true);
      expect(report.wallet_mismatches.length).toBe(0);
      expect(report.system_conservation.is_equation_satisfied).toBe(true);
      expect(report.escrow_audit.is_escrow_aligned).toBe(true);
    });
  });
});
