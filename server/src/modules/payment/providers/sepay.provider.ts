import crypto from 'crypto';
import { prisma } from '../../../common/prisma.js';
import { env } from '../../../config/env.js';
import { IPaymentProvider, CreatePaymentParams, CreatePaymentResult } from '../payment-provider.interface.js';

export class SepayPaymentProvider implements IPaymentProvider {
  readonly name = 'sepay' as const;

  /**
   * Sinh mã chuyển khoản định dạng INSQ + 8 ký tự chữ hoa/số (không ký tự đặc biệt).
   */
  generateTransferCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = 'INSQ';
    for (let i = 0; i < 8; i++) {
      const idx = crypto.randomInt(0, chars.length);
      code += chars[idx];
    }
    return code;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const transferCode = this.generateTransferCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút hiệu lực

    const bankCode = env.SEPAY_BANK_CODE;
    const accountNumber = env.SEPAY_ACCOUNT_NUMBER;
    const accountName = env.SEPAY_ACCOUNT_NAME;

    // Chuỗi sinh mã VietQR chuẩn VietQR.io (Compact2 kèm số tiền và nội dung điền sẵn)
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${params.amount}&addInfo=${transferCode}&accountName=${encodeURIComponent(accountName)}`;

    const payment = await prisma.payment.create({
      data: {
        wallet_id: params.walletId,
        provider: 'SEPAY',
        gateway_ref: transferCode,
        amount: params.amount,
        status: 'PENDING',
        expires_at: expiresAt,
        qr_url: qrUrl,
      },
    });

    return {
      payment_id: payment.payment_id,
      gateway_ref: payment.gateway_ref,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      qr_url: qrUrl,
      transfer_content: transferCode,
      account_number: accountNumber,
      bank_code: bankCode,
      account_name: accountName,
      expires_at: expiresAt,
      created_at: payment.created_at,
    };
  }
}
