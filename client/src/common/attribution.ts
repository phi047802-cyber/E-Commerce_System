/**
 * Kênh nguồn first-touch (G8/G9): lấy utm_* từ URL của lượt truy cập ĐẦU TIÊN có UTM và giữ lại (localStorage)
 * để gửi kèm khi đăng ký. Server làm sạch lại toàn bộ giá trị (common/utm.ts) — client chỉ chuyển tiếp.
 */
export interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const KEY = 'instasquad_first_touch_utm';

export function utmFromUrl(search: string = typeof window !== 'undefined' ? window.location.search : ''): Utm {
  const q = new URLSearchParams(search);
  const pick = (k: string) => {
    const v = q.get(k);
    return v && v.trim() ? v.trim().slice(0, 200) : undefined;
  };
  const utm: Utm = { utm_source: pick('utm_source'), utm_medium: pick('utm_medium'), utm_campaign: pick('utm_campaign') };
  return utm.utm_source || utm.utm_medium || utm.utm_campaign ? utm : {};
}

/** Lưu UTM của URL hiện tại nếu chưa có first-touch; trả về first-touch đang giữ. */
export function rememberFirstTouch(): Utm {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved) as Utm;
    const current = utmFromUrl();
    if (current.utm_source || current.utm_medium || current.utm_campaign) {
      localStorage.setItem(KEY, JSON.stringify(current));
    }
    return current;
  } catch {
    return utmFromUrl();
  }
}

export function getFirstTouch(): Utm {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as Utm) : {};
  } catch {
    return {};
  }
}
