import { prisma } from '../../common/prisma.js';

/** D25: mục tiêu xử lý khiếu nại 45 phút, đồng hồ tạm dừng khi chờ bổ sung chứng cứ. */
export const DISPUTE_SLA_TARGET_MINUTES = 45;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Thứ Hai 00:00 giờ Việt Nam (UTC+7) của tuần chứa `d`, trả về dạng UTC. */
export function vnWeekStart(d: Date): Date {
  const local = new Date(d.getTime() + VN_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // 0 = thứ Hai
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  return new Date(mondayLocal - VN_OFFSET_MS);
}

const fmtVnDate = (utc: Date) => {
  const l = new Date(utc.getTime() + VN_OFFSET_MS);
  return `${String(l.getUTCDate()).padStart(2, '0')}/${String(l.getUTCMonth() + 1).padStart(2, '0')}/${l.getUTCFullYear()}`;
};

type WeekRow = {
  week_start: string;
  label: string;
  opened: number;
  resolved: number;
  within_sla: number;
  breached: number;
  still_open: number;
  within_sla_pct: number | null;
  avg_resolution_minutes: number | null;
  median_resolution_minutes: number | null;
};

/**
 * G10 — Báo cáo SLA khiếu nại theo tuần (UTC+7, tuần bắt đầu thứ Hai).
 * Khiếu nại được tính vào tuần nó được MỞ. Thời gian xử lý = resolved_at − created_at − paused_sla_ms
 * (cùng công thức với hồ sơ khiếu nại, D25). Chỉ đọc.
 */
export async function getWeeklyDisputeSlaReport(weeks: number, now = new Date()) {
  const n = Math.min(26, Math.max(1, Math.floor(weeks) || 8));
  const currentWeek = vnWeekStart(now);
  const from = new Date(currentWeek.getTime() - (n - 1) * WEEK_MS);

  const disputes = await prisma.disputeCase.findMany({
    where: { created_at: { gte: from } },
    select: { created_at: true, resolved_at: true, paused_sla_ms: true, status: true },
  });

  const buckets: { start: Date; minutes: number[]; opened: number; stillOpen: number }[] = [];
  for (let i = 0; i < n; i++) buckets.push({ start: new Date(from.getTime() + i * WEEK_MS), minutes: [], opened: 0, stillOpen: 0 });

  for (const d of disputes) {
    const idx = Math.floor((vnWeekStart(d.created_at).getTime() - from.getTime()) / WEEK_MS);
    const b = buckets[idx];
    if (!b) continue;
    b.opened += 1;
    if (d.resolved_at) {
      const active = Math.max(0, d.resolved_at.getTime() - d.created_at.getTime() - (d.paused_sla_ms || 0));
      b.minutes.push(active / 60000);
    } else {
      b.stillOpen += 1;
    }
  }

  const round1 = (x: number) => Math.round(x * 10) / 10;
  const median = (xs: number[]) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return round1(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
  };

  const rows: WeekRow[] = buckets.map((b) => {
    const within = b.minutes.filter((m) => m <= DISPUTE_SLA_TARGET_MINUTES).length;
    const end = new Date(b.start.getTime() + WEEK_MS - 1);
    return {
      week_start: b.start.toISOString(),
      label: `${fmtVnDate(b.start)} – ${fmtVnDate(end)}`,
      opened: b.opened,
      resolved: b.minutes.length,
      within_sla: within,
      breached: b.minutes.length - within,
      still_open: b.stillOpen,
      within_sla_pct: b.minutes.length ? round1((within / b.minutes.length) * 100) : null,
      avg_resolution_minutes: b.minutes.length ? round1(b.minutes.reduce((s, m) => s + m, 0) / b.minutes.length) : null,
      median_resolution_minutes: median(b.minutes),
    };
  });

  const allMinutes = buckets.flatMap((b) => b.minutes);
  const totalWithin = allMinutes.filter((m) => m <= DISPUTE_SLA_TARGET_MINUTES).length;
  return {
    sla_target_minutes: DISPUTE_SLA_TARGET_MINUTES,
    timezone: 'UTC+7 (tuần bắt đầu thứ Hai)',
    weeks: rows.reverse(), // tuần gần nhất trước
    totals: {
      opened: buckets.reduce((s, b) => s + b.opened, 0),
      resolved: allMinutes.length,
      within_sla: totalWithin,
      still_open: buckets.reduce((s, b) => s + b.stillOpen, 0),
      within_sla_pct: allMinutes.length ? round1((totalWithin / allMinutes.length) * 100) : null,
      avg_resolution_minutes: allMinutes.length ? round1(allMinutes.reduce((s, m) => s + m, 0) / allMinutes.length) : null,
      median_resolution_minutes: median(allMinutes),
    },
  };
}
