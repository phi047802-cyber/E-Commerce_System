import { z } from 'zod';

export const submitEvidenceSchema = z.object({
  file_type: z.enum(['IMAGE_PNG', 'IMAGE_JPEG', 'IMAGE_WEBP', 'LOG_TEXT'], {
    errorMap: () => ({
      message: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận IMAGE_PNG, IMAGE_JPEG, IMAGE_WEBP, LOG_TEXT. Không hỗ trợ file âm thanh/video thật.',
    }),
  }),
  file_url: z.string().optional(),
  file_content_base64: z.string().optional(),
  file_name: z.string().optional(),
  file_size_bytes: z.number().max(2 * 1024 * 1024, 'Kích thước tệp không được vượt quá 2MB').optional(),
  description: z.string().max(1000, 'Mô tả chứng cứ tối đa 1000 ký tự').optional(),
});

export type SubmitEvidenceInput = z.infer<typeof submitEvidenceSchema>;

export const resolveDisputeSchema = z.object({
  fault_percent: z.number().int({ message: 'Tỷ lệ lỗi phải là số nguyên' }).min(0, 'Tỷ lệ lỗi tối thiểu là 0%').max(100, 'Tỷ lệ lỗi tối đa là 100%'),
  decision_reason: z.string().trim().min(10, 'Lý do phán quyết là bắt buộc và phải có tối thiểu 10 ký tự').max(2000, 'Lý do phán quyết tối đa 2000 ký tự'),
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

export const requestEvidenceSchema = z.object({
  notes: z.string().trim().min(5, 'Ghi chú yêu cầu bổ sung chứng cứ tối thiểu 5 ký tự').max(1000),
  deadline_hours: z.number().int().positive().default(24),
});

export type RequestEvidenceInput = z.infer<typeof requestEvidenceSchema>;
