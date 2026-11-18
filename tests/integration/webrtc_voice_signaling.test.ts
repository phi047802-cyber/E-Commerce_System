import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { env } from '../../server/src/config/env.js';
import { voiceSignalingService } from '../../server/src/modules/session/voice-signaling.service.js';
import { wsNotificationService } from '../../server/src/common/ws-notification.service.js';

describe('F1 - WebRTC Voice Calling & CallLog Audit (FR-006, UC04 bước 3, luồng thay thế 2a và 3a)', () => {
  let renterToken: string;
  let companionToken: string;
  let strangerToken: string;
  let csToken: string;

  let renterId: string;
  let companionUserId: string;
  let strangerId: string;
  let csId: string;

  let testBookingId: string;
  let testSessionId: string;

  const mockSockets: { [key: string]: any } = {};

  const createMockSocket = (id: string) => {
    const messages: any[] = [];
    const ws = {
      id,
      readyState: 1, // OPEN
      send: (data: string) => {
        messages.push(JSON.parse(data));
      },
      messages,
      getLastMessage: () => messages[messages.length - 1],
    };
    mockSockets[id] = ws;
    return ws;
  };

  beforeAll(async () => {
    // 1. Lấy thông tin user có sẵn từ DB seed
    const renter = await prisma.user.findFirst({ where: { role: 'RENTER' } });
    const companionUser = await prisma.user.findFirst({ where: { role: 'COMPANION' } });
    const cs = await prisma.user.findFirst({ where: { role: 'CS_AGENT' } });

    if (!renter || !companionUser || !cs) {
      throw new Error('Thiếu dữ liệu seed cần thiết');
    }

    renterId = renter.user_id;
    companionUserId = companionUser.user_id;
    csId = cs.user_id;

    // Tạo một người dùng thứ ba (stranger)
    const stranger = await prisma.user.upsert({
      where: { email: 'stranger_test_f1@instasquad.vn' },
      update: {},
      create: {
        email: 'stranger_test_f1@instasquad.vn',
        password_hash: 'mock_hash',
        display_name: 'Người Lạ F1',
        role: 'RENTER',
      },
    });
    strangerId = stranger.user_id;

    renterToken = jwt.sign({ user_id: renterId, email: renter.email, role: renter.role }, env.JWT_SECRET);
    companionToken = jwt.sign({ user_id: companionUserId, email: companionUser.email, role: companionUser.role }, env.JWT_SECRET);
    strangerToken = jwt.sign({ user_id: strangerId, email: stranger.email, role: stranger.role }, env.JWT_SECRET);
    csToken = jwt.sign({ user_id: csId, email: cs.email, role: cs.role }, env.JWT_SECRET);

    // 2. Tìm profile của companion
    const companionProfile = await prisma.companionProfile.findUnique({
      where: { user_id: companionUserId },
    });
    if (!companionProfile) throw new Error('Không tìm thấy companion profile');

    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000); // bắt đầu 10 phút trước
    const endTime = new Date(now.getTime() + 50 * 60 * 1000); // kết thúc sau 50 phút

    // 3. Tạo SlotCalendar và Booking test
    const testSlot = await prisma.slotCalendar.create({
      data: {
        profile_id: companionProfile.profile_id,
        start_time: startTime,
        end_time: endTime,
        status: 'BOOKED',
      },
    });

    const testBooking = await prisma.booking.create({
      data: {
        request_key: `req-voice-${Date.now()}`,
        renter_id: renterId,
        profile_id: companionProfile.profile_id,
        slot_id: testSlot.slot_id,
        start_time: startTime,
        duration_hours: 1,
        total_fee_snapshot: 150000,
        status: 'IN_SESSION',
        response_deadline: new Date(Date.now() + 180 * 1000),
      },
    });
    testBookingId = testBooking.booking_id;

    // 4. Tạo Session ACTIVE cho booking
    const testSession = await prisma.session.create({
      data: {
        booking_id: testBookingId,
        status: 'ACTIVE',
        start_time: startTime,
        end_time: endTime,
        room_token: `token-${Date.now()}`,
      },
    });
    testSessionId = testSession.session_id;

    // Đăng ký mock sockets vào wsNotificationService
    const renterWs = createMockSocket('renterWs');
    const companionWs = createMockSocket('companionWs');
    (wsNotificationService as any).registerSocket(renterId, renterWs);
    (wsNotificationService as any).registerSocket(companionUserId, companionWs);
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.callLog.deleteMany({ where: { session_id: testSessionId } });
    await prisma.chatMessage.deleteMany({ where: { session_id: testSessionId } });
    await prisma.session.deleteMany({ where: { session_id: testSessionId } });
    await prisma.booking.deleteMany({ where: { booking_id: testBookingId } });
    await prisma.user.deleteMany({ where: { email: 'stranger_test_f1@instasquad.vn' } });
  });

  describe('1. Kiểm soát quyền truy cập & Bảo vệ kênh tín hiệu (RBAC & Session Status)', () => {
    it('Từ chối tín hiệu khi chưa xác thực (UNAUTHORIZED)', async () => {
      const mockWs = createMockSocket('unauthWs');
      await voiceSignalingService.handleVoiceMessage(mockWs as any, null, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
        sdp: { type: 'offer', sdp: 'mock_sdp' },
      }, 100);

      const lastMsg = mockWs.getLastMessage();
      expect(lastMsg).toBeDefined();
      expect(lastMsg.type).toBe('VOICE_ERROR');
      expect(lastMsg.code).toBe('UNAUTHORIZED');
    });

    it('Từ chối tín hiệu khi vượt quá kích thước 64KB (PAYLOAD_TOO_LARGE)', async () => {
      const mockWs = createMockSocket('oversizeWs');
      await voiceSignalingService.handleVoiceMessage(mockWs as any, renterId, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
      }, 70 * 1024); // 70KB

      const lastMsg = mockWs.getLastMessage();
      expect(lastMsg.type).toBe('VOICE_ERROR');
      expect(lastMsg.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('Từ chối tín hiệu từ người ngoài không thuộc đơn (FORBIDDEN_VOICE_PARTICIPANT)', async () => {
      const mockWs = createMockSocket('strangerWs');
      await voiceSignalingService.handleVoiceMessage(mockWs as any, strangerId, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
        sdp: { type: 'offer', sdp: 'mock_sdp' },
      }, 200);

      const lastMsg = mockWs.getLastMessage();
      expect(lastMsg.type).toBe('VOICE_ERROR');
      expect(lastMsg.code).toBe('FORBIDDEN_VOICE_PARTICIPANT');
    });

    it('Từ chối cuộc gọi khi phiên chơi không ở trạng thái ACTIVE (SESSION_NOT_ACTIVE)', async () => {
      // Tạm cập nhật session sang ENDED
      await prisma.session.update({
        where: { session_id: testSessionId },
        data: { status: 'ENDED' },
      });

      const mockWs = createMockSocket('endedWs');
      await voiceSignalingService.handleVoiceMessage(mockWs as any, renterId, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
        sdp: { type: 'offer', sdp: 'mock_sdp' },
      }, 200);

      const lastMsg = mockWs.getLastMessage();
      expect(lastMsg.type).toBe('VOICE_ERROR');
      expect(lastMsg.code).toBe('SESSION_NOT_ACTIVE');

      // Khôi phục lại ACTIVE để tiếp tục test
      await prisma.session.update({
        where: { session_id: testSessionId },
        data: { status: 'ACTIVE' },
      });
    });

    it('Từ chối cuộc gọi khi thời gian phiên đã hết hạn giờ thuê (SESSION_NOT_ACTIVE)', async () => {
      // Tạm cập nhật end_time về quá khứ
      await prisma.session.update({
        where: { session_id: testSessionId },
        data: { end_time: new Date(Date.now() - 5 * 60 * 1000) },
      });

      const mockWs = createMockSocket('expiredWs');
      await voiceSignalingService.handleVoiceMessage(mockWs as any, renterId, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
        sdp: { type: 'offer', sdp: 'mock_sdp' },
      }, 200);

      const lastMsg = mockWs.getLastMessage();
      expect(lastMsg.type).toBe('VOICE_ERROR');
      expect(lastMsg.code).toBe('SESSION_NOT_ACTIVE');

      // Khôi phục lại thời gian hợp lệ
      await prisma.session.update({
        where: { session_id: testSessionId },
        data: { end_time: new Date(Date.now() + 60 * 60 * 1000) },
      });
    });
  });

  describe('2. Luồng thiết lập cuộc gọi thoại 1-1, trao đổi tín hiệu & ghi nhận CallLog', () => {
    let createdCallId: string;

    it('Renter gửi VOICE_OFFER: Tạo CallLog và chuyển tiếp tới Companion', async () => {
      const renterWs = mockSockets['renterWs'];
      const companionWs = mockSockets['companionWs'];

      await voiceSignalingService.handleVoiceMessage(renterWs, renterId, {
        type: 'VOICE_OFFER',
        session_id: testSessionId,
        sdp: { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1' },
      }, 500);

      // Kiểm tra thông điệp chuyển tiếp tới Companion
      const companionMsg = companionWs.getLastMessage();
      expect(companionMsg).toBeDefined();
      expect(companionMsg.type).toBe('VOICE_OFFER');
      expect(companionMsg.session_id).toBe(testSessionId);
      expect(companionMsg.caller_id).toBe(renterId);
      expect(companionMsg.call_id).toBeDefined();

      createdCallId = companionMsg.call_id;

      // Kiểm tra CallLog trong DB
      const callLog = await prisma.callLog.findUnique({
        where: { call_id: createdCallId },
      });
      expect(callLog).not.toBeNull();
      expect(callLog?.caller_id).toBe(renterId);
      expect(callLog?.receiver_id).toBe(companionUserId);
      expect(callLog?.result).toBe('IN_PROGRESS');
    });

    it('Companion gửi VOICE_ANSWER: Cập nhật sự kiện CallLog và chuyển tiếp tới Renter', async () => {
      const renterWs = mockSockets['renterWs'];
      const companionWs = mockSockets['companionWs'];

      await voiceSignalingService.handleVoiceMessage(companionWs, companionUserId, {
        type: 'VOICE_ANSWER',
        session_id: testSessionId,
        sdp: { type: 'answer', sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1' },
      }, 500);

      const renterMsg = renterWs.getLastMessage();
      expect(renterMsg).toBeDefined();
      expect(renterMsg.type).toBe('VOICE_ANSWER');
      expect(renterMsg.session_id).toBe(testSessionId);

      const callLog = await prisma.callLog.findUnique({
        where: { call_id: createdCallId },
      });
      expect(callLog?.events).toContain('CALL_ANSWER_RECEIVED');
    });

    it('Trao đổi VOICE_ICE_CANDIDATE giữa hai bên', async () => {
      const renterWs = mockSockets['renterWs'];
      const companionWs = mockSockets['companionWs'];

      // Renter gửi candidate sang Companion
      await voiceSignalingService.handleVoiceMessage(renterWs, renterId, {
        type: 'VOICE_ICE_CANDIDATE',
        session_id: testSessionId,
        candidate: { candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 50000 typ host', sdpMid: '0' },
      }, 200);

      const compMsg = companionWs.getLastMessage();
      expect(compMsg.type).toBe('VOICE_ICE_CANDIDATE');
      expect(compMsg.candidate).toBeDefined();
    });

    it('Báo cáo trạng thái VOICE_STATUS CONNECTED', async () => {
      const renterWs = mockSockets['renterWs'];
      await voiceSignalingService.handleVoiceMessage(renterWs, renterId, {
        type: 'VOICE_STATUS',
        session_id: testSessionId,
        status: 'CONNECTED',
      }, 100);

      const callLog = await prisma.callLog.findUnique({
        where: { call_id: createdCallId },
      });
      expect(callLog?.events).toContain('STATUS_CONNECTED');
    });

    it('Kết thúc cuộc gọi VOICE_HANGUP: Hoàn tất CallLog và tính thời lượng duration_sec', async () => {
      const renterWs = mockSockets['renterWs'];
      const companionWs = mockSockets['companionWs'];

      await voiceSignalingService.handleVoiceMessage(renterWs, renterId, {
        type: 'VOICE_HANGUP',
        session_id: testSessionId,
        reason: 'USER_COMPLETED',
      }, 100);

      const compMsg = companionWs.getLastMessage();
      expect(compMsg.type).toBe('VOICE_HANGUP');

      const finalCallLog = await prisma.callLog.findUnique({
        where: { call_id: createdCallId },
      });
      expect(finalCallLog?.ended_at).not.toBeNull();
      expect(finalCallLog?.result).toBe('COMPLETED');
      expect(finalCallLog?.duration_sec).toBeGreaterThanOrEqual(0);
      expect(finalCallLog?.events).toContain('CALL_ENDED');
    });
  });

  describe('3. Độc lập kênh chat & API ICE Servers / CallLog', () => {
    it('Kênh chat văn bản vẫn hoạt động bình thường khi voice không khả dụng (luồng thay thế 3a)', async () => {
      const res = await request(app)
        .post(`/api/sessions/${testSessionId}/messages`)
        .set('Authorization', `Bearer ${renterToken}`)
        .send({ content: 'Voice gián đoạn, chúng ta tiếp tục chat nhé!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Voice gián đoạn, chúng ta tiếp tục chat nhé!');
    });

    it('API GET /api/sessions/:id/ice-servers trả về cấu hình STUN/TURN', async () => {
      const res = await request(app)
        .get(`/api/sessions/${testSessionId}/ice-servers`)
        .set('Authorization', `Bearer ${renterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.ice_servers)).toBe(true);
      expect(res.body.data.ice_servers.length).toBeGreaterThan(0);
      expect(res.body.data.ice_servers[0].urls).toContain('stun:');
    });

    it('API GET /api/sessions/:id/call-logs trả về lịch sử cuộc gọi đúng quyền', async () => {
      const res = await request(app)
        .get(`/api/sessions/${testSessionId}/call-logs`)
        .set('Authorization', `Bearer ${csToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].result).toBe('COMPLETED');
      expect(res.body.data[0].caller_name).toBeDefined();
    });
  });
});
