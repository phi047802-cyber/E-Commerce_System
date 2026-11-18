import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react';
import { MockGame, MockCompanion } from '../data/mock';
import { GameCard } from './GameCard';

interface GameRowProps {
  games: MockGame[];
  companions?: MockCompanion[];
  selectedGame: string;
  onSelectGame: (gameId: string) => void;
}

export const GameRow: React.FC<GameRowProps> = ({
  games,
  companions = [],
  selectedGame,
  onSelectGame,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate real companion count from actual companions list
  const getCompanionCount = (gameId: string) => {
    const target = gameId.toLowerCase();
    return companions.filter((c) => {
      const gid = (c.gameId || '').toLowerCase();
      const gname = (c.gameName || '').toLowerCase();
      if (gid === target) return true;
      if ((target === 'lol' || target === 'lmht') && (gid === 'lol' || gid === 'lmht')) return true;
      if (target === 'valorant' && gid === 'valorant') return true;
      if (target === 'tft' && gid === 'tft') return true;
      return gname.includes(target) || target.includes(gid);
    }).length;
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -480 : 480;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section id="games" className="py-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Section Header with Left/Right Arrows on top right (giống Featured Games ở ảnh 1) */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#E11D2E]">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] tracking-tight">
              Chọn game bạn muốn chơi
            </h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Khám phá danh sách game eSports thịnh hành với các bạn đồng hành rank cao
            </p>
          </div>
        </div>

        {/* Top-Right Horizontal Scroll Arrows */}
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

      {/* Horizontal Scrollable Row (Giống Featured Games ở Ảnh 1) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            companionCount={getCompanionCount(game.id)}
            isSelected={selectedGame.toLowerCase() === game.id.toLowerCase()}
            onSelect={onSelectGame}
          />
        ))}
      </div>
    </section>
  );
};
