import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import { ErrorBoundary } from './common/ErrorBoundary';

export interface DemoAccount {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  role_label: string;
  role_badge_class: string;
  description: string;
  avatar: string;
}

const DEFAULT_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    user_id: 'u-renter-01',
    email: 'renter1@instasquad.test',
    display_name: 'Minh Hoàng',
    role: 'RENTER',
    role_label: 'Renter',
    role_badge_class: 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]',
    description: 'Có sẵn 500.000đ trong ví để demo đặt lịch và ký quỹ Escrow',
    avatar: '/images/avatars/av01.jpg',
  },
  {
    user_id: 'u-renter-02',
    email: 'renter2@instasquad.test',
    display_name: 'Khánh Vy',
    role: 'RENTER',
    role_label: 'Renter',
    role_badge_class: 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]',
    description: 'Ví 0đ – dùng để demo quy trình nạp tiền giả lập và thanh toán',
    avatar: '/images/avatars/av02.jpg',
  },
  {
    user_id: 'u-comp-01',
    email: 'companion1@instasquad.test',
    display_name: 'Bảo Ngọc',
    role: 'COMPANION',
    role_label: 'Companion',
    role_badge_class: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    description: 'Companion – LMHT (Uy tín 95.0, 100k/h, sẵn sàng nhận đơn)',
    avatar: '/images/avatars/av03.jpg',
  },
  {
    user_id: 'u-comp-02',
    email: 'companion2@instasquad.test',
    display_name: 'Tuấn Anh',
    role: 'COMPANION',
    role_label: 'Companion',
    role_badge_class: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    description: 'Companion – VALORANT (Mới 80.0, 80k/h, demo nhận/từ chối)',
    avatar: '/images/avatars/av04.jpg',
  },
  {
    user_id: 'u-cs-01',
    email: 'cs_agent@instasquad.test',
    display_name: 'Nguyễn Văn CS',
    role: 'CS_AGENT',
    role_label: 'CS Agent',
    role_badge_class: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    description: 'Nhân viên CS – Xử lý khiếu nại, phân xử RMA và đóng băng Escrow',
    avatar: '/images/avatars/av05.jpg',
  },
  {
    user_id: 'u-auditor-01',
    email: 'auditor@instasquad.test',
    display_name: 'Trần Thị Kiểm Toán',
    role: 'AUDITOR',
    role_label: 'Auditor',
    role_badge_class: 'bg-[#E11D2E]/10 text-[#E11D2E] border-[#E11D2E]/30',
    description: 'Kiểm toán viên – Duyệt yêu cầu rút tiền và đối soát Sổ cái kép',
    avatar: '/images/avatars/av01.jpg',
  },
  {
    user_id: 'u-admin-01',
    email: 'admin@instasquad.test',
    display_name: 'Quản Trị Viên',
    role: 'ADMIN',
    role_label: 'Admin',
    role_badge_class: 'bg-[#E11D2E]/10 text-[#E11D2E] border-[#E11D2E]/30',
    description: 'Quản trị viên toàn hệ thống – Toàn quyền giám sát sàn',
    avatar: '/images/avatars/av02.jpg',
  },
];

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  onSwitchToRegister: () => void;
  initialEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToRegister,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(DEFAULT_DEMO_ACCOUNTS);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // Google OAuth2 & Onboarding State (FR-001)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingToken, setOnboardingToken] = useState('');
  const [onboardingRole, setOnboardingRole] = useState<'RENTER' | 'COMPANION'>('RENTER');
  const [onboardingDob, setOnboardingDob] = useState('');
  const [onboardingTerms, setOnboardingTerms] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const showDemoColumn = 
    import.meta.env.DEV || 
    import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true' || 
    (typeof window !== 'undefined' && (window.location.search.includes('dev=1') || window.location.search.includes('demo=1')));

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setPassword('Demo@123456');
    }
  }, [initialEmail]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/demo-accounts')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setDemoAccounts(data.data);
          }
        })
        .catch(() => {
          // fallback
        });
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      if (googleClientId && !document.getElementById('google-gsi-client')) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          console.warn('[Google GSI] Không thể tải thư viện Google Identity Services');
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      console.warn('[Google GSI] Lỗi tải script:', e);
    }
  }, [googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('token', data.data.token);
        } else {
          sessionStorage.setItem('token', data.data.token);
        }
        onSuccess(data.data.token, data.data.user);
        onClose();
      } else {
        const message = data.error?.message || 'Email hoặc mật khẩu không chính xác.';
        setErrorMsg(message);
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối máy chủ: ${err.message || 'Vui lòng kiểm tra lại mạng.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword('Demo@123456');
    setErrorMsg('');
  };

  const handleCopyEmail = (e: React.MouseEvent, targetEmail: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(targetEmail);
    setCopiedEmail(targetEmail);
    setTimeout(() => {
      setCopiedEmail(null);
    }, 2000);
  };

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setForgotStep(2);
      } else {
        setErrorMsg(data.error?.message || 'Không thể gửi mã OTP.');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !newPassword) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForgotSuccessMsg('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
        setIsForgotPassword(false);
        setEmail(forgotEmail);
        setPassword(newPassword);
      } else {
        setErrorMsg(data.error?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setErrorMsg('');
    if (!googleClientId) return;

    if (typeof (window as any).google !== 'undefined' && (window as any).google.accounts?.id) {
      (window as any).google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          if (!response.credential) return;
          try {
            setLoading(true);
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
              if (data.data.needs_onboarding) {
                setOnboardingToken(data.data.token);
                setShowOnboarding(true);
              } else {
                onSuccess(data.data.token, data.data.user);
              }
            } else {
              setErrorMsg(data.error?.message || 'Đăng nhập Google thất bại.');
            }
          } catch (err: any) {
            setErrorMsg(`Lỗi kết nối: ${err.message}`);
          } finally {
            setLoading(false);
          }
        },
      });
      (window as any).google.accounts.id.prompt();
    } else {
      const promptToken = window.prompt(
        'Nhập Google ID Token để kiểm thử (hoặc cấu hình Google Client ID thật trong .env theo docs/GOOGLE_OAUTH.md):'
      );
      if (promptToken) {
        setLoading(true);
        fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: promptToken }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              if (data.data.needs_onboarding) {
                setOnboardingToken(data.data.token);
                setShowOnboarding(true);
              } else {
                onSuccess(data.data.token, data.data.user);
              }
            } else {
              setErrorMsg(data.error?.message || 'Đăng nhập Google thất bại.');
            }
          })
          .catch((err) => setErrorMsg(`Lỗi kết nối: ${err.message}`))
          .finally(() => setLoading(false));
      }
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingDob) {
      setOnboardingError('Vui lòng chọn ngày sinh.');
      return;
    }
    if (!onboardingTerms) {
      setOnboardingError('Bạn phải đồng ý với Điều khoản dịch vụ.');
      return;
    }

    setOnboardingLoading(true);
    setOnboardingError('');
    try {
      const res = await fetch('/api/auth/google/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${onboardingToken}`,
        },
        body: JSON.stringify({
          role: onboardingRole,
          date_of_birth: onboardingDob,
          terms_accepted: onboardingTerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.data.token, data.data.user);
      } else {
        setOnboardingError(data.error?.message || 'Hoàn tất hồ sơ thất bại.');
      }
    } catch (err: any) {
      setOnboardingError(`Lỗi kết nối: ${err.message}`);
    } finally {
      setOnboardingLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className={`relative w-full max-h-[92vh] overflow-y-auto bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl transition-all ${
          showDemoColumn ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-[#1C1C1C] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] transition cursor-pointer"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`grid grid-cols-1 ${showDemoColumn ? 'md:grid-cols-12' : ''} divide-y md:divide-y-0 md:divide-x divide-[#2A2A2A]`}>
          
          {/* CỘT TRÁI: FORM ĐĂNG NHẬP HOẶC QUÊN MẬT KHẨU */}
          <div className={`${showDemoColumn ? 'md:col-span-6 lg:col-span-7' : 'w-full'} p-6 sm:p-8 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/30 flex items-center justify-center text-[#E11D2E]">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E11D2E]">INSTASQUAD</span>
              </div>

              {isForgotPassword ? (
                <>
                  <h2 id="login-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Đặt lại mật khẩu (UC01)
                  </h2>
                  <p className="text-xs text-[#A3A3A3] mt-1">
                    {forgotStep === 1 
                      ? 'Nhập email tài khoản để nhận mã OTP xác thực (10 phút TTL).' 
                      : `Mã OTP đã gửi đến ${forgotEmail}. Nhập mã và mật khẩu mới.`}
                  </p>
                </>
              ) : (
                <>
                  <h2 id="login-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Đăng nhập tài khoản
                  </h2>
                  <p className="text-xs text-[#A3A3A3] mt-1">
                    Chào mừng bạn quay trở lại sàn thương mại game
                  </p>
                </>
              )}

              {/* Success Alert */}
              {forgotSuccessMsg && (
                <div className="mt-4 p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] text-xs flex items-start gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{forgotSuccessMsg}</span>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="mt-4 p-3 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/40 text-[#E11D2E] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {showOnboarding ? (
                <div className="mt-5 space-y-4">
                  <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Hoàn tất hồ sơ ban đầu (FR-001)
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Tài khoản Google cần xác nhận vai trò và độ tuổi trước khi kích hoạt ví.
                    </p>
                  </div>

                  {onboardingError && (
                    <div className="p-2.5 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/40 text-[#E11D2E] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{onboardingError}</span>
                    </div>
                  )}

                  <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                        Bạn tham gia với vai trò:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOnboardingRole('RENTER')}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                            onboardingRole === 'RENTER'
                              ? 'bg-red-950/40 border-[#E11D2E] text-white font-bold'
                              : 'bg-[#1C1C1C] border-[#2A2A2A] text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs">Người thuê</div>
                          <div className="text-[10px] text-slate-400 font-normal">Tìm đồng đội chơi game</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnboardingRole('COMPANION')}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                            onboardingRole === 'COMPANION'
                              ? 'bg-red-950/40 border-[#E11D2E] text-white font-bold'
                              : 'bg-[#1C1C1C] border-[#2A2A2A] text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs">Companion</div>
                          <div className="text-[10px] text-slate-400 font-normal">Đồng hành & nhận thu nhập</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="onboarding-dob">
                        Ngày sinh (Yêu cầu từ đủ 18 tuổi)
                      </label>
                      <input
                        id="onboarding-dob"
                        type="date"
                        required
                        value={onboardingDob}
                        onChange={(e) => setOnboardingDob(e.target.value)}
                        className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#6B6B6B] transition-colors outline-none"
                      />
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 text-xs text-[#A3A3A3] hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={onboardingTerms}
                          onChange={(e) => setOnboardingTerms(e.target.checked)}
                          className="mt-0.5 rounded bg-[#1C1C1C] border-[#2A2A2A] text-[#E11D2E] focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] leading-relaxed">
                          Tôi xác nhận đã đủ 18 tuổi và đồng ý với Điều khoản dịch vụ và Chính sách ký quỹ Escrow.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={onboardingLoading}
                      className="w-full py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/50"
                    >
                      {onboardingLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang khởi tạo ví...</span>
                        </>
                      ) : (
                        <span>Hoàn tất & Khởi tạo ví</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : isForgotPassword ? (
                /* QUÊN MẬT KHẨU FLOW */
                forgotStep === 1 ? (
                  <form onSubmit={handleSendForgotOtp} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="forgot-email">
                        Địa chỉ Email nhận mã OTP
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-[#6B6B6B] transition-colors outline-none"
                        />
                        <Mail className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-3 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-3 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang gửi mã OTP...</span>
                        </>
                      ) : (
                        <span>Gửi mã xác nhận qua Email</span>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setErrorMsg('');
                        }}
                        className="text-xs text-[#A3A3A3] hover:text-white transition cursor-pointer"
                      >
                        ← Quay lại Đăng nhập
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="forgot-otp">
                        Mã OTP gồm 6 chữ số
                      </label>
                      <input
                        id="forgot-otp"
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#E11D2E] rounded-lg py-2.5 px-3 text-center tracking-widest text-lg font-mono text-white placeholder-[#6B6B6B] transition-colors outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="new-password">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mật khẩu tối thiểu 6 ký tự"
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
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-3 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang đổi mật khẩu...</span>
                        </>
                      ) : (
                        <span>Xác nhận đổi mật khẩu</span>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="text-[#A3A3A3] hover:text-white transition cursor-pointer"
                      >
                        Gửi lại mã OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setErrorMsg('');
                        }}
                        className="text-[#A3A3A3] hover:text-white transition cursor-pointer"
                      >
                        Quay lại Đăng nhập
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* FORM ĐĂNG NHẬP THƯỜNG */
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="login-email">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <input
                        id="login-email"
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

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5" htmlFor="login-password">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
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
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember & Forgot */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-[#A3A3A3] hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded bg-[#1C1C1C] border-[#2A2A2A] text-[#E11D2E] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(email || '');
                        setForgotStep(1);
                        setErrorMsg('');
                        setForgotSuccessMsg(null);
                      }}
                      className="text-[#E11D2E] hover:underline font-medium cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <span>Đăng nhập</span>
                    )}
                  </button>

                  {/* Google OAuth2 Sign-In Button (FR-001) */}
                  {googleClientId && (
                    <ErrorBoundary compact fallbackMessage="Không thể tải tính năng đăng nhập Google.">
                      <div className="pt-2">
                        <div className="relative flex items-center justify-center my-3">
                          <div className="border-t border-[#2A2A2A] w-full" />
                          <span className="bg-[#141414] px-2 text-[10px] text-[#6B6B6B] uppercase font-semibold tracking-wider">hoặc</span>
                          <div className="border-t border-[#2A2A2A] w-full" />
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="w-full py-2.5 px-4 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Đăng nhập với Google</span>
                        </button>
                      </div>
                    </ErrorBoundary>
                  )}
                </form>
              )}
            </div>

            {/* Bottom Register Switch */}
            <div className="mt-6 pt-4 border-t border-[#2A2A2A] text-center text-xs text-[#A3A3A3]">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-[#E11D2E] hover:underline font-bold transition cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG TÀI KHOẢN DEMO */}
          {showDemoColumn && (
            <div className="md:col-span-6 lg:col-span-5 p-6 sm:p-7 bg-[#0A0A0A] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pr-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                    <h3 className="font-bold text-sm text-white">Tài khoản demo</h3>
                  </div>
                  <span className="text-[10px] font-mono bg-[#141414] border border-[#2A2A2A] text-[#A3A3A3] px-2 py-0.5 rounded-full mr-1">
                    Demo@123456
                  </span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] mb-4">
                  Bấm vào thẻ để <strong>điền sẵn</strong> thông tin vào form (không tự động login):
                </p>

                {/* Danh sách cards */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {demoAccounts.map((acc) => {
                    const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleSelectDemoAccount(acc)}
                        className={`group p-2.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 select-none ${
                          isSelected
                            ? 'bg-[#1C1C1C] border-[#E11D2E]'
                            : 'bg-[#141414] border-[#2A2A2A] hover:border-[#E11D2E]/40'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#0A0A0A] border border-[#2A2A2A]">
                          <img
                            src={acc.avatar}
                            alt={acc.display_name}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = '/images/avatars/av01.jpg';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate group-hover:text-[#E11D2E] transition-colors">
                              {acc.display_name}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${acc.role_badge_class}`}>
                              {acc.role_label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#A3A3A3] mt-0.5">
                            <span className="font-mono text-[10px] truncate max-w-[170px] text-[#A3A3A3]">
                              {acc.email}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(e, acc.email)}
                              className="p-1 hover:text-white text-[#6B6B6B] rounded transition cursor-pointer"
                              title="Sao chép email"
                            >
                              {copiedEmail === acc.email ? (
                                <Check className="w-3 h-3 text-[#22C55E]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <p className="text-[10px] text-[#6B6B6B] mt-1 line-clamp-1">
                            {acc.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[10px] text-[#6B6B6B]">
                <span>Chỉ dùng cho môi trường demo</span>
                <span className="text-[#E11D2E] font-medium">Bảo vệ đồ án</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
