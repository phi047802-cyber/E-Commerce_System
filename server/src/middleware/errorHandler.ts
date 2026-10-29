import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors.js';
import { logger } from '../common/logger.js';
import { sendError } from '../common/response.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`[${req.method}] ${req.url} — Error: ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.errorCode, err.message, err.details);
    return;
  }

  // Lỗi không xác định
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'Đã xảy ra lỗi nội bộ trên máy chủ. Vui lòng thử lại sau.'
  );
}
