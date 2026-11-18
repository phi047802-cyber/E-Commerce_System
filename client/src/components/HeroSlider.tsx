import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Users, Flame, ArrowRight } from 'lucide-react';
import { MockCompanion } from '../data/mock';

interface HeroSliderProps {
  onExploreCompanions?: () => void;
  onLearnMore?: () => void;
  onCtaClick?: () => void;
  onExploreGames?: () => void;
  topCompanions?: MockCompanion[];
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  onExploreCompanions,
  onLearnMore,
  onCtaClick,
  onExploreGames,
  topCompanions = [],
}) => {
  const handlePrimary = onCtaClick || onExploreCompanions;
  const handleSecondary = onExploreGames || onLearnMore;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const top1 = topCompanions[0];

  const handleScrollToEscrow = () => {
    const el = document.getElementById('escrow');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (handleSecondary) {
      handleSecondary();
    }
  };

  const handleNavigateToEscrowPolicy = () => {
    window.history.pushState({}, '', '/chinh-sach-escrow');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToCompanions = () => {
    const el = document.getElementById('companions');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (handlePrimary) {
      handlePrimary();
    }
  };

  const slides = [
    {
      id: 1,
      layout: 'character-split',
      badge: 'Nền tảng thuê bạn chơi game C2C',
      badgeIcon: <Flame className="w-3.5 h-3.5 text-[#E11D2E]" />,
      title: 'Kết nối bạn đồng hành chơi game cùng bạn',
      subtitle:
        'Tìm kiếm và thuê game thủ rank cao chơi cùng trong LMHT, Valorant, CS2. Đàm thoại văn minh, phối hợp chuẩn xác, nâng tầm trải nghiệm leo rank.',
      primaryBtnText: 'Tìm đồng đội ngay',
      secondaryBtnText: 'Khám phá game',
      characterImage: '/images/hero/hero-agent-jett.png',
      onPrimaryClick: handlePrimary,
      onSecondaryClick: handleSecondary,
    },
    {
      id: 2,
      layout: 'full-bleed',
      badge: 'Cơ chế bảo vệ ký quỹ Escrow',
      badgeIcon: <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />,
      title: 'Ký quỹ Escrow bảo vệ tiền của bạn',
      subtitle:
        'Tiền thuê được giữ trong ví ký quỹ Escrow cho đến khi bạn nghiệm thu hoặc có quyết định xử lý khiếu nại. Hoàn 100% nếu Companion từ chối hoặc không phản hồi trong 180 giây; hủy trước giờ hẹn từ 30 phút hoàn 100%.',
      primaryBtnText: 'Khám phá Escrow',
      secondaryBtnText: 'Xem quy trình bảo vệ',
      image: '/images/games/overwatch2.webp',
      onPrimaryClick: handleScrollToEscrow,
      onSecondaryClick: handleNavigateToEscrowPolicy,
    },
    {
      id: 3,
      layout: 'full-bleed',
      badge: 'Companion nổi bật tuần này, xếp theo điểm đánh giá trong hệ thống',
      badgeIcon: <Users className="w-3.5 h-3.5 text-[#FACC15]" />,
      title: top1
        ? `Companion nổi bật tuần này: ${top1.name}`
        : 'Companion nổi bật tuần này, xếp theo điểm đánh giá trong hệ thống',
      subtitle: top1
        ? `Đạt ${top1.rating.toFixed(1)} ⭐ (${top1.reviewCount} lượt đánh giá) • Rank ${top1.tier} game ${top1.gameName}. Đặt lịch ngay để trải nghiệm cùng đồng đội.`
        : 'Những game thủ có điểm TrustScore và tỷ lệ hoàn thành đơn tích cực tuần qua trên hệ thống INSTASQUAD.',
      primaryBtnText: 'Xem danh sách ngay',
      secondaryBtnText: 'Xem Companion theo giá',
      image: '/images/games/genshin.webp',
      onPrimaryClick: handleScrollToCompanions,
      onSecondaryClick: handleScrollToCompanions,
    },
  ];

  // Auto-switch every 6 seconds, pause on hover (or lock if ?slide=... query param is set)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('slide');
    if (s) {
      const idx = parseInt(s, 10) - 1;
      if (idx >= 0 && idx < slides.length) {
        setCurrentSlide(idx);
        return; // Don't auto-rotate if a specific slide is requested
      }
    }

    if (isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const active = slides[currentSlide];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-[#0A0A0A] border border-[#2A2A2A] h-[380px] md:h-[400px] select-none shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Layer */}
      {active.layout === 'character-split' ? (
        // Slide 1: eSports dark red theme with ambient lighting & crisp cutout character on the right
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#120709] to-[#170A0D]">
          {/* Subtle eSports background grid */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
          {/* Ambient red glow behind character */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 w-[420px] h-[360px] bg-[#E11D2E]/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Dedicated Right Character Frame - Crisp, no blur, true 2048x1860 transparent cutout */}
          <div className="absolute right-4 sm:right-8 md:right-16 bottom-0 top-0 w-[260px] sm:w-[320px] md:w-[420px] flex items-end justify-center pointer-events-none z-0">
            <img
              src={active.characterImage}
              alt="Valorant Agent Jett - INSTASQUAD Companion"
              className="h-[92%] md:h-[96%] w-auto object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] filter brightness-[0.95]"
            />
          </div>
        </div>
      ) : (
        // Slide 2 & 3: High-Res 1920x1080 Key Art with crisp WCAG AA dark overlay on the left
        <div className="absolute inset-0">
          <img
            key={active.id}
            src={active.image}
            alt={active.title}
            className="w-full h-full object-cover object-center md:object-right transition-opacity duration-700 brightness-[0.85]"
          />
          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Slide Content */}
      <div className="relative z-10 h-full w-full max-w-2xl px-4 sm:px-8 md:px-12 flex flex-col justify-center min-w-0">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1C1C]/90 backdrop-blur-sm border border-[#2A2A2A] text-[11px] sm:text-xs font-semibold text-[#A3A3A3] mb-2 sm:mb-3 w-fit">
          {active.badgeIcon}
          <span>{active.badge}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#FFFFFF] tracking-tight leading-snug sm:leading-tight mb-2 sm:mb-3 drop-shadow-sm">
          {active.title}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed max-w-xl mb-6 line-clamp-3">
          {active.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={active.onPrimaryClick}
            className="px-5 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-[#FFFFFF] font-bold text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>{active.primaryBtnText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={active.onSecondaryClick}
            className="px-5 py-2.5 rounded-lg bg-[#141414]/80 backdrop-blur-sm hover:bg-[#1C1C1C] text-[#FFFFFF] font-medium text-xs border border-[#2A2A2A] transition duration-150 cursor-pointer"
          >
            {active.secondaryBtnText}
          </button>
        </div>
      </div>

      {/* Left/Right Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous slide"
        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-lg bg-[#141414]/80 hover:bg-[#1C1C1C] border border-[#2A2A2A] text-[#FFFFFF] items-center justify-center transition cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Next slide"
        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-lg bg-[#141414]/80 hover:bg-[#1C1C1C] border border-[#2A2A2A] text-[#FFFFFF] items-center justify-center transition cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentSlide === idx
                ? 'w-6 h-2 bg-[#E11D2E]'
                : 'w-2 h-2 bg-[#2A2A2A] hover:bg-[#6B6B6B]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
