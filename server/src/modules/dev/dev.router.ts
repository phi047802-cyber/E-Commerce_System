import { Router, Request, Response } from 'express';
import { devService } from './dev.service.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';

export const devRouter = Router();

/**
 * POST /api/dev/reset-demo
 * Reset toàn bộ database về trạng thái seed ban đầu.
 * Chỉ hoạt động khi KHÔNG PHẢI môi trường Production.
 */
devRouter.post(
  '/reset-demo',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await devService.resetDemoDatabase();
    sendSuccess(res, result);
  })
);

/**
 * GET /api/dev/audit-alerts
 * Lấy danh sách sự cố lỗi sổ cái kiểm toán (Ledger Audit Alerts).
 */
devRouter.get(
  '/audit-alerts',
  asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await devService.listAuditAlerts();
    sendSuccess(res, alerts);
  })
);
