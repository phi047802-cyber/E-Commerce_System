import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';

interface LedgerEntry {
  entry_id: string;
  direction: 'DEBIT' | 'CREDIT';
  balance_type: 'AVAILABLE' | 'ESCROW';
  amount: number;
  balance_after: number;
  created_at: string;
  transaction: { txn_type: string; booking_id: string | null; created_at: string };
}

interface WalletWithEntries {
  available_balance: number;
  escrow_balance: number;
  penalty_debt?: number;
  entries: LedgerEntry[];
}

// Nhãn tiếng Việt cho loại giao dịch sổ cái (FINANCIAL_RULES.md)
const TXN_LABEL: Record<string, string> = {
  TOPUP: 'Nạp tiền',
  ESCROW_HOLD: 'Ký quỹ đặt lịch',
  ESCROW_RELEASE: 'Giải ngân 88/12',
  ESCROW_REFUND: 'Hoàn ký quỹ',
  CANCEL_PENALTY: 'Phí hủy đơn',
  DISPUTE_SETTLE: 'Phán quyết khiếu nại',
  WITHDRAW_RESERVE: 'Giữ tiền rút',
  WITHDRAW_SETTLE: 'Rút tiền hoàn tất',
  WITHDRAW_REJECT: 'Hoàn tiền rút bị từ chối',
};

const vnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

/**
 * Biến động số dư (Renter & Companion): mọi dòng đến từ LEDGER_ENTRY ghi kép, không tính toán phía client.
 * Quy ước hiển thị theo góc nhìn người dùng: CREDIT ví khả dụng = tiền vào (+), DEBIT = tiền ra (−).
 */
export const WalletLedgerPanel: React.FC<{ token: string | null; refreshKey?: number }> = ({ token, refreshKey }) => {
  const [wallet, setWallet] = useState<WalletWithEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Không tải được ví');
      setWallet(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!token) return null;

  return (
    <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4" aria-labelledby="wallet-ledger-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="wallet-ledger-title" className="font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#22C55E]" /> Biến động số dư (Sổ cái ghi kép)
        </h3>
        <button onClick={load} disabled={loading} className="text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>
      {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
      {wallet && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#0F0F0F] rounded-xl p-3">
              <p className="text-[11px] text-[#A3A3A3]">Khả dụng</p>
              <p className="text-lg font-bold text-white font-mono">{vnd(wallet.available_balance)}</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-xl p-3">
              <p className="text-[11px] text-[#A3A3A3]">Đang ký quỹ (Escrow)</p>
              <p className="text-lg font-bold text-amber-300 font-mono">{vnd(wallet.escrow_balance)}</p>
            </div>
            {!!wallet.penalty_debt && (
              <div className="bg-[#0F0F0F] rounded-xl p-3">
                <p className="text-[11px] text-[#A3A3A3]">Nợ phạt chờ cấn trừ</p>
                <p className="text-lg font-bold text-rose-300 font-mono">{vnd(wallet.penalty_debt)}</p>
              </div>
            )}
          </div>
          {wallet.entries.length === 0 ? (
            <p className="text-xs text-[#A3A3A3]">Chưa có biến động nào. Nạp tiền hoặc đặt lịch để bắt đầu.</p>
          ) : (
            <ul className="divide-y divide-[#1F1F1F]">
              {wallet.entries.map((e) => {
                const isIn = e.direction === 'CREDIT';
                return (
                  <li key={e.entry_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-white truncate">
                        {TXN_LABEL[e.transaction.txn_type] || e.transaction.txn_type}
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F1F] text-[#A3A3A3]">
                          {e.balance_type === 'ESCROW' ? 'Escrow' : 'Khả dụng'}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#737373]">
                        {new Date(e.created_at).toLocaleString('vi-VN')}
                        {e.transaction.booking_id ? ` · Đơn #${e.transaction.booking_id.slice(0, 8)}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono font-semibold ${isIn ? 'text-[#22C55E]' : 'text-[#E11D2E]'}`}>
                        {isIn ? '+' : '−'}{vnd(e.amount)}
                      </p>
                      <p className="text-[11px] text-[#737373] font-mono">Số dư: {vnd(e.balance_after)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
