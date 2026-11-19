import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  LayoutDashboard, 
  Calendar, 
  Wallet, 
  ShieldAlert, 
  BarChart3, 
  Search, 
  Bell, 
  LogOut, 
  Clock, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MessageSquare, 
  Upload, 
  Star, 
  Eye, 
  Menu,
  FileText,
  User,
  MailWarning,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { BookingCountdown } from './BookingCountdown';
import { isBookingActive } from '../common/bookingStates';
import { Avatar } from './common/Avatar';
import { sanitizeUIMessage, formatShortId } from '../common/messages.vi';

interface AuthenticatedAppFrameProps {
  currentUser: any;
  activeTab: 'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view' | 'admin_dashboard' | 'admin_bookings' | 'profile';
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  onTopupClick: () => void;
  /** Mở màn xác minh email (UC01) — hiện khi tài khoản chưa xác minh. */
  onVerifyEmailClick?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  myBookings: any[];
  companions: any[];
  onOpenBookingDetail: (id: string) => void;
  onHoldEscrow: (id: string) => void;
  onOpenCancelModal: (booking: any) => void;
  onTimeoutBooking: (id: string) => Promise<void> | void;
  onOpenRoom: (id: string) => void;
  onOpenUploadEvidence: (id: string) => void;
  onOpenExplanation?: (id: string) => void;
  onOpenReview: (id: string) => void;
  onBookCompanion: (companion: any) => void;
  loading: boolean;
  children: React.ReactNode;
}

