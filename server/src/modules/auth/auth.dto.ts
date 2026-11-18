import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
  display_name: z.string().min(2, 'Tên hiển thị phải có tối thiểu 2 ký tự').max(50),
  role: z.enum(['RENTER', 'COMPANION']).default('RENTER'),
  phone_number: z.string().optional(),
  is_over_18: z.boolean().optional(),
  date_of_birth: z.string().optional(),
  // Chấp thuận Điều khoản tại bước đăng ký (TERMS_AND_CONTRACTS.md B.6). Không bắt buộc ở đây;
  // nếu bỏ qua, người dùng sẽ được yêu cầu chấp thuận trước giao dịch đầu tiên.
  accept_terms_version: z.string().max(32).optional(),
  channel: z.enum(['WEB', 'MOBILE']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  otp: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
  new_password: z.string().min(6, 'Mật khẩu mới phải có tối thiểu 6 ký tự'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const sendVerifyOtpSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
});
export type SendVerifyOtpInput = z.infer<typeof sendVerifyOtpSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  otp: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
