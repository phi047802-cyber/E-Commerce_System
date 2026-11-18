import { prisma } from '../../common/prisma.js';
import { logger } from '../../common/logger.js';
import { SYSTEM_ACCOUNTS } from './ledger.types.js';

export interface WalletMismatchReport {
  wallet_id: string;
  user_id: string;
  wallet_type: string;
  current_available: number;
  calculated_available: number;
  diff_available: number;
  current_escrow: number;
  calculated_escrow: number;
  diff_escrow: number;
}

export interface ReconciliationReport {
  timestamp: string;
  is_balanced: boolean;
  total_wallets_checked: number;
  wallet_mismatches: WalletMismatchReport[];
  system_conservation: {
    total_available_user_balances: number;
    total_escrow_user_balances: number;
    total_platform_revenue: number;
    total_withdrawn_amount: number;
    total_reserved_withdrawals: number;
    total_system_assets: number;
    total_deposited_payments: number;
    equation_difference: number;
    is_equation_satisfied: boolean;
  };
  escrow_audit: {
    total_active_escrow_records: number;
    total_wallet_escrow_balances: number;
    difference: number;
    is_escrow_aligned: boolean;
  };
  alerts_logged: number;
}

export class ReconciliationService {
  /**
   * Chạy quy trình đối soát toàn diện giữa Sổ cái bất biến và các số dư hiển thị.
   * Tuyệt đối không tự ý ghi đè hay sửa số dư; nếu có sai lệch sẽ cảnh báo rõ ràng.
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    const timestamp = new Date().toISOString();
    logger.info('🔍 Starting Double-Entry Ledger Reconciliation audit...');

    const wallets = await prisma.wallet.findMany();
    const mismatches: WalletMismatchReport[] = [];

    // 1. Đối soát từng ví: Tổng các Ledger Entries vs Số dư trong bảng Wallet
    for (const wallet of wallets) {
      const entries = await prisma.ledgerEntry.findMany({
        where: { wallet_id: wallet.wallet_id },
      });

      let calcAvail = 0;
      let calcEscrow = 0;

      for (const e of entries) {
        const sign = e.direction === 'CREDIT' ? 1 : -1;
        if (e.balance_type === 'AVAILABLE') {
          calcAvail += sign * e.amount;
        } else if (e.balance_type === 'ESCROW') {
          calcEscrow += sign * e.amount;
        }
      }

      // Với ví Clearing hệ thống, số dư khả dụng phản ánh vị thế đối ứng (âm số tiền nạp)
      const diffAvail = wallet.available_balance - calcAvail;
      const diffEscrow = wallet.escrow_balance - calcEscrow;

      if (diffAvail !== 0 || diffEscrow !== 0) {
        mismatches.push({
          wallet_id: wallet.wallet_id,
          user_id: wallet.user_id,
          wallet_type: wallet.wallet_type,
          current_available: wallet.available_balance,
          calculated_available: calcAvail,
          diff_available: diffAvail,
          current_escrow: wallet.escrow_balance,
          calculated_escrow: calcEscrow,
          diff_escrow: diffEscrow,
        });
      }
    }

    // 2. Kiểm tra Phương trình bảo toàn tổng tiền toàn hệ thống (Financial Rules Section 1 & 3)
    // Tổng khả dụng người dùng + Tổng ký quỹ người dùng + Doanh thu sàn + Tiền đã rút == Tổng tiền nạp vào sàn
    const standardWallets = wallets.filter((w) => w.wallet_type === 'STANDARD');
    const totalAvailUsers = standardWallets.reduce((sum, w) => sum + w.available_balance, 0);
    const totalEscrowUsers = standardWallets.reduce((sum, w) => sum + w.escrow_balance, 0);

    const platformRevenues = await prisma.platformRevenue.findMany();
    const totalPlatformRevenue = platformRevenues.reduce((sum, r) => sum + r.amount, 0);

    const completedWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { status: 'COMPLETED' },
    });
    const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const reservedWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });
    const totalReservedWithdrawals = reservedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const successfulPayments = await prisma.payment.findMany({
      where: { status: { in: ['SUCCESS', 'LATE'] } },
    });
    const totalDeposited = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // Lưu ý: Nếu ban đầu seed có tiền khởi tạo chưa qua bảng Payment (như renter1 500k),
    // ta tính thêm các bút toán TOPUP khởi tạo
    const initTopupTxns = await prisma.ledgerTransaction.findMany({
      where: {
        txn_type: 'TOPUP',
        payment: null, // Không gắn Payment record
      },
      include: { entries: true },
    });
    let seedInitialDeposited = 0;
    for (const tx of initTopupTxns) {
      for (const entry of tx.entries) {
        if (entry.direction === 'CREDIT' && entry.balance_type === 'AVAILABLE') {
          seedInitialDeposited += entry.amount;
        }
      }
    }

    const totalSystemInflow = totalDeposited + seedInitialDeposited;
    const totalSystemAssets = totalAvailUsers + totalEscrowUsers + totalPlatformRevenue + totalWithdrawn + totalReservedWithdrawals;
    const equationDiff = totalSystemAssets - totalSystemInflow;
    const isEquationSatisfied = equationDiff === 0;

    // 3. Đối soát số dư Escrow: Bảng Escrow (HELD/FROZEN) vs Tổng escrow_balance của ví
    const activeEscrows = await prisma.escrow.findMany({
      where: { status: { in: ['HELD', 'FROZEN'] } },
    });
    const totalActiveEscrows = activeEscrows.reduce((sum, e) => sum + e.amount, 0);
    const escrowDiff = totalActiveEscrows - totalEscrowUsers;
    const isEscrowAligned = escrowDiff === 0;

    const isBalanced = mismatches.length === 0 && isEquationSatisfied && isEscrowAligned;
    let alertsLogged = 0;

    // 4. Nếu phát hiện bất kỳ sai lệch nào, ghi nhận LedgerAuditAlert cảnh báo
    if (!isBalanced) {
      logger.error('🚨 RECONCILIATION MISMATCH DETECTED!', {
        mismatchesCount: mismatches.length,
        equationDiff,
        escrowDiff,
      });

      await prisma.ledgerAuditAlert.create({
        data: {
          error_code: 'LEDGER_MISMATCH_DETECTED',
          error_message: `Phát hiện sai lệch đối soát sổ cái: ${mismatches.length} ví lệch, sai lệch phương trình bảo toàn = ${equationDiff} VND, lệch Escrow = ${escrowDiff} VND.`,
          context_json: JSON.stringify({
            timestamp,
            mismatches,
            equationDiff,
            escrowDiff,
          }),
        },
      });
      alertsLogged += 1;
    } else {
      logger.info('✅ Reconciliation completed: All ledger accounts and conservation equations are 100% BALANCED.');
    }

    return {
      timestamp,
      is_balanced: isBalanced,
      total_wallets_checked: wallets.length,
      wallet_mismatches: mismatches,
      system_conservation: {
        total_available_user_balances: totalAvailUsers,
        total_escrow_user_balances: totalEscrowUsers,
        total_platform_revenue: totalPlatformRevenue,
        total_withdrawn_amount: totalWithdrawn,
        total_reserved_withdrawals: totalReservedWithdrawals,
        total_system_assets: totalSystemAssets,
        total_deposited_payments: totalSystemInflow,
        equation_difference: equationDiff,
        is_equation_satisfied: isEquationSatisfied,
      },
      escrow_audit: {
        total_active_escrow_records: totalActiveEscrows,
        total_wallet_escrow_balances: totalEscrowUsers,
        difference: escrowDiff,
        is_escrow_aligned: isEscrowAligned,
      },
      alerts_logged: alertsLogged,
    };
  }
}

export const reconciliationService = new ReconciliationService();
