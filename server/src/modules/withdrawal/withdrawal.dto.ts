import { z } from 'zod';

export const createWithdrawalSchema = z.object({
  amount: z
    .number()
    .int({ message: 'Số tiền rút phải là số nguyên VND.' })
    .positive({ message: 'Số tiền rút phải lớn hơn 0.' })
    .min(50000, 'Số tiền rút tối thiểu là 50.000 VND.'),
  bank_name: z.string().trim().min(2, 'Tên ngân hàng tối thiểu 2 ký tự.').max(50, 'Tên ngân hàng tối đa 50 ký tự.'),
  account_no: z.string().trim().min(4, 'Số tài khoản tối thiểu 4 ký tự.').max(30, 'Số tài khoản tối đa 30 ký tự.'),
  idempotency_key: z.string().optional(),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

export const rejectWithdrawalSchema = z.object({
  reason: z.string().trim().min(5, 'Lý do từ chối rút tiền tối thiểu 5 ký tự.').max(500, 'Lý do từ chối tối đa 500 ký tự.'),
});

export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>;
