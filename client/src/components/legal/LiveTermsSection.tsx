import React, { useEffect, useState } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
import { describeLadder, fetchTerms, SEVERITY_STYLE, TermsInfo } from './legalApi';

const APPLIES: Record<string, string> = { BOTH: 'Cả hai', COMPANION: 'Companion', RENTER: 'Renter' };

/** Phiên bản điều khoản & bảng vi phạm đọc trực tiếp từ API — cùng nguồn với Mobile App. */
export const LiveTermsSection: React.FC = () => {
  const [terms, setTerms] = useState<TermsInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerms().then(setTerms).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-sm text-rose-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>;
  }
  if (!terms) return <p className="text-sm text-[#A3A3A3]">Đang tải phiên bản điều khoản…</p>;

  return (
    <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4" aria-labelledby="live-terms-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="live-terms-title" className="text-lg font-bold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#E11D2E]" /> Phiên bản hiện hành & Bảng chế tài vi phạm
        </h2>
        <span className="text-xs font-mono px-2 py-1 rounded bg-[#1F1F1F] text-[#D4D4D4]">
          {terms.version} · hiệu lực {terms.effective_date} · {terms.label}
        </span>
      </div>
      <p className="text-xs text-[#A3A3A3]">
        Hợp đồng ba bên: {terms.parties.join(' – ')}. Chế tài tiền chỉ thực hiện qua phán quyết khiếu nại của CS; bảng dưới quy định trừ TrustScore và khóa tài khoản.
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs text-left min-w-[640px]">
          <thead className="text-[#A3A3A3] border-b border-[#2A2A2A]">
            <tr>
              <th className="py-2 px-1">Mã</th>
              <th className="py-2 px-1">Hành vi</th>
              <th className="py-2 px-1">Đối tượng</th>
              <th className="py-2 px-1">Mức</th>
              <th className="py-2 px-1">TrustScore</th>
              <th className="py-2 px-1">Khóa tài khoản</th>
              <th className="py-2 px-1">Chế tài tiền (qua khiếu nại)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F] text-[#D4D4D4]">
            {terms.violations.map((v) => (
              <tr key={v.code}>
                <td className="py-2 px-1 font-mono font-bold text-white">{v.code}</td>
                <td className="py-2 px-1">{v.title}</td>
                <td className="py-2 px-1">{APPLIES[v.applies_to]}</td>
                <td className="py-2 px-1"><span className={`px-1.5 py-0.5 rounded ${SEVERITY_STYLE[v.severity]}`}>{v.severity}</span></td>
                <td className="py-2 px-1 font-mono">{v.trust_delta === 0 ? '—' : v.trust_delta}</td>
                <td className="py-2 px-1">{describeLadder(v.suspension_ladder)}</td>
                <td className="py-2 px-1">{v.money_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
