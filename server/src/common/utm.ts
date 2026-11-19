/**
 * Làm sạch tham số UTM (G8/G9): chữ thường, chỉ giữ [a-z0-9_.-], cắt độ dài. Giá trị rỗng/không hợp lệ → undefined.
 * Dùng chung cho ghi nhận lượt truy cập (`site_visits`) và kênh nguồn lúc đăng ký (`users.signup_utm_*`).
 */
export function extractUtm(src: Record<string, unknown> | undefined): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_path?: string;
} {
  const clean = (v: unknown, max = 64) =>
    typeof v === 'string' && v.trim() !== ''
      ? v.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, max) || undefined
      : undefined;
  const landing = typeof src?.landing_path === 'string' && src.landing_path.startsWith('/') ? src.landing_path.slice(0, 200) : undefined;
  return {
    utm_source: clean(src?.utm_source),
    utm_medium: clean(src?.utm_medium),
    utm_campaign: clean(src?.utm_campaign, 100),
    landing_path: landing,
  };
}

/** Kênh mạng xã hội tính cho KPI G8 (≥ 40% phiên đến từ social). */
export const SOCIAL_SOURCES = ['tiktok', 'facebook', 'instagram', 'threads'] as const;

/** Nhãn kênh khi không có utm_source. */
export const DIRECT_SOURCE = 'direct';
