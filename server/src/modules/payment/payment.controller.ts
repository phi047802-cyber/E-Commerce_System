import { Request, Response } from 'express';
import { paymentService } from './payment.service.js';
import { sendSuccess } from '../../common/response.js';
import { ForbiddenError } from '../../common/errors.js';

export async function handleCreateTopup(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;

  if (['ADMIN', 'CS_AGENT', 'AUDITOR'].includes(userRole)) {
    throw new ForbiddenError('Tài khoản quản trị/vận hành không sử dụng tính năng nạp tiền ví cá nhân.');
  }

  const result = await paymentService.createTopup(userId, req.body);
  sendSuccess(res, result, 201);
}

export async function handleMockWebhook(req: Request, res: Response): Promise<void> {
  const headerSignature = req.headers['x-mock-signature'] as string | undefined;
  const result = await paymentService.processWebhook(req.body, headerSignature);
  sendSuccess(res, result, 200, { is_idempotent_replay: result.is_idempotent_replay });
}

export async function handleSepayWebhook(req: Request, res: Response): Promise<void> {
  const authHeader = (req.headers.authorization || req.headers['x-api-key']) as string | undefined;
  const result = await paymentService.processSepayWebhook(req.body, authHeader);
  res.status(200).json(result);
}

export async function handleSimulateOutcome(req: Request, res: Response): Promise<void> {
  const result = await paymentService.simulateOutcome(req.body);
  sendSuccess(res, result, 200, { is_idempotent_replay: result.is_idempotent_replay });
}

export async function handleGetPaymentById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const payment = await paymentService.getPaymentById(id);
  sendSuccess(res, payment);
}

export async function handleGetMonthlyInflowMetrics(_req: Request, res: Response): Promise<void> {
  const metrics = await paymentService.getMonthlyInflowMetrics();
  sendSuccess(res, metrics);
}
