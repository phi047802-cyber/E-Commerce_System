import { Request, Response } from 'express';
import { paymentService } from './payment.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleCreateTopup(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const result = await paymentService.createTopup(userId, req.body);
  sendSuccess(res, result, 201);
}

export async function handleMockWebhook(req: Request, res: Response): Promise<void> {
  const headerSignature = req.headers['x-mock-signature'] as string | undefined;
  const result = await paymentService.processWebhook(req.body, headerSignature);
  sendSuccess(res, result, 200, { is_idempotent_replay: result.is_idempotent_replay });
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
