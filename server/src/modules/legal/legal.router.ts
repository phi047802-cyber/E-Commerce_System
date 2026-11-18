import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';
import { legalService } from './legal.service.js';

export const legalRouter = Router();

const acceptSchema = z.object({
  terms_version: z.string().min(1).max(32),
  channel: z.enum(['WEB', 'MOBILE']).default('WEB'),
});

const violationSchema = z.object({
  user_id: z.string().min(1),
  code: z.string().regex(/^V0[1-8]$/, 'Mã vi phạm phải từ V01 đến V08'),
  note: z.string().min(10).max(2000),
  booking_id: z.string().optional(),
});

// Công khai: phiên bản điều khoản hiện hành + bảng vi phạm/chế tài (Web & Mobile dùng chung)
legalRouter.get('/terms', (_req: Request, res: Response) => {
  sendSuccess(res, legalService.getTerms());
});

legalRouter.get(
  '/acceptance',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await legalService.getAcceptanceStatus(req.user!.user_id));
  })
);

legalRouter.post(
  '/accept',
  authenticate,
  validateBody(acceptSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()) || req.socket.remoteAddress || undefined;
    const data = await legalService.acceptTerms(req.user!.user_id, req.body.terms_version, req.body.channel, ip);
    sendSuccess(res, data, 201);
  })
);

legalRouter.get(
  '/violations/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await legalService.listMyViolations(req.user!.user_id));
  })
);

legalRouter.get(
  '/violations',
  authenticate,
  authorizeRoles('CS_AGENT', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = typeof req.query.user_id === 'string' ? req.query.user_id : undefined;
    sendSuccess(res, await legalService.listViolations(userId));
  })
);

legalRouter.post(
  '/violations',
  authenticate,
  authorizeRoles('CS_AGENT', 'ADMIN'),
  validateBody(violationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await legalService.recordViolation(req.user!.user_id, req.body), 201);
  })
);
