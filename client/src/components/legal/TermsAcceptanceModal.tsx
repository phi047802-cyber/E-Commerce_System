import React, { useEffect, useState } from 'react';
import { FileText, X, Loader2 } from 'lucide-react';
import { acceptTerms, fetchTerms, TermsInfo } from './legalApi';

interface Props {
  open: boolean;
  token: string | null;
  onClose: () => void;
  onAccepted: () => void;
}

/** Hiện khi server trả TERMS_NOT_ACCEPTED (D39): đọc điều khoản chính và chấp thuận phiên bản hiện hành. */
export const TermsAcceptanceModal: React.FC<Props> = ({ open, token, onClose, onAccepted }) => {
  const [terms, setTerms] = useState<TermsInfo | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChecked(false);
    setError(null);
    fetchTerms().then(setTerms).catch((e) => setError(e.message));
  }, [open]);

  if (!open) return null;

  const handleAccept = async () => {
    if (!token || !terms) return;
    setBusy(true);
    setError(null);
    try {
      await acceptTerms(token, terms.version);
      onAccepted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 id="terms-modal-title" className="text-white font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E11D2E]" /> Chấp thuận Điều khoản sử dụng
          </h2>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-white" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3 text-sm text-[#D4D4D4]">
          {!terms && !error && (
            <p className="flex items-center gap-2 text-[#A3A3A3]"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải điều khoản…</p>
          )}
          {terms && (
            <>
              <p>
                Để đặt lịch, bạn cần chấp thuận phiên bản <strong className="text-white">{terms.version}</strong> (hiệu lực {terms.effective_date}) của hợp đồng dịch vụ ba bên giữa Nền tảng, Renter và Companion.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                {terms.key_clauses.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <a href="/dieu-khoan-dich-vu" target="_blank" rel="noreferrer" className="text-[#E11D2E] underline text-xs">
                Xem toàn văn điều khoản và bảng chế tài vi phạm
              </a>
              <label className="flex items-start gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 accent-[#E11D2E]" />
                <span>Tôi đã đọc, hiểu và đồng ý với Điều khoản sử dụng, cơ chế Ký quỹ 88/12 và quy trình giải quyết khiếu nại.</span>
              </label>
            </>
          )}
          {error && <p className="text-rose-400 text-xs" role="alert">{error}</p>}
        </div>
        <div className="p-4 border-t border-[#2A2A2A] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#A3A3A3] hover:text-white">Để sau</button>
          <button
            onClick={handleAccept}
            disabled={!checked || busy || !terms}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#E11D2E] text-white disabled:opacity-40 flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Chấp thuận & tiếp tục đặt lịch
          </button>
        </div>
      </div>
    </div>
  );
};
