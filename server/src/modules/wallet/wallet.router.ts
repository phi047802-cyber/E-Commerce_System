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

// 2b. Xuất CSV Sổ cái cho Kiểm toán viên (Chống CSV Injection)
walletRouter.get(
  '/reconciliation/export-csv',
  authorizeRoles('AUDITOR', 'ADMIN'),
  asyncHandler(async (_req: Request, res: Response) => {
    const transactions = await prisma.ledgerTransaction.findMany({
      include: {
        entries: {
          include: {
            wallet: {
              include: {
                user: { select: { display_name: true, email: true, role: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    const sanitizeCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Chống CSV injection: nếu ký tự đầu là =, +, -, @ thì chèn dấu nháy đơn '
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = [
      'Mã Giao Dịch (Txn ID)',
      'Loại Giao Dịch',
      'Idempotency Key',
      'Mã Booking',
      'Mã Ví',
      'Chủ Ví',
      'Vai Trò',
      'Loại Số Dư',
      'Chiều Hạch Toán',
      'Số Tiền (VND)',
      'Số Dư Sau',
      'Thời Gian Ghi Sổ',
    ];

    const rows: string[] = [headers.join(',')];

    for (const txn of transactions) {
      for (const entry of txn.entries) {
        rows.push([
          sanitizeCell(txn.txn_id),
          sanitizeCell(txn.txn_type),
          sanitizeCell(txn.idempotency_key),
          sanitizeCell(txn.booking_id || 'N/A'),
          sanitizeCell(entry.wallet_id),
          sanitizeCell(entry.wallet.user?.display_name || entry.wallet_id),
          sanitizeCell(entry.wallet.user?.role || 'SYSTEM'),
          sanitizeCell(entry.balance_type),
          sanitizeCell(entry.direction),
          sanitizeCell(entry.amount),
          sanitizeCell(entry.balance_after),
          sanitizeCell(new Date(entry.created_at).toISOString()),
        ].join(','));
      }
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-audit-${Date.now()}.csv"`);
    res.status(200).send(csvContent);
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
