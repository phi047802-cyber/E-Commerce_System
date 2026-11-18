/**
 * INSTASQUAD CLIENT — Mẫu câu tiếng Việt hiển thị cho người dùng (Đợt E2)
 */

export const DISPUTE_REASON_LABELS: Record<string, string> = {
  NO_SHOW: 'Companion không vào phòng chơi đúng giờ',
  MISCONDUCT: 'Thái độ không phù hợp',
  HARASSMENT: 'Quấy rối hoặc ngôn từ không phù hợp',
  SERVICE_NOT_AS_PROMISED: 'Dịch vụ không đúng cam kết',
  SKILL_MISMATCH: 'Kỹ năng không đúng cam kết',
  TECHNICAL_ISSUE: 'Sự cố kỹ thuật / kết nối',
  INTERRUPTED: 'Phiên bị gián đoạn',
  OTHER: 'Lý do khác',
};

export function getDisputeReasonLabel(category?: string | null): string {
  if (!category) return 'Lý do khác';
  return DISPUTE_REASON_LABELS[category] || 'Lý do khác';
}

export function formatVnd(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0đ';
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export function formatDateTime(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function formatShortId(prefix: string, fullId?: string | null): string {
  if (!fullId) return prefix;
  const clean = fullId.replace(/^(bk-|dsp-|prof-|usr-|u-)/i, '').replace(/-/g, '');
  const tail = clean.slice(-4).toUpperCase();
  return `${prefix}-${tail}`;
}

export function sanitizeUIMessage(raw: string): string {
  if (!raw) return '';

  let sanitized = raw;

  sanitized = sanitized.replace(/\[NHÓM ĐÃ CHỐT[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Nhóm đã chốt[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\(D\d+\)/gi, '');
  sanitized = sanitized.replace(/\(BR-\d+\)/gi, '');
  sanitized = sanitized.replace(/REF-[A-Z]+-\d+/gi, '');
  sanitized = sanitized.replace(/–\s*Charter chưa quy định/gi, '');
  sanitized = sanitized.replace(/Charter chưa quy định/gi, '');

  sanitized = sanitized.replace(/\bNO_SHOW\b/g, 'không vào phòng chơi đúng giờ');
  sanitized = sanitized.replace(/\bHARASSMENT\b/g, 'quấy rối / ngôn từ không phù hợp');
  sanitized = sanitized.replace(/\bSKILL_MISMATCH\b/g, 'kỹ năng không đúng cam kết');
  sanitized = sanitized.replace(/\bSERVICE_NOT_AS_PROMISED\b/g, 'dịch vụ không đúng cam kết');
  sanitized = sanitized.replace(/\bTECHNICAL_ISSUE\b/g, 'sự cố kỹ thuật / kết nối');
  sanitized = sanitized.replace(/\bMISCONDUCT\b/g, 'thái độ không phù hợp');
  sanitized = sanitized.replace(/\bEVIDENCE_PENDING\b/g, 'chờ bổ sung bằng chứng');
  sanitized = sanitized.replace(/\bUNDER_REVIEW\b/g, 'đang thẩm định phán quyết');
  sanitized = sanitized.replace(/\bPENALTY_DEBT\b/g, 'nợ vi phạm');

  sanitized = sanitized.replace(/#([a-f0-9]{8})[a-f0-9-]*/gi, (_match, p1) => {
    return `#${p1.slice(-4).toUpperCase()}`;
  });

  sanitized = sanitized.replace(/\s+/g, ' ').replace(/\s*:\s*:/g, ':').trim();

  return sanitized;
}
