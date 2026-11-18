/**
 * Danh mục điều khoản & vi phạm — nguồn: docs/TERMS_AND_CONTRACTS.md (Phần B, C). Nhãn DEMO_POLICY.
 * Đây là nguồn sự thật duy nhất cho phiên bản điều khoản và bảng chế tài; Web và Mobile đọc qua GET /api/legal/terms.
 */

export const CURRENT_TERMS_VERSION = 'TOS-2026.11';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ViolationRule {
  code: string;
  title: string;
  applies_to: 'BOTH' | 'COMPANION' | 'RENTER';
  severity: ViolationSeverity;
  /** Điểm TrustScore bị trừ (chỉ áp dụng cho Companion có hồ sơ). */
  trust_delta: number;
  /**
   * Số ngày khóa theo lần vi phạm thứ n (index 0 = lần 1). 0 = không khóa, -1 = khóa vĩnh viễn.
   * Lần vượt quá độ dài mảng dùng phần tử cuối.
   */
  suspension_ladder: number[];
  money_note: string;
}

export const VIOLATION_CATALOG: ViolationRule[] = [
  { code: 'V01', title: 'Chia sẻ liên lạc / lôi kéo giao dịch ngoài sàn', applies_to: 'BOTH', severity: 'MEDIUM', trust_delta: -10, suspension_ladder: [0, 7, -1], money_note: '—' },
  { code: 'V02', title: 'Vắng mặt (no-show) không báo', applies_to: 'COMPANION', severity: 'HIGH', trust_delta: -15, suspension_ladder: [0, 0, 7], money_note: 'Hoàn 100% Renter + phạt 20% qua phán quyết khiếu nại (lỗi ≥80%)' },
  { code: 'V03', title: 'Không phản hồi đơn trong 180 giây', applies_to: 'COMPANION', severity: 'LOW', trust_delta: -3, suspension_ladder: [0], money_note: 'Hoàn 100% Renter (tự động)' },
  { code: 'V04', title: 'Quấy rối, xúc phạm, nội dung khiêu dâm', applies_to: 'BOTH', severity: 'CRITICAL', trust_delta: -20, suspension_ladder: [30, -1], money_note: 'Hoàn 100% + phạt 20% nếu là Companion (qua khiếu nại)' },
  { code: 'V05', title: 'Gian lận thanh toán / chargeback giả / đa tài khoản', applies_to: 'BOTH', severity: 'CRITICAL', trust_delta: -30, suspension_ladder: [-1], money_note: 'Đóng băng, kiểm toán viên xử lý' },
  { code: 'V06', title: 'Khai sai rank / kỹ năng', applies_to: 'COMPANION', severity: 'MEDIUM', trust_delta: -5, suspension_ladder: [0], money_note: 'Theo tỷ lệ lỗi CS xác định' },
  { code: 'V07', title: 'Khiếu nại sai sự thật lặp lại', applies_to: 'RENTER', severity: 'MEDIUM', trust_delta: 0, suspension_ladder: [0, 0, 7], money_note: 'Giải ngân 88/12 cho Companion' },
  { code: 'V08', title: 'Dịch vụ SOCIAL biến tướng (hẹn hò/tình dục trá hình, gặp ngoài đời)', applies_to: 'BOTH', severity: 'CRITICAL', trust_delta: -30, suspension_ladder: [-1], money_note: 'Hoàn 100% Renter nếu Companion vi phạm' },
];

export function findViolationRule(code: string): ViolationRule | undefined {
  return VIOLATION_CATALOG.find((v) => v.code === code);
}

/** Số ngày khóa cho lần vi phạm thứ `occurrence` (bắt đầu từ 1). */
export function suspensionDaysFor(rule: ViolationRule, occurrence: number): number {
  const idx = Math.min(Math.max(occurrence, 1), rule.suspension_ladder.length) - 1;
  return rule.suspension_ladder[idx];
}

export const TERMS_SUMMARY = {
  version: CURRENT_TERMS_VERSION,
  effective_date: '2026-11-18',
  document: 'docs/TERMS_AND_CONTRACTS.md',
  label: 'DEMO_POLICY',
  parties: ['Nền tảng INSTASQUAD', 'Renter', 'Companion'],
  key_clauses: [
    'Hợp đồng hình thành khi Escrow HELD thành công và Companion chấp nhận trong 180 giây.',
    'Tiền ký quỹ giải ngân 88% Companion / 12% nền tảng sau nghiệm thu (hoặc tự nghiệm thu sau 15 phút).',
    'Hủy ≥30 phút hoàn 100%; 10–<30 phút hoàn 70% (30% Companion); <10 phút phạt 100% chia 88/12.',
    'Khiếu nại đóng băng tiền ngay; CS phán quyết có lý do; lỗi Companion ≥80% hoàn 100% Renter và phạt Companion 20%.',
    'Cấm giao dịch ngoài sàn; chat tự động che SĐT, đường dẫn, số tài khoản.',
    'Người dùng từ 18 tuổi; Companion bắt buộc eKYC; không ghi âm cuộc gọi mặc định.',
    'Dịch vụ SOCIAL chỉ trực tuyến; nghiêm cấm hẹn hò/tình dục trá hình hoặc gặp mặt ngoài đời.',
  ],
};
