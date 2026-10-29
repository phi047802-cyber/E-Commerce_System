import { z } from 'zod';

export const createReviewSchema = z.object({
  booking_id: z.string().uuid({ message: 'Mã đơn đặt lịch booking_id không đúng định dạng UUID.' }),
  rating: z
    .number()
    .int({ message: 'Điểm đánh giá phải là số nguyên (1 đến 5 sao).' })
    .min(1, 'Đánh giá tối thiểu 1 sao.')
    .max(5, 'Đánh giá tối đa 5 sao.'),
  comment: z.string().trim().max(1000, 'Nội dung nhận xét tối đa 1000 ký tự.').optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
