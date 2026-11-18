import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { NotFoundError, UnauthorizedError, BusinessError, ForbiddenError } from '../../common/errors.js';
import { ledgerService } from '../ledger/ledger.service.js';
import { SYSTEM_ACCOUNTS } from '../ledger/ledger.types.js';
import { CreateTopupInput, MockWebhookInput, SimulatePaymentInput, SepayWebhookInput } from './payment.dto.js';
import { logger } from '../../common/logger.js';
import { IPaymentProvider, ConfirmPaymentInflowParams, ConfirmPaymentInflowResult } from './payment-provider.interface.js';
import { SimulatorPaymentProvider } from './providers/simulator.provider.js';
import { SepayPaymentProvider } from './providers/sepay.provider.js';
import { wsNotificationService } from '../../common/ws-notification.service.js';

export class PaymentService {
  private simulatorProvider = new SimulatorPaymentProvider();
  private sepayProvider = new SepayPaymentProvider();
  private activeLocks = new Set<string>();

  /**
   * Lấy Provider tương ứng theo cấu hình hệ thống (simulator hoặc sepay).
   */
  getProvider(requestedProvider?: string): IPaymentProvider {
    if (requestedProvider === 'SEPAY') {
      return this.sepayProvider;
    }
    if (requestedProvider === 'MOCK_VNPAY' || requestedProvider === 'MOCK_MOMO' || requestedProvider === 'SIMULATOR') {
      return this.simulatorProvider;
    }
    return env.PAYMENT_PROVIDER === 'sepay' ? this.sepayProvider : this.simulatorProvider;
  }

  /**
   * Tạo chuỗi chữ ký HMAC-SHA256 chuẩn cho cổng thanh toán mô phỏng.
   */
  generateMockSignature(gatewayRef: string, amount: number, status: string): string {
    const rawData = `${gatewayRef}|${amount}|${status}`;
    return crypto.createHmac('sha256', env.SIMULATOR_SECRET).update(rawData).digest('hex');
  }

