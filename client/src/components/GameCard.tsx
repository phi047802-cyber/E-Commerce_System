import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { MockGame } from '../data/mock';
import { getGameCover } from '../data/gameCovers';

interface GameCardProps {
  game: MockGame;
  isSelected: boolean;
  onSelect: (gameId: string) => void;
  companionCount?: number;
}

export const GameCard: React.FC<GameCardProps> = ({ game, isSelected, onSelect, companionCount }) => {
  const [imageError, setImageError] = useState(false);
  const cover = getGameCover(game.id || game.slug);
  const imageSrc = game.image || cover.coverPath;

  const count = typeof companionCount === 'number'
    ? companionCount
    : parseInt(game.companionsCount, 10) || 0;

  return (
    <div
      onClick={() => onSelect(game.id)}
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 select-none border ${
        isSelected
          ? 'border-[#E11D2E] ring-1 ring-[#E11D2E] -translate-y-0.5'
          : 'border-[#2A2A2A] hover:border-[#E11D2E] hover:-translate-y-0.5'
      } bg-[#141414] w-[210px] sm:w-[220px] h-[320px] flex flex-col justify-between p-3.5 flex-shrink-0`}
    >
      {/* Vertical Key Art with single dark overlay (Chỉ dùng dark overlay để chữ đọc được) */}
      <div className="absolute inset-0">
        {!imageError ? (
          <img
            src={imageSrc}
            alt={cover.alt || game.name}
            loading="eager"
            onError={() => setImageError(true)}
            style={{ objectPosition: cover.objectPosition || 'center' }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-[0.85]"
          />
        ) : (
          <div className="w-full h-full bg-[#1C1C1C] flex items-center justify-center p-4 text-center">
            <span className="text-sm font-bold uppercase text-[#A3A3A3]">{game.name}</span>
          </div>
        )}
        {/* Dark gradient overlay bottom-to-top */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 via-55% to-transparent pointer-events-none" />
      </div>

      {/* Top Genre Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="px-2 py-0.5 rounded-md bg-[#0A0A0A]/80 border border-[#2A2A2A] text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider backdrop-blur-sm">
          {cover.genre || game.genre}
        </span>
      </div>

      {/* Bottom Content: Name, Real Companions Count, Solid Red Button */}
      <div className="relative z-10 space-y-2.5">
        <div>
          <h3 className="text-base font-bold text-[#FFFFFF] leading-snug truncate" title={game.name}>
            {game.name}
          </h3>
          <p className="text-xs text-[#A3A3A3] flex items-center gap-1.5 mt-0.5 font-medium">
            <Users className="w-3.5 h-3.5 text-[#E11D2E]" />
            {count > 0 ? (
              <span className="text-[#FFFFFF]">{count} Companion sẵn sàng</span>
            ) : (
              <span className="text-[#6B6B6B] italic">Sắp có</span>
            )}
          </p>
        </div>

        {/* Nút "Xem companion" Đỏ đặc (theo yêu cầu 2c) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(game.id);
          }}
          className="w-full py-2 px-3 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-[#FFFFFF] text-xs font-bold transition duration-150 text-center cursor-pointer shadow-sm"
        >
          Xem companion
        </button>
      </div>
    </div>
  );
};
