import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  Gamepad2, 
  CheckCircle2 
} from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToLogin,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'RENTER' | 'COMPANION'>('RENTER');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Đo độ mạnh mật khẩu
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Chưa nhập', color: 'bg-[#2A2A2A]' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: 'Yếu', color: 'bg-[#E11D2E]' };
    if (score === 2 || score === 3) return { score: 2, text: 'Trung bình', color: 'bg-[#F59E0B]' };
    return { score: 3, text: 'Mạnh', color: 'bg-[#22C55E]' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách ký quỹ Escrow.');
      return;
    }

    if (!isOver18) {
      setErrorMsg('Bạn phải xác nhận từ đủ 18 tuổi trở lên để tham gia nền tảng.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          is_over_18: isOver18,
          date_of_birth: dateOfBirth || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        onSuccess(data.data.token, data.data.user);
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối: ${err.message || 'Không thể kết nối đến máy chủ.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        className="relative w-full max-w-lg bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-[#1C1C1C] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] transition cursor-pointer"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/30 flex items-center justify-center text-[#E11D2E]">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#E11D2E]">INSTASQUAD</span>
          </div>

          <h2 id="register-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Tạo tài khoản mới
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Gia nhập cộng đồng Game Companion được bảo vệ bởi Ký quỹ Escrow
          </p>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/40 text-[#E11D2E] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#E11D2E] flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Tên hiển thị */}
            <div>
              <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="reg-name">
                Tên hiển thị
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Long, Ngọc Băng..."
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-[#6B6B6B] transition-colors outline-none"
                />
                <User className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="reg-email">
                Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-[#6B6B6B] transition-colors outline-none"
                />
                <Mail className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="reg-password">
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 pl-9 pr-10 text-xs sm:text-sm text-white placeholder-[#6B6B6B] transition-colors outline-none"
                />
                <Lock className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-[#6B6B6B] hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#1C1C1C] rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-[#2A2A2A]'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-[#2A2A2A]'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-[#2A2A2A]'}`} />
                  </div>
                  <span className="text-[10px] text-[#A3A3A3]">Độ mạnh: <strong className="text-white">{strength.text}</strong></span>
                </div>
              )}
            </div>

            {/* Chọn vai trò */}
            <div>
              <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Bạn muốn tham gia với vai trò:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setRole('RENTER')}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors select-none flex flex-col justify-between ${
                    role === 'RENTER'
                      ? 'bg-[#1C1C1C] border-[#E11D2E]'
                      : 'bg-[#141414] border-[#2A2A2A] hover:border-[#2A2A2A]/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Người thuê (Renter)</span>
                    {role === 'RENTER' && <CheckCircle2 className="w-4 h-4 text-[#E11D2E]" />}
                  </div>
                  <p className="text-[10px] text-[#A3A3A3]">Tìm kiếm và thuê người chơi cùng</p>
                </div>

                <div
                  onClick={() => setRole('COMPANION')}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors select-none flex flex-col justify-between ${
                    role === 'COMPANION'
                      ? 'bg-[#1C1C1C] border-[#E11D2E]'
                      : 'bg-[#141414] border-[#2A2A2A] hover:border-[#2A2A2A]/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Đồng hành (Companion)</span>
                    {role === 'COMPANION' && <CheckCircle2 className="w-4 h-4 text-[#E11D2E]" />}
                  </div>
                  <p className="text-[10px] text-[#A3A3A3]">Mở lịch rảnh, nhận đơn và kiếm thu nhập</p>
                </div>
              </div>
            </div>

            {/* Ngày sinh & Độ tuổi */}
            <div>
              <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Ngày sinh (Tùy chọn)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-white text-xs sm:text-sm focus:border-[#E11D2E] focus:outline-none transition-colors"
              />
            </div>

            {/* Checkbox Độ tuổi 18+ */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-[#A3A3A3] cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={isOver18}
                  onChange={(e) => setIsOver18(e.target.checked)}
                  className="rounded bg-[#1C1C1C] border-[#2A2A2A] text-[#E11D2E] focus:ring-0 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                />
                <span className="leading-snug">
                  Tôi xác nhận <strong className="text-white">đã từ đủ 18 tuổi trở lên</strong> theo quy định tham gia nền tảng.
                </span>
              </label>
            </div>

            {/* Checkbox Điều khoản & Quy chế tài khoản */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-[#A3A3A3] cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded bg-[#1C1C1C] border-[#2A2A2A] text-[#E11D2E] focus:ring-0 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                />
                <span className="leading-snug">
                  Tôi đồng ý với <strong className="text-white">Điều khoản dịch vụ</strong> (chỉ chơi cùng, <strong className="text-white">cấm mua bán, cho thuê tài khoản hoặc cày thuê</strong>) và xác nhận hiểu rõ cơ chế <strong className="text-[#22C55E]">Ký quỹ Escrow</strong> bảo vệ quyền lợi giao dịch.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <span>Hoàn tất đăng ký</span>
              )}
            </button>

            {/* Google OAuth2 Quick Register Button (FR-001) */}
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="pt-1">
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-[#2A2A2A] w-full" />
                  <span className="bg-[#141414] px-2 text-[10px] text-[#6B6B6B] uppercase font-semibold tracking-wider">hoặc</span>
                  <div className="border-t border-[#2A2A2A] w-full" />
                </div>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Đăng nhập hoặc đăng ký với Google</span>
                </button>
              </div>
            )}
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-4 border-t border-[#2A2A2A] text-center text-xs text-[#A3A3A3]">
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#E11D2E] hover:underline font-bold transition cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
