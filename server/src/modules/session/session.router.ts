import { Router } from 'express';
import {
  handleGetSessionById,
  handleGetSessionByBookingId,
  handleStartSession,
  handleEndSession,
  handleSendMessage,
  handleGetMessages,
  handleGetIceServers,
  handleGetCallLogs,
} from './session.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendMessageSchema } from './session.dto.js';

export const sessionRouter = Router();

// Toàn bộ API session yêu cầu xác thực JWT
sessionRouter.use(authenticate);

sessionRouter.get('/:id', asyncHandler(handleGetSessionById));
sessionRouter.get('/booking/:bookingId', asyncHandler(handleGetSessionByBookingId));
sessionRouter.post('/:id/start', asyncHandler(handleStartSession));
sessionRouter.post('/:id/end', asyncHandler(handleEndSession));
sessionRouter.post('/:id/messages', validateBody(sendMessageSchema), asyncHandler(handleSendMessage));
sessionRouter.get('/:id/messages', asyncHandler(handleGetMessages));
sessionRouter.get('/:id/ice-servers', asyncHandler(handleGetIceServers));
sessionRouter.get('/:id/call-logs', asyncHandler(handleGetCallLogs));
