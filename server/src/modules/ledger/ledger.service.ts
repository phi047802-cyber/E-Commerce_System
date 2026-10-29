import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../common/prisma.js';
import { BusinessError, NotFoundError, ValidationError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';
import { 
  SYSTEM_ACCOUNTS, 
  PostTransactionInput, 
  LedgerEntryInput 
} from './ledger.types.js';

export class LedgerService {
  /**
   * Đảm bảo các tài khoản hệ thống (Clearing và Platform Revenue) luôn tồn tại trong DB.
   */
  async ensureSystemWallets(tx: Prisma.TransactionClient | PrismaClient = prisma): Promise<void> {
    // 1. Tài khoản trung gian thanh toán (Payment Clearing)
    const clearingWallet = await tx.wallet.findUnique({
      where: { wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID },
    });

    if (!clearingWallet) {
      await tx.user.upsert({
        where: { user_id: SYSTEM_ACCOUNTS.CLEARING_USER_ID },
        update: {},
        create: {
          user_id: SYSTEM_ACCOUNTS.CLEARING_USER_ID,
          email: 'clearing@system.internal',
          password_hash: 'SYSTEM_INTERNAL_ACCOUNT_NO_LOGIN',
          display_name: 'Payment Clearing (Hệ thống thanh toán trung gian)',
          role: 'ADMIN',
        },
      });

      await tx.wallet.create({
        data: {
          wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
          user_id: SYSTEM_ACCOUNTS.CLEARING_USER_ID,
          wallet_type: 'SYSTEM_CLEARING',
          available_balance: 0,
          escrow_balance: 0,
        },
      });
      logger.info('Initialized System Clearing Wallet.');
    }

    // 2. Tài khoản doanh thu nền tảng (Platform Commission Revenue)
    const revenueWallet = await tx.wallet.findUnique({
      where: { wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID },
    });

    if (!revenueWallet) {
      await tx.user.upsert({
        where: { user_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_USER_ID },
        update: {},
        create: {
          user_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_USER_ID,
          email: 'revenue@system.internal',
          password_hash: 'SYSTEM_INTERNAL_ACCOUNT_NO_LOGIN',
          display_name: 'Platform Revenue (Doanh thu hoa hồng sàn)',
          role: 'ADMIN',
        },
      });

      await tx.wallet.create({
        data: {
          wallet_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID,
          user_id: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_USER_ID,
          wallet_type: 'PLATFORM_REVENUE',
          available_balance: 0,
          escrow_balance: 0,
        },
      });
      logger.info('Initialized System Platform Revenue Wallet.');
    }
  }

  /**
   * Ghi nhận giao dịch Sổ cái kép (Double-Entry Ledger Posting).
   * Bắt buộc tuân thủ:
   * 1. Toàn vẹn giao dịch DB (All or nothing).
   * 2. Tổng Nợ (Debit) == Tổng Có (Credit).
   * 3. Số tiền là số nguyên VND > 0.
   * 4. Idempotency Key bảo đảm không chạy trùng lặp.
   */
  async postTransaction(
    input: PostTransactionInput,
    customTx?: Prisma.TransactionClient
  ) {
    // A. Kiểm tra tính hợp lệ cơ bản của dữ liệu
    if (!input.entries || input.entries.length < 2) {
      throw new ValidationError('Mỗi bút toán sổ cái kép bắt buộc phải có ít nhất 2 dòng đối ứng (Debit và Credit).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of input.entries) {
      if (!Number.isInteger(entry.amount) || entry.amount <= 0) {
        throw new ValidationError(`Số tiền giao dịch phải là số nguyên VND dương (> 0). Nhận được: ${entry.amount}`);
      }

      if (entry.direction === 'DEBIT') {
        totalDebit += entry.amount;
      } else if (entry.direction === 'CREDIT') {
        totalCredit += entry.amount;
      } else {
        throw new ValidationError(`Hướng bút toán không hợp lệ: ${(entry as any).direction}`);
      }
    }

    // B. Kiểm tra nguyên tắc Kế toán kép: Tổng Debit == Tổng Credit
    if (totalDebit !== totalCredit) {
      throw new BusinessError(
        'LEDGER_UNBALANCED',
        `Bút toán Sổ cái không cân bằng: Tổng Nợ (Debit: ${totalDebit.toLocaleString('vi-VN')} VND) khác Tổng Có (Credit: ${totalCredit.toLocaleString('vi-VN')} VND). Giao dịch bị từ chối!`
      );
    }

    // C. Kiểm tra Idempotency trước khi mở transaction
    const existingTxn = await prisma.ledgerTransaction.findUnique({
      where: { idempotency_key: input.idempotency_key },
      include: { entries: true },
    });

    if (existingTxn) {
      logger.info(`Idempotent replay detected for ledger key: ${input.idempotency_key}`);
      return {
        transaction: existingTxn,
        is_idempotent_replay: true,
      };
    }

    // D. Thực thi bên trong Transaction
    const execute = async (tx: Prisma.TransactionClient) => {
      // Đảm bảo các ví hệ thống sẵn sàng
      await this.ensureSystemWallets(tx);

      // 1. Tạo bản ghi LedgerTransaction
      const txn = await tx.ledgerTransaction.create({
        data: {
          txn_type: input.txn_type,
          idempotency_key: input.idempotency_key,
          booking_id: input.booking_id,
          escrow_id: input.escrow_id,
        },
      });

      const createdEntries = [];

      // 2. Xử lý từng dòng bút toán và cập nhật số dư ví tương ứng
      for (const entry of input.entries) {
        const wallet = await tx.wallet.findUnique({
          where: { wallet_id: entry.wallet_id },
        });

        if (!wallet) {
          throw new NotFoundError(`Không tìm thấy ví với ID '${entry.wallet_id}'.`);
        }

        let newBalance = 0;

        if (entry.direction === 'DEBIT') {
          if (entry.balance_type === 'AVAILABLE') {
            // Kiểm tra số dư khả dụng (trừ tài khoản trung gian clearing)
            if (wallet.wallet_type !== 'SYSTEM_CLEARING' && wallet.available_balance < entry.amount) {
              throw new BusinessError(
                'INSUFFICIENT_BALANCE',
                `Số dư khả dụng không đủ. Cần ${entry.amount.toLocaleString('vi-VN')} VND, hiện có ${wallet.available_balance.toLocaleString('vi-VN')} VND.`
              );
            }
            newBalance = wallet.available_balance - entry.amount;
            await tx.wallet.update({
              where: { wallet_id: wallet.wallet_id },
              data: {
                available_balance: newBalance,
                version: { increment: 1 },
                updated_at: new Date(),
              },
            });
          } else {
            // DEBIT ESCROW
            if (wallet.escrow_balance < entry.amount) {
              throw new BusinessError(
                'INSUFFICIENT_ESCROW_BALANCE',
                `Số dư ký quỹ không đủ để thực hiện giải phóng hoặc hoàn tiền.`
              );
            }
            newBalance = wallet.escrow_balance - entry.amount;
            await tx.wallet.update({
              where: { wallet_id: wallet.wallet_id },
              data: {
                escrow_balance: newBalance,
                version: { increment: 1 },
                updated_at: new Date(),
              },
            });
          }
        } else {
          // CREDIT
          if (entry.balance_type === 'AVAILABLE') {
            newBalance = wallet.available_balance + entry.amount;
            await tx.wallet.update({
              where: { wallet_id: wallet.wallet_id },
              data: {
                available_balance: newBalance,
                version: { increment: 1 },
                updated_at: new Date(),
              },
            });
          } else {
            // CREDIT ESCROW
            newBalance = wallet.escrow_balance + entry.amount;
            await tx.wallet.update({
              where: { wallet_id: wallet.wallet_id },
              data: {
                escrow_balance: newBalance,
                version: { increment: 1 },
                updated_at: new Date(),
              },
            });
          }
        }

        // 3. Tạo bản ghi LedgerEntry với balance_after chính xác
        const createdEntry = await tx.ledgerEntry.create({
          data: {
            txn_id: txn.txn_id,
            wallet_id: wallet.wallet_id,
            direction: entry.direction,
            balance_type: entry.balance_type,
            amount: entry.amount,
            balance_after: newBalance,
          },
        });

        createdEntries.push(createdEntry);
      }

      // 4. Nếu là giao dịch trích hoa hồng nền tảng (ESCROW_RELEASE hoặc CANCEL_PENALTY), ghi nhận PlatformRevenue
      if (input.txn_type === 'ESCROW_RELEASE' || input.txn_type === 'CANCEL_PENALTY') {
        const revEntry = input.entries.find(
          (e) => e.wallet_id === SYSTEM_ACCOUNTS.PLATFORM_REVENUE_WALLET_ID && e.direction === 'CREDIT'
        );
        if (revEntry) {
          await tx.platformRevenue.create({
            data: {
              txn_id: txn.txn_id,
              amount: revEntry.amount,
              commission_rate: 0.12,
            },
          });
        }
      }

      return {
        transaction: {
          ...txn,
          entries: createdEntries,
        },
        is_idempotent_replay: false,
      };
    };

    if (customTx) {
      return await execute(customTx);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await execute(tx);
      });
    }
  }
}

export const ledgerService = new LedgerService();
