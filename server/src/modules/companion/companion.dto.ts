import { z } from 'zod';

export const updateProfileSchema = z.object({
  game_id: z.string().min(1, 'Vui lòng chọn tựa game dịch vụ').optional(),
  verified_tier_id: z.string().min(1, 'Vui lòng chọn bậc xếp hạng').optional(),
  hourly_rate: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(30000, 'Đơn giá tối thiểu là 30.000 VND/giờ')
    .max(1000000, 'Đơn giá tối đa là 1.000.000 VND/giờ')
    .optional(),
  availability: z.enum(['ONLINE', 'BUSY', 'OFFLINE']).optional(),
  game_account_id: z
    .string()
    .min(2, 'Tên nhân vật / mã in-game phải có tối thiểu 2 ký tự')
    .max(50, 'Mã in-game không quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_\-\. #]{2,50}$/, 'Mã in-game chỉ bao gồm chữ, số, dấu cách hoặc các ký tự _, -, ., #')
    .optional(),
  bio: z.string().max(500, 'Tiểu sử không được vượt quá 500 ký tự').optional(),
  audio_bio_url: z.string().url('Đường dẫn file giới thiệu không hợp lệ').nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const uploadVoiceIntroSchema = z.object({
  file_name: z.string().min(1, 'Tên tệp âm thanh là bắt buộc'),
  file_type: z.enum(['audio/webm', 'audio/mp3', 'audio/mpeg', 'AUDIO_WEBM', 'AUDIO_MP3'], {
    errorMap: () => ({ message: 'Định dạng âm thanh chỉ chấp nhận webm hoặc mp3' }),
  }),
  file_size_bytes: z.number().int().positive().max(2 * 1024 * 1024, 'Kích thước tệp âm thanh không được vượt quá 2MB'),
  file_content_base64: z.string().min(1, 'Nội dung tệp là bắt buộc'),
});

export type UploadVoiceIntroInput = z.infer<typeof uploadVoiceIntroSchema>;

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
