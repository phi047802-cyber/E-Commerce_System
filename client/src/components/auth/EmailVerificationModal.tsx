import React, { useEffect, useRef, useState } from 'react';
import { MailCheck, X, Loader2, Send } from 'lucide-react';

interface Props {
  open: boolean;
  email: string;
  onClose: () => void;
  /** Gọi sau khi server xác nhận email đã xác minh (App tải lại hồ sơ). */
  onVerified: () => void;
}

const RESEND_SECONDS = 60;

/**
 * UC01 — Xác minh email bằng OTP 6 số trên Web. Bắt buộc trước khi nạp tiền / đặt lịch (server trả `EMAIL_NOT_VERIFIED`).
 * Quy tắc do server quyết định: gửi lại sau 60 giây (`OTP_RATE_LIMITED`), mã hết hạn 10 phút, tối đa 5 lần nhập sai.
 */
export const EmailVerificationModal: React.FC<Props> = ({ open, email, onClose, onVerified }) => {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    setOtp('');
    setMessage(null);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [open]);

  if (!open) return null;

  const startCooldown = (seconds: number) => {
    if (timer.current) clearInterval(timer.current);
    setCooldown(seconds);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const send = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        startCooldown(RESEND_SECONDS);
        setMessage({ type: 'info', text: 'Đã gửi mã xác minh. Mã có hiệu lực 10 phút.' });
      } else if (data.error?.code === 'OTP_RATE_LIMITED') {
        // Mã trước vẫn còn hiệu lực: cho nhập mã và đếm đúng số giây server yêu cầu
        const wait = Number((data.error.message || '').match(/(\d+)/)?.[1]) || RESEND_SECONDS;
        setSent(true);
        startCooldown(wait);
        setMessage({ type: 'error', text: data.error.message });
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Không gửi được mã xác minh.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi gửi mã xác minh.' });
    } finally {
      setSending(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setMessage({ type: 'error', text: 'Mã xác minh gồm 6 chữ số.' });
      return;
    }
    setVerifying(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (data.success) {
        onVerified();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Mã xác minh không hợp lệ.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xác minh email.' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="verify-email-title">
      <div className="w-full max-w-md bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h2 id="verify-email-title" className="text-base font-bold text-white flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-amber-400" /> Xác minh email
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={verify} className="p-5 space-y-4">
          <p className="text-sm text-[#D4D4D4] leading-relaxed">
            Xác minh email để nạp tiền vào ví và đặt lịch. Mã 6 chữ số sẽ được gửi tới
            <span className="block font-semibold text-white mt-1 break-all">{email}</span>
          </p>

          <button
            type="button"
            onClick={send}
            disabled={sending || cooldown > 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2A2A2A] text-sm font-semibold text-white hover:bg-[#1C1C1C] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : sent ? 'Gửi lại mã' : 'Gửi mã xác minh'}
          </button>

          <div>
            <label htmlFor="verify-otp" className="text-xs text-[#A3A3A3] block mb-1.5">Mã xác minh</label>
            <input
              id="verify-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={!sent}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] text-xl font-mono bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-[#E11D2E] disabled:opacity-50"
            />
          </div>

          {message && (
            <p className={`text-xs ${message.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`} role={message.type === 'error' ? 'alert' : 'status'}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!sent || verifying}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#E11D2E] text-white text-sm font-bold hover:bg-[#C81A28] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying && <Loader2 className="w-4 h-4 animate-spin" />} Xác minh
          </button>

          <p className="text-[11px] text-[#6B6B6B] leading-snug">
            Môi trường demo không gửi email thật: mã OTP được ghi vào log máy chủ (dòng <code>[EMAIL-SERVICE]</code>).
          </p>
        </form>
      </div>
    </div>
  );
};
