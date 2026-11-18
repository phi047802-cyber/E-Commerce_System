import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(40, 'Tên hiển thị không được vượt quá 40 ký tự')
    .refine((val) => !/[\x00-\x1F\x7F]/.test(val), {
      message: 'Tên hiển thị không được chứa ký tự điều khiển',
    })
    .refine((val) => !/\b(admin|cs_agent|cs|support|quantrivien|hethong|system)\b/i.test(val), {
      message: 'Tên hiển thị không được chứa danh xưng quản trị hoặc hỗ trợ hệ thống',
    })
    .optional(),
  bio: z.string().trim().max(500, 'Tiểu sử không được vượt quá 500 ký tự').optional(),
  date_of_birth: z.string().datetime({ message: 'Ngày sinh không đúng định dạng ISO-8601' }).optional().nullable(),
  favorite_games: z.string().trim().max(200, 'Danh sách game yêu thích tối đa 200 ký tự').optional().nullable(),
  // Dành riêng cho Companion Profile
  hourly_rate: z.number().int().min(50000, 'Giá thuê tối thiểu 50.000 VND').max(1000000, 'Giá thuê tối đa 1.000.000 VND').optional(),
  availability: z.enum(['ONLINE', 'BUSY', 'OFFLINE']).optional(),
  game_account_id: z.string().trim().min(3).max(50).optional(),
  max_hours_per_day: z.number().int().min(1).max(16, 'Giới hạn tối đa 16 giờ/ngày').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  new_password: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .max(64, 'Mật khẩu mới không được vượt quá 64 ký tự')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Mật khẩu mới phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
