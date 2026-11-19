import React from 'react';
import { Repeat } from 'lucide-react';

export interface RetentionReport {
  window_days: number;
  renters_with_escrow: number;
  eligible_renters: number;
  returned_within_window: number;
  retention_rate_pct: number | null;
  renters_in_window: number;
  early_returners_in_window: number;
  target_pct: number;
  definition: string;
}

/** G10 — Tỷ lệ Renter quay lại trong 30 ngày (số do server tính, `metrics.retention`). */
export const RetentionCard: React.FC<{ retention?: RetentionReport }> = ({ retention }) => {
  if (!retention) return null;
  const rate = retention.retention_rate_pct;
  const reached = rate !== null && rate >= retention.target_pct;

  return (
    <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-3" aria-labelledby="retention-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="retention-title" className="text-sm font-bold text-white flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#E11D2E]" /> Renter quay lại trong {retention.window_days} ngày
          </h3>
          <p className="text-[11px] text-[#A3A3A3] mt-0.5 leading-snug">{retention.definition}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-2xl font-bold ${rate === null ? 'text-[#A3A3A3]' : reached ? 'text-[#22C55E]' : 'text-amber-400'}`}>
            {rate === null ? '—' : `${rate.toLocaleString('vi-VN')}%`}
          </span>
          <span className="block text-[11px] text-[#A3A3A3]">mục tiêu ≥ {retention.target_pct}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Renter có đơn ký quỹ" value={retention.renters_with_escrow} />
        <Stat label="Đủ 30 ngày (mẫu số)" value={retention.eligible_renters} />
        <Stat label="Đã quay lại" value={retention.returned_within_window} />
        <Stat label="Chưa đủ 30 ngày" value={retention.renters_in_window} hint={`${retention.early_returners_in_window} đã quay lại sớm`} />
      </div>
      {rate === null && (
        <p className="text-[11px] text-[#A3A3A3]">Chưa có Renter nào có đơn đầu tiên từ đủ {retention.window_days} ngày trước nên chưa tính được tỷ lệ.</p>
      )}
    </section>
  );
};

const Stat: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-3">
    <span className="text-[#A3A3A3] block text-[11px]">{label}</span>
    <span className="text-base font-bold text-white">{value.toLocaleString('vi-VN')}</span>
    {hint && <span className="block text-[10px] text-[#6B6B6B]">{hint}</span>}
  </div>
);
