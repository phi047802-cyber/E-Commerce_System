import React from 'react';
import { Share2 } from 'lucide-react';

export interface ChannelRow {
  source: string;
  visits: number;
  signups: number;
  escrow_bookings: number;
  is_social: boolean;
  visit_share_pct: number | null;
  conversion_pct: number | null;
}

export interface ChannelMetrics {
  breakdown: ChannelRow[];
  total_visits: number;
  social_visits: number;
  social_visit_share_pct: number | null;
  social_visit_share_target_pct: number;
  attribution: string;
}

const SOURCE_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  direct: 'Trực tiếp / không rõ',
};

const fmtPct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('vi-VN')}%`);

/**
 * G8/G9 — Bảng kênh nguồn cho Admin: phiên truy cập, đăng ký, đơn ký quỹ và conversion theo utm_source.
 * Số liệu do server tính (`GET /api/admin/dashboard/metrics` → `channels`); client chỉ hiển thị.
 */
export const ChannelConversionPanel: React.FC<{ channels?: ChannelMetrics }> = ({ channels }) => {
  if (!channels) return null;
  const share = channels.social_visit_share_pct;
  const target = channels.social_visit_share_target_pct;
  const reached = share !== null && share >= target;

  return (
    <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4" aria-labelledby="channel-panel-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2A2A] pb-3">
        <div>
          <h3 id="channel-panel-title" className="text-sm font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#E11D2E]" /> Chuyển đổi theo kênh nguồn
          </h3>
          <p className="text-[11px] text-[#A3A3A3] mt-0.5">
            Conversion = đơn ký quỹ thành công / phiên truy cập của kênh. Ghi nhận {channels.attribution}.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#A3A3A3] block">Phiên đến từ mạng xã hội (mục tiêu ≥ {target}%)</span>
          <span className={`text-lg font-bold ${reached ? 'text-[#22C55E]' : 'text-amber-400'}`}>
            {fmtPct(share)}
          </span>
          <span className="text-[11px] text-[#A3A3A3]"> · {channels.social_visits}/{channels.total_visits} phiên</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[520px]">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-[#A3A3A3]">
              <th className="py-2">Kênh</th>
              <th className="py-2 text-right">Phiên truy cập</th>
              <th className="py-2 text-right">Tỉ trọng</th>
              <th className="py-2 text-right">Đăng ký</th>
              <th className="py-2 text-right">Đơn ký quỹ</th>
              <th className="py-2 text-right">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {channels.breakdown.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-[#A3A3A3]">Chưa có dữ liệu kênh</td>
              </tr>
            ) : (
              channels.breakdown.map((r) => (
                <tr key={r.source} className="hover:bg-[#1C1C1C]">
                  <td className="py-2.5 font-medium text-white">
                    {SOURCE_LABEL[r.source] ?? r.source}
                    {r.is_social && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#E11D2E]/10 text-[#E11D2E] border border-[#E11D2E]/30">
                        social
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-white">{r.visits.toLocaleString('vi-VN')}</td>
                  <td className="py-2.5 text-right text-[#A3A3A3]">{fmtPct(r.visit_share_pct)}</td>
                  <td className="py-2.5 text-right font-mono text-white">{r.signups.toLocaleString('vi-VN')}</td>
                  <td className="py-2.5 text-right font-mono text-white">{r.escrow_bookings.toLocaleString('vi-VN')}</td>
                  <td
                    className={`py-2.5 text-right font-semibold ${r.conversion_pct !== null && r.conversion_pct > 100 ? 'text-amber-400' : 'text-[#22C55E]'}`}
                    title={r.conversion_pct !== null && r.conversion_pct > 100 ? 'Số đơn ký quỹ lớn hơn số phiên ghi nhận — xem chú thích bên dưới' : undefined}
                  >
                    {fmtPct(r.conversion_pct)}
                    {r.conversion_pct !== null && r.conversion_pct > 100 ? ' *' : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {channels.breakdown.some((r) => r.conversion_pct !== null && r.conversion_pct > 100) && (
        <p className="text-[11px] text-amber-400/90 leading-snug">
          * Vượt 100%: kênh có nhiều đơn ký quỹ hơn số phiên được ghi nhận — thường do tài khoản tạo trước khi có ghi nhận kênh
          (tính vào “Trực tiếp”) hoặc đặt lịch không qua trang Web (App, API). Số liệu sẽ chính xác dần khi người dùng mới đăng ký kèm kênh nguồn.
        </p>
      )}
    </section>
  );
};
