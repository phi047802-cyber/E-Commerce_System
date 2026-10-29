import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  sendSuccess(res, result, 201);
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 200);
}

export async function handleGetMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const user = await authService.getMe(userId);
  sendSuccess(res, user, 200);
}
