import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../common/errors.js';

export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  display_name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Header Authorization với định dạng Bearer <token> là bắt buộc.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    throw new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn.');
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Yêu cầu xác thực trước khi kiểm tra quyền hạn.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Vai trò '${req.user.role}' không có quyền thực hiện hành động này. Yêu cầu một trong các vai trò: [${allowedRoles.join(', ')}].`
      );
    }

    next();
  };
}
