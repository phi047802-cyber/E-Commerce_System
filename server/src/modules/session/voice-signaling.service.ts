import { WebSocket } from 'ws';
import { prisma } from '../../common/prisma.js';
import { logger } from '../../common/logger.js';
import { wsNotificationService } from '../../common/ws-notification.service.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class VoiceSignalingService {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private activeCalls: Map<string, { callId: string; callerId: string; receiverId: string; startedAt: Date }> = new Map();

  private MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB giới hạn kích thước tín hiệu
  private MAX_MESSAGES_PER_SEC = 20; // 20 thông điệp / giây

  /**
   * Kiểm tra giới hạn tần suất tín hiệu (Rate Limit)
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(userId);

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + 1000 });
      return true;
    }

    if (entry.count >= this.MAX_MESSAGES_PER_SEC) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  /**
   * Xử lý thông điệp tín hiệu thoại WebRTC từ client WebSocket
   */
  async handleVoiceMessage(
    ws: WebSocket,
    senderId: string | null,
    parsed: any,
    payloadSize: number
  ): Promise<void> {
    // 1. Kiểm tra xác thực
    if (!senderId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Vui lòng xác thực trước khi gửi tín hiệu thoại.');
      return;
    }

    // 2. Giới hạn kích thước gói tin
    if (payloadSize > this.MAX_PAYLOAD_BYTES) {
      this.sendError(ws, 'PAYLOAD_TOO_LARGE', 'Kích thước gói tín hiệu vượt quá 64KB.');
      return;
    }

    // 3. Giới hạn tần suất
    if (!this.checkRateLimit(senderId)) {
      this.sendError(ws, 'RATE_LIMIT_EXCEEDED', 'Tần suất gửi tín hiệu quá nhanh. Vui lòng thử lại sau.');
      return;
    }

    const { type, session_id } = parsed;

    if (!session_id || typeof session_id !== 'string') {
      this.sendError(ws, 'INVALID_SESSION_ID', 'Thông điệp tín hiệu thiếu session_id hợp lệ.');
      return;
    }

    // 4. Kiểm tra phiên và quyền truy cập phòng chơi
    const session = await prisma.session.findUnique({
      where: { session_id },
      include: {
        booking: {
          include: {
            companion: true,
          },
        },
      },
    });

    if (!session) {
      this.sendError(ws, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên chơi tương ứng.');
      return;
    }

    const renterId = session.booking.renter_id;
    const companionId = session.booking.companion.user_id;

    // Kiểm tra người ngoài phòng (Người không thuộc đơn không tham gia được - FR-006)
    if (senderId !== renterId && senderId !== companionId) {
      logger.warn(`[WebRTC] Từ chối tín hiệu từ người ngoài: userId=${senderId}, session=${session_id}`);
      this.sendError(ws, 'FORBIDDEN_VOICE_PARTICIPANT', 'Bạn không phải là người tham gia của phiên chơi này.');
      return;
    }

    const peerId = senderId === renterId ? companionId : renterId;

    // 5. Kiểm tra thời gian phiên chơi (Chỉ mở khi phiên đang diễn ra - FR-006)
    const now = new Date();
    const isSessionActive = session.status === 'ACTIVE' && session.booking.status === 'IN_SESSION';
    // Cho phép gọi trong khoảng từ start_time đến end_time (hoặc đang ACTIVE)
    const isWithinTimeRange = now <= session.end_time;

    if (!isSessionActive || !isWithinTimeRange) {
      logger.warn(`[WebRTC] Từ chối cuộc gọi ngoài thời gian phiên: status=${session.status}, end_time=${session.end_time.toISOString()}`);
      this.sendError(
        ws,
        'SESSION_NOT_ACTIVE',
        'Cuộc gọi thoại chỉ khả dụng khi phiên chơi đang diễn ra (từ lúc bắt đầu đến hết giờ thuê).'
      );
      return;
    }

    // 6. Xử lý theo từng loại thông điệp WebRTC
    switch (type) {
      case 'VOICE_OFFER': {
        const sdp = parsed.sdp;
        if (!sdp) {
          this.sendError(ws, 'INVALID_SDP', 'Thiếu dữ liệu SDP offer.');
          return;
        }

        // Tạo bản ghi CallLog mới
        const newCallLog = await prisma.callLog.create({
          data: {
            session_id,
            caller_id: senderId,
            receiver_id: peerId,
            started_at: new Date(),
            events: JSON.stringify([
              { event: 'CALL_OFFER_SENT', timestamp: new Date().toISOString(), from: senderId },
            ]),
            result: 'IN_PROGRESS',
          },
        });

        this.activeCalls.set(session_id, {
          callId: newCallLog.call_id,
          callerId: senderId,
          receiverId: peerId,
          startedAt: newCallLog.started_at,
        });

        // Chuyển tiếp tín hiệu sang peer
        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_OFFER',
          session_id,
          call_id: newCallLog.call_id,
          caller_id: senderId,
          sdp,
        });

        logger.info(`[WebRTC] VOICE_OFFER forwarded: call=${newCallLog.call_id}, session=${session_id}, from=${senderId} to=${peerId}`);
        break;
      }

      case 'VOICE_ANSWER': {
        const sdp = parsed.sdp;
        if (!sdp) {
          this.sendError(ws, 'INVALID_SDP', 'Thiếu dữ liệu SDP answer.');
          return;
        }

        const activeCall = this.activeCalls.get(session_id);
        if (activeCall) {
          await this.appendCallEvent(activeCall.callId, {
            event: 'CALL_ANSWER_RECEIVED',
            timestamp: new Date().toISOString(),
            from: senderId,
          });
        }

        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_ANSWER',
          session_id,
          call_id: activeCall?.callId,
          responder_id: senderId,
          sdp,
        });

        logger.info(`[WebRTC] VOICE_ANSWER forwarded: session=${session_id}, from=${senderId} to=${peerId}`);
        break;
      }

      case 'VOICE_ICE_CANDIDATE': {
        const candidate = parsed.candidate;
        if (!candidate) {
          this.sendError(ws, 'INVALID_CANDIDATE', 'Thiếu dữ liệu ICE candidate.');
          return;
        }

        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_ICE_CANDIDATE',
          session_id,
          candidate,
        });
        break;
      }

      case 'VOICE_STATUS': {
        const status = parsed.status; // CONNECTED, RECONNECTING, DISCONNECTED
        const activeCall = this.activeCalls.get(session_id);
        if (activeCall && status) {
          await this.appendCallEvent(activeCall.callId, {
            event: `STATUS_${status}`,
            timestamp: new Date().toISOString(),
            from: senderId,
          });
        }

        // Báo cho peer về trạng thái kết nối
        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_PEER_STATUS',
          session_id,
          status,
          user_id: senderId,
        });
        break;
      }

      case 'VOICE_HANGUP': {
        const reason = parsed.reason || 'USER_HANGUP';
        const activeCall = this.activeCalls.get(session_id);

        if (activeCall) {
          const endedAt = new Date();
          const durationSec = Math.max(0, Math.round((endedAt.getTime() - activeCall.startedAt.getTime()) / 1000));

          await this.appendCallEvent(activeCall.callId, {
            event: 'CALL_ENDED',
            timestamp: endedAt.toISOString(),
            ended_by: senderId,
            reason,
          });

          await prisma.callLog.update({
            where: { call_id: activeCall.callId },
            data: {
              ended_at: endedAt,
              duration_sec: durationSec,
              result: reason === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
            },
          });

          this.activeCalls.delete(session_id);
          logger.info(`[WebRTC] Call ended: call=${activeCall.callId}, duration=${durationSec}s, reason=${reason}`);
        }

        // Báo cho đối phương biết cuộc gọi đã kết thúc
        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_HANGUP',
          session_id,
          reason,
          ended_by: senderId,
        });
        break;
      }

      case 'VOICE_RECONNECT': {
        const activeCall = this.activeCalls.get(session_id);
        if (activeCall) {
          await this.appendCallEvent(activeCall.callId, {
            event: 'CALL_RECONNECTING',
            timestamp: new Date().toISOString(),
            user_id: senderId,
          });
        }

        wsNotificationService.notifyUser(peerId, {
          type: 'VOICE_RECONNECT',
          session_id,
          user_id: senderId,
        });
        break;
      }

      default:
        this.sendError(ws, 'UNKNOWN_VOICE_TYPE', `Loại tín hiệu WebRTC không hỗ trợ: ${type}`);
        break;
    }
  }

  private async appendCallEvent(callId: string, eventObj: any): Promise<void> {
    try {
      const call = await prisma.callLog.findUnique({
        where: { call_id: callId },
        select: { events: true },
      });
      if (call) {
        let events: any[] = [];
        try {
          events = call.events ? JSON.parse(call.events) : [];
        } catch {
          events = [];
        }
        events.push(eventObj);
        await prisma.callLog.update({
          where: { call_id: callId },
          data: { events: JSON.stringify(events) },
        });
      }
    } catch (err: any) {
      logger.warn(`[WebRTC] Lỗi ghi nhận sự kiện CallLog: ${err.message}`);
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'VOICE_ERROR',
          code,
          message,
        })
      );
    }
  }
}

export const voiceSignalingService = new VoiceSignalingService();
