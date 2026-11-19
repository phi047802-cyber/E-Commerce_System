import React, { useEffect, useState } from 'react';
import { Timer, Loader2 } from 'lucide-react';

interface WeekRow {
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
}

interface SlaReport {
  sla_target_minutes: number;
  timezone: string;
  weeks: WeekRow[];
  totals: Omit<WeekRow, 'week_start' | 'label' | 'breached'>;
}

const fmt = (v: number | null, suffix = '') => (v === null ? '—' : `${v.toLocaleString('vi-VN')}${suffix}`);

/** G10 — Báo cáo SLA khiếu nại theo tuần cho CS / Admin (`GET /api/cs/reports/dispute-sla`). Chỉ hiển thị số server tính. */
export const DisputeSlaReport: React.FC<{ token: string | null }> = ({ token }) => {
  const [weeks, setWeeks] = useState(8);
  const [report, setReport] = useState<SlaReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/cs/reports/dispute-sla?weeks=${weeks}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setReport(d.data);
        else setError(d.error?.message || 'Không tải được báo cáo SLA');
      })
      .catch(() => !cancelled && setError('Lỗi kết nối khi tải báo cáo SLA'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, weeks]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" aria-labelledby="sla-report-title">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 id="sla-report-title" className="text-lg font-bold text-white flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-400" /> SLA khiếu nại theo tuần
          </h3>
          <p className="text-xs text-slate-400">
            Mục tiêu xử lý ≤ {report?.sla_target_minutes ?? 45} phút, không tính thời gian chờ bổ sung chứng cứ (D25). {report?.timezone}.
          </p>
        </div>
        <label className="text-xs text-slate-400 flex items-center gap-2">
          Số tuần
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
          >
            {[4, 8, 12, 26].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && !report ? (
        <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="Đã mở" value={fmt(report.totals.opened)} />
            <Stat label="Đã xử lý" value={fmt(report.totals.resolved)} />
            <Stat label="Đúng SLA" value={fmt(report.totals.within_sla_pct, '%')} accent />
            <Stat label="Thời gian xử lý trung vị" value={fmt(report.totals.median_resolution_minutes, ' phút')} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2">Tuần</th>
                  <th className="py-2 text-right">Mở</th>
                  <th className="py-2 text-right">Đã xử lý</th>
                  <th className="py-2 text-right">Đúng SLA</th>
                  <th className="py-2 text-right">Quá SLA</th>
                  <th className="py-2 text-right">Còn mở</th>
                  <th className="py-2 text-right">TB / Trung vị (phút)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.weeks.map((w) => (
                  <tr key={w.week_start} className="text-slate-200">
                    <td className="py-2 whitespace-nowrap">{w.label}</td>
                    <td className="py-2 text-right">{w.opened}</td>
                    <td className="py-2 text-right">{w.resolved}</td>
                    <td className={`py-2 text-right ${w.resolved > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {w.within_sla}{w.within_sla_pct !== null ? ` (${fmt(w.within_sla_pct, '%')})` : ''}
                    </td>
                    <td className={`py-2 text-right ${w.breached > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>{w.breached}</td>
                    <td className={`py-2 text-right ${w.still_open > 0 ? 'text-amber-300 font-semibold' : 'text-slate-500'}`}>{w.still_open}</td>
                    <td className="py-2 text-right font-mono">
                      {fmt(w.avg_resolution_minutes)} / {fmt(w.median_resolution_minutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
    <span className="text-slate-400 block">{label}</span>
    <span className={`text-base font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
  </div>
);
