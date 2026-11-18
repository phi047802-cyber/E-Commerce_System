import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Scale, 
  Headphones, 
  Star, 
  HelpCircle
} from 'lucide-react';
import { WHY_CHOOSE_ITEMS } from '../data/mock';

export const WhyChoose: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'Lock': return <Lock className="w-5 h-5 text-cyan-400" />;
      case 'Scale': return <Scale className="w-5 h-5 text-purple-400" />;
      case 'Headphones': return <Headphones className="w-5 h-5 text-purple-300" />;
      case 'Star': return <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
      default: return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <section id="why-us" className="py-8 md:py-12 max-w-7xl mx-auto px-4">
      {/* Title */}
      <div className="flex items-center space-x-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide text-white">
            VÌ SAO CHỌN INSTASQUAD?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mô hình sàn thương mại điện tử bảo vệ tài chính an toàn minh bạch
          </p>
        </div>
      </div>

      {/* 2-Column Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 5 Features (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D0D12] border border-white/[0.08] rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-3.5 shadow-sm">
          {WHY_CHOOSE_ITEMS.map((item) => (
            <div 
              key={item.id} 
              className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#14141B] border border-white/[0.04] hover:border-purple-500/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0D0D12] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                {getIcon(item.iconName)}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Gamer Banner + Quote (5 cols) */}
        <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0D0D12] p-6 sm:p-7 flex flex-col justify-between shadow-sm min-h-[380px]">
          {/* Gamer Image Backdrop */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/why-us/gamer-banner.jpg"
              alt="Gamer Community"
              loading="lazy"
              className="w-full h-full object-cover object-top opacity-70 transition-transform duration-700 hover:scale-105"
            />
            {/* Dark gradient mask: deep dark at the bottom 65% so text is in full dark contrast zone */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 via-50% to-transparent" />
          </div>

          {/* Top Logo / Slogan Badge */}
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-black/80 border border-purple-500/30 px-3 py-1 rounded-full backdrop-blur-md">
              CỘNG ĐỒNG GAMER VĂN MINH
            </span>
          </div>

          {/* Bottom Protected Dark Container with High Legibility */}
          <div className="relative z-10 mt-auto pt-6">
            <div className="bg-black/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                Không chỉ là chơi game. <br />
                <span className="text-gradient-purple font-extrabold">
                  Đó là những người bạn đồng hành chinh phục mọi thử thách!
                </span>
              </h3>
              
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Ký quỹ Escrow & Sổ cái kép</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Kiểm toán tự động cân bằng thời gian thực</p>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-purple-400">INSTASQUAD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

