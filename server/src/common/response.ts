import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  details?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: details ?? null,
    },
  });
}
