import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../common/errors.js';

export function validateBody(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Dữ liệu đầu vào không hợp lệ', err.errors));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Tham số truy vấn (query) không hợp lệ', err.errors));
      } else {
        next(err);
      }
    }
  };
}

export function validateParams(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Tham số đường dẫn (params) không hợp lệ', err.errors));
      } else {
        next(err);
      }
    }
  };
}
