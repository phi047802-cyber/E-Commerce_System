import { z } from 'zod';

export const createTopupSchema = z.object({
  amount: z
    .number({ required_error: 'Số tiền nạp là bắt buộc' })
    .int('Số tiền nạp phải là số nguyên VND')
    .min(10000, 'Số tiền nạp tối thiểu là 10.000 VND')
    .max(100000000, 'Số tiền nạp tối đa một lần là 100.000.000 VND'),
  provider: z.enum(['MOCK_VNPAY', 'MOCK_MOMO']).default('MOCK_VNPAY'),
});

export type CreateTopupInput = z.infer<typeof createTopupSchema>;

export const mockWebhookSchema = z.object({
  gateway_ref: z.string().min(1, 'gateway_ref là bắt buộc'),
  payment_id: z.string().min(1, 'payment_id là bắt buộc'),
  amount: z.number().int('amount phải là số nguyên VND').positive('amount phải > 0'),
  status: z.enum(['SUCCESS', 'FAILED', 'PENDING']),
  signature: z.string().optional(),
});

export type MockWebhookInput = z.infer<typeof mockWebhookSchema>;

export const simulatePaymentSchema = z.object({
  payment_id: z.string().min(1, 'payment_id là bắt buộc'),
  outcome: z.enum(['SUCCESS', 'FAILED', 'PENDING']),
});

export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
