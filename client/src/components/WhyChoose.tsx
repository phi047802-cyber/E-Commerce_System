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
      case 'Headphones': return <Headphones className="w-5 h-5 text-pink-400" />;
      case 'Star': return <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
      default: return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <section id="why-us" className="py-8 md:py-12 max-w-7xl mx-auto px-4">
      {/* Title */}
      <div className="flex items-center space-x-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wide text-white">
            VÌ SAO CHỌN INSTASQUAD?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mô hình sàn thương mại điện tử bảo vệ tài chính an toàn tuyệt đối
          </p>
        </div>
      </div>

      {/* 2-Column Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 5 Features (7 cols) */}
        <div className="lg:col-span-7 bg-[#15152E] border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-xl">
          {WHY_CHOOSE_ITEMS.map((item) => (
            <div 
              key={item.id} 
              className="flex items-start gap-4 p-3 rounded-2xl bg-[#0e0e24]/60 border border-white/5 hover:border-purple-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#15152E] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                {getIcon(item.iconName)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Gamer Banner + Quote (5 cols) */}
        <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1b1b3d] to-[#0A0A1F] p-7 flex flex-col justify-between shadow-xl min-h-[360px]">
          {/* Gamer Image Backdrop */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/why-us/gamer-banner.jpg"
              alt="Gamer Community"
              loading="lazy"
              className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-[#0A0A1F]/70 to-transparent" />
          </div>

          {/* Top Logo / Slogan */}
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-950/70 border border-purple-500/30 px-3 py-1 rounded-full">
              CỘNG ĐỒNG GAMER VĂN MINH
            </span>
            <h3 className="mt-4 text-xl sm:text-2xl font-black text-white leading-snug">
              Không chỉ là chơi game. <br />
              <span className="text-gradient-purple">
                Đó là những người bạn đồng hành cùng bạn chinh phục mọi giới hạn!
              </span>
            </h3>
          </div>

          {/* Bottom Socials & Trust */}
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">Ký quỹ Escrow & Sổ cái kép</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Kiểm toán cân bằng thời gian thực (&Sigma; Debit &equiv; &Sigma; Credit)</p>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[11px] uppercase tracking-wider font-bold text-purple-400">INSTASQUAD</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
