import { prisma } from '../../common/prisma.js';
import { BusinessError, ForbiddenError, NotFoundError, ConflictError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';
import { ledgerService } from '../ledger/ledger.service.js';
import { SYSTEM_ACCOUNTS } from '../ledger/ledger.types.js';
import { CreateWithdrawalInput } from './withdrawal.dto.js';

export class WithdrawalService {
  /**
   * Tạo yêu cầu rút tiền cho Companion (Prompt 11 - Requirement 4 & 5).
   * - Kiểm tra số dư khả dụng.
   * - Khóa số dư khả dụng ngay lập tức qua bút toán Sổ cái kép WITHDRAW_RESERVE.
   * - Tuyệt đối không gọi ngân hàng thật, không lưu số tài khoản thật dạng rõ.
   */
  async requestWithdrawal(
    userId: string,
    userRole: string,
    input: CreateWithdrawalInput,
    idempotencyKey?: string
  ) {
    if (userRole !== 'COMPANION' && userRole !== 'ADMIN') {
      throw new ForbiddenError('Chỉ tài khoản Companion mới có quyền tạo yêu cầu rút tiền.');
    }

    const finalKey = idempotencyKey || input.idempotency_key || `withdraw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 1. Kiểm tra Idempotency tránh tạo lặp
    const existingReq = await prisma.withdrawalRequest.findFirst({
      where: { idempotency_key: finalKey },
      include: {
        wallet: true,
      },
    });

    if (existingReq) {
      logger.info(`[Withdrawal] Idempotent replay for key ${finalKey}`);
      return {
        withdrawal: existingReq,
        is_idempotent_replay: true,
      };
    }

    // 2. Lấy ví của Companion
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError('Không tìm thấy ví của người dùng.');
    }

    // 3. Kiểm tra số dư khả dụng
    if (wallet.available_balance < input.amount) {
      throw new BusinessError(
        'INSUFFICIENT_BALANCE',
        `Số dư khả dụng không đủ để rút. Yêu cầu rút: ${input.amount.toLocaleString('vi-VN')} VND, hiện có: ${wallet.available_balance.toLocaleString('vi-VN')} VND.`
      );
    }

    // 4. Che mặt nạ số tài khoản (Masked account number)
    const rawAcc = input.account_no.trim();
    const maskedLength = Math.max(0, rawAcc.length - 4);
    const maskedAccount = `${'*'.repeat(maskedLength)}${rawAcc.slice(-4)}`;

    // 5. Thực hiện Transaction nguyên tử: Khóa số dư qua Sổ cái kép và tạo WithdrawalRequest
    const result = await prisma.$transaction(async (tx) => {
      // Bút toán Sổ cái kép WITHDRAW_RESERVE:
      // Debit ví khả dụng Companion: amount (giảm số dư khả dụng)
      // Credit ví Clearing hệ thống: amount (đối ứng giữ tiền)
      const ledgerResult = await ledgerService.postTransaction(
        {
          txn_type: 'WITHDRAW_RESERVE',
          idempotency_key: finalKey,
          entries: [
            {
              wallet_id: wallet.wallet_id,
              direction: 'DEBIT',
              balance_type: 'AVAILABLE',
              amount: input.amount,
            },
            {
              wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
              direction: 'CREDIT',
              balance_type: 'AVAILABLE',
              amount: input.amount,
            },
          ],
        },
        tx
      );

      // Tạo bản ghi WithdrawalRequest
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          wallet_id: wallet.wallet_id,
          txn_id: ledgerResult.transaction.txn_id,
          amount: input.amount,
          bank_name: input.bank_name.trim(),
          account_no_masked: maskedAccount,
          status: 'PENDING',
          idempotency_key: finalKey,
        },
      });

      // Tạo AuditLog
      await tx.auditLog.create({
        data: {
          actor_id: userId,
          action: 'WITHDRAW_RESERVE',
          entity_type: 'WithdrawalRequest',
          entity_id: withdrawal.withdraw_id,
          payload_json: JSON.stringify({
            amount: input.amount,
            bank_name: input.bank_name,
            account_masked: maskedAccount,
          }),
        },
      });

      return withdrawal;
    });

    logger.info(`[Withdrawal] Request created #${result.withdraw_id} for ${input.amount} VND (Reserved from wallet ${wallet.wallet_id}).`);

    return {
      withdrawal: result,
      is_idempotent_replay: false,
    };
  }

  /**
   * Chuyển yêu cầu rút tiền sang trạng thái PROCESSING (Admin / CS Agent).
   * Chống xử lý trùng hai lần.
   */
  async processWithdrawal(actorId: string, actorRole: string, withdrawId: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'CS_AGENT') {
      throw new ForbiddenError('Chỉ Quản trị viên (Admin) hoặc CS Agent mới có quyền chuyển trạng thái xử lý.');
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { withdraw_id: withdrawId },
    });

    if (!withdrawal) {
      throw new NotFoundError(`Không tìm thấy yêu cầu rút tiền với ID '${withdrawId}'.`);
    }

    if (withdrawal.status === 'PROCESSING') {
      throw new ConflictError('ALREADY_PROCESSING', 'Yêu cầu rút tiền này đã ở trạng thái đang xử lý (PROCESSING). Không được xử lý lặp lại.');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BusinessError(
        'INVALID_STATUS_TRANSITION',
        `Chỉ yêu cầu ở trạng thái PENDING mới có thể chuyển sang PROCESSING. Trạng thái hiện tại: ${withdrawal.status}.`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawalRequest.update({
        where: { withdraw_id: withdrawId },
        data: {
          status: 'PROCESSING',
          processed_by: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: actorId,
          action: 'WITHDRAW_PROCESSING',
          entity_type: 'WithdrawalRequest',
          entity_id: withdrawId,
        },
      });

      return w;
    });

    logger.info(`[Withdrawal] Request #${withdrawId} moved to PROCESSING by actor ${actorId}.`);
    return updated;
  }

  /**
   * Hoàn tất chuyển tiền mô phỏng (Complete Payout Simulation) - Admin / CS Agent.
   * Tạo mã payout giả lập, chuyển trạng thái sang COMPLETED.
   */
  async completeWithdrawal(actorId: string, actorRole: string, withdrawId: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'CS_AGENT') {
      throw new ForbiddenError('Chỉ Quản trị viên (Admin) hoặc CS Agent mới có quyền phê duyệt tất toán rút tiền.');
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { withdraw_id: withdrawId },
      include: { wallet: true },
    });

    if (!withdrawal) {
      throw new NotFoundError(`Không tìm thấy yêu cầu rút tiền với ID '${withdrawId}'.`);
    }

    // Chống duplicate completion
    if (withdrawal.status === 'COMPLETED') {
      logger.info(`[Withdrawal] Complete called on already completed #${withdrawId} (Idempotent replay)`);
      return {
        withdrawal,
        is_idempotent_replay: true,
      };
    }

    if (withdrawal.status === 'REJECTED') {
      throw new BusinessError('ALREADY_REJECTED', 'Không thể hoàn tất yêu cầu rút tiền đã bị từ chối.');
    }

    if (withdrawal.status !== 'PROCESSING' && withdrawal.status !== 'PENDING') {
      throw new BusinessError(
        'INVALID_STATUS_TRANSITION',
        `Không thể hoàn tất yêu cầu ở trạng thái ${withdrawal.status}.`
      );
    }

    // Tạo mã Payout ngân hàng giả lập
    const bankClean = withdrawal.bank_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const mockPayoutCode = `SIM-PO-${bankClean}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawalRequest.update({
        where: { withdraw_id: withdrawId },
        data: {
          status: 'COMPLETED',
          processed_by: actorId,
          processed_at: new Date(),
          payout_code: mockPayoutCode,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: actorId,
          action: 'WITHDRAW_SETTLE',
          entity_type: 'WithdrawalRequest',
          entity_id: withdrawId,
          payload_json: JSON.stringify({ payout_code: mockPayoutCode }),
        },
      });

      return w;
    });

    logger.info(`[Withdrawal] Request #${withdrawId} COMPLETED with mock payout code ${mockPayoutCode} by actor ${actorId}.`);

    return {
      withdrawal: updated,
      is_idempotent_replay: false,
    };
  }

  /**
   * Từ chối duyệt rút tiền & Hoàn trả số dư qua Sổ cái kép (Reject & Refund Reserve) - Admin / CS Agent.
   * Ghi nhận bút toán WITHDRAW_REJECT, tuyệt đối KHÔNG tự ý sửa số dư thô.
   */
  async rejectWithdrawal(
    actorId: string,
    actorRole: string,
    withdrawId: string,
    reason: string
  ) {
    if (actorRole !== 'ADMIN' && actorRole !== 'CS_AGENT') {
      throw new ForbiddenError('Chỉ Quản trị viên (Admin) hoặc CS Agent mới có quyền từ chối rút tiền.');
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { withdraw_id: withdrawId },
      include: { wallet: true },
    });

    if (!withdrawal) {
      throw new NotFoundError(`Không tìm thấy yêu cầu rút tiền với ID '${withdrawId}'.`);
    }

    if (withdrawal.status === 'REJECTED') {
      throw new ConflictError('ALREADY_REJECTED', 'Yêu cầu rút tiền này đã bị từ chối trước đó.');
    }

    if (withdrawal.status === 'COMPLETED') {
      throw new BusinessError('ALREADY_COMPLETED', 'Không thể từ chối yêu cầu rút tiền đã được hoàn tất chuyển khoản thành công.');
    }

    const refundTxnKey = `withdraw-reject-${withdrawId}-${Date.now()}`;

    // Thực thi transaction nguyên tử: Hoàn trả tiền vào ví Companion qua Sổ cái kép
    const updated = await prisma.$transaction(async (tx) => {
      // Bút toán đảo Sổ cái kép WITHDRAW_REJECT:
      // Credit ví khả dụng Companion: amount (trả lại tiền khả dụng)
      // Debit ví Clearing hệ thống: amount (giảm vị thế giữ tiền)
      await ledgerService.postTransaction(
        {
          txn_type: 'WITHDRAW_REJECT',
          idempotency_key: refundTxnKey,
          entries: [
            {
              wallet_id: withdrawal.wallet_id,
              direction: 'CREDIT',
              balance_type: 'AVAILABLE',
              amount: withdrawal.amount,
            },
            {
              wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
              direction: 'DEBIT',
              balance_type: 'AVAILABLE',
              amount: withdrawal.amount,
            },
          ],
        },
        tx
      );

      const w = await tx.withdrawalRequest.update({
        where: { withdraw_id: withdrawId },
        data: {
          status: 'REJECTED',
          reject_reason: reason.trim(),
          processed_by: actorId,
          processed_at: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: actorId,
          action: 'WITHDRAW_REJECT',
          entity_type: 'WithdrawalRequest',
          entity_id: withdrawId,
          payload_json: JSON.stringify({ reason }),
        },
      });

      return w;
    });

    logger.info(`[Withdrawal] Request #${withdrawId} REJECTED with reason "${reason}". Refunded ${withdrawal.amount} VND to wallet ${withdrawal.wallet_id}.`);
    return updated;
  }

  /**
   * Lấy lịch sử yêu cầu rút tiền của Companion
   */
  async getMyWithdrawals(userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError('Không tìm thấy ví của người dùng.');
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { wallet_id: wallet.wallet_id },
      orderBy: { created_at: 'desc' },
    });

    return withdrawals;
  }

  /**
   * Lấy danh sách toàn bộ yêu cầu rút tiền (Dành cho Admin / CS Agent)
   */
  async listAllWithdrawals(actorRole: string, statusFilter?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'CS_AGENT' && actorRole !== 'AUDITOR') {
      throw new ForbiddenError('Bạn không có quyền xem danh sách yêu cầu rút tiền của hệ thống.');
    }

    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: whereClause,
      include: {
        wallet: {
          include: {
            user: { select: { user_id: true, display_name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return withdrawals;
  }
}

export const withdrawalService = new WithdrawalService();
