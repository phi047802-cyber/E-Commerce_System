import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { MockGame } from '../data/mock';

interface GameCardProps {
  game: MockGame;
  isSelected: boolean;
  onSelect: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(game.id)}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 select-none border ${
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-glow-purple -translate-y-1'
          : 'border-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-glow-purple'
      } bg-[#15152E] h-48 sm:h-52 flex flex-col justify-end p-4`}
    >
      {/* Background Game Art */}
      <img
        src={game.image}
        alt={game.name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1F] via-[#0A0A1F]/70 to-transparent group-hover:via-[#0A0A1F]/50 transition-colors" />

      {/* Content */}
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            {game.genre}
          </span>
          <h3 className="text-sm font-extrabold text-white group-hover:text-purple-300 transition-colors leading-tight">
            {game.name}
          </h3>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {game.companionsCount} Companion sẵn sàng
          </p>
        </div>

        {/* Circular Action Button */}
        <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-gradient-primary group-hover:text-white flex items-center justify-center text-slate-300 transition-all duration-300 flex-shrink-0 group-hover:scale-110 shadow">
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </div>
  );
};
