import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { NotFoundError, UnauthorizedError, BusinessError } from '../../common/errors.js';
import { ledgerService } from '../ledger/ledger.service.js';
import { SYSTEM_ACCOUNTS } from '../ledger/ledger.types.js';
import { CreateTopupInput, MockWebhookInput, SimulatePaymentInput } from './payment.dto.js';
import { logger } from '../../common/logger.js';

export class PaymentService {
  /**
   * Tạo chuỗi chữ ký HMAC-SHA256 chuẩn cho cổng thanh toán mô phỏng.
   */
  generateMockSignature(gatewayRef: string, amount: number, status: string): string {
    const rawData = `${gatewayRef}|${amount}|${status}`;
    return crypto.createHmac('sha256', env.SIMULATOR_SECRET).update(rawData).digest('hex');
  }

  /**
   * Khởi tạo giao dịch nạp tiền PENDING và sinh link điều hướng Simulator.
   */
  async createTopup(userId: string, input: CreateTopupInput) {
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError('Không tìm thấy ví người dùng để nạp tiền.');
    }

    const gatewayRef = `MOCK-VNPAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        wallet_id: wallet.wallet_id,
        provider: input.provider || 'MOCK_VNPAY',
        gateway_ref: gatewayRef,
        amount: input.amount,
        status: 'PENDING',
      },
    });

    logger.info(`Created Topup Payment request: ${payment.payment_id} (${input.amount.toLocaleString('vi-VN')} VND)`);

    return {
      payment_id: payment.payment_id,
      gateway_ref: payment.gateway_ref,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      created_at: payment.created_at,
    };
  }

  /**
   * Xử lý Webhook callback từ Payment Simulator (xác thực HMAC, chống ghi trùng, hạch toán Sổ cái).
   */
  async processWebhook(input: MockWebhookInput, headerSignature?: string) {
    const providedSignature = input.signature || headerSignature;

    if (!providedSignature) {
      throw new UnauthorizedError('Chữ ký xác thực Webhook (signature hoặc header X-Mock-Signature) là bắt buộc.');
    }

    // 1. Xác thực chữ ký HMAC
    const expectedSignature = this.generateMockSignature(input.gateway_ref, input.amount, input.status);
    if (providedSignature !== expectedSignature) {
      throw new UnauthorizedError('Chữ ký Webhook giả lập (HMAC SHA-256) không hợp lệ hoặc đã bị thay đổi.');
    }

    // 2. Tìm bản ghi Payment trong DB
    const payment = await prisma.payment.findUnique({
      where: { gateway_ref: input.gateway_ref },
    });

    if (!payment) {
      throw new NotFoundError(`Không tìm thấy giao dịch thanh toán với gateway_ref: ${input.gateway_ref}`);
    }

    // Kiểm tra số tiền khớp
    if (payment.amount !== input.amount) {
      throw new BusinessError('AMOUNT_MISMATCH', 'Số tiền trong webhook không khớp với số tiền khởi tạo.');
    }

    // 3. Cơ chế Idempotency: Nếu Payment đã ở trạng thái SUCCESS trước đó
    if (payment.status === 'SUCCESS') {
      logger.info(`Webhook idempotent replay ignored for payment: ${payment.payment_id}`);
      const wallet = await prisma.wallet.findUnique({ where: { wallet_id: payment.wallet_id } });
      return {
        payment_id: payment.payment_id,
        status: payment.status,
        is_idempotent_replay: true,
        wallet_balance_after: wallet?.available_balance ?? 0,
        message: 'Giao dịch đã được ghi sổ thành công trước đó (Idempotent Replay). Không ghi nhận trùng.',
      };
    }

    // 4. Nếu trạng thái là SUCCESS: Thực hiện ghi nhận Sổ cái kép và cộng ví
    if (input.status === 'SUCCESS') {
      const idempotencyKey = `TOPUP-${payment.gateway_ref}`;

      const postResult = await ledgerService.postTransaction({
        txn_type: 'TOPUP',
        idempotency_key: idempotencyKey,
        entries: [
          // Dòng 1: CREDIT ví khả dụng Renter (+amount)
          {
            wallet_id: payment.wallet_id,
            direction: 'CREDIT',
            balance_type: 'AVAILABLE',
            amount: payment.amount,
          },
          // Dòng 2: DEBIT tài khoản trung gian hệ thống (-amount)
          {
            wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
            direction: 'DEBIT',
            balance_type: 'AVAILABLE',
            amount: payment.amount,
          },
        ],
      });

      // Cập nhật trạng thái Payment sang SUCCESS
      const updatedPayment = await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: 'SUCCESS',
          txn_id: postResult.transaction.txn_id,
          processed_at: new Date(),
        },
      });

      const updatedWallet = await prisma.wallet.findUnique({
        where: { wallet_id: payment.wallet_id },
      });

      logger.info(`Topup SUCCESS: +${payment.amount.toLocaleString('vi-VN')} VND to wallet ${payment.wallet_id}`);

      return {
        payment_id: updatedPayment.payment_id,
        status: updatedPayment.status,
        is_idempotent_replay: false,
        wallet_balance_after: updatedWallet?.available_balance ?? 0,
        message: 'Nạp tiền thành công và đã ghi sổ cái kép.',
      };
    }

    // 5. Nếu trạng thái là FAILED
    if (input.status === 'FAILED') {
      const updatedPayment = await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: 'FAILED',
          processed_at: new Date(),
        },
      });

      logger.warn(`Topup FAILED: Payment ${payment.payment_id} marked as FAILED.`);

      return {
        payment_id: updatedPayment.payment_id,
        status: updatedPayment.status,
        is_idempotent_replay: false,
        message: 'Thanh toán thất bại, không cộng tiền ví.',
      };
    }

    // 6. Nếu trạng thái là PENDING / Timeout
    return {
      payment_id: payment.payment_id,
      status: 'PENDING',
      is_idempotent_replay: false,
      message: 'Giao dịch thanh toán đang chờ xử lý.',
    };
  }

  /**
   * Helper Simulator: Kích hoạt callback giả lập theo kết quả mong muốn (SUCCESS / FAILED / PENDING).
   * Đi qua đúng cổng xử lý Webhook mô phỏng thực tế.
   */
  async simulateOutcome(input: SimulatePaymentInput) {
    const payment = await prisma.payment.findUnique({
      where: { payment_id: input.payment_id },
    });

    if (!payment) {
      throw new NotFoundError(`Không tìm thấy đơn nạp tiền với ID: ${input.payment_id}`);
    }

    const signature = this.generateMockSignature(payment.gateway_ref, payment.amount, input.outcome);

    const webhookPayload: MockWebhookInput = {
      gateway_ref: payment.gateway_ref,
      payment_id: payment.payment_id,
      amount: payment.amount,
      status: input.outcome,
      signature,
    };

    return await this.processWebhook(webhookPayload, signature);
  }

  /**
   * Tra cứu chi tiết một giao dịch Payment.
   */
  async getPaymentById(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { payment_id: paymentId },
      include: { transaction: { include: { entries: true } } },
    });

    if (!payment) {
      throw new NotFoundError('Không tìm thấy thông tin đơn thanh toán.');
    }

    return payment;
  }
}

export const paymentService = new PaymentService();
