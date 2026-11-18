import { Request, Response } from 'express';
import { kycService } from './kyc.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleCompanionSubmitKyc(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const result = await kycService.submitKyc(userId, req.body);
  sendSuccess(res, result, 201);
}

export async function handleAdminGetPendingKyc(req: Request, res: Response): Promise<void> {
  const list = await kycService.getPendingList();
  sendSuccess(res, list, 200);
}

export async function handleAdminGetDecryptedImage(req: Request, res: Response): Promise<void> {
  const adminUserId = req.user!.user_id;
  const kycId = req.params.id;
  const type = req.params.type as 'front' | 'back' | 'selfie';
  const ip = req.ip || req.socket.remoteAddress;

  const { buffer, mime } = await kycService.getDecryptedImage(adminUserId, kycId, type, ip);

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.status(200).send(buffer);
}

export async function handleAdminReviewKyc(req: Request, res: Response): Promise<void> {
  const adminUserId = req.user!.user_id;
  const kycId = req.params.id;
  const { decision, reason } = req.body;

  const result = await kycService.reviewKyc(adminUserId, kycId, decision, reason);
  sendSuccess(res, result, 200);
}
