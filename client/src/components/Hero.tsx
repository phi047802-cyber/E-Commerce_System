import React from 'react';
import { Gamepad2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  onCtaClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onCtaClick }) => {
  return (
    <section id="home" className="relative w-full pt-6 pb-8 md:pt-8 md:pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero Card Container */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f29] min-h-[380px] md:min-h-[440px] flex items-center">
          
          {/* Background Banner with Character Collage */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/hero/hero-banner.jpg"
              alt="INSTASQUAD Hero Banner"
              className="w-full h-full object-cover object-right md:object-center opacity-70"
            />
            {/* Deep Dark Gaming Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A1F] via-[#0A0A1F]/90 to-transparent w-full md:w-3/4" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-transparent to-[#0A0A1F]/40" />
            {/* Purple ambient glow spot */}
            <div className="absolute top-1/4 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Left Hero Content */}
          <div className="relative z-10 px-6 py-8 md:px-12 md:py-12 max-w-2xl">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-pink-400" />
              <span>NỀN TẢNG THUÊ COMPANION C2C AN TOÀN</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              KẾT NỐI BẠN ĐỒNG HÀNH <br />
              <span className="italic text-gradient-purple drop-shadow-md">
                CHƠI GAME CÙNG BẠN
              </span>
            </h1>

            {/* Subtitle / Description */}
            <p className="mt-4 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-xl">
              Thuê companion uy tín – An toàn – Nhanh chóng. <br className="hidden sm:inline" />
              Bảo vệ 100% bằng cơ chế <strong className="text-purple-300 font-semibold">Ký quỹ Escrow</strong> và hệ thống <strong className="text-cyan-300 font-semibold">Sổ cái ghi kép</strong> minh bạch.
            </p>

            {/* CTA Button */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                onClick={onCtaClick}
                className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-gradient-primary hover:opacity-95 text-white font-bold text-sm shadow-glow-purple-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-purple-200 group-hover:rotate-12 transition-transform duration-300" />
                <span>Tìm đồng đội ngay</span>
                <ArrowRight className="w-4 h-4 text-pink-200 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Hoàn tiền 100% nếu sự cố</span>
              </div>
            </div>
          </div>

          {/* Bottom Right Slogan */}
          <div className="absolute right-6 bottom-5 hidden md:block z-10 select-none">
            <span className="text-xs lg:text-sm font-extrabold italic uppercase tracking-widest text-slate-400/60 drop-shadow">
              PLAY TOGETHER, WIN TOGETHER
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
