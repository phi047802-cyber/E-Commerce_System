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
  // G10: nhắc đánh giá sau khi đơn hoàn tất bao lâu (phút); chỉ nhắc đơn hoàn tất trong 7 ngày gần nhất
  REVIEW_REMINDER_DELAY_MINUTES: z.coerce.number().int().min(0).default(60),
  MAX_COMPANION_HOURS_PER_DAY: z.coerce.number().default(10),
  MIN_COMPANION_HOURLY_RATE: z.coerce.number().default(30000),
  MAX_COMPANION_HOURLY_RATE: z.coerce.number().default(1000000),
  SIMULATOR_SECRET: z.string().default('mock_vnpay_momo_secret_key_demo_2026'),
  PAYMENT_PROVIDER: z.enum(['simulator', 'sepay']).default('simulator'),
  SEPAY_WEBHOOK_API_KEY: z.string().default('sepay_demo_api_key_2026'),
  SEPAY_ACCOUNT_NUMBER: z.string().default('0123456789'),
  SEPAY_BANK_CODE: z.string().default('MBBank'),
  SEPAY_ACCOUNT_NAME: z.string().default('CONG TY INSTASQUAD'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  ENABLE_BACKGROUND_WORKER: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true;
    if (typeof val === 'boolean') return val;
    const str = String(val).trim().toLowerCase();
    if (['false', '0', 'no', 'off', 'disable', 'disabled'].includes(str)) return false;
    return true;
  }, z.boolean().default(true)),
  BACKGROUND_WORKER_INTERVAL_MS: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 5000;
    const num = Number(val);
    if (isNaN(num)) return 5000;
    return Math.max(1000, Math.floor(num));
  }, z.number().int().min(1000).default(5000)),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('InstaSquad <no-reply@instasquad.vn>'),
  EKYC_ENCRYPTION_KEY: z.string().optional(),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Pháp lý: bắt buộc chấp thuận điều khoản trước khi đặt lịch (TERMS_AND_CONTRACTS.md B.6)
  REQUIRE_TERMS_ACCEPTANCE: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true;
    return !['false', '0', 'no', 'off'].includes(String(val).trim().toLowerCase());
  }, z.boolean().default(true)),
  // Deep Link / App Links (NON_GAMER_GROWTH_STRATEGY.md §4) — placeholder đến khi phát hành (DEFERRED)
  ANDROID_PACKAGE_NAME: z.string().default('vn.instasquad.app'),
  ANDROID_SHA256_CERT_FINGERPRINTS: z.string().default('00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'),
  IOS_TEAM_ID: z.string().default('TEAMID0000'),
  IOS_BUNDLE_ID: z.string().default('vn.instasquad.app'),
  ICE_SERVERS: z.string().default(
    JSON.stringify([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ])
  ),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.EKYC_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EKYC_ENCRYPTION_KEY'],
        message: 'EKYC_ENCRYPTION_KEY là bắt buộc trong môi trường production và không được có giá trị mặc định cố định.',
      });
    } else if (Buffer.byteLength(data.EKYC_ENCRYPTION_KEY, 'utf-8') !== 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EKYC_ENCRYPTION_KEY'],
        message: `EKYC_ENCRYPTION_KEY phải có độ dài chính xác 32 byte trong production (hiện tại: ${Buffer.byteLength(data.EKYC_ENCRYPTION_KEY, 'utf-8')} byte).`,
      });
    }

    if (!data.DATA_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATA_ENCRYPTION_KEY'],
        message: 'DATA_ENCRYPTION_KEY là bắt buộc trong môi trường production (NFR-002) và không được có giá trị mặc định cố định.',
      });
    } else if (Buffer.byteLength(data.DATA_ENCRYPTION_KEY, 'utf-8') !== 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATA_ENCRYPTION_KEY'],
        message: `DATA_ENCRYPTION_KEY phải có độ dài chính xác 32 byte trong production (hiện tại: ${Buffer.byteLength(data.DATA_ENCRYPTION_KEY, 'utf-8')} byte).`,
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid or missing environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// Trong development/test, nếu thiếu thì dùng khóa mẫu 32 byte chuẩn riêng biệt (không trùng với eKYC)
const resolvedEkycKey = parsed.data.EKYC_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
const resolvedDataKey = parsed.data.DATA_ENCRYPTION_KEY || 'fedcba9876543210fedcba9876543210';

export const env = {
  ...parsed.data,
  EKYC_ENCRYPTION_KEY: resolvedEkycKey,
  DATA_ENCRYPTION_KEY: resolvedDataKey,
};
