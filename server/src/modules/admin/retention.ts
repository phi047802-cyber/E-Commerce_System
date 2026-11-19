import { prisma } from '../../common/prisma.js';

export const RETENTION_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionReport {
  window_days: number;
  /** Renter có ít nhất 1 đơn ký quỹ thành công. */
  renters_with_escrow: number;
  /** Renter có đơn đầu từ ≥ 30 ngày trước (đã đủ thời gian để quay lại) — mẫu số của tỷ lệ. */
  eligible_renters: number;
  /** Trong nhóm đủ điều kiện: có thêm ≥ 1 đơn ký quỹ trong 30 ngày kể từ đơn đầu. */
  returned_within_window: number;
  /** returned / eligible × 100; null khi chưa có Renter đủ điều kiện. */
  retention_rate_pct: number | null;
  /** Renter có đơn đầu chưa đủ 30 ngày — không tính vào tỷ lệ. */
  renters_in_window: number;
  /** Trong nhóm chưa đủ 30 ngày: đã quay lại sớm (tham khảo). */
  early_returners_in_window: number;
  target_pct: number;
  definition: string;
}

/**
 * G10 — Tỷ lệ Renter quay lại trong 30 ngày (hàm thuần, dễ kiểm thử).
 * `escrows`: thời điểm ký quỹ thành công của từng đơn kèm Renter (cùng định nghĩa "đơn ký quỹ thành công" với D27).
 */
export function computeRetention(escrows: { renter_id: string; held_at: Date }[], now = new Date()): RetentionReport {
  const byRenter = new Map<string, number[]>();
  for (const e of escrows) {
    const list = byRenter.get(e.renter_id) ?? [];
    list.push(e.held_at.getTime());
    byRenter.set(e.renter_id, list);
  }

  let eligible = 0;
  let returned = 0;
  let inWindow = 0;
  let earlyReturners = 0;
  for (const times of byRenter.values()) {
    times.sort((a, b) => a - b);
    const first = times[0];
    const cameBack = times.slice(1).some((t) => t - first <= RETENTION_WINDOW_DAYS * DAY_MS);
    if (now.getTime() - first >= RETENTION_WINDOW_DAYS * DAY_MS) {
      eligible += 1;
      if (cameBack) returned += 1;
    } else {
      inWindow += 1;
      if (cameBack) earlyReturners += 1;
    }
  }

  return {
    window_days: RETENTION_WINDOW_DAYS,
    renters_with_escrow: byRenter.size,
    eligible_renters: eligible,
    returned_within_window: returned,
    retention_rate_pct: eligible > 0 ? Number(((returned / eligible) * 100).toFixed(2)) : null,
    renters_in_window: inWindow,
    early_returners_in_window: earlyReturners,
    target_pct: 30,
    definition:
      'Renter có đơn ký quỹ đầu tiên từ ≥ 30 ngày trước và có thêm ≥ 1 đơn ký quỹ trong 30 ngày kể từ đơn đầu / số Renter đủ điều kiện.',
  };
}

export async function getRetentionReport(now = new Date()): Promise<RetentionReport> {
  const rows = await prisma.escrow.findMany({ select: { held_at: true, booking: { select: { renter_id: true } } } });
  return computeRetention(
    rows.map((r) => ({ renter_id: r.booking.renter_id, held_at: r.held_at })),
    now
  );
}
