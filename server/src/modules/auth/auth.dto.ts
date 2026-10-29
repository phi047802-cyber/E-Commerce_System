import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
  display_name: z.string().min(2, 'Tên hiển thị phải có tối thiểu 2 ký tự').max(50),
  role: z.enum(['RENTER', 'COMPANION']).default('RENTER'),
  phone_number: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginInput = z.infer<typeof loginSchema>;
