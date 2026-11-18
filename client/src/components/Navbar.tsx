import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  Search, 
  Bell, 
  Wallet, 
  LogOut, 
  RotateCcw,
  Menu, 
  X,
  ChevronDown,
  User,
  ShieldAlert,
  BarChart3,
  CreditCard
} from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onTopupClick: () => void;
  activeTab: 'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view' | 'admin_dashboard' | 'admin_bookings' | 'profile';
  setActiveTab: (tab: any) => void;
  health: any;
  onResetDemoClick: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeMenu: string;
  setActiveMenu: (m: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onTopupClick,
  activeTab,
  setActiveTab,
  health,
  onResetDemoClick,
  searchQuery,
  setSearchQuery,
  activeMenu,
  setActiveMenu,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDevMode = 
    import.meta.env.DEV || 
    (typeof window !== 'undefined' && (window.location.search.includes('dev=1') || window.location.search.includes('demo=1')));

  const navMenuItems = [
    { id: 'home', label: 'Trang chủ', href: '#home' },
    { id: 'find-team', label: 'Tìm đồng đội', href: '#games' },
    { id: 'companions', label: 'Companion', href: '#companions' },
    { id: 'games', label: 'Game', href: '#games' },
    { id: 'community', label: 'Cộng đồng', href: '#community' },
    { id: 'reviews', label: 'Đánh giá', href: '#community' },
    { id: 'about', label: 'Về chúng tôi', href: '#why-us' },
  ];

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'RENTER':
        return 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]';
      case 'COMPANION':
        return 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30';
      case 'CS_AGENT':
        return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
      case 'AUDITOR':
      case 'ADMIN':
        return 'bg-[#E11D2E]/10 text-[#E11D2E] border-[#E11D2E]/30';
      default:
        return 'bg-[#1C1C1C] text-white border-[#2A2A2A]';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#2A2A2A] transition-all">
      {/* 1. Dev / Admin System Bar (Single compact line, only when DEV or ?dev=1) */}
      {isDevMode && (
        <div className="bg-[#000000] border-b border-[#2A2A2A] py-1 px-2.5 sm:px-4 text-[10px] sm:text-[11px] text-[#6B6B6B]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health?.database === 'CONNECTED' ? 'bg-[#22C55E]' : 'bg-[#E11D2E]'}`} />
              <span className="truncate"><strong className={health?.database === 'CONNECTED' ? 'text-[#22C55E]' : 'text-[#E11D2E]'}>{health?.database === 'CONNECTED' ? 'Online' : 'Offline'}</strong></span>
              <span className="hidden sm:inline text-[#2A2A2A]">|</span>
              <span className="hidden sm:inline text-[#A3A3A3]">Ký quỹ Escrow & Sổ cái kép</span>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={onResetDemoClick}
                className="flex items-center gap-1 text-[10px] text-[#A3A3A3] hover:text-white bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] px-2 py-0.5 rounded transition cursor-pointer whitespace-nowrap"
                title="Khôi phục cơ sở dữ liệu về trạng thái mẫu ban đầu"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>[MOCK] Reset DB</span>
              </button>
              {currentUser && (
                <button
                  onClick={onLogout}
                  className="text-[10px] text-[#E11D2E] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo: INSTASQUAD with white INSTA and red SQUAD */}
        <div 
          onClick={() => { setActiveTab('catalog'); setActiveMenu('home'); }}
          className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E11D2E] flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg tracking-wider text-white flex items-center">
              INSTA<span className="text-[#E11D2E]">SQUAD</span>
            </span>
          </div>
        </div>

        {/* Public Desktop Menu: Underline active tab in red #E11D2E */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs font-medium">
          {navMenuItems.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (activeTab !== 'catalog') setActiveTab('catalog');
                }}
                className={`relative py-1 transition-colors duration-200 ${
                  isActive ? 'text-white font-bold' : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E11D2E] rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xs relative mx-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm game, companion..."
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#E11D2E] transition-all"
          />
          <Search className="w-3.5 h-3.5 text-[#6B6B6B] absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Right Section: Conditional based on Login status */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {currentUser ? (
            /* Khi ĐÃ ĐĂNG NHẬP */
            <div className="flex items-center space-x-2.5">
              {/* Notification Bell with red dot */}
              <button 
                className="relative p-2 rounded-full bg-[#141414] hover:bg-[#1C1C1C] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] transition cursor-pointer"
                title="Thông báo hệ thống"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#E11D2E] rounded-full ring-2 ring-[#0A0A0A]" />
              </button>

              {/* Wallet Pill: HIỂN THỊ SỐ DƯ THẬT */}
              <div 
                onClick={onTopupClick}
                className="flex items-center space-x-2 bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] px-3 py-1.5 rounded-full cursor-pointer transition select-none"
                title="Bấm để mở nạp tiền ví"
              >
                <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-xs font-bold text-[#22C55E]">
                  {currentUser.wallet?.available_balance?.toLocaleString('vi-VN') || 0} đ
                </span>
                <span className="text-[10px] text-white bg-[#E11D2E] px-1.5 py-0.2 rounded-full">
                  +
                </span>
              </div>

              {/* User Avatar + Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] rounded-full pl-1.5 pr-2.5 py-1 transition select-none cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#E11D2E] p-0.5 flex-shrink-0 flex items-center justify-center font-bold text-xs text-white uppercase">
                    {currentUser.display_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left pr-1">
                    <span className="text-xs font-semibold text-white leading-tight truncate max-w-[110px]">
                      {currentUser.display_name}
                    </span>
                    <span className={`text-[9px] font-bold px-1 rounded mt-0.5 border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-[#A3A3A3]" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141414] border border-[#2A2A2A] shadow-2xl p-2 z-50 divide-y divide-[#2A2A2A]">
                    {/* Header info */}
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-bold text-white truncate">{currentUser.display_name}</p>
                      <p className="text-[10px] text-[#A3A3A3] truncate mt-0.5">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-[#A3A3A3]">Khả dụng:</span>
                        <span className="font-bold text-[#22C55E]">{currentUser.wallet?.available_balance?.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    {/* Navigation Links inside dropdown */}
                    <div className="py-1 space-y-0.5 text-xs font-medium text-[#A3A3A3]">
                      <button
                        onClick={() => {
                          setActiveTab('catalog');
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left cursor-pointer ${
                          activeTab === 'catalog' ? 'bg-[#E11D2E] text-white font-semibold' : 'hover:bg-[#1C1C1C] hover:text-white'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Trang chủ & Sàn</span>
                      </button>

                      {currentUser.role === 'COMPANION' && (
                        <button
                          onClick={() => {
                            setActiveTab('companion_dashboard');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left cursor-pointer ${
                            activeTab === 'companion_dashboard' ? 'bg-[#E11D2E] text-white font-semibold' : 'hover:bg-[#1C1C1C] hover:text-white'
                          }`}
                        >
                          <Gamepad2 className="w-3.5 h-3.5" />
                          <span>Lịch & Hồ sơ Companion</span>
                        </button>
                      )}

                      {(currentUser.role === 'CS_AGENT' || currentUser.role === 'ADMIN') && (
                        <button
                          onClick={() => {
                            setActiveTab('cs_view');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left cursor-pointer ${
                            activeTab === 'cs_view' ? 'bg-[#E11D2E] text-white font-semibold' : 'hover:bg-[#1C1C1C] hover:text-white'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Quản lý CS / RMA</span>
                        </button>
                      )}

                      {(currentUser.role === 'AUDITOR' || currentUser.role === 'ADMIN') && (
                        <button
                          onClick={() => {
                            setActiveTab('auditor_view');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left cursor-pointer ${
                            activeTab === 'auditor_view' ? 'bg-[#E11D2E] text-white font-semibold' : 'hover:bg-[#1C1C1C] hover:text-white'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Kiểm toán Sổ cái</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onTopupClick();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1C1C1C] hover:text-white transition text-left cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span>Nạp tiền vào ví</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#E11D2E] hover:bg-[#E11D2E]/10 transition text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Khi CHƯA ĐĂNG NHẬP: Nút Đăng nhập (viền xám) + Đăng ký (nền đỏ đặc #E11D2E) */
            <div className="flex items-center space-x-2">
              <button
                onClick={onLoginClick}
                className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-transparent hover:bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
              <button
                onClick={onRegisterClick}
                className="hidden sm:inline-block px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E11D2E] hover:bg-[#B91C1C] rounded-lg transition-colors cursor-pointer"
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#A3A3A3] hover:text-white rounded-lg hover:bg-[#1C1C1C] transition cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#141414] border-b border-[#2A2A2A] px-4 py-3 space-y-2">
          {navMenuItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={() => {
                setActiveMenu(item.id);
                setMobileMenuOpen(false);
                if (activeTab !== 'catalog') setActiveTab('catalog');
              }}
              className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                activeMenu === item.id ? 'bg-[#E11D2E] text-white font-bold' : 'text-[#A3A3A3] hover:bg-[#1C1C1C] hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
          {!currentUser && (
            <div className="pt-2 border-t border-[#2A2A2A] flex items-center gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick();
                }}
                className="flex-1 py-2 text-xs font-semibold text-white border border-[#2A2A2A] rounded-lg text-center"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRegisterClick();
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#E11D2E] rounded-lg text-center"
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