  /**
   * Xác thực API Key của SePay Webhook bằng so sánh thời gian hằng số (Timing-Safe Comparison).
   */
  verifySepayApiKey(authHeader?: string): boolean {
    if (!authHeader) return false;
    let apiKey = authHeader.trim();
    if (apiKey.startsWith('Apikey ') || apiKey.startsWith('Bearer ')) {
      apiKey = apiKey.substring(7).trim();
    }
    const expected = env.SEPAY_WEBHOOK_API_KEY.trim();
    if (Buffer.byteLength(apiKey) !== Buffer.byteLength(expected)) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expected));
  }

  /**
   * Che số tài khoản ngân hàng trong nhật ký (chỉ giữ 4 số cuối).
   */
  maskAccountNumber(acc?: string): string {
    if (!acc) return '****';
    const clean = acc.trim();
    if (clean.length <= 4) return '****';
    return '*'.repeat(clean.length - 4) + clean.slice(-4);
  }

  /**
   * Khởi tạo giao dịch nạp tiền PENDING thông qua Provider đã cấu hình.
   */
  async createTopup(userId: string, input: CreateTopupInput) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { is_email_verified: true },
    });
    if (user && !user.is_email_verified) {
      throw new ForbiddenError(
        'Tài khoản chưa xác minh email (UC01). Vui lòng xác minh email để nạp tiền.',
        'EMAIL_NOT_VERIFIED'
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError('Không tìm thấy ví người dùng để nạp tiền.');
    }

    const provider = this.getProvider(input.provider);
    const result = await provider.createPayment({
      userId,
      walletId: wallet.wallet_id,
      amount: input.amount,
      provider: input.provider,
    });

    logger.info(
      `Created Topup Payment request: ${result.payment_id} (${input.amount.toLocaleString('vi-VN')} VND) via provider [${provider.name}]`
    );

    return result;
  }

  /**
   * HÀM XÁC NHẬN TIỀN VÀO DUY NHẤT (Core Double-Entry Settlement Function).
   * Mọi Provider (Simulator lẫn SePay) và Webhook đều bắt buộc đi qua cùng hàm này.
   * Tuyệt đối không có đường tắt bypass sổ cái.
   */
  async confirmPaymentInflow(params: ConfirmPaymentInflowParams): Promise<ConfirmPaymentInflowResult> {
    // 0. Khóa chống chạy đua đồng thời (Concurrency Lock) theo external_transaction_id
    const lockKey = `LOCK-${params.external_transaction_id}`;
    if (this.activeLocks.has(lockKey)) {
      logger.warn(`Concurrent webhook detected for transaction ${params.external_transaction_id}, waiting for lock...`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    this.activeLocks.add(lockKey);

    try {
      // 1. Chỉ chấp nhận tiền vào (transfer_type === 'in'). Bỏ qua tiền ra.
      if (params.transfer_type === 'out') {
        logger.info(`Bỏ qua giao dịch tiền ra (transfer_type=out), SePay ID: ${params.external_transaction_id}`);
        return {
          success: true,
          status: 'IGNORED',
          is_idempotent_replay: false,
          message: 'Bỏ qua giao dịch tiền ra.',
        };
      }

      // 2. Tìm Payment theo mã nội dung chuyển khoản hoặc external_transaction_id
      const rawContent = (params.transfer_content || '').trim();
      const normalizedContent = rawContent.replace(/[\s-]/g, '').toUpperCase();

      let payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { gateway_ref: normalizedContent },
            { gateway_ref: rawContent },
            ...(params.external_transaction_id ? [{ sepay_id: params.external_transaction_id }] : []),
          ],
        },
      });

      // Nếu không tìm thấy bằng so sánh chính xác, trích xuất mã dạng INSQ + 8 ký tự
      if (!payment) {
        const match = normalizedContent.match(/INSQ[A-Z0-9]{8}/);
        if (match) {
          payment = await prisma.payment.findUnique({
            where: { gateway_ref: match[0] },
          });
        }
      }

      // 3. Nếu không tìm thấy Payment: Lưu UNMATCHED cho Auditor
      if (!payment) {
        logger.warn(
          `Không tìm thấy đơn nạp tiền cho nội dung: "${rawContent}" (Normalized: "${normalizedContent}"). Lưu kiểm toán UNMATCHED.`
        );

        const existingUnmatched = await prisma.ledgerAuditAlert.findFirst({
          where: {
            error_code: 'UNMATCHED_PAYMENT',
            is_resolved: false,
            context_json: { contains: params.external_transaction_id },
          },
        });

        if (existingUnmatched) {
          await prisma.ledgerAuditAlert.update({
            where: { alert_id: existingUnmatched.alert_id },
            data: { repeat_count: { increment: 1 } },
          });

          return {
            success: true,
            status: 'UNMATCHED',
            is_idempotent_replay: true,
            alert_id: existingUnmatched.alert_id,
            message: 'Không tìm thấy đơn nạp tiền khớp nội dung. Đã lưu UNMATCHED cho kiểm toán viên.',
          };
        }

        const unmatchedAlert = await prisma.ledgerAuditAlert.create({
          data: {
            error_code: 'UNMATCHED_PAYMENT',
            error_message: `Giao dịch tiền vào không khớp bất kỳ đơn nạp tiền nào trong hệ thống. Nội dung: "${rawContent}", số tiền: ${params.actual_amount.toLocaleString('vi-VN')} đ.`,
            context_json: JSON.stringify({
              action: 'PROCESS_WEBHOOK_UNMATCHED',
              external_transaction_id: params.external_transaction_id,
              transfer_content: rawContent,
              normalized_content: normalizedContent,
              actual_amount: params.actual_amount,
              provider: params.provider,
              gateway_bank: params.gateway_bank,
            }),
            repeat_count: 1,
          },
        });

        return {
          success: true,
          status: 'UNMATCHED',
          is_idempotent_replay: false,
          alert_id: unmatchedAlert.alert_id,
          message: 'Không tìm thấy đơn nạp tiền khớp nội dung. Đã lưu UNMATCHED cho kiểm toán viên.',
        };
      }

      // 4. Kiểm tra nếu Payment đã SUCCESS hoặc LATE từ trước đó (Trùng lặp / Idempotent Replay)
      if (payment.status === 'SUCCESS' || payment.status === 'LATE') {
        logger.info(`Payment ${payment.payment_id} already settled (${payment.status}). Recording duplicate replay.`);

        const existingAlert = await prisma.ledgerAuditAlert.findFirst({
          where: {
            error_code: 'WEBHOOK_DUPLICATE_REPLAY',
            is_resolved: false,
            OR: [
              { context_json: { contains: payment.gateway_ref } },
              ...(params.external_transaction_id ? [{ context_json: { contains: params.external_transaction_id } }] : []),
            ],
          },
        });

        if (existingAlert) {
          await prisma.ledgerAuditAlert.update({
            where: { alert_id: existingAlert.alert_id },
            data: { repeat_count: { increment: 1 } },
          });
        } else {
          await prisma.ledgerAuditAlert.create({
            data: {
              error_code: 'WEBHOOK_DUPLICATE_REPLAY',
              error_message: `Giao dịch đã ghi sổ trước đó: Payment ${payment.gateway_ref}, External ID: ${params.external_transaction_id}.`,
              context_json: JSON.stringify({
                action: 'PROCESS_WEBHOOK_DUPLICATE',
                payment_id: payment.payment_id,
                gateway_ref: payment.gateway_ref,
                external_transaction_id: params.external_transaction_id,
                status: payment.status,
              }),
              repeat_count: 1,
            },
          });
        }

        const wallet = await prisma.wallet.findUnique({ where: { wallet_id: payment.wallet_id } });
        return {
          success: true,
          payment_id: payment.payment_id,
          status: payment.status,
          is_idempotent_replay: true,
          wallet_balance_after: wallet?.available_balance ?? 0,
          message: 'Giao dịch đã được ghi sổ thành công trước đó (Idempotent Replay). Không ghi nhận trùng.',
        };
      }

      // 6. Kiểm tra số tiền: Nếu THIẾU -> không cộng tiền ví khả dụng, tạo LedgerAuditAlert
      if (params.actual_amount < payment.amount) {
        logger.warn(
          `Số tiền nhận được (${params.actual_amount.toLocaleString('vi-VN')} đ) thiếu so với yêu cầu (${payment.amount.toLocaleString('vi-VN')} đ) cho Payment ${payment.gateway_ref}.`
        );

        const underpaidAlert = await prisma.ledgerAuditAlert.create({
          data: {
            error_code: 'WEBHOOK_UNDERPAID_AMOUNT',
            error_message: `Số tiền chuyển khoản thiếu (${params.actual_amount.toLocaleString('vi-VN')} đ < ${payment.amount.toLocaleString('vi-VN')} đ) cho đơn ${payment.gateway_ref}.`,
            context_json: JSON.stringify({
              action: 'PROCESS_WEBHOOK_UNDERPAID',
              payment_id: payment.payment_id,
              gateway_ref: payment.gateway_ref,
              expected_amount: payment.amount,
              received_amount: params.actual_amount,
              external_transaction_id: params.external_transaction_id,
            }),
            repeat_count: 1,
          },
        });

        await prisma.payment.update({
          where: { payment_id: payment.payment_id },
          data: {
            status: 'UNDERPAID',
            sepay_id: params.external_transaction_id,
          },
        });

        return {
          success: true,
          payment_id: payment.payment_id,
          status: 'UNDERPAID',
          is_idempotent_replay: false,
          alert_id: underpaidAlert.alert_id,
          message: 'Số tiền thanh toán bị thiếu, không thể giải ngân vào ví khả dụng.',
        };
      }

      // 7. Kiểm tra trạng thái quá hạn (LATE): Nếu hết hạn 15 phút, vẫn cộng tiền ví và đánh dấu LATE
      const now = new Date();
      const isExpired = payment.status === 'EXPIRED' || (payment.expires_at && now > payment.expires_at);
      let isLate = false;

      if (isExpired) {
        isLate = true;
        logger.warn(`Đơn nạp tiền ${payment.gateway_ref} đến muộn sau khi hết hạn 15 phút. Ghi nhận LATE và cảnh báo Auditor.`);

        await prisma.ledgerAuditAlert.create({
          data: {
            error_code: 'WEBHOOK_LATE_PAYMENT',
            error_message: `Đơn thanh toán ${payment.gateway_ref} nhận tiền muộn sau khi hết hạn hiệu lực. Đã tự động hạch toán vào ví khả dụng khách hàng.`,
            context_json: JSON.stringify({
              action: 'PROCESS_WEBHOOK_LATE',
              payment_id: payment.payment_id,
              gateway_ref: payment.gateway_ref,
              external_transaction_id: params.external_transaction_id,
              amount: params.actual_amount,
            }),
            repeat_count: 1,
          },
        });
      }

      // 8. ĐỦ hoặc THỪA: Cộng đúng số thực nhận trong một DB Transaction với bút toán Sổ cái cân bằng
      const creditAmount = params.actual_amount; // Nếu thừa, cộng đúng số thực nhận
      const idempotencyKey = `TOPUP-${payment.gateway_ref}`;

      const postResult = await ledgerService.postTransaction({
        txn_type: 'TOPUP',
        idempotency_key: idempotencyKey,
        entries: [
          // Dòng 1: CREDIT ví khả dụng Renter (+actual_amount)
          {
            wallet_id: payment.wallet_id,
            direction: 'CREDIT',
            balance_type: 'AVAILABLE',
            amount: creditAmount,
          },
          // Dòng 2: DEBIT tài khoản trung gian hệ thống (-actual_amount)
          {
            wallet_id: SYSTEM_ACCOUNTS.CLEARING_WALLET_ID,
            direction: 'DEBIT',
            balance_type: 'AVAILABLE',
            amount: creditAmount,
          },
        ],
      });

      // 9. Cập nhật bản ghi Payment sang trạng thái SUCCESS hoặc LATE
      const finalStatus = isLate ? 'LATE' : 'SUCCESS';
      const updatedPayment = await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: finalStatus,
          amount: creditAmount,
          sepay_id: params.external_transaction_id,
          txn_id: postResult.transaction.txn_id,
          processed_at: new Date(),
        },
      });

      const updatedWallet = await prisma.wallet.findUnique({
        where: { wallet_id: payment.wallet_id },
      });

      logger.info(
        `Topup ${finalStatus}: +${creditAmount.toLocaleString('vi-VN')} VND to wallet ${payment.wallet_id} via provider [${params.provider}]`
      );

      // 10. REALTIME: Phát sự kiện WebSocket tới đúng người dùng sở hữu ví
      if (updatedWallet?.user_id) {
        wsNotificationService.notifyUser(updatedWallet.user_id, {
          type: 'TOPUP_SUCCESS',
          payment_id: updatedPayment.payment_id,
          gateway_ref: updatedPayment.gateway_ref,
          amount: creditAmount,
          status: finalStatus,
          available_balance: updatedWallet.available_balance,
          is_late: isLate,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        payment_id: updatedPayment.payment_id,
        status: finalStatus,
        is_idempotent_replay: false,
        wallet_balance_after: updatedWallet?.available_balance ?? 0,
        message: isLate
          ? 'Nạp tiền muộn thành công. Số tiền đã được cộng vào ví khả dụng và báo cáo kiểm toán viên.'
          : 'Nạp tiền thành công và đã hạch toán Sổ cái kép cân bằng.',
      };
    } finally {
      this.activeLocks.delete(lockKey);
    }
  }

  /**
   * Xử lý Webhook callback từ Payment Simulator (Mock Gateway).
   * Đi qua cùng hàm `confirmPaymentInflow` duy nhất.
   */
  async processWebhook(input: MockWebhookInput, headerSignature?: string) {
    const providedSignature = input.signature || headerSignature;

    if (!providedSignature) {
      throw new UnauthorizedError('Chữ ký xác thực Webhook (signature hoặc header X-Mock-Signature) là bắt buộc.');
    }

    // 1. Xác thực chữ ký HMAC của Simulator
    const expectedSignature = this.generateMockSignature(input.gateway_ref, input.amount, input.status);
    if (providedSignature !== expectedSignature) {
      throw new UnauthorizedError('Chữ ký Webhook giả lập (HMAC SHA-256) không hợp lệ hoặc đã bị thay đổi.');
    }

    // Nếu trạng thái FAILED: Đánh dấu Payment thất bại
    if (input.status === 'FAILED') {
      const payment = await prisma.payment.findUnique({
        where: { gateway_ref: input.gateway_ref },
      });

      if (!payment) {
        throw new NotFoundError(`Không tìm thấy giao dịch thanh toán với gateway_ref: ${input.gateway_ref}`);
      }

      const updated = await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: 'FAILED',
          processed_at: new Date(),
        },
      });

      return {
        payment_id: updated.payment_id,
        status: 'FAILED',
        is_idempotent_replay: false,
        message: 'Thanh toán thất bại, không cộng tiền ví.',
      };
    }

    if (input.status === 'PENDING') {
      return {
        payment_id: input.payment_id,
        status: 'PENDING',
        is_idempotent_replay: false,
        message: 'Giao dịch thanh toán đang chờ xử lý.',
      };
    }

    // Kiểm tra Payment tồn tại và khớp số tiền đối với mock-webhook
    const payment = await prisma.payment.findUnique({
      where: { gateway_ref: input.gateway_ref },
    });

    if (!payment) {
      throw new NotFoundError(`Không tìm thấy giao dịch thanh toán với gateway_ref: ${input.gateway_ref}`);
    }

    if (payment.amount !== input.amount) {
      logger.warn(
        `Mock Webhook amount mismatch for ${input.gateway_ref}: expected ${payment.amount}, received ${input.amount}`
      );

      await prisma.ledgerAuditAlert.create({
        data: {
          error_code: 'WEBHOOK_AMOUNT_MISMATCH',
          error_message: `Số tiền trong Webhook (${input.amount.toLocaleString('vi-VN')} đ) không khớp với số tiền khởi tạo (${payment.amount.toLocaleString('vi-VN')} đ) cho ${input.gateway_ref}.`,
          context_json: JSON.stringify({
            action: 'PROCESS_MOCK_WEBHOOK_MISMATCH',
            gateway_ref: input.gateway_ref,
            expected_amount: payment.amount,
            received_amount: input.amount,
          }),
          repeat_count: 1,
        },
      });

      throw new BusinessError(
        'AMOUNT_MISMATCH',
        `Số tiền trong Webhook (${input.amount.toLocaleString('vi-VN')} đ) không khớp với số tiền khởi tạo (${payment.amount.toLocaleString('vi-VN')} đ).`
      );
    }

    // Trạng thái SUCCESS: Đi qua đúng hàm xử lý xác nhận tiền vào chung
    return await this.confirmPaymentInflow({
      transfer_content: input.gateway_ref,
      actual_amount: input.amount,
      external_transaction_id: input.gateway_ref,
      provider: 'SIMULATOR',
      transfer_type: 'in',
    });
  }

  /**
   * Xử lý Webhook từ Cổng SePay (POST /api/webhooks/sepay).
   * Đi qua cùng hàm `confirmPaymentInflow` duy nhất.
   */
  async processSepayWebhook(payload: SepayWebhookInput, authHeader?: string): Promise<{ success: boolean; data?: any }> {
    // 1. Xác thực API Key bằng so sánh thời gian hằng số
    const isValidKey = this.verifySepayApiKey(authHeader);
    if (!isValidKey) {
      logger.warn('SePay Webhook rejected: Invalid or missing API Key.');
      throw new UnauthorizedError('API Key xác thực SePay Webhook không hợp lệ.');
    }

    // 2. Che số tài khoản trong nhật ký, bảo đảm an toàn dữ liệu
    const maskedAcc = this.maskAccountNumber(payload.accountNumber);
    logger.info(
      `Received SePay Webhook: ID ${payload.id}, Bank: ${payload.gateway}, Acc: ${maskedAcc}, Amount: ${payload.transferAmount?.toLocaleString('vi-VN')} VND, Content: "${payload.content}"`
    );

    // 3. Thực hiện xác nhận tiền vào qua hàm cốt lõi duy nhất
    const result = await this.confirmPaymentInflow({
      transfer_content: payload.content || payload.code || '',
      actual_amount: payload.transferAmount,
      external_transaction_id: String(payload.id),
      provider: 'SEPAY',
      gateway_bank: payload.gateway,
      transfer_type: payload.transferType,
      transaction_date: payload.transactionDate,
    });

    // SePay yêu cầu bắt buộc phản hồi {"success": true}
    return {
      success: true,
      data: result,
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
   * Bộ đếm số giao dịch tiền vào đã xử lý trong tháng (Phục vụ Admin Dashboard & Giới hạn Gói Free SePay).
   */
  async getMonthlyInflowMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyInflowCount = await prisma.payment.count({
      where: {
        status: { in: ['SUCCESS', 'LATE'] },
        processed_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const quota = 50; // Giới hạn 50 giao dịch tiền vào / tháng của gói SePay Free
    const isWarning = monthlyInflowCount >= 40;

    return {
      monthly_inflow_count: monthlyInflowCount,
      monthly_inflow_quota: quota,
      is_quota_warning: isWarning,
      warning_message: isWarning
        ? `⚠️ CẢNH BÁO QUOTA: Đã sử dụng ${monthlyInflowCount}/${quota} giao dịch tiền vào miễn phí của SePay trong tháng!`
        : null,
    };
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