export const AuthenticatedAppFrame: React.FC<AuthenticatedAppFrameProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onTopupClick,
  onVerifyEmailClick,
  searchQuery,
  setSearchQuery,
  myBookings,
  companions,
  onOpenBookingDetail,
  onHoldEscrow,
  onOpenCancelModal,
  onTimeoutBooking,
  onOpenRoom,
  onOpenUploadEvidence,
  onOpenExplanation,
  onOpenReview,
  onBookCompanion,
  loading,
  children,
}) => {
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED_REFUNDED'>('ALL');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Chỉ coi là chưa xác minh khi server trả rõ false (tài khoản cũ / Google OAuth có thể không có trường này)
  const needsEmailVerification = currentUser?.is_email_verified === false;
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null | undefined>(currentUser?.avatar_url);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());

  useEffect(() => {
    setCurrentAvatarUrl(currentUser?.avatar_url);
  }, [currentUser?.avatar_url]);

  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      if (e.detail && e.detail.avatar_url !== undefined) {
        setCurrentAvatarUrl(e.detail.avatar_url);
        setAvatarVersion(Date.now());
      }
    };
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unread_count || 0);
      }
    } catch (e) {
      console.error('Lỗi tải thông báo:', e);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Lỗi đánh dấu đã đọc:', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter bookings (Mục B & C - Đợt E1: 5 nhóm rõ ràng)
  const filteredBookings = myBookings.filter((b) => {
    if (bookingFilter === 'ALL') return true;
    if (bookingFilter === 'ACTIVE') {
      return isBookingActive(b);
    }
    if (bookingFilter === 'COMPLETED') {
      return b.status === 'COMPLETED';
    }
    if (bookingFilter === 'DISPUTED') {
      return b.status === 'DISPUTED' && b.dispute?.status !== 'RESOLVED';
    }
    if (bookingFilter === 'CANCELLED_REFUNDED') {
      return (
        ['CANCELLED', 'REFUNDED', 'REJECTED', 'TIMEOUT'].includes(b.status) ||
        (b.status === 'DISPUTED' && b.dispute?.status === 'RESOLVED')
      );
    }
    return true;
  });

  // Chỉ lấy đơn ĐANG HOẠT ĐỘNG thật sự cho thẻ "Đơn hẹn đang hoạt động" (Sửa triệt để Lỗi A.1)
  const activeBookings = myBookings.filter(isBookingActive);
  const urgentBooking = activeBookings.length > 0 ? activeBookings[0] : null;

  // Online companions for Right Panel (loại trừ chính mình nếu đang đăng nhập tài khoản Companion)
  const filteredCompanions = companions.filter((c) => {
    const compUserId = c.userId || c.user_id || c.user?.user_id;
    return compUserId !== currentUser?.user_id;
  });
  const onlineComps = filteredCompanions.filter((c) => c.availability === 'ONLINE').slice(0, 5);
  const displayOnline = onlineComps.length > 0 ? onlineComps : filteredCompanions.slice(0, 5);

  const scrollBookings = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-w-0 min-h-screen bg-[#0A0A0A] p-2 sm:p-4 md:p-6 text-white flex flex-col items-center">
      {/* w-full + min-w-0: khung nằm trong cột flex `items-center` của App nên không tự giãn theo màn hình — thiếu 2 lớp này
          khung phình tới 1440px trên laptop, đẩy thanh bên và nút header (nạp tiền, tài khoản) ra ngoài màn hình. */}
      {/* Outer Container / App Frame (rounded-3xl, 24px radius, border #2A2A2A, #141414) */}
      <div className="w-full min-w-0 max-w-[1440px] bg-[#141414] border border-[#2A2A2A] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[92vh]">
        
        {/* ================= 1. LEFT SIDEBAR (~240px) ================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#141414] border-r border-[#2A2A2A] p-5 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Logo */}
            <div 
              onClick={() => { setActiveTab('catalog'); setMobileSidebarOpen(false); }}
              className="flex items-center space-x-2.5 mb-8 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-lg bg-[#E11D2E] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-wider text-white">
                INSTA<span className="text-[#E11D2E]">SQUAD</span>
              </span>
            </div>

            {/* Navigation Groups */}
            <div className="space-y-6">
              {/* Group: MENU CHÍNH THEO VAI TRÒ (Đợt E1) */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] px-3 mb-2 block">
                  {currentUser.role === 'ADMIN' ? 'Quản trị hệ thống' : currentUser.role === 'CS_AGENT' ? 'Chăm sóc khách hàng' : currentUser.role === 'AUDITOR' ? 'Kiểm toán hệ thống' : 'Menu chính'}
                </span>
                <nav className="space-y-1">
                  {/* Renter View */}
                  {currentUser.role === 'RENTER' && (
                    <>
                      <button
                        onClick={() => { setActiveTab('catalog'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'catalog'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>Sàn Companion & Game</span>
                      </button>
                      <a
                        href="#my-bookings"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-colors cursor-pointer text-left"
                      >
                        <Clock className="w-4 h-4 text-[#A3A3A3]" />
                        <span>Đơn của tôi ({myBookings.length})</span>
                      </a>
                    </>
                  )}

                  {/* Companion View */}
                  {currentUser.role === 'COMPANION' && (
                    <>
                      <button
                        onClick={() => { setActiveTab('companion_dashboard'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'companion_dashboard'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard Companion</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('catalog'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'catalog'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>Khám phá game & Sàn</span>
                      </button>
                    </>
                  )}

                  {/* CS Agent View */}
                  {currentUser.role === 'CS_AGENT' && (
                    <button
                      onClick={() => { setActiveTab('cs_view'); setMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                        activeTab === 'cs_view'
                          ? 'bg-[#E11D2E] text-white'
                          : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Hàng chờ khiếu nại (CS)</span>
                    </button>
                  )}

                  {/* Auditor View */}
                  {currentUser.role === 'AUDITOR' && (
                    <button
                      onClick={() => { setActiveTab('auditor_view'); setMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                        activeTab === 'auditor_view'
                          ? 'bg-[#E11D2E] text-white'
                          : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Kiểm toán Sổ cái</span>
                    </button>
                  )}

                  {/* Admin View */}
                  {currentUser.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => { setActiveTab('admin_dashboard'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'admin_dashboard'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#FACC15]" />
                        <span>Tổng quan quản trị</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('admin_bookings'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'admin_bookings'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Quản lý đơn hàng</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('cs_view'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'cs_view'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Quản lý CS / RMA</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('auditor_view'); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                          activeTab === 'auditor_view'
                            ? 'bg-[#E11D2E] text-white'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Kiểm toán Sổ cái</span>
                      </button>
                    </>
                  )}

                  {/* Profile link for all users */}
                  <button
                    onClick={() => { setActiveTab('profile'); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                      activeTab === 'profile'
                        ? 'bg-[#E11D2E] text-white'
                        : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                    }`}
                  >
                    <User className="w-4 h-4 text-sky-400" />
                    <span>Hồ sơ của tôi</span>
                  </button>
                </nav>
              </div>

              {/* Group: GIAO DỊCH (Chỉ dành cho Renter) */}
              {currentUser.role === 'RENTER' && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] px-3 mb-2 block">
                    Tài chính & Ví
                  </span>
                  <nav className="space-y-1">
                    <button
                      onClick={onTopupClick}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-colors cursor-pointer text-left"
                    >
                      <Wallet className="w-4 h-4 text-[#22C55E]" />
                      <span>Nạp tiền vào ví</span>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card: Chỉ hiển thị cho Renter */}
          {currentUser.role === 'RENTER' && (
            <div className="mt-6 pt-4 border-t border-[#2A2A2A]">
              <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#A3A3A3]">Số dư khả dụng</span>
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                </div>
                <p className="text-base font-bold text-[#22C55E] font-mono leading-none">
                  {currentUser.wallet?.available_balance?.toLocaleString('vi-VN') || 0} đ
                </p>
                {currentUser.wallet?.escrow_balance > 0 && (
                  <p className="text-[10px] text-[#F59E0B]">
                    Escrow giữ: {currentUser.wallet.escrow_balance.toLocaleString('vi-VN')} đ
                  </p>
                )}
                <button
                  onClick={onTopupClick}
                  className="w-full py-2 bg-[#E11D2E] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nạp tiền vào ví</span>
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Overlay for mobile sidebar */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}

        {/* ================= 2. MAIN APP CONTENT ================= */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#141414]">
          {/* Topbar inside Frame */}
          <header className="h-16 border-b border-[#2A2A2A] px-4 md:px-6 flex items-center justify-between gap-4 bg-[#141414]">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 text-[#A3A3A3] hover:text-white rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search Pill */}
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm game, companion, đơn..."
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#E11D2E] transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-[#6B6B6B] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Right Topbar Elements */}
            <div className="flex items-center space-x-3">
              {/* Notification Bell with unread counter and popover (Đợt D1b - Mục C.4) */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    loadNotifications();
                  }}
                  className="relative p-2 rounded-full bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] transition cursor-pointer"
                  title="Thông báo in-app"
                  aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
                >
                  <Bell className="w-4 h-4" />
                  {/* Chỉ hiện huy hiệu khi thật sự có thông báo chưa đọc (trước đây luôn có chấm đỏ mờ gây hiểu nhầm) */}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#E11D2E] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-[#141414] min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Popover */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                    <div className="p-3.5 border-b border-[#27272A] flex items-center justify-between bg-[#141417]">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-sky-400" />
                        <span className="font-bold text-white">Thông báo in-app</span>
                        {unreadCount > 0 && (
                          <span className="bg-rose-950 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-rose-800">
                            {unreadCount} chưa đọc
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                        >
                          Đã đọc tất cả
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#27272A]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 italic">
                          Không có thông báo mới nào.
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const cleanTitle = sanitizeUIMessage(notif.title);
                          const cleanMessage = sanitizeUIMessage(notif.message);
                          return (
                            <div
                              key={notif.notification_id}
                              onClick={() => {
                                if (notif.target_url) {
                                  if (notif.target_url.startsWith('/khieu-nai')) {
                                    if (currentUser?.role === 'CS_AGENT') setActiveTab('cs_view');
                                    else if (currentUser?.role === 'ADMIN') setActiveTab('admin_dashboard');
                                  } else if (notif.target_url.startsWith('/don-hang')) {
                                    if (currentUser?.role === 'COMPANION') setActiveTab('companion_dashboard');
                                    else if (currentUser?.role === 'ADMIN') setActiveTab('admin_bookings');
                                  } else if (notif.target_url.startsWith('/vi')) {
                                    if (currentUser?.role === 'RENTER') onTopupClick();
                                  }
                                }
                                setNotificationsOpen(false);
                              }}
                              className={`p-3 space-y-1 transition hover:bg-[#222225] cursor-pointer ${
                                !notif.is_read ? 'bg-sky-950/20' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white flex items-center gap-1.5">
                                  {!notif.is_read && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                  )}
                                  {cleanTitle}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(notif.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                {cleanMessage}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Pill Badge: Chỉ hiển thị cho Renter & Companion (Ẩn với Admin, CS, Auditor) */}
              {!['ADMIN', 'CS_AGENT', 'AUDITOR'].includes(currentUser?.role) && (
                <div
                  onClick={currentUser?.role === 'RENTER' ? onTopupClick : undefined}
                  className={`flex items-center space-x-2 bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] px-3 py-1.5 rounded-full transition select-none ${
                    currentUser?.role === 'RENTER' ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  title={currentUser?.role === 'RENTER' ? 'Nạp tiền vào ví' : 'Số dư khả dụng'}
                >
                  <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-xs font-bold text-[#22C55E] font-mono">
                    {currentUser.wallet?.available_balance?.toLocaleString('vi-VN') || 0} đ
                  </span>
                  {currentUser?.role === 'RENTER' && (
                    <span className="text-[10px] text-white bg-[#E11D2E] px-1.5 py-0.2 rounded-full font-bold">
                      +
                    </span>
                  )}
                </div>
              )}

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-full pl-1.5 pr-2.5 py-1 transition cursor-pointer"
                >
                  <Avatar
                    src={currentAvatarUrl}
                    name={currentUser?.display_name}
                    size="sm"
                    version={avatarVersion}
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                      {currentUser?.display_name}
                    </span>
                    <span className="text-[9px] text-[#A3A3A3] font-mono">
                      {currentUser?.role}
                    </span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#141414] border border-[#2A2A2A] shadow-2xl p-2 z-50 divide-y divide-[#2A2A2A]">
                    <div className="px-3 py-2">
                      <p className="text-xs font-bold text-white truncate">{currentUser?.display_name}</p>
                      <p className="text-[10px] text-[#A3A3A3] truncate">{currentUser?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setActiveTab('profile');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-[#2A2A2A] transition text-left cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <span>Hồ sơ của tôi</span>
                      </button>
                      {needsEmailVerification && onVerifyEmailClick && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onVerifyEmailClick();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 hover:bg-amber-500/10 transition text-left cursor-pointer"
                        >
                          <MailWarning className="w-3.5 h-3.5" />
                          <span>Xác minh email</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#E11D2E] hover:bg-[#E11D2E]/10 transition text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Body */}
          <main className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-64px)]">
            {/* UC01: nhắc xác minh email — nạp tiền / đặt lịch bị chặn cho tới khi xác minh */}
            {needsEmailVerification && onVerifyEmailClick && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10" role="status">
                <MailWarning className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-100 flex-1">
                  Email <span className="font-semibold break-all">{currentUser?.email}</span> chưa được xác minh. Xác minh để nạp tiền vào ví và đặt lịch.
                </p>
                <button
                  type="button"
                  onClick={onVerifyEmailClick}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition cursor-pointer"
                >
                  Xác minh ngay
                </button>
              </div>
            )}
            {/* If in catalog view, show the 2-column top section + My Bookings lower section */}
            {activeTab === 'catalog' && (
              <>
                {/* 2-COLUMN MAIN CONTENT (Hero / Active Session + Side Panel) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column (8 cols): Hero or Active Session Card */}
                  <div className="lg:col-span-8 bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 md:p-6 flex flex-col justify-between">
                    {urgentBooking ? (
                      /* Highlight Active/Urgent Booking */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D2E] animate-ping" />
                            <h2 className="text-base md:text-lg font-bold text-white">
                              Đơn hẹn đang hoạt động
                            </h2>
                          </div>
                          <StatusBadge status={urgentBooking.status} />
                        </div>

                        {/* Banner cảnh báo khiếu nại đang chờ bổ sung chứng cứ */}
                        {urgentBooking.status === 'DISPUTED' && (urgentBooking.dispute?.status === 'EVIDENCE_PENDING' || urgentBooking.status_reason?.includes('bổ sung')) && (
                          <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <span>⚠️ CS đang yêu cầu bổ sung chứng cứ / giải trình cho khiếu nại. Vui lòng nộp trước thời hạn.</span>
                            {urgentBooking.dispute?.evidence_deadline && (
                              <span className="font-mono text-[11px] font-bold text-amber-300 shrink-0">
                                Hạn: {new Date(urgentBooking.dispute.evidence_deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="p-4 bg-[#141414] border border-[#2A2A2A] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={currentUser?.role === 'COMPANION' ? urgentBooking.renter?.avatar_url : urgentBooking.companion?.user?.avatar_url}
                              name={currentUser?.role === 'COMPANION'
                                ? (urgentBooking.renter?.display_name || urgentBooking.renter?.email || 'Khách thuê')
                                : (urgentBooking.companion?.user?.display_name || 'Đồng đội')}
                              size="md"
                            />
                            <div>
                              <p className="text-xs text-[#A3A3A3]">
                                {currentUser?.role === 'COMPANION' ? 'Khách thuê (Renter)' : 'Companion'}
                              </p>
                              <p className="text-sm font-bold text-white">
                                {currentUser?.role === 'COMPANION'
                                  ? (urgentBooking.renter?.display_name || urgentBooking.renter?.email || 'Khách thuê')
                                  : (urgentBooking.companion?.user?.display_name || 'Đồng đội')}
                              </p>
                              <p className="text-xs text-[#A3A3A3] mt-0.5">
                                {urgentBooking.companion?.game?.game_name} • Phí: {urgentBooking.total_fee_snapshot?.toLocaleString('vi-VN')} VND
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {urgentBooking.status === 'PENDING_ACCEPTANCE' && (
                              <button
                                disabled={loading}
                                onClick={() => onHoldEscrow(urgentBooking.booking_id)}
                                className="px-4 py-2 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Ký quỹ Escrow ({urgentBooking.total_fee_snapshot?.toLocaleString('vi-VN')} đ)
                              </button>
                            )}

                            {urgentBooking.status === 'WAITING_COMPANION_RESPONSE' && (
                              <div className="flex items-center gap-2">
                                <BookingCountdown
                                  status={urgentBooking.status}
                                  responseDeadline={urgentBooking.response_deadline}
                                  createdAt={urgentBooking.created_at}
                                  onTriggerTimeout={async () => {
                                    await onTimeoutBooking(urgentBooking.booking_id);
                                  }}
                                  canTrigger={true}
                                  loading={loading}
                                  compact={true}
                                />
                                <button
                                  disabled={loading}
                                  onClick={() => onOpenCancelModal(urgentBooking)}
                                  className="px-3 py-1.5 bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-xs text-[#A3A3A3] hover:text-white rounded-lg transition-colors cursor-pointer"
                                >
                                  Hủy đơn
                                </button>
                              </div>
                            )}

                            {(urgentBooking.status === 'ACCEPTED' || urgentBooking.status === 'IN_SESSION') && (
                              <button
                                disabled={loading}
                                onClick={() => onOpenRoom(urgentBooking.booking_id)}
                                className="px-4 py-2 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Vào phòng chơi</span>
                              </button>
                            )}

                            {urgentBooking.status === 'DISPUTED' && (
                              <div className="flex items-center gap-2">
                                {currentUser?.role === 'COMPANION' ? (
                                  <button
                                    disabled={loading}
                                    onClick={() => onOpenExplanation ? onOpenExplanation(urgentBooking.dispute?.dispute_id || urgentBooking.booking_id) : onOpenUploadEvidence(urgentBooking.dispute?.dispute_id || urgentBooking.booking_id)}
                                    className="px-3 py-1.5 bg-rose-600/30 text-rose-300 border border-rose-500/50 hover:bg-rose-600/50 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Giải trình khiếu nại</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled={loading}
                                    onClick={() => onOpenUploadEvidence(urgentBooking.dispute?.dispute_id || urgentBooking.booking_id)}
                                    className="px-3 py-1.5 bg-[#E11D2E]/20 text-[#E11D2E] border border-[#E11D2E]/40 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Nộp chứng cứ bổ sung</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {urgentBooking.status === 'COMPLETED' && (
                              <button
                                disabled={loading}
                                onClick={() => onOpenReview(urgentBooking.booking_id)}
                                className="px-3 py-1.5 bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Star className="w-3.5 h-3.5 fill-[#FACC15]" />
                                <span>Đánh giá</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#A3A3A3] pt-2">
                          <span>Tiền được giữ trong ví ký quỹ cho đến khi bạn xác nhận hoàn thành</span>
                          <button
                            onClick={() => onOpenBookingDetail(urgentBooking.booking_id)}
                            className="text-[#E11D2E] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Chi tiết đơn <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Friendly Empty State khi không có đơn nào đang hoạt động (Sửa triệt để Lỗi A.1) */
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <h2 className="text-base md:text-lg font-bold text-white">
                            Đơn hẹn đang hoạt động
                          </h2>
                        </div>
                        <div className="p-6 bg-[#141414] border border-[#2A2A2A] rounded-xl text-center space-y-3">
                          <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                          <p className="text-sm font-semibold text-white">Chưa có đơn đang hoạt động</p>
                          <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto">
                            {currentUser?.role === 'COMPANION'
                              ? 'Bạn đang trong trạng thái sẵn sàng. Khi có người đặt lịch, thông báo và đồng hồ đếm ngược 180s sẽ xuất hiện tại đây.'
                              : 'Bạn chưa có buổi chơi nào đang diễn ra. Hãy chọn Companion yêu thích để cùng leo rank ngay!'}
                          </p>
                          <div className="pt-2">
                            {currentUser?.role === 'RENTER' ? (
                              <a
                                href="#companions"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E11D2E] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition shadow-md"
                              >
                                <span>Tìm đồng đội</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <button
                                onClick={() => setActiveTab('companion_dashboard')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                <span>Mở lịch rảnh / Quản lý ca</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (4 cols): Side Panel - Chỉ hiện Companion Online + Nút Thuê cho Renter */}
                  <div className="lg:col-span-4 bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-between">
                    {currentUser?.role === 'RENTER' ? (
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A2A2A]">
                          <h3 className="font-bold text-sm text-white">Companion đang online</h3>
                          <span className="flex items-center text-[10px] text-[#22C55E] gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                            Online
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {displayOnline.map((comp) => (
                            <div
                              key={comp.id || comp.profile_id}
                              className="flex items-center justify-between p-2 bg-[#141414] border border-[#2A2A2A] rounded-lg hover:border-[#E11D2E]/40 transition-colors"
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className="relative">
                                  <Avatar
                                    src={comp.avatar || comp.image}
                                    name={comp.name || comp.user?.display_name}
                                    size="sm"
                                  />
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#22C55E] ring-1 ring-[#141414]" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white leading-tight">
                                    {comp.name || comp.user?.display_name}
                                  </p>
                                  <p className="text-[10px] text-[#A3A3A3]">
                                    {comp.gameName || comp.game?.game_name} • {((comp.hourlyRate ?? comp.hourly_rate ?? comp.pricePerHour ?? 100000)).toLocaleString('vi-VN')} đ/giờ
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => onBookCompanion(comp)}
                                className="px-2.5 py-1 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-[11px] font-bold rounded transition-colors cursor-pointer"
                              >
                                Thuê
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#2A2A2A] text-right">
                          <a href="#companions" className="text-[11px] text-[#E11D2E] hover:underline">
                            Xem tất cả companion →
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Side Panel quy chuẩn cho Companion */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                          <h3 className="font-bold text-sm text-white">Quy chuẩn dịch vụ</h3>
                          <span className="text-[10px] text-emerald-400 font-semibold">Chuẩn vận hành C2C</span>
                        </div>
                        <div className="p-3 bg-[#141414] border border-[#2A2A2A] rounded-xl space-y-2 text-xs text-[#A3A3A3]">
                          <p>⏱ Phản hồi trong 180 giây khi có yêu cầu đặt.</p>
                          <p>🤝 Tỉ lệ chia sẻ 88% Companion, 12% Nền tảng.</p>
                          <p>🛡 Tự động giải ngân sau 15 phút nghiệm thu.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ================= LOWER SECTION: ĐƠN CỦA TÔI ================= */}
                <div id="my-bookings" className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 md:p-6 space-y-4">
                  {/* Header & Filter Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E11D2E]" />
                        <span>Đơn của tôi</span>
                      </h3>
                      <p className="text-xs text-[#A3A3A3] mt-0.5">
                        Theo dõi trạng thái ký quỹ, phiên chơi và tiến độ giải ngân
                      </p>
                    </div>

                    {/* Filter Tabs & Scroll Arrows */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#2A2A2A]">
                        {[
                          { id: 'ALL', label: 'Tất cả' },
                          { id: 'ACTIVE', label: 'Đang hoạt động' },
                          { id: 'COMPLETED', label: 'Hoàn tất' },
                          { id: 'DISPUTED', label: 'Khiếu nại' },
                          { id: 'CANCELLED_REFUNDED', label: 'Đã hủy / hoàn tiền' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setBookingFilter(t.id as any)}
                            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                              bookingFilter === t.id
                                ? 'bg-[#E11D2E] text-white font-bold'
                                : 'text-[#A3A3A3] hover:text-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Circular Scroll Buttons */}
                      <div className="hidden sm:flex items-center space-x-1">
                        <button
                          onClick={() => scrollBookings('left')}
                          className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] flex items-center justify-center text-[#A3A3A3] hover:text-white transition cursor-pointer"
                          aria-label="Scroll left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => scrollBookings('right')}
                          className="w-7 h-7 rounded-full bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] flex items-center justify-center text-[#A3A3A3] hover:text-white transition cursor-pointer"
                          aria-label="Scroll right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bookings List / Data Table */}
                  {filteredBookings.length > 0 ? (
                    <div
                      ref={scrollContainerRef}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto pb-2"
                    >
                      {filteredBookings.map((b) => (
                        <div
                          key={b.booking_id}
                          className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar
                                  src={currentUser?.role === 'COMPANION' ? b.renter?.avatar_url : b.companion?.user?.avatar_url}
                                  name={currentUser?.role === 'COMPANION'
                                    ? (b.renter?.display_name || b.renter?.email || 'Khách thuê')
                                    : (b.companion?.user?.display_name || 'Companion')}
                                  size="sm"
                                />
                                <div>
                                  <p className="text-xs font-bold text-white">
                                    {currentUser?.role === 'COMPANION'
                                      ? (b.renter?.display_name || b.renter?.email || 'Khách thuê')
                                      : (b.companion?.user?.display_name || 'Companion')}
                                  </p>
                                  <p className="text-[11px] text-[#A3A3A3]">
                                    {b.companion?.game?.game_name} • {b.total_fee_snapshot?.toLocaleString('vi-VN')} VND
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={b.status} />
                            </div>

                            <div className="text-[10px] text-[#6B6B6B] font-mono">
                              Mã đơn: {formatShortId('BK', b.booking_id)}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#2A2A2A] flex items-center justify-between gap-2">
                            <button
                              onClick={() => onOpenBookingDetail(b.booking_id)}
                              className="text-[11px] text-[#A3A3A3] hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Chi tiết
                            </button>

                            <div className="flex items-center gap-1.5">
                              {b.status === 'PENDING_ACCEPTANCE' && (
                                <button
                                  disabled={loading}
                                  onClick={() => onHoldEscrow(b.booking_id)}
                                  className="px-2.5 py-1 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-[11px] font-bold rounded transition cursor-pointer"
                                >
                                  Ký quỹ Escrow
                                </button>
                              )}

                              {b.status === 'WAITING_COMPANION_RESPONSE' && (
                                <button
                                  disabled={loading}
                                  onClick={() => onOpenCancelModal(b)}
                                  className="px-2 py-1 bg-[#1C1C1C] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] text-[11px] rounded transition cursor-pointer"
                                >
                                  Hủy đơn
                                </button>
                              )}

                              {(b.status === 'ACCEPTED' || b.status === 'IN_SESSION') && (
                                <button
                                  disabled={loading}
                                  onClick={() => onOpenRoom(b.booking_id)}
                                  className="px-2.5 py-1 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-[11px] font-bold rounded transition cursor-pointer flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" /> Vào phòng
                                </button>
                              )}

                              {b.status === 'DISPUTED' && (
                                <div className="flex items-center gap-1.5">
                                  {b.dispute?.evidence_deadline && (
                                    <span className="text-[10px] text-amber-300/80 font-mono hidden sm:inline">
                                      Hạn: {new Date(b.dispute.evidence_deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    </span>
                                  )}
                                  {currentUser?.role === 'COMPANION' ? (
                                    <button
                                      disabled={loading}
                                      onClick={() => onOpenExplanation ? onOpenExplanation(b.dispute?.dispute_id || b.booking_id) : onOpenUploadEvidence(b.dispute?.dispute_id || b.booking_id)}
                                      className="px-2.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/40 text-[11px] font-medium rounded transition cursor-pointer"
                                    >
                                      Giải trình
                                    </button>
                                  ) : (
                                    <button
                                      disabled={loading}
                                      onClick={() => onOpenUploadEvidence(b.dispute?.dispute_id || b.booking_id)}
                                      className="px-2.5 py-1 bg-[#E11D2E]/20 text-[#E11D2E] border border-[#E11D2E]/40 text-[11px] font-medium rounded transition cursor-pointer"
                                    >
                                      Nộp chứng cứ bổ sung
                                    </button>
                                  )}
                                </div>
                              )}

                              {b.status === 'COMPLETED' && currentUser?.role === 'RENTER' && (
                                <button
                                  disabled={loading}
                                  onClick={() => onOpenReview(b.booking_id)}
                                  className="px-2 py-1 bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30 text-[11px] rounded transition cursor-pointer flex items-center gap-1"
                                >
                                  <Star className="w-3 h-3 fill-[#FACC15]" /> Đánh giá
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#A3A3A3] text-xs bg-[#141414] border border-[#2A2A2A] rounded-xl">
                      Không có đơn đặt nào trong mục này.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB CHILDREN (Companion Dashboard, CS View, Auditor View, or Catalog Bottom) */}
            <div className="space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
