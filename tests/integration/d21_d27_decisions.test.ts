import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { SYSTEM_ACCOUNTS } from '../../server/src/modules/ledger/ledger.types.js';
import { settlementService } from '../../server/src/modules/ledger/settlement.service.js';
import { bookingAutomationService } from '../../server/src/modules/booking/booking-automation.service.js';

describe('Official Team Decisions D21 - D27 [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định]', () => {
  let renterToken: string;
  let compToken: string;
  let compToken2: string;
  let csToken: string;
  let adminToken: string;

  const TEST_PREFIX = 'test-d21-';
  let seq = 1;

  beforeAll(async () => {
    // 1. Đăng nhập các tài khoản mẫu
    const resRenter = await request(app).post('/api/auth/login').send({
      email: 'renter1@instasquad.test',
      password: 'Demo@123456',
    });
    renterToken = resRenter.body.data.token;

    const resComp = await request(app).post('/api/auth/login').send({
      email: 'companion1@instasquad.test',
      password: 'Demo@123456',
    });
    compToken = resComp.body.data.token;

    const resComp2 = await request(app).post('/api/auth/login').send({
      email: 'companion2@instasquad.test',
      password: 'Demo@123456',
    });
    compToken2 = resComp2.body.data.token;

    const resCs = await request(app).post('/api/auth/login').send({
      email: 'cs_agent@instasquad.test',
      password: 'Demo@123456',
    });
    csToken = resCs.body.data.token;

    const resAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@instasquad.test',
      password: 'Demo@123456',
    });
    adminToken = resAdmin.body.data.token;

    // Nạp tiền ví Renter để sẵn sàng test
    await prisma.wallet.update({
      where: { wallet_id: 'w-renter-01' },
      data: { available_balance: 10000000, escrow_balance: 0 },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-01' },
      data: { available_balance: 500000, escrow_balance: 0, penalty_debt: 0 },
    });
    // Khôi phục điểm uy tín và trạng thái ONLINE cho Companion
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-02' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
    await prisma.wallet.update({
      where: { wallet_id: 'w-comp-02' },
      data: { available_balance: 0, escrow_balance: 0, penalty_debt: 0 },
    });
  });

  beforeEach(async () => {
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-01' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
    await prisma.companionProfile.update({
      where: { profile_id: 'prof-comp-02' },
      data: { trust_score: 95.0, availability: 'ONLINE' },
    });
  });

  afterAll(async () => {
    // Dọn dẹp test slots & bookings
    await prisma.disputeDecision.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeCase.deleteMany();
    await prisma.settlementRetryQueue.deleteMany();
    await prisma.session.deleteMany();
    await prisma.escrow.deleteMany();
    await prisma.bookingStatusHistory.deleteMany();
    await prisma.booking.deleteMany({
      where: { request_key: { startsWith: TEST_PREFIX } },
    });
    await prisma.slotCalendar.deleteMany({
      where: { slot_id: { startsWith: TEST_PREFIX } },
    });
  });

  const createBookingHelper = async (tag: string, startTime: Date, compProfileId = 'prof-comp-01') => {
    const slotId = `${TEST_PREFIX}slot-${tag}-${seq++}`;
    const reqKey = `${TEST_PREFIX}req-${tag}-${seq++}`;
    const endTime = new Date(startTime.getTime() + 3600 * 1000);

    await prisma.slotCalendar.create({
      data: {
        slot_id: slotId,
        profile_id: compProfileId,
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    const resBook = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${renterToken}`)
      .send({
        slot_id: slotId,
        request_key: reqKey,
        duration_hours: 1,
      });

    expect(resBook.status).toBe(201);
    const bookingId = resBook.body.data.booking_id;
    const totalFee = resBook.body.data.total_fee_snapshot;

    // Ký quỹ Escrow
    const resEscrow = await request(app)
      .post(`/api/bookings/${bookingId}/hold-escrow`)
      .set('Authorization', `Bearer ${renterToken}`);
    expect(resEscrow.status).toBe(200);

    // Companion chấp nhận
    const activeToken = compProfileId === 'prof-comp-02' ? compToken2 : compToken;
    const resAccept = await request(app)
      .post(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${activeToken}`);
    expect(resAccept.status).toBe(200);

    return { bookingId, slotId, totalFee };
  };

  // =========================================================================
  // D21: Hủy dưới 10 phút: phạt 100%, chia 88% Companion / 12% Platform
  // =========================================================================
  describe('D21 – Chính sách hủy đơn sát giờ (< 10 phút)', () => {
    it('D21: Hủy dưới 10 phút phạt 100% ký quỹ, chia 88% Companion và 12% Sàn (Zero-cent rounding)', async () => {
      const startTime = new Date(Date.now() + 5 * 60 * 1000); // 5 phút nữa (< 10m)
      const { bookingId, totalFee } = await createBookingHelper('d21-lt10m', startTime);

      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletBefore = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      const resCancel = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({ reason: 'Việc đột xuất không thể tham gia' });

      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.policy_applied).toBe('CANCEL_LT_10M');

      const expectedPlatform = Math.floor(totalFee * 0.12);
      const expectedCompanion = totalFee - expectedPlatform;

      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletAfter = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      expect(compWalletAfter!.available_balance - compWalletBefore!.available_balance).toBe(expectedCompanion);
      expect(platWalletAfter!.available_balance - platWalletBefore!.available_balance).toBe(expectedPlatform);

      // Lịch sử ghi nhận đúng quy định hủy gấp dưới 10 phút
      const history = await prisma.bookingStatusHistory.findFirst({
        where: { booking_id: bookingId, to_status: 'CANCELLED' },
      });
      expect(history?.reason).toContain('Hủy gấp dưới 10 phút');
    });

    it('D21: Hủy từ 10 đến 29 phút giữ đúng BPMN (70% Renter, 30% Companion, không hoa hồng)', async () => {
      const startTime = new Date(Date.now() + 20 * 60 * 1000); // 20 phút nữa (10-29m)
      const { bookingId, totalFee } = await createBookingHelper('d21-10-30m', startTime);

      const renterWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      const resCancel = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({ reason: 'Bận việc' });

      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.policy_applied).toBe('CANCEL_10_30M');

      const expectedRenter = Math.floor(totalFee * 0.70);
      const expectedComp = totalFee - expectedRenter;

      const renterWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      expect(renterWalletAfter!.available_balance - renterWalletBefore!.available_balance).toBe(expectedRenter);
      expect(compWalletAfter!.available_balance - compWalletBefore!.available_balance).toBe(expectedComp);
    });
  });

  // =========================================================================
  // D22 & D23: Khiếu nại lỗi >= 80% (Phạt 20% nộp Sàn, nợ phạt PENALTY_DEBT, cấn trừ đơn sau) & Lỗi < 80%
  // =========================================================================
  describe('D22 & D23 – Khiếu nại RMA, Cơ chế nợ phạt PENALTY_DEBT và Phân nhánh nhị phân', () => {
    it('D22: Companion lỗi >= 80% khi ví đủ tiền: Hoàn 100% Renter, phạt 20% nộp quỹ Sàn', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId, totalFee } = await createBookingHelper('d22-sufficient', startTime);

      // Renter báo sự cố
      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'NO_SHOW',
          description: 'Companion không vào phòng và không liên lạc được',
        });
      const disputeId = resDispute.body.data.dispute.dispute_id;

      const renterWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletBefore = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      // CS ra phán quyết lỗi 100%
      const resDecision = await request(app)
        .post(`/api/cs/disputes/${disputeId}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 100,
          decision_reason: 'Companion hoàn toàn vắng mặt không lý do',
        });

      expect(resDecision.status).toBe(200);

      const renterWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-renter-01' } });
      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const platWalletAfter = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      const expectedPenalty = Math.floor(totalFee * 0.20);
      // Renter hoàn đúng 100% tiền ký quỹ
      expect(renterWalletAfter!.available_balance - renterWalletBefore!.available_balance).toBe(totalFee);
      // Companion bị trừ 20%
      expect(compWalletBefore!.available_balance - compWalletAfter!.available_balance).toBe(expectedPenalty);
      // Sàn nhận khoản phạt 20% vào doanh thu nền tảng (phạt vi phạm)
      expect(platWalletAfter!.available_balance - platWalletBefore!.available_balance).toBe(expectedPenalty);
    });

    it('D22: Companion lỗi >= 80% khi ví KHÔNG ĐỦ TIỀN: Trừ tối đa số có, phần thiếu ghi PENALTY_DEBT, ví không âm', async () => {
      // Reset ví companion 2 về 0 để kiểm tra chống âm ví
      await prisma.wallet.update({
        where: { wallet_id: 'w-comp-02' },
        data: { available_balance: 0, penalty_debt: 0 },
      });

      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId, totalFee } = await createBookingHelper('d22-nodebt', startTime, 'prof-comp-02');

      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'HARASSMENT',
          description: 'Companion có hành vi xúc phạm',
        });
      const disputeId = resDispute.body.data.dispute.dispute_id;

      const resDecision = await request(app)
        .post(`/api/cs/disputes/${disputeId}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 85,
          decision_reason: 'Companion vi phạm chuẩn mực ứng xử nghiêm trọng',
        });

      expect(resDecision.status).toBe(200);

      const comp2Wallet = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-02' } });
      // Ví không bao giờ âm
      expect(comp2Wallet!.available_balance).toBe(0);
      // Ghi nợ đúng 20% của totalFee
      const expectedDebt = Math.floor(totalFee * 0.20);
      expect(comp2Wallet!.penalty_debt).toBe(expectedDebt);
    });

    it('D22: Đơn tiếp theo tự động CẤN TRỪ NỢ PHẠT (PENALTY_DEBT) vào thu nhập Companion, nộp cho Sàn', async () => {
      // Đảm bảo Companion 2 có ghi nhận nợ phạt PENALTY_DEBT
      await prisma.wallet.update({
        where: { wallet_id: 'w-comp-02' },
        data: { penalty_debt: 20000 },
      });

      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-02' } });
      const currentDebt = compWalletBefore!.penalty_debt;
      expect(currentDebt).toBe(20000);

      // Tạo một đơn mới hoàn thành tốt đẹp cho Companion 2
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId, totalFee } = await createBookingHelper('d22-offset', startTime, 'prof-comp-02');

      const platWalletBefore = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      // Nghiệm thu hoàn tất đơn
      const settleResult = await settlementService.settleBooking(bookingId, 'RENTER_MANUAL_ACCEPT', 'u-renter-01');

      const standardPlatformFee = Math.floor(totalFee * 0.12);
      const standardCompFee = totalFee - standardPlatformFee;
      const expectedOffset = Math.min(currentDebt, standardCompFee);
      const expectedCompReceived = standardCompFee - expectedOffset;
      const expectedPlatReceived = standardPlatformFee + expectedOffset;

      expect((settleResult.settlement as any).penalty_offset).toBe(expectedOffset);
      expect(settleResult.settlement.companion_received).toBe(expectedCompReceived);
      expect(settleResult.settlement.platform_fee).toBe(expectedPlatReceived);

      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-02' } });
      const platWalletAfter = await prisma.wallet.findUnique({
        where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
      });

      expect(compWalletAfter!.available_balance).toBe(expectedCompReceived);
      expect(compWalletAfter!.penalty_debt).toBe(currentDebt - expectedOffset);
      expect(platWalletAfter!.available_balance - platWalletBefore!.available_balance).toBe(expectedPlatReceived);
    });

    it('D23: Lỗi 1–79% (nhánh Không): Giải ngân 88/12, không phạt, không trừ TrustScore', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId, totalFee } = await createBookingHelper('d23-minor', startTime);

      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'TECHNICAL_ISSUE',
          description: 'Mất kết nối 5 phút giữa chừng',
        });
      const disputeId = resDispute.body.data.dispute.dispute_id;

      const compProfileBefore = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });
      const compWalletBefore = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });

      // CS phân xử lỗi 40% (< 80%)
      const resDecision = await request(app)
        .post(`/api/cs/disputes/${disputeId}/decision`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          fault_percent: 40,
          decision_reason: 'Sự cố kết nối khách quan ngắn, dịch vụ cơ bản hoàn tất',
        });

      expect(resDecision.status).toBe(200);

      const compWalletAfter = await prisma.wallet.findUnique({ where: { wallet_id: 'w-comp-01' } });
      const compProfileAfter = await prisma.companionProfile.findUnique({ where: { profile_id: 'prof-comp-01' } });

      const expectedCompFee = totalFee - Math.floor(totalFee * 0.12);
      expect(compWalletAfter!.available_balance - compWalletBefore!.available_balance).toBe(expectedCompFee);
      // TrustScore không bị trừ
      expect(compProfileAfter!.trust_score).toBe(compProfileBefore!.trust_score);

      const booking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
      expect(booking?.status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // D24: Tự động nghiệm thu sau 15 phút im lặng
  // =========================================================================
  describe('D24 – Tự động nghiệm thu sau 15 phút (Auto-Accept)', () => {
    it('D24: Tự động nghiệm thu sau 15 phút ghi nhận đúng nhãn Nhóm đã chốt D24', async () => {
      const startTime = new Date(Date.now() + 3600 * 1000);
      const { bookingId } = await createBookingHelper('d24-auto', startTime);

      // Cập nhật confirm_deadline đã qua
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: {
          confirm_deadline: new Date(Date.now() - 5 * 60 * 1000),
          status: 'ACCEPTED',
        },
      });

      // Worker quét nghiệm thu tự động
      const autoResult = await bookingAutomationService.processExpiredAutoAccepts();
      expect(autoResult.processed).toBeGreaterThanOrEqual(1);

      const booking = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      expect(booking?.status).toBe('COMPLETED');
      expect(booking?.escrow?.status).toBe('RELEASED');

      const history = await prisma.bookingStatusHistory.findFirst({
        where: { booking_id: bookingId, to_status: 'COMPLETED' },
      });
      expect(history?.reason).toContain('Tự động nghiệm thu sau 15 phút');
    });
  });

  // =========================================================================
  // D25: Hạn nộp bằng chứng 24h & Đồng hồ SLA 45m tạm dừng
  // =========================================================================
  describe('D25 – Hạn bổ sung chứng cứ 24h & Tạm dừng đồng hồ SLA', () => {
    it('D25: Yêu cầu chứng cứ tạm dừng đồng hồ SLA và thiết lập hạn 24h', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId } = await createBookingHelper('d25-sla', startTime);

      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'SKILL_MISMATCH',
          description: 'Trình độ không đúng mô tả',
        });
      const disputeId = resDispute.body.data.dispute.dispute_id;

      // CS yêu cầu bổ sung chứng cứ
      const resReq = await request(app)
        .post(`/api/cs/disputes/${disputeId}/request-evidence`)
        .set('Authorization', `Bearer ${csToken}`)
        .send({
          deadline_hours: 24,
          notes: 'Vui lòng cung cấp ảnh chụp màn hình bảng điểm in-game',
        });

      expect(resReq.status).toBe(200);

      // Xem chi tiết hồ sơ (Dossier) kiểm tra SLA metrics
      const resDossier = await request(app)
        .get(`/api/cs/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(resDossier.status).toBe(200);
      expect(resDossier.body.data.sla_metrics.is_paused).toBe(true);
      expect(resDossier.body.data.sla_metrics.target_minutes).toBe(45);
      expect(resDossier.body.data.dispute.status).toBe('EVIDENCE_PENDING');
      expect(resDossier.body.data.dispute.evidence_deadline).toBeDefined();
    });

    it('D25: Quá hạn 24 giờ tự động chuyển hồ sơ về UNDER_REVIEW để CS phán quyết', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId } = await createBookingHelper('d25-expired', startTime);

      const resDispute = await request(app)
        .post(`/api/bookings/${bookingId}/report-issue`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          reason_category: 'HARASSMENT',
          description: 'Tranh cãi trong phòng',
        });
      const disputeId = resDispute.body.data.dispute.dispute_id;

      // Yêu cầu chứng cứ nhưng giả lập hạn chót đã trôi qua 24 giờ trước
      await prisma.disputeCase.update({
        where: { dispute_id: disputeId },
        data: {
          status: 'EVIDENCE_PENDING',
          evidence_deadline: new Date(Date.now() - 3600 * 1000), // Hết hạn 1 giờ trước
          evidence_requested_at: new Date(Date.now() - 25 * 3600 * 1000),
        },
      });

      // Worker quét hồ sơ hết hạn chứng cứ
      const result = await bookingAutomationService.processExpiredDisputeEvidences();
      expect(result.processed).toBeGreaterThanOrEqual(1);

      const disputeAfter = await prisma.disputeCase.findUnique({
        where: { dispute_id: disputeId },
      });
      expect(disputeAfter?.status).toBe('UNDER_REVIEW');
      expect(disputeAfter?.paused_sla_ms).toBeGreaterThan(0); // Đã tích lũy thời gian dừng SLA
    });
  });

  // =========================================================================
  // D26: Thử lại giải ngân Escrow tối đa 3 lần (1, 5, 15 phút) cùng idempotency_key
  // =========================================================================
  describe('D26 – Cơ chế thử lại giải ngân Escrow 3 lần với cùng idempotency_key', () => {
    it('D26: Thử lại lần 1 thất bại -> lần 2 thành công với CÙNG idempotency_key, không nhân đôi bút toán', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId } = await createBookingHelper('d26-retry', startTime);

      // Đưa vào hàng đợi thử lại giải ngân (Attempt 0)
      const queueItem = await settlementService.queueSettlementRetry(
        bookingId,
        'Cổng thanh toán tạm thời gián đoạn mạng'
      );
      expect(queueItem.attempts).toBe(0);
      expect(queueItem.idempotency_key).toBe(`SETTLE-BOOKING-${bookingId}`);
      expect(queueItem.status).toBe('PENDING');

      // Mô phỏng tới thời điểm thử lại (next_retry_at)
      await prisma.settlementRetryQueue.update({
        where: { retry_id: queueItem.retry_id },
        data: { next_retry_at: new Date(Date.now() - 1000) },
      });

      // Worker chạy thử lại
      const retryResult = await bookingAutomationService.processSettlementRetries();
      expect(retryResult.processed).toBeGreaterThanOrEqual(1);

      // Kiểm tra trạng thái đã chuyển SUCCESS
      const queueAfter = await prisma.settlementRetryQueue.findUnique({
        where: { retry_id: queueItem.retry_id },
      });
      expect(queueAfter?.status).toBe('SUCCESS');

      // Kiểm tra Escrow đã RELEASED
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('RELEASED');

      // Kiểm tra Sổ cái chỉ có DUY NHẤT 1 giao dịch giải ngân
      const ledgerTxCount = await prisma.ledgerTransaction.count({
        where: { idempotency_key: `SETTLE-BOOKING-${bookingId}` },
      });
      expect(ledgerTxCount).toBe(1);
    });

    it('D26: Thất bại cả 3 lần -> Đánh dấu EXHAUSTED, giữ Escrow HELD, tạo LedgerAuditAlert và thông báo Companion', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const { bookingId } = await createBookingHelper('d26-exhausted', startTime);

      // Đổi trạng thái booking thành DISPUTED để cố ý gây lỗi khi settleBooking
      await prisma.booking.update({
        where: { booking_id: bookingId },
        data: { status: 'DISPUTED' },
      });

      // Tạo hàng đợi với 2 lần thử trước đó đã qua
      const queueItem = await prisma.settlementRetryQueue.create({
        data: {
          booking_id: bookingId,
          attempts: 2, // Đã thử 2 lần, lần này là lần 3
          max_attempts: 3,
          next_retry_at: new Date(Date.now() - 1000),
          idempotency_key: `SETTLE-BOOKING-${bookingId}`,
          last_error: 'Simulated connection failure',
          status: 'PENDING',
        },
      });

      // Worker xử lý lần 3
      const retryResult = await bookingAutomationService.processSettlementRetries();
      expect(retryResult.exhausted).toBeGreaterThanOrEqual(1);

      const queueAfter = await prisma.settlementRetryQueue.findUnique({
        where: { retry_id: queueItem.retry_id },
      });
      expect(queueAfter?.status).toBe('EXHAUSTED');
      expect(queueAfter?.attempts).toBe(3);

      // Escrow vẫn bảo lưu an toàn ở trạng thái HELD
      const escrow = await prisma.escrow.findUnique({ where: { booking_id: bookingId } });
      expect(escrow?.status).toBe('HELD');

      // Có cảnh báo kiểm toán SETTLEMENT_RETRY_EXHAUSTED cho Auditor
      const alert = await prisma.ledgerAuditAlert.findFirst({
        where: { error_code: 'SETTLEMENT_RETRY_EXHAUSTED' },
      });
      expect(alert).toBeDefined();

      // Companion nhận thông báo cảnh báo (chuẩn hóa theo userMessages.settlementRetryExhaustedStaff)
      const notif = await prisma.notification.findFirst({
        where: { type: 'SETTLEMENT_RETRY_FAILED' },
      });
      expect(notif?.message).toContain('Kiểm toán xử lý thủ công');
    });
  });

  // =========================================================================
  // D27: Admin Dashboard hiển thị 2 chỉ số riêng biệt với nhãn công thức chuẩn hóa
  // =========================================================================
  describe('D27 – Chỉ số chuyển đổi Dashboard Admin', () => {
    it('D27: Admin Dashboard hiển thị Tỷ lệ hoàn tất đơn và Tỷ lệ chuyển đổi phễu chuẩn hóa', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const metrics = res.body.data.metrics;

      // Chỉ số 1: Vận hành đơn
      expect(typeof metrics.order_completion_rate_pct).toBe('number');
      expect(metrics.order_completion_rate_formula).toContain('chỉ số vận hành đơn');

      // Chỉ số 2: Chuyển đổi phễu
      expect(typeof metrics.conversion_rate_pct).toBe('number');
      expect(typeof metrics.funnel_conversion_rate_pct).toBe('number');
      expect(metrics.conversion_rate_formula).toContain('Quy tắc tính toán chuyển đổi');
    });
  });
});
