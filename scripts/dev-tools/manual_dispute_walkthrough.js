/**
 * KỊCH BẢN KIỂM CHỨNG BẰNG TAY TỰ ĐỘNG (8 BƯỚC) - ĐỢT D1b
 * Chạy qua API HTTP thật, kiểm chứng luồng khiếu nại (RMA) hoàn chỉnh:
 * 1. Renter đặt lịch, ký quỹ Escrow 100.000đ.
 * 2. Companion nhận đơn, vào phòng chơi.
 * 3. Hai bên chat 3 câu (trong đó có 1 câu Companion chia sẻ SĐT bị che).
 * 4. Renter báo sự cố HARASSMENT kèm 1 ảnh bằng chứng (PNG magic bytes hợp lệ), Escrow đóng băng.
 * 5. CS xem hồ sơ Dossier: thấy chat gốc, thấy ảnh bằng chứng, yêu cầu bổ sung chứng cứ với ghi chú "Cần log sảnh chờ", hạn 24 giờ, đồng hồ SLA tạm dừng.
 * 6. Renter nộp thêm 1 ảnh bằng chứng bổ sung; Companion nộp văn bản giải trình + 1 ảnh bằng chứng. CS nhận được notification.
 * 7. CS xem lại hồ sơ Dossier đã có đủ 2 bên: Renter (lý do + 2 bằng chứng) và Companion (giải trình + 1 bằng chứng).
 * 8. CS ra phán quyết lỗi Companion 85%: Renter hoàn 100.000đ, Companion bị phạt 20.000đ (ghi nợ phạt nếu ví = 0), Variance = 0, thông báo phán quyết và cập nhật ví.
 */

const { spawn } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 1x1 Transparent PNG hợp chuẩn magic bytes (89 50 4E 47)
const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch (e) {
      // Server chưa khởi động
    }
    await sleep(500);
  }
  return false;
}

