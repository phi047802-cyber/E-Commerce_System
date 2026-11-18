import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RotateCcw } from 'lucide-react';

interface BookingCountdownProps {
  status: string;
  responseDeadline?: string | Date | null;
  confirmDeadline?: string | Date | null;
  createdAt?: string | Date | null;
  onTriggerTimeout?: () => Promise<void>;
  canTrigger: boolean;
  loading?: boolean;
  compact?: boolean;
  mode?: 'response_180s' | 'confirm_15m';
}

export const BookingCountdown: React.FC<BookingCountdownProps> = ({
  status,
  responseDeadline,
  confirmDeadline,
  createdAt,
  onTriggerTimeout,
  canTrigger,
  loading = false,
  compact = false,
  mode = 'response_180s',
}) => {
  // Với mode response_180s: Chỉ hiển thị khi đơn đang chờ Companion phản hồi (180s)
  if (mode === 'response_180s' && status !== 'WAITING_COMPANION_RESPONSE') {
    return null;
  }

  const calculateRemainingSeconds = (): number | null => {
    let targetTime: number | null = null;

    if (mode === 'confirm_15m') {
      if (confirmDeadline) {
        const d = new Date(confirmDeadline).getTime();
        if (!isNaN(d)) targetTime = d;
      }
    } else {
      if (responseDeadline) {
        const d = new Date(responseDeadline).getTime();
        if (!isNaN(d)) targetTime = d;
      }
      // Fallback: nếu backend không có response_deadline, tính từ created_at + 180s theo quy tắc nghiệp vụ
      if (!targetTime && createdAt) {
        const c = new Date(createdAt).getTime();
        if (!isNaN(c)) targetTime = c + 180 * 1000;
      }
    }

    if (!targetTime) return null;

    const now = Date.now();
    const diffSec = Math.floor((targetTime - now) / 1000);
    return Math.max(0, diffSec);
  };

  const [remainingSec, setRemainingSec] = useState<number | null>(calculateRemainingSeconds());

  useEffect(() => {
    setRemainingSec(calculateRemainingSeconds());

    const interval = setInterval(() => {
      setRemainingSec(calculateRemainingSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [responseDeadline, confirmDeadline, createdAt, mode]);

  if (remainingSec === null) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs">
        <Clock className="w-3.5 h-3.5" />
        <span>Thời hạn: Không xác định</span>
      </div>
    );
  }

  const isExpired = remainingSec === 0;
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
            isExpired
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse'
              : remainingSec <= 30
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 animate-pulse'
                : 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
          }`}
        >
          <Clock className={`w-3 h-3 ${isExpired ? 'text-rose-400' : 'text-sky-400'}`} />
          {isExpired ? (
            <span>Hết hạn (00:00)</span>
          ) : (
            <span>{mode === 'confirm_15m' ? `Tự nghiệm thu: ${formattedTime}` : `Còn ${formattedTime}`}</span>
          )}
        </div>

        {canTrigger && isExpired && onTriggerTimeout && (
          <button
            type="button"
            disabled={loading}
            onClick={onTriggerTimeout}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
            title={mode === 'confirm_15m' ? 'Kích hoạt nghiệm thu tự động (88/12)' : 'Kích hoạt xử lý quá hạn phản hồi và hoàn 100% tiền ký quỹ'}
          >
            <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang xử lý...' : mode === 'confirm_15m' ? 'Auto-Accept' : 'Xử lý timeout'}</span>
          </button>
        )}
      </div>
    );
  }

  const title = mode === 'confirm_15m' ? 'Cửa sổ nghiệm thu tự động (15 phút)' : 'Thời hạn Companion phản hồi (180s)';
  const descExpired = mode === 'confirm_15m'
    ? 'Đã kết thúc cửa sổ 15 phút nghiệm thu sau phiên chơi mà không nhận khiếu nại. Đơn đủ điều kiện nghiệm thu tự động (Auto-Accept) và giải ngân 88/12 theo quy định.'
    : 'Đã hết thời gian phản hồi 180 giây của Companion. Đơn đủ điều kiện hủy quá hạn và hoàn 100% tiền ký quỹ Escrow về ví người thuê.';
  const descPending = mode === 'confirm_15m'
    ? 'Sau khi phiên chơi kết thúc, Renter có 15 phút để nghiệm thu hoặc báo sự cố. Nếu quá hạn không có khiếu nại, hệ thống sẽ tự động giải ngân cho Companion.'
    : 'Companion có tối đa 180 giây để Chấp nhận hoặc Từ chối yêu cầu. Nếu hết hạn, tiền ký quỹ sẽ được bảo toàn và hoàn trả 100%.';

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
        isExpired
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          : remainingSec <= 60
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            : 'bg-sky-950/30 border-sky-500/40 text-sky-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-400' : 'text-sky-400'} animate-pulse`} />
          <span>{title}</span>
        </div>
        <div
          className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs tracking-wider ${
            isExpired
              ? 'bg-rose-900/60 text-rose-200 border border-rose-500/50'
              : 'bg-sky-900/60 text-sky-200 border border-sky-500/50'
          }`}
        >
          {isExpired ? '00:00 (HẾT HẠN)' : formattedTime}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed opacity-90">
        {isExpired ? <span className="text-rose-300 font-medium">{descExpired}</span> : <span>{descPending}</span>}
      </p>

      {canTrigger && isExpired && onTriggerTimeout && (
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {mode === 'confirm_15m' ? 'Hết hạn nghiệm thu. Nhấn để kích hoạt giải ngân:' : 'Nhấn để giải phóng slot và hoàn 100% tiền Escrow:'}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={onTriggerTimeout}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-glow-rose transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang xử lý...' : mode === 'confirm_15m' ? 'Kích hoạt Auto-Accept (88/12)' : 'Kích hoạt Timeout (Hoàn 100%)'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
