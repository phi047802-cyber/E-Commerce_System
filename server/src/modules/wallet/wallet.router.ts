import { Router, Request, Response } from 'express';
import { prisma } from '../../common/prisma.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';
import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import { reconciliationService } from '../ledger/reconciliation.service.js';

export const walletRouter = Router();

walletRouter.use(authenticate);

// 1. Xem ví và lịch sử Sổ cái của chính mình
const handleGetMyWallet = async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const wallet = await prisma.wallet.findUnique({
    where: { user_id: userId },
    include: {
      entries: {
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          transaction: {
            select: {
              txn_type: true,
              idempotency_key: true,
              booking_id: true,
              created_at: true,
            },
          },
        },
      },
    },
  });

  if (!wallet) {
    throw new NotFoundError('Không tìm thấy ví của người dùng.');
  }

  sendSuccess(res, wallet);
};

walletRouter.get('/', asyncHandler(handleGetMyWallet));
walletRouter.get('/me', asyncHandler(handleGetMyWallet));

// 2. Chạy báo cáo đối soát Sổ cái bất biến (Chỉ dành cho Auditor và Admin)
walletRouter.get(
  '/reconciliation',
  authorizeRoles('AUDITOR', 'ADMIN'),
  asyncHandler(async (_req: Request, res: Response) => {
    const report = await reconciliationService.runReconciliation();
    sendSuccess(res, report);
  })
);

// 3. Tra cứu ví theo userId — Bắt buộc phải là chính mình hoặc vai trò AUDITOR / ADMIN
walletRouter.get(
  '/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = req.params.userId;
    const currentUser = req.user!;

    if (currentUser.user_id !== targetUserId && !['AUDITOR', 'ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenError('Bạn không có quyền xem thông tin số dư ví của người dùng khác.');
    }

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: targetUserId },
      include: {
        entries: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundError('Không tìm thấy ví của người dùng được yêu cầu.');
    }

    sendSuccess(res, wallet);
  })
);