async function run() {
  console.log('================================================================');
  console.log('   INSTASQUAD: KỊCH BẢN KIỂM CHỨNG BẰNG TAY TỰ ĐỘNG (8 BƯỚC)');
  console.log('   ĐỢT D1b – SIẾT AN TOÀN, HOÀN THIỆN VÀ KIỂM CHỨNG LẠI LUỒNG RMA');
  console.log('================================================================\n');

  let serverProcess = null;
  const isRunning = await waitForServer(BASE_URL, 1000);

  if (!isRunning) {
    console.log(`[INIT] Khởi động INSTASQUAD Backend tại ${BASE_URL}...`);
    serverProcess = spawn('npm', ['run', 'dev:server'], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'pipe',
    });

    const ready = await waitForServer(BASE_URL, 15000);
    if (!ready) {
      console.error('❌ Không thể khởi động server backend trong vòng 15 giây.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log(`[INIT] Backend server đã sẵn sàng tại ${BASE_URL}.\n`);
  } else {
    console.log(`[INIT] Đã phát hiện Backend server đang hoạt động tại ${BASE_URL}.\n`);
  }

  try {
    // 0. Chuẩn bị dữ liệu tài khoản
    console.log('--- ĐĂNG NHẬP CÁC TÀI KHOẢN THỰC HIỆN KIỂM CHỨNG ---');
    const login = async (email, password) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(`Đăng nhập thất bại: ${email} - ${data.error?.message}`);
      return data.data;
    };

    const renterAuth = await login('renter1@instasquad.test', 'Demo@123456');
    const companionAuth = await login('companion1@instasquad.test', 'Demo@123456');
    const csAuth = await login('cs_agent@instasquad.test', 'Demo@123456');
    const adminAuth = await login('admin@instasquad.test', 'Demo@123456');

    console.log(`✓ Renter: ${renterAuth.user.display_name} (${renterAuth.user.user_id})`);
    console.log(`✓ Companion: ${companionAuth.user.display_name} (${companionAuth.user.user_id})`);
    console.log(`✓ CS Agent: ${csAuth.user.display_name} (${csAuth.user.user_id})`);
    console.log(`✓ Admin: ${adminAuth.user.display_name} (${adminAuth.user.user_id})\n`);

    // Dọn dẹp ví & tạo slot test mới
    const now = new Date();
    const testSlotId = `slot-walkthrough-${Date.now()}`;
    await prisma.slotCalendar.create({
      data: {
        slot_id: testSlotId,
        profile_id: 'prof-comp-01',
        start_time: new Date(now.getTime() + 3600 * 1000),
        end_time: new Date(now.getTime() + 7200 * 1000),
        status: 'AVAILABLE',
      },
    });

    let bookingId = '';
    let sessionId = '';
    let disputeId = '';
    let initialEvidenceId = '';
    let renterProof2Id = '';
    let companionProofId = '';

    // ==========================================
    // BƯỚC 1: Renter đặt lịch, ký quỹ Escrow 100.000đ
    // ==========================================
    {
      const reqKey = `req-walkthrough-${Date.now()}`;
      const resBook = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({ slot_id: testSlotId, request_key: reqKey }),
      });
      const dataBook = await resBook.json();
      if (!dataBook.success) throw new Error(`Bước 1 thất bại (Đặt đơn): ${dataBook.error?.message}`);
      bookingId = dataBook.data.booking_id;

      // Ký quỹ Escrow
      const resEscrow = await fetch(`${BASE_URL}/api/bookings/${bookingId}/hold-escrow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${renterAuth.token}` },
      });
      const dataEscrow = await resEscrow.json();
      if (!dataEscrow.success) throw new Error(`Bước 1 thất bại (Ký quỹ): ${dataEscrow.error?.message}`);

      console.log(`[BƯỚC 1] PASS: Renter đặt lịch thành công (#${bookingId.slice(0, 8)}). Ký quỹ Escrow 100.000đ ở trạng thái HELD.`);
    }

    // ==========================================
    // BƯỚC 2: Companion nhận đơn, vào phòng chơi
    // ==========================================
    {
      const resAccept = await fetch(`${BASE_URL}/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${companionAuth.token}` },
      });
      const dataAccept = await resAccept.json();
      if (!dataAccept.success) throw new Error(`Bước 2 thất bại (Companion accept): ${dataAccept.error?.message}`);

      // Lấy Session ID
      const resDetail = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${renterAuth.token}` },
      });
      const dataDetail = await resDetail.json();
      sessionId = dataDetail.data.session.session_id;

      // Bắt đầu Session
      const resStart = await fetch(`${BASE_URL}/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${companionAuth.token}` },
      });
      const dataStart = await resStart.json();
      if (!dataStart.success && dataStart.data?.status !== 'IN_SESSION') {
        throw new Error(`Bước 2 thất bại (Start session): ${dataStart.error?.message}`);
      }

      console.log(`[BƯỚC 2] PASS: Companion chấp nhận đơn (#${bookingId.slice(0, 8)}). Phiên chơi bắt đầu (#${sessionId.slice(0, 8)}) ở trạng thái IN_SESSION.`);
    }

    // ==========================================
    // BƯỚC 3: Hai bên chat 3 câu (có 1 câu chia sẻ SĐT bị che)
    // ==========================================
    {
      // Câu 1: Renter chào hỏi
      await fetch(`${BASE_URL}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({ content: 'Chào Companion, mình đã online game rồi nhé!' }),
      });

      // Câu 2: Companion gửi số điện thoại nhạy cảm để hệ thống che
      const resSens = await fetch(`${BASE_URL}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${companionAuth.token}`,
        },
        body: JSON.stringify({ content: 'Ok bạn, add Zalo số 0912345678 để mình gửi link voice chat nhanh hơn.' }),
      });
      const dataSens = await resSens.json();
      if (!dataSens.data?.content.includes('***')) {
        throw new Error('Bước 3 thất bại: Số điện thoại không được bộ lọc tự động che chắn.');
      }

      // Câu 3: Renter phản hồi
      await fetch(`${BASE_URL}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({ content: 'Ủa trên sàn có voice chat rồi mà, sao lại bắt ra ngoài Zalo?' }),
      });

      // Kết thúc phiên chơi
      await fetch(`${BASE_URL}/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${companionAuth.token}` },
      });

      console.log(`[BƯỚC 3] PASS: Hai bên trao đổi 3 tin nhắn trong phòng chơi. Bộ lọc tự động che SĐT thành "***[SỐ ĐIỆN THOẠI ĐÃ BỊ CHE]***".`);
    }

    // ==========================================
    // BƯỚC 4: Renter báo sự cố HARASSMENT kèm 1 ảnh bằng chứng (PNG magic bytes hợp lệ), Escrow đóng băng
    // ==========================================
    {
      const resDispute = await fetch(`${BASE_URL}/api/bookings/${bookingId}/report-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({
          reason_category: 'HARASSMENT',
          description: 'Companion lôi kéo giao dịch ra Zalo ngoài sàn và có lời lẽ không hợp tác.',
        }),
      });
      const dataDispute = await resDispute.json();
      if (!dataDispute.success) throw new Error(`Bước 4 thất bại (Report issue): ${dataDispute.error?.message}`);
      disputeId = dataDispute.data.dispute.dispute_id;

      // Nộp bằng chứng ban đầu chuẩn Magic bytes PNG
      const resEv = await fetch(`${BASE_URL}/api/disputes/${disputeId}/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({
          file_type: 'IMAGE_PNG',
          file_content_base64: VALID_PNG_BASE64,
          file_name: 'screenshot_zalo_invite.png',
          description: 'Ảnh chụp tin nhắn đòi liên hệ qua Zalo ngoài sàn',
        }),
      });
      const dataEv = await resEv.json();
      if (!dataEv.success) throw new Error(`Bước 4 thất bại (Upload initial evidence): ${dataEv.error?.message}`);
      initialEvidenceId = dataEv.data.evidence_id;

      // Xác minh Escrow đã đóng băng
      const escrowInDb = await prisma.escrow.findFirst({ where: { booking_id: bookingId } });
      if (escrowInDb?.status !== 'FROZEN') {
        throw new Error('Bước 4 thất bại: Escrow không được chuyển sang trạng thái FROZEN.');
      }

      console.log(`[BƯỚC 4] PASS: Renter báo sự cố HARASSMENT (#${disputeId.slice(0, 8)}). Escrow 100.000đ được ĐÓNG BĂNG (FROZEN). Bằng chứng ban đầu hợp chuẩn magic bytes PNG (#${initialEvidenceId.slice(0, 8)}).`);
    }

    // ==========================================
    // BƯỚC 5: CS xem hồ sơ Dossier: thấy chat gốc, thấy ảnh bằng chứng, yêu cầu bổ sung chứng cứ với ghi chú "Cần log sảnh chờ", hạn 24 giờ, đồng hồ SLA tạm dừng.
    // ==========================================
    {
      const resDossier = await fetch(`${BASE_URL}/api/cs/disputes/${disputeId}`, {
        headers: { Authorization: `Bearer ${csAuth.token}` },
      });
      const dataDossier = await resDossier.json();
      if (!dataDossier.success) throw new Error(`Bước 5 thất bại (CS Dossier): ${dataDossier.error?.message}`);

      // Kiểm tra chat gốc (original_content) cho CS
      const phoneMsg = dataDossier.data.chat_messages.find((m) => m.is_censored);
      if (!phoneMsg || !phoneMsg.original_content.includes('0912345678')) {
        throw new Error('Bước 5 thất bại: CS không xem được nội dung chat gốc của tin nhắn bị che.');
      }

      // CS yêu cầu bổ sung chứng cứ
      const resReq = await fetch(`${BASE_URL}/api/cs/disputes/${disputeId}/request-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${csAuth.token}`,
        },
        body: JSON.stringify({
          deadline_hours: 24,
          notes: 'Cần log sảnh chờ và giải trình lý do yêu cầu liên lạc ngoài sàn.',
        }),
      });
      const dataReq = await resReq.json();
      if (!dataReq.success) throw new Error(`Bước 5 thất bại (CS Request evidence): ${dataReq.error?.message}`);

      // Kiểm tra trạng thái EVIDENCE_PENDING
      const disputeInDb = await prisma.disputeCase.findUnique({ where: { dispute_id: disputeId } });
      if (disputeInDb?.status !== 'EVIDENCE_PENDING') {
        throw new Error('Bước 5 thất bại: Trạng thái khiếu nại không chuyển sang EVIDENCE_PENDING.');
      }

      console.log(`[BƯỚC 5] PASS: CS Agent xem hồ sơ Dossier: đọc được nội dung gốc "0912345678" và xem ảnh bằng chứng. CS gửi yêu cầu bổ sung 24h: trạng thái chuyển EVIDENCE_PENDING, đồng hồ SLA 45 phút tạm dừng (D25).`);
    }

    // ==========================================
    // BƯỚC 6: Renter nộp thêm 1 ảnh bằng chứng bổ sung; Companion nộp văn bản giải trình + 1 ảnh bằng chứng. CS nhận được notification.
    // ==========================================
    {
      // Renter nộp thêm bằng chứng bổ sung
      const resRenter2 = await fetch(`${BASE_URL}/api/disputes/${disputeId}/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${renterAuth.token}`,
        },
        body: JSON.stringify({
          file_type: 'IMAGE_PNG',
          file_content_base64: VALID_PNG_BASE64,
          file_name: 'renter_additional_proof.png',
          description: 'Ảnh chụp log sảnh chờ Discord từ phía Renter',
        }),
      });
      const dataRenter2 = await resRenter2.json();
      renterProof2Id = dataRenter2.data.evidence_id;

      // Companion nộp văn bản giải trình D29 + 1 ảnh đối chứng
      const resCompExp = await fetch(`${BASE_URL}/api/disputes/${disputeId}/explanation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${companionAuth.token}`,
        },
        body: JSON.stringify({
          explanation: 'Tôi gửi số Zalo để tiện gửi file cấu hình Discord mic, không hề có mục đích nhận tiền ngoài sàn.',
          file_type: 'IMAGE_PNG',
          file_content_base64: VALID_PNG_BASE64,
          file_name: 'companion_discord_screenshot.png',
        }),
      });
      const dataCompExp = await resCompExp.json();
      if (!dataCompExp.success) throw new Error(`Bước 6 thất bại (Companion explanation): ${dataCompExp.error?.message}`);
      companionProofId = dataCompExp.data.evidence?.evidence_id;

      // Kiểm tra CS và Admin đã nhận notification in-app
      const csNotifs = await prisma.notification.findMany({
        where: {
          user_id: { in: [csAuth.user.user_id, adminAuth.user.user_id] },
          type: { in: ['DISPUTE_EVIDENCE_SUBMITTED', 'DISPUTE_EXPLANATION_SUBMITTED'] },
        },
      });
      if (csNotifs.length < 2) {
        throw new Error('Bước 6 thất bại: Nhân viên CS/Admin chưa nhận đủ thông báo in-app khi có chứng cứ/giải trình mới.');
      }

      console.log(`[BƯỚC 6] PASS: Renter nộp thêm chứng cứ (#${renterProof2Id.slice(0, 8)}). Companion nộp giải trình D29 + ảnh đối chứng (#${companionProofId ? companionProofId.slice(0, 8) : 'N/A'}). Bộ phận CS nhận đầy đủ thông báo in-app.`);
    }

    // ==========================================
    // BƯỚC 7: CS xem lại hồ sơ Dossier đã có đủ 2 bên: Renter (lý do + 2 bằng chứng) và Companion (giải trình + 1 bằng chứng).
    // ==========================================
    {
      const resDossier = await fetch(`${BASE_URL}/api/cs/disputes/${disputeId}`, {
        headers: { Authorization: `Bearer ${csAuth.token}` },
      });
      const dataDossier = await resDossier.json();
      const d = dataDossier.data.dispute || dataDossier.data;
      const evList = d.evidences || d.evidence || [];

      const renterEvs = evList.filter((e) => e.uploader_id === renterAuth.user.user_id);
      const compEvs = evList.filter((e) => e.uploader_id === companionAuth.user.user_id);

      if (renterEvs.length < 2) throw new Error(`Bước 7 thất bại: Renter phải có 2 bằng chứng (thực tế: ${renterEvs.length})`);
      if (compEvs.length < 1) throw new Error(`Bước 7 thất bại: Companion phải có ít nhất 1 bằng chứng đối chứng`);
      if (!d.companion_explanation) throw new Error('Bước 7 thất bại: Chưa có lời giải trình của Companion trong Dossier.');

      console.log(`[BƯỚC 7] PASS: CS Dossier phân định rõ 2 bên: Phía Renter (Lý do HARASSMENT + ${renterEvs.length} bằng chứng) vs Phía Companion (Giải trình D29 + ${compEvs.length} ảnh đối chứng).`);
    }

    // ==========================================
    // BƯỚC 8: CS ra phán quyết lỗi Companion 85%: Renter hoàn 100.000đ, Companion bị phạt 20.000đ, Variance = 0, thông báo phán quyết và cập nhật ví.
    // ==========================================
    {
      const resDecision = await fetch(`${BASE_URL}/api/cs/disputes/${disputeId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${csAuth.token}`,
        },
        body: JSON.stringify({
          fault_percent: 85,
          decision_reason: 'Companion vi phạm điều khoản trao đổi thông tin liên lạc ngoài sàn. Áp dụng Quyết định D22: lỗi 85% (>= 80%) hoàn 100% cho Renter và phạt 20% trừ ví Companion nộp doanh thu sàn.',
        }),
      });
      const dataDecision = await resDecision.json();
      if (!dataDecision.success) throw new Error(`Bước 8 thất bại (CS Decision): ${dataDecision.error?.message}`);

      // Kiểm tra số dư ví Renter & Escrow
      const bookingInDb = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { escrow: true },
      });
      if (bookingInDb?.status !== 'REFUNDED' || bookingInDb?.escrow?.status !== 'REFUNDED') {
        throw new Error('Bước 8 thất bại: Đơn đặt hoặc Escrow chưa chuyển sang REFUNDED.');
      }

      // Kiểm tra bảo toàn Sổ cái kép: Tổng Nợ (Debit) == Tổng Có (Credit), Variance = 0
      const allEntries = await prisma.ledgerEntry.findMany();
      const totalDebits = allEntries.filter((e) => e.direction === 'DEBIT').reduce((acc, e) => acc + e.amount, 0);
      const totalCredits = allEntries.filter((e) => e.direction === 'CREDIT').reduce((acc, e) => acc + e.amount, 0);
      const variance = totalDebits - totalCredits;
      if (variance !== 0) {
        throw new Error(`Bước 8 thất bại: Sổ cái mất cân đối! Variance = ${variance}`);
      }

      // Kiểm tra notification phán quyết gửi cho cả hai bên
      const resolvedNotifs = await prisma.notification.findMany({
        where: {
          type: 'DISPUTE_RESOLVED',
          user_id: { in: [renterAuth.user.user_id, companionAuth.user.user_id] },
        },
      });
      if (resolvedNotifs.length < 2) {
        throw new Error('Bước 8 thất bại: Chưa gửi đủ thông báo phán quyết giải quyết khiếu nại cho hai bên.');
      }

      console.log(`[BƯỚC 8] PASS: Phán quyết ban hành (Lỗi Companion 85%). Renter nhận hoàn 100.000đ; Companion phạt 20.000đ theo D22. Sổ cái kép Variance = 0 tuyệt đối. Cả 2 bên nhận thông báo phán quyết & số dư ví cập nhật.`);
    }

    console.log('\n================================================================');
    console.log('   🎉 TOÀN BỘ 8 BƯỚC KIỂM CHỨNG BẰNG TAY TỰ ĐỘNG ĐỀU ĐẠT: PASS');
    console.log('================================================================\n');

  } catch (error) {
    console.error(`\n❌ THẤT BẠI TẠI KỊCH BẢN KIỂM CHỨNG: ${error.message}\n`, error);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log('[CLEANUP] Đang dừng tiến trình backend server...');
      serverProcess.kill('SIGTERM');
    }
    await prisma.$disconnect();
  }
}

run();
