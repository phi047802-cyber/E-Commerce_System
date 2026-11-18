import React, { useEffect, useState } from 'react';
import { Gavel, Loader2 } from 'lucide-react';
import { fetchTerms, ViolationRule, SEVERITY_STYLE } from './legalApi';

interface ViolationRow {
  violation_id: string;
  code: string;
  severity: ViolationRule['severity'];
  trust_delta: number;
  suspension_days: number;
  note: string;
  created_at: string;
  user: { display_name: string; role: string; status: string };
}

/** CS/Admin ghi nhận vi phạm điều khoản (TERMS_AND_CONTRACTS.md Phần C). Server tự áp dụng TrustScore & khóa tài khoản. */
export const ViolationPanel: React.FC<{ token: string | null; onToast: (type: 'success' | 'error', title: string, msg: string) => void }> = ({ token, onToast }) => {
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('V01');
  const [bookingId, setBookingId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRows = async () => {
    if (!token) return;
    const res = await fetch('/api/legal/violations', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setRows(data.data);
  };

  useEffect(() => {
    fetchTerms().then((t) => setRules(t.violations)).catch(() => setRules([]));
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch('/api/legal/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId.trim(), code, note: note.trim(), ...(bookingId.trim() ? { booking_id: bookingId.trim() } : {}) }),
      });
      const data = await res.json();
      if (!data.success) {
        onToast('error', 'Không ghi nhận được vi phạm', `${data.error.message} (${data.error.code})`);
        return;
      }
      const d = data.data;
      onToast('success', `Đã ghi nhận ${code} (lần ${d.occurrence})`,
        `Trạng thái tài khoản: ${d.account_status}${d.new_trust_score !== null ? ` · TrustScore mới: ${d.new_trust_score}` : ''}`);
      setNote('');
      setBookingId('');
      await loadRows();
    } finally {
      setBusy(false);
    }
  };

  const selected = rules.find((r) => r.code === code);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-white text-base flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400" /> Ghi nhận vi phạm điều khoản
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Hệ thống tự trừ TrustScore và khóa tài khoản theo bậc thang tái phạm. Chế tài tiền chỉ thực hiện qua phán quyết khiếu nại.</p>
      </div>
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Mã người dùng (user_id)</span>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" placeholder="vd. u-comp-02" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Hành vi vi phạm</span>
          <select value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
            {rules.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.title}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-400">Mã đơn liên quan (tùy chọn)</span>
          <input value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
        </label>
        <div className="text-xs text-slate-400 self-end">
          {selected && <>Mức <span className={`px-1.5 py-0.5 rounded ${SEVERITY_STYLE[selected.severity]}`}>{selected.severity}</span> · TrustScore {selected.trust_delta || '—'}</>}
        </div>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs text-slate-400">Ghi chú kiểm toán (tối thiểu 10 ký tự)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} required minLength={10} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
        </label>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={busy || !userId.trim() || note.trim().length < 10} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold disabled:opacity-40 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Ghi nhận vi phạm
          </button>
        </div>
      </form>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[560px]">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr><th className="py-2">Thời điểm</th><th>Người dùng</th><th>Mã</th><th>TrustScore</th><th>Khóa</th><th>Ghi chú</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {rows.slice(0, 10).map((r) => (
                <tr key={r.violation_id}>
                  <td className="py-2 pr-2">{new Date(r.created_at).toLocaleString('vi-VN')}</td>
                  <td>{r.user.display_name} <span className="text-slate-500">({r.user.status})</span></td>
                  <td className="font-mono">{r.code}</td>
                  <td className="font-mono">{r.trust_delta || '—'}</td>
                  <td>{r.suspension_days === -1 ? 'Vĩnh viễn' : r.suspension_days > 0 ? `${r.suspension_days} ngày` : '—'}</td>
                  <td className="max-w-[240px] truncate" title={r.note}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
