import { Request, Response } from 'express';
import { companionService } from './companion.service.js';
import { trustScoreService } from './trust-score.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleGetMyProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const profile = await companionService.getMyProfile(userId);
  sendSuccess(res, profile);
}

export async function handleGetTrustScore(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const profile = await companionService.getMyProfile(userId);
  const breakdown = await trustScoreService.getScoreBreakdown(profile.profile_id);
  sendSuccess(res, breakdown);
}

export async function handleUpdateMyProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const updated = await companionService.updateMyProfile(userId, req.body);
  sendSuccess(res, updated);
}

export async function handleGetMySlots(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const slots = await companionService.getMySlots(userId);
  sendSuccess(res, slots);
}

export async function handleCreateSlot(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const newSlot = await companionService.createSlot(userId, req.body);
  sendSuccess(res, newSlot, 201);
}

export async function handleDeleteSlot(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  const result = await companionService.deleteSlot(userId, id);
  sendSuccess(res, result);
}

export async function handleUploadVoiceIntro(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const result = await companionService.uploadVoiceIntro(userId, req.body);
  sendSuccess(res, result, 201);
}
