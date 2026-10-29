import { z } from 'zod';

export const updateProfileSchema = z.object({
  hourly_rate: z.number().int().min(10000, 'Đơn giá tối thiểu là 10.000 VND/giờ').max(10000000, 'Đơn giá tối đa là 10.000.000 VND/giờ').optional(),
  availability: z.enum(['ONLINE', 'BUSY', 'OFFLINE']).optional(),
  game_account_id: z.string().min(2, 'Tên nhân vật trong game phải có tối thiểu 2 ký tự').max(100).optional(),
  audio_bio_url: z.string().url('Đường dẫn file giới thiệu không hợp lệ').nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const createSlotSchema = z.object({
  start_time: z.string().datetime({ message: 'Thời gian bắt đầu phải có định dạng ISO 8601 hợp lệ' }),
  end_time: z.string().datetime({ message: 'Thời gian kết thúc phải có định dạng ISO 8601 hợp lệ' }),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  {
    message: 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu',
    path: ['end_time'],
  }
);

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
