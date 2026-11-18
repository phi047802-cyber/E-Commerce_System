import { Router, Request, Response, NextFunction } from 'express';
import {
  handleCompanionSubmitKyc,
  handleAdminGetPendingKyc,
  handleAdminGetDecryptedImage,
  handleAdminReviewKyc,
} from './kyc.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const kycRouter = Router();

// Middleware kiểm tra Content-Length trước khi đọc toàn bộ payload
const checkKycContentLength = (req: Request, res: Response, next: NextFunction) => {
  const cl = req.headers['content-length'];
  if (cl && parseInt(cl, 10) > 10 * 1024 * 1024) {
    return res.status(400).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Dung lượng yêu cầu gửi hồ sơ eKYC vượt quá giới hạn cho phép (10MB).',
      },
    });
  }
  next();
};

// Companion nộp hồ sơ eKYC
kycRouter.post(
  '/companion/kyc/submit',
  authenticate,
  authorizeRoles('COMPANION'),
  checkKycContentLength,
  asyncHandler(handleCompanionSubmitKyc)
);

// Admin xem danh sách chờ duyệt eKYC
kycRouter.get(
  '/admin/kyc/pending',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(handleAdminGetPendingKyc)
);

// Admin giải mã và xem ảnh trực tiếp trong phiên xem (AuditLog được ghi lại)
kycRouter.get(
  '/admin/kyc/:id/image/:type',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(handleAdminGetDecryptedImage)
);

// Admin phê duyệt hoặc từ chối eKYC
kycRouter.post(
  '/admin/kyc/:id/review',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(handleAdminReviewKyc)
);
