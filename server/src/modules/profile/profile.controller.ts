import { Request, Response } from 'express';
import { profileService } from './profile.service.js';
import { sendSuccess } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';

export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const profile = await profileService.getProfile(userId);
  sendSuccess(res, profile);
}

export async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const updated = await profileService.updateProfile(userId, req.body, ip);
  sendSuccess(res, updated);
}

export async function handleUploadAvatar(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  let buffer: Buffer | null = null;
  let fileName = 'avatar.png';

  // Hỗ trợ cả Base64 Data URL và raw base64
  const base64Input = req.body.avatar_base64 || req.body.avatar || req.body.image_base64;
  if (base64Input && typeof base64Input === 'string') {
    fileName = req.body.file_name || req.body.fileName || 'avatar.png';
    const matches = base64Input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Input, 'base64');
    }
  } else if ((req as any).file && (req as any).file.buffer) {
    buffer = (req as any).file.buffer;
    fileName = (req as any).file.originalname || 'avatar.png';
  }

  if (!buffer) {
    throw new ValidationError('Vui lòng cung cấp dữ liệu ảnh (avatar_base64 hoặc tệp đính kèm).');
  }

  const result = await profileService.uploadAvatar(userId, buffer, fileName, ip);
  sendSuccess(res, result, 200);
}

export async function handleDeleteAvatar(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = await profileService.deleteAvatar(userId, ip);
  sendSuccess(res, result);
}

export async function handleChangePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = await profileService.changePassword(userId, req.body, ip);
  sendSuccess(res, result);
}
