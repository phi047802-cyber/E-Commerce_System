import crypto from 'crypto';
import { prisma } from '../../../common/prisma.js';
import { IPaymentProvider, CreatePaymentParams, CreatePaymentResult } from '../payment-provider.interface.js';

export class SimulatorPaymentProvider implements IPaymentProvider {
  readonly name = 'simulator' as const;

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const gatewayRef = `MOCK-VNPAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Hạn 15 phút

    const payment = await prisma.payment.create({
      data: {
        wallet_id: params.walletId,
        provider: params.provider || 'MOCK_VNPAY',
        gateway_ref: gatewayRef,
        amount: params.amount,
        status: 'PENDING',
        expires_at: expiresAt,
      },
    });

    return {
      payment_id: payment.payment_id,
      gateway_ref: payment.gateway_ref,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      transfer_content: payment.gateway_ref,
      expires_at: expiresAt,
      created_at: payment.created_at,
    };
  }
}
