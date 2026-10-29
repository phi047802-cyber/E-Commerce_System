import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SLOT_HOLD_TTL_MINUTES: z.coerce.number().default(10),
  FULFILLMENT_ACCEPTANCE_TIMEOUT_MINUTES: z.coerce.number().default(15),
  BOOKING_RESPONSE_TIMEOUT_SECONDS: z.coerce.number().default(180),
  MAX_COMPANION_HOURS_PER_DAY: z.coerce.number().default(10),
  SIMULATOR_SECRET: z.string().default('mock_vnpay_momo_secret_key_demo_2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid or missing environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
