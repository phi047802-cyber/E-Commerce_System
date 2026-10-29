import { Router } from 'express';
import { 
  handleCreateTopup, 
  handleMockWebhook, 
  handleSimulateOutcome, 
  handleGetPaymentById 
} from './payment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { 
  createTopupSchema, 
  mockWebhookSchema, 
  simulatePaymentSchema 
} from './payment.dto.js';

export const paymentRouter = Router();

// 1. Webhook nhận callback từ cổng mô phỏng (Xác thực qua HMAC SHA-256 header X-Mock-Signature)
paymentRouter.post('/mock-webhook', validateBody(mockWebhookSchema), asyncHandler(handleMockWebhook));

// 2. Helper Simulator: Giao diện hoặc test gọi giả lập kết quả
paymentRouter.post('/simulate', validateBody(simulatePaymentSchema), asyncHandler(handleSimulateOutcome));

// 3. Tạo yêu cầu nạp tiền (Cần đăng nhập)
paymentRouter.post('/create-topup', authenticate, validateBody(createTopupSchema), asyncHandler(handleCreateTopup));

// 4. Tra cứu đơn nạp tiền
paymentRouter.get('/:id', authenticate, asyncHandler(handleGetPaymentById));
