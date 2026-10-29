import { Router } from 'express';
import {
  handleRequestWithdrawal,
  handleGetMyWithdrawals,
  handleListAllWithdrawals,
  handleProcessWithdrawal,
  handleCompleteWithdrawal,
  handleRejectWithdrawal,
} from './withdrawal.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { createWithdrawalSchema, rejectWithdrawalSchema } from './withdrawal.dto.js';

export const withdrawalRouter = Router();

// Yêu cầu xác thực JWT cho toàn bộ router
withdrawalRouter.use(authenticate);

// 1. Companion tạo yêu cầu rút tiền
withdrawalRouter.post(
  '/',
  validateBody(createWithdrawalSchema),
  asyncHandler(handleRequestWithdrawal)
);

// 2. Companion xem lịch sử rút tiền của chính mình
withdrawalRouter.get('/my', asyncHandler(handleGetMyWithdrawals));

// 3. Admin / CS Agent xem danh sách toàn bộ yêu cầu rút tiền
withdrawalRouter.get(
  '/',
  authorizeRoles('ADMIN', 'CS_AGENT', 'AUDITOR'),
  asyncHandler(handleListAllWithdrawals)
);

// 4. Admin / CS Agent chuyển trạng thái sang PROCESSING
withdrawalRouter.post(
  '/:id/process',
  authorizeRoles('ADMIN', 'CS_AGENT'),
  asyncHandler(handleProcessWithdrawal)
);

// 5. Admin / CS Agent phê duyệt chuyển tiền (Complete payout)
withdrawalRouter.post(
  '/:id/complete',
  authorizeRoles('ADMIN', 'CS_AGENT'),
  asyncHandler(handleCompleteWithdrawal)
);
withdrawalRouter.post(
  '/:id/approve',
  authorizeRoles('ADMIN', 'CS_AGENT'),
  asyncHandler(handleCompleteWithdrawal)
);

// 6. Admin / CS Agent từ chối rút tiền (Reject & Refund Reserve)
withdrawalRouter.post(
  '/:id/reject',
  authorizeRoles('ADMIN', 'CS_AGENT'),
  validateBody(rejectWithdrawalSchema),
  asyncHandler(handleRejectWithdrawal)
);
