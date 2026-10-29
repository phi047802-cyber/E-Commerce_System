import { z } from 'zod';

export const createBookingSchema = z.object({
  slot_id: z.string().min(1, 'slot_id là bắt buộc'),
  request_key: z.string().min(1, 'request_key không được để trống').max(100).optional(),
  duration_hours: z.number().int().positive().optional(),
});

export type CreateBookingInput = {
  slot_id: string;
  request_key: string;
  duration_hours?: number;
};

export const rejectBookingSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(255).optional(),
});

