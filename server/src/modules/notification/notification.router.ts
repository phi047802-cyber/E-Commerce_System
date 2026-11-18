import { Router, Request, Response } from 'express';
import { prisma } from '../../common/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';
import { sanitizeUIMessage } from '../../common/messages.vi.js';

export const notificationRouter = Router();

// Xác thực JWT bắt buộc cho mọi API thông báo
notificationRouter.use(authenticate);

/**
 * 1. Lấy danh sách thông báo in-app và số đếm chưa đọc (Đợt D1b - Mục C.4)
 */
notificationRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    const sanitizedNotifications = notifications.map((n) => {
      let targetUrl = n.target_url;
      if (!targetUrl) {
        if (n.type?.startsWith('DISPUTE_')) {
          targetUrl = '/khieu-nai';
        } else if (n.type?.startsWith('BOOKING_') || n.type === 'ESCROW_RELEASED' || n.type === 'ACCEPTANCE_REQUIRED') {
          targetUrl = '/don-hang';
        } else if (n.type?.startsWith('TOPUP_')) {
          targetUrl = '/vi';
        }
      }
      return {
        ...n,
        title: sanitizeUIMessage(n.title),
        message: sanitizeUIMessage(n.message),
        target_url: targetUrl,
      };
    });

    sendSuccess(res, {
      notifications: sanitizedNotifications,
      unread_count: unreadCount,
    });
  })
);

/**
 * 2. Đánh dấu đã đọc tất cả thông báo
 */
notificationRouter.put(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;

    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    sendSuccess(res, { message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  })
);

/**
 * 3. Đánh dấu đã đọc một thông báo
 */
notificationRouter.put(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;
    const notificationId = parseInt(req.params.id, 10);

    await prisma.notification.updateMany({
      where: { notification_id: notificationId, user_id: userId },
      data: { is_read: true },
    });

    sendSuccess(res, { message: 'Đã đánh dấu thông báo là đã đọc.' });
  })
);
