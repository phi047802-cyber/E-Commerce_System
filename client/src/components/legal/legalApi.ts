// API pháp lý dùng chung cho Web (TERMS_AND_CONTRACTS.md). Mobile gọi cùng endpoint.

/** Phiên bản điều khoản Web gửi kèm khi đăng ký; nếu lệch server sẽ bỏ qua và yêu cầu chấp thuận lại. */
export const CURRENT_TERMS_VERSION = 'TOS-2026.11';

export interface ViolationRule {
  code: string;
  title: string;
  applies_to: 'BOTH' | 'COMPANION' | 'RENTER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trust_delta: number;
  suspension_ladder: number[];
  money_note: string;
}

export interface TermsInfo {
  version: string;
  effective_date: string;
  label: string;
  parties: string[];
  key_clauses: string[];
  violations: ViolationRule[];
}

export async function fetchTerms(): Promise<TermsInfo> {
  const res = await fetch('/api/legal/terms');
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Không tải được điều khoản');
  return data.data;
}

export async function acceptTerms(token: string, version: string): Promise<void> {
  const res = await fetch('/api/legal/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ terms_version: version, channel: 'WEB' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Không ghi nhận được chấp thuận');
}

export function describeLadder(ladder: number[]): string {
  return ladder
    .map((d, i) => `Lần ${i + 1}: ${d === -1 ? 'khóa vĩnh viễn' : d === 0 ? 'cảnh cáo' : `khóa ${d} ngày`}`)
    .join(' · ');
}

export const SEVERITY_STYLE: Record<ViolationRule['severity'], string> = {
  LOW: 'bg-slate-700/40 text-slate-200',
  MEDIUM: 'bg-amber-500/15 text-amber-300',
  HIGH: 'bg-orange-500/15 text-orange-300',
  CRITICAL: 'bg-rose-500/15 text-rose-300',
};
