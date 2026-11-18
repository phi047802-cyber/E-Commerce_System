import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Nội dung tin nhắn không được để trống').max(1000, 'Tin nhắn tối đa 1000 ký tự'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const reportIssueSchema = z.object({
  reason_category: z.enum(['NO_SHOW', 'HARASSMENT', 'SKILL_MISMATCH', 'TECHNICAL_ISSUE'], {
    errorMap: () => ({ message: 'Lý do khiếu nại không hợp lệ. Phải là một trong: NO_SHOW, HARASSMENT, SKILL_MISMATCH, TECHNICAL_ISSUE' }),
  }),
  description: z.string().trim().min(10, 'Mô tả sự cố phải có tối thiểu 10 ký tự').max(1000, 'Mô tả tối đa 1000 ký tự'),
});

export type ReportIssueInput = z.infer<typeof reportIssueSchema>;

export const autoAcceptSchema = z.object({
  simulated_now: z.string().optional(),
}).passthrough();

export type AutoAcceptInput = z.infer<typeof autoAcceptSchema>;
