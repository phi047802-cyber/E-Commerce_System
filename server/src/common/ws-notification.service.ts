import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { AuthUser } from '../middleware/auth.js';
import { voiceSignalingService } from '../modules/session/voice-signaling.service.js';

class WsNotificationService {
  private userSockets: Map<string, Set<WebSocket>> = new Map();

  /**
   * Khởi tạo và liên kết WebSocketServer với trình quản lý thông báo.
   */
  init(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket, req) => {
      let authenticatedUserId: string | null = null;

      // 1. Kiểm tra xác thực qua Query string: /ws?token=<jwt>
      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (token) {
          const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
          authenticatedUserId = decoded.user_id;
          this.registerSocket(authenticatedUserId, ws);
          logger.info(`📡 WebSocket client authenticated via query for user: ${authenticatedUserId}`);
          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', user_id: authenticatedUserId }));
        }
      } catch (err: any) {
        logger.warn(`WebSocket query token auth error: ${err.message}`);
      }

      // 2. Nhận message (hỗ trợ gửi token qua message `{ type: 'AUTH', token }`)
      ws.on('message', (raw) => {
        try {
          const messageStr = raw.toString();
          const parsed = JSON.parse(messageStr);

          if (parsed.type === 'AUTH' && parsed.token) {
            try {
              const decoded = jwt.verify(parsed.token, env.JWT_SECRET) as AuthUser;
              authenticatedUserId = decoded.user_id;
              this.registerSocket(authenticatedUserId, ws);
              logger.info(`📡 WebSocket client authenticated via message for user: ${authenticatedUserId}`);
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', user_id: authenticatedUserId }));
            } catch (authErr: any) {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Token không hợp lệ' }));
            }
          } else if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          } else if (typeof parsed.type === 'string' && parsed.type.startsWith('VOICE_')) {
            // Xử lý tín hiệu WebRTC Voice (FR-006, UC04)
            const byteLength = Buffer.byteLength(messageStr, 'utf-8');
            voiceSignalingService.handleVoiceMessage(ws, authenticatedUserId, parsed, byteLength).catch((err) => {
              logger.error(`[WebRTC] Lỗi xử lý tín hiệu thoại: ${err.message}`);
            });
          }
        } catch (e) {
          // ignore non-json messages
        }
      });

      // 3. Dọn dẹp kết nối khi đóng
      ws.on('close', () => {
        if (authenticatedUserId) {
          this.unregisterSocket(authenticatedUserId, ws);
        }
      });

      ws.on('error', (err) => {
        logger.warn(`WebSocket socket error: ${err.message}`);
        if (authenticatedUserId) {
          this.unregisterSocket(authenticatedUserId, ws);
        }
      });
    });
  }

  private registerSocket(userId: string, ws: WebSocket): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);
  }

  private unregisterSocket(userId: string, ws: WebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Gửi thông báo sự kiện Realtime tới một người dùng cụ thể.
   */
  notifyUser(userId: string, payload: any): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return false;
    }

    const message = JSON.stringify(payload);
    let sentCount = 0;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    }
    return sentCount > 0;
  }

  /**
   * Phát sóng sự kiện tới toàn bộ kết nối WebSocket đang mở.
   */
  broadcast(payload: any): void {
    const message = JSON.stringify(payload);
    for (const sockets of this.userSockets.values()) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }
}

export const wsNotificationService = new WsNotificationService();
