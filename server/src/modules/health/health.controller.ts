import { Request, Response } from 'express';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../common/response.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  try {
    // Kiểm tra kết nối database bằng raw query
    await prisma.$queryRawUnsafe('SELECT 1');

    sendSuccess(res, {
      status: 'UP',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
      environment: env.NODE_ENV,
      payment_provider: env.PAYMENT_PROVIDER,
      version: '1.0.0-mvp',
    });
  } catch (err: any) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Cơ sở dữ liệu tạm thời không phản hồi', {
      error: err.message,
    });
  }
}
