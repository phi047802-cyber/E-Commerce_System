import { Request, Response } from 'express';
import { disputeService } from './dispute.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleGetDisputeById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await disputeService.getDisputeById(userId, userRole, id);
  sendSuccess(res, result);
}

export async function handleSubmitEvidence(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;
  const input = req.body;

  const evidence = await disputeService.submitEvidence(userId, userRole, id, input);
  sendSuccess(res, evidence, 201);
}

export async function handleGetEvidences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const dossier = await disputeService.getDisputeById(userId, userRole, id);
  sendSuccess(res, dossier.dispute.evidences);
}
