import React, { useState } from 'react';
import { 
  Gamepad2, 
  Search, 
  Bell, 
  Wallet, 
  LogOut, 
  RotateCcw,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onLoginClick: () => void;
  onLogout: () => void;
  onTopupClick: () => void;
  activeTab: 'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view';
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

  const navMenuItems = [
    { id: 'home', label: 'Trang chủ', href: '#home' },
    { id: 'find-team', label: 'Tìm đồng đội', href: '#games' },
    { id: 'companions', label: 'Companion', href: '#companions' },
    { id: 'games', label: 'Game', href: '#games' },
    { id: 'reviews', label: 'Đánh giá', href: '#reviews' },
    { id: 'about', label: 'Về chúng tôi', href: '#why-us' },
  ];

  return (
    <header className="sticky top-0 z-50 glass-nav transition-all">
      {/* Top Banner Bar for DB & Demo Controls */}
      <div className="bg-[#0e0e24] border-b border-white/5 py-1 px-4 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${health?.database === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>Hệ thống: <strong className={health?.database === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'}>{health?.database === 'CONNECTED' ? 'Hoạt động bình thường' : 'Mất kết nối'}</strong></span>
            <span className="hidden sm:inline text-white/20">|</span>
            <span className="hidden sm:inline text-purple-400 font-medium">Bảo vệ Ký quỹ Escrow 100% & Sổ cái kép</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Role Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'catalog' ? 'bg-purple-600 text-white shadow-glow-purple' : 'text-slate-400 hover:text-white'
                }`}
              >
                Trang chủ / Sàn
              </button>
              {currentUser?.role === 'COMPANION' && (
                <button
                  onClick={() => setActiveTab('companion_dashboard')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activeTab === 'companion_dashboard' ? 'bg-purple-600 text-white shadow-glow-purple' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Lịch & Hồ sơ Companion
                </button>
              )}
              {(currentUser?.role === 'CS_AGENT' || currentUser?.role === 'ADMIN') && (
                <button
                  onClick={() => setActiveTab('cs_view')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activeTab === 'cs_view' ? 'bg-purple-600 text-white shadow-glow-purple' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quản lý CS / Rút tiền
                </button>
              )}
              {currentUser?.role === 'AUDITOR' && (
                <button
                  onClick={() => setActiveTab('auditor_view')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activeTab === 'auditor_view' ? 'bg-purple-600 text-white shadow-glow-purple' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kiểm toán Sổ cái
                </button>
              )}
            </div>

            <button
              onClick={onResetDemoClick}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 px-2 py-0.5 rounded-md transition"
              title="Khôi phục dữ liệu mẫu ban đầu"
            >
              <RotateCcw className="w-3 h-3" />
              <span>[MOCK] Reset DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => { setActiveTab('catalog'); setActiveMenu('home'); }}
          className="flex items-center space-x-2.5 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-pink-500 p-0.5 shadow-glow-purple group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#0A0A1F] rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-purple-400 group-hover:text-pink-400 transition-colors" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-wider text-white flex items-center gap-1">
              INSTA<span className="text-gradient-purple">SQUAD</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 -mt-1 font-semibold">
              Game Companion
            </span>
          </div>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium">
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
                  isActive ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-fade-in shadow-glow-purple" />
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
            placeholder="Tìm game, tên người chơi..."
            className="w-full bg-[#15152E]/90 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
        </div>

        {/* Right Section: Notifications & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Notification Bell */}
          <button 
            className="relative p-2 rounded-full bg-[#15152E] hover:bg-[#1f1f42] text-slate-300 hover:text-white border border-white/10 transition"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-[#0A0A1F]" />
          </button>

          {/* User state */}
          {currentUser ? (
            <div className="flex items-center space-x-2.5">
              {/* Wallet Pill */}
              <div 
                onClick={onTopupClick}
                className="flex items-center space-x-2 bg-[#15152E] hover:bg-[#1c1c3d] border border-purple-500/30 px-3 py-1.5 rounded-full cursor-pointer transition shadow-sm group"
                title="Bấm để nạp thêm số dư ví"
              >
                <Wallet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-emerald-400">
                  {currentUser.wallet?.available_balance?.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded-full border border-purple-700/50">
                  +
                </span>
              </div>

              {/* User Dropdown / Avatar */}
              <div className="flex items-center space-x-2 bg-[#15152E] border border-white/10 rounded-full pl-2 pr-1.5 py-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-[#12122A] flex items-center justify-center font-bold text-xs text-white uppercase">
                    {currentUser.display_name?.charAt(0) || 'U'}
                  </div>
                </div>
                <div className="hidden xl:flex flex-col text-left pr-2">
                  <span className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">
                    {currentUser.display_name}
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono leading-none">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-white/5 transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onLoginClick}
                className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-2 rounded-xl transition"
              >
                Đăng nhập
              </button>
              <button
                onClick={onLoginClick}
                className="text-xs font-semibold text-white bg-gradient-primary hover:opacity-95 px-4 py-2 rounded-full shadow-glow-purple transition duration-200"
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#15152E] text-slate-300 hover:text-white border border-white/10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0e24] border-b border-white/10 px-4 py-3 space-y-3 animate-fade-in">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm game, tên người chơi..."
              className="w-full bg-[#15152E] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-1">
            {navMenuItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveMenu(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  activeMenu === item.id ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
