import { Request, Response } from 'express';
import { withdrawalService } from './withdrawal.service.js';
import { sendSuccess } from '../../common/response.js';

export const handleRequestWithdrawal = async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotency_key;

  const result = await withdrawalService.requestWithdrawal(userId, userRole, req.body, idempotencyKey);
  sendSuccess(res, result.withdrawal, 201, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
};

export const handleGetMyWithdrawals = async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const list = await withdrawalService.getMyWithdrawals(userId);
  sendSuccess(res, list);
};

export const handleListAllWithdrawals = async (req: Request, res: Response) => {
  const actorRole = req.user!.role;
  const statusFilter = req.query.status as string | undefined;

  const list = await withdrawalService.listAllWithdrawals(actorRole, statusFilter);
  sendSuccess(res, list);
};

export const handleProcessWithdrawal = async (req: Request, res: Response) => {
  const actorId = req.user!.user_id;
  const actorRole = req.user!.role;
  const { id } = req.params;

  const updated = await withdrawalService.processWithdrawal(actorId, actorRole, id);
  sendSuccess(res, updated);
};

export const handleCompleteWithdrawal = async (req: Request, res: Response) => {
  const actorId = req.user!.user_id;
  const actorRole = req.user!.role;
  const { id } = req.params;

  const result = await withdrawalService.completeWithdrawal(actorId, actorRole, id);
  sendSuccess(res, result.withdrawal, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
};

export const handleRejectWithdrawal = async (req: Request, res: Response) => {
  const actorId = req.user!.user_id;
  const actorRole = req.user!.role;
  const { id } = req.params;
  const { reason } = req.body;

  const updated = await withdrawalService.rejectWithdrawal(actorId, actorRole, id, reason);
  sendSuccess(res, updated);
};
