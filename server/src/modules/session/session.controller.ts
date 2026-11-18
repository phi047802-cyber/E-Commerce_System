import { Request, Response } from 'express';
import { sessionService } from './session.service.js';
import { sendSuccess } from '../../common/response.js';

export async function handleGetSessionById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await sessionService.getSessionById(userId, userRole, id);
  sendSuccess(res, result);
}

export async function handleGetSessionByBookingId(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { bookingId } = req.params;

  const result = await sessionService.getSessionByBookingId(userId, userRole, bookingId);
  sendSuccess(res, result);
}

export async function handleStartSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await sessionService.startSession(userId, userRole, id);
  sendSuccess(res, result, 200, { is_idempotent_replay: result.is_idempotent_replay });
}

export async function handleEndSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await sessionService.endSession(userId, userRole, id);
  sendSuccess(res, result);
}

export async function handleSendMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;
  const { content } = req.body;

  const message = await sessionService.sendMessage(userId, userRole, id, content);
  sendSuccess(res, message, 201);
}

export async function handleGetMessages(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;
  const afterId = req.query.afterId ? parseInt(req.query.afterId as string, 10) : undefined;

  const messages = await sessionService.getMessages(userId, userRole, id, afterId);
  sendSuccess(res, messages);
}

export async function handleGetIceServers(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await sessionService.getIceServers(userId, userRole, id);
  sendSuccess(res, result);
}

export async function handleGetCallLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const logs = await sessionService.getCallLogs(userId, userRole, id);
  sendSuccess(res, logs);
}
