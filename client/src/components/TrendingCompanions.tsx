import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Star, Clock } from 'lucide-react';
import { MockCompanion } from '../data/mock';

interface TrendingCompanionsProps {
  companions: MockCompanion[];
  onBookCompanion: (companion: MockCompanion) => void;
}

export const TrendingCompanions: React.FC<TrendingCompanionsProps> = ({
  companions,
  onBookCompanion,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sắp xếp theo rating giảm dần và reviewCount giảm dần (từ DB)
  const sortedCompanions = [...companions].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header with left/right arrows like Trending Now in Ref 1 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#E11D2E]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] tracking-tight">
              Companion đang hot
            </h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Được người thuê đánh giá cao nhất và hoàn thành nhiều đơn nhất
            </p>
          </div>
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] text-[#FFFFFF] flex items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] text-[#FFFFFF] flex items-center justify-center transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Row (Giống Trending Now ở ảnh 1) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedCompanions.map((comp) => {
          const avatarSrc = comp.avatar || `/images/avatars/av0${((comp.rankIndex - 1) % 5) + 1}.jpg`;
          return (
            <div
              key={comp.id}
              onClick={() => onBookCompanion(comp)}
              className="group rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-[#E11D2E] transition-all duration-150 hover:-translate-y-0.5 p-3 w-[260px] sm:w-[280px] flex-shrink-0 cursor-pointer flex items-center gap-3.5"
            >
              {/* Square Image / Avatar with Online dot */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#1C1C1C] shrink-0 border border-[#2A2A2A]">
                <img
                  src={avatarSrc}
                  alt={comp.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = '/images/avatars/av01.jpg';
                  }}
                />
                {/* Chấm Online xanh lá #22C55E */}
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#141414]" />
              </div>

              {/* Info: Name, Game, Rank, Price */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-sm font-bold text-[#FFFFFF] truncate group-hover:text-[#E11D2E] transition-colors" title={comp.name}>
                    {comp.name}
                  </h4>
                  <div className="flex items-center gap-0.5 text-[11px] font-semibold text-[#FACC15] shrink-0">
                    <Star className="w-3 h-3 fill-[#FACC15]" />
                    <span>{comp.rating.toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#A3A3A3] truncate">
                  {comp.gameName} • <span className="text-[#FFFFFF] font-medium">{comp.tier}</span>
                </p>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FFFFFF]">
                    {comp.hourlyRate.toLocaleString('vi-VN')} <span className="text-[10px] text-[#A3A3A3] font-normal">đ/h</span>
                  </span>

                  <span className="text-[10px] text-[#E11D2E] font-bold group-hover:underline flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Thuê ngay</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
