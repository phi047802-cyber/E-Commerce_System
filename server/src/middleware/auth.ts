import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../common/errors.js';

export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  display_name: string;
  purpose?: string;
  evidence_id?: string;
  dispute_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Sinh signed token có thời hạn ngắn (mặc định 60 giây) phục vụ tải tệp hoặc mở trực tiếp tệp bằng chứng an toàn.
 * Chứa mục đích evidence_download, ID người dùng, vai trò và phạm vi tệp được cấp phép.
 */
export function generateEvidenceSignedToken(
  payload: {
    user_id: string;
    role: string;
    dispute_id: string;
    evidence_id: string;
    email?: string;
    display_name?: string;
  },
  expiresInSeconds = 60
): string {
  return jwt.sign(
    {
      user_id: payload.user_id,
      email: payload.email || '',
      role: payload.role,
      display_name: payload.display_name || '',
      purpose: 'evidence_download',
      dispute_id: payload.dispute_id,
      evidence_id: payload.evidence_id,
    },
    env.JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // 1. Chặn tuyệt đối việc truyền JWT thông thường qua query string (?token=) để tránh rò rỉ qua log/WAF (Đợt D1b - Mục B.1)
  if (req.query && (typeof req.query.token === 'string' || req.query.token !== undefined)) {
    throw new UnauthorizedError(
      'Truyền token qua query string (?token=) bị nghiêm cấm theo chính sách bảo mật. Vui lòng sử dụng Authorization header (Bearer token) hoặc tham số ký ngắn hạn ?signed_token= khi tải tệp.'
    );
  }

  // 2. Xác thực qua Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      req.user = decoded;
      return next();
    } catch (err) {
      throw new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn.');
    }
  }

  // 3. Xác thực qua liên kết ký ngắn hạn ?signed_token= (dành cho tải tệp trực tiếp / mở tab mới)
  if (req.query && typeof req.query.signed_token === 'string') {
    const signedToken = req.query.signed_token;
    try {
      const decoded = jwt.verify(signedToken, env.JWT_SECRET) as AuthUser;
      if (decoded.purpose !== 'evidence_download') {
        throw new UnauthorizedError('Mục đích của token ký không hợp lệ.');
      }
      req.user = decoded;
      return next();
    } catch (err) {
      throw new UnauthorizedError('Token ký đã hết hạn hoặc không hợp lệ.');
    }
  }

  // 4. Nếu không có cả hai
  throw new UnauthorizedError('Header Authorization Bearer hoặc signed_token là bắt buộc.');
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
