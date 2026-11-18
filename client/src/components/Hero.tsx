import React from 'react';
import { Gamepad2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  onCtaClick: () => void;
  stats?: {
    totalCompanions: number;
    totalGames: number;
    totalCompletedBookings: number;
    averageTrustScore: number;
  };
}

export const Hero: React.FC<HeroProps> = ({ onCtaClick, stats }) => {
  return (
    <section id="home" className="relative w-full pt-4 pb-6 md:pt-6 md:pb-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero Card Container - Professional True Dark */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0D0D12] min-h-[400px] md:min-h-[440px] flex items-center">
          
          {/* Right-aligned Dedicated Character Artwork */}
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-3/5 overflow-hidden z-0">
            <img
              src="/images/hero/hero-banner.jpg"
              alt="INSTASQUAD Gaming Ambassador"
              className="w-full h-full object-cover object-[78%_center] md:object-[82%_25%] transition-transform duration-500 brightness-100"
            />
            {/* Smooth horizontal gradient from left dark background into character */}
            <div className="absolute inset-y-0 left-0 w-28 md:w-56 bg-gradient-to-r from-[#0D0D12] via-[#0D0D12]/85 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0D0D12] to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0D0D12]/60 to-transparent pointer-events-none" />
          </div>

          {/* Left Hero Content with pure dark backdrop to guarantee 100% text readability */}
          <div className="relative z-10 px-6 py-8 md:px-12 md:py-10 max-w-xl lg:max-w-2xl">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>NỀN TẢNG THUÊ COMPANION C2C AN TOÀN</span>
            </div>

            {/* Main Title - Max 2 lines */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Kết nối bạn đồng hành <br />
              <span className="text-gradient-purple">
                chơi game cùng bạn
              </span>
            </h1>

            {/* Subtitle / Description */}
            <p className="mt-3.5 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-lg">
              Thuê companion uy tín – An toàn – Nhanh chóng. <br className="hidden sm:inline" />
              Bảo vệ toàn diện bằng cơ chế <strong className="text-purple-300 font-semibold">Ký quỹ Escrow</strong> và hệ thống <strong className="text-cyan-300 font-semibold">Sổ cái kép</strong> bất biến.
            </p>

            {/* CTA Button & Trust Indicator */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={onCtaClick}
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-primary hover:opacity-95 text-white font-bold text-sm shadow-glow-purple transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform duration-200" />
                <span>Tìm đồng đội ngay</span>
                <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Hoàn tiền 100% nếu sự cố</span>
              </div>
            </div>

            {/* Trust Metrics Pill Row - Grounded Real Stats */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-6 text-[11px] text-slate-400">
              <div>
                <span className="font-extrabold text-white text-sm">
                  {stats?.totalCompanions ? `${stats.totalCompanions}` : '12'}
                </span>
                <p className="text-[10px] text-slate-400">Companion sẵn sàng</p>
              </div>
              <div className="w-[1px] h-6 bg-white/[0.08]" />
              <div>
                <span className="font-extrabold text-purple-400 text-sm">
                  {stats?.totalGames ? `${stats.totalGames}` : '7'}
                </span>
                <p className="text-[10px] text-slate-400">Tựa game hỗ trợ</p>
              </div>
              <div className="w-[1px] h-6 bg-white/[0.08]" />
              <div>
                <span className="font-extrabold text-emerald-400 text-sm">100% Escrow</span>
                <p className="text-[10px] text-slate-400">Ký quỹ minh bạch</p>
              </div>
            </div>
          </div>

          {/* Bottom Right Slogan */}
          <div className="absolute right-6 bottom-4 hidden md:block z-10 select-none">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500/70">
              PLAY TOGETHER, WIN TOGETHER
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

