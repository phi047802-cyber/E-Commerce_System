import React from 'react';
import { Gamepad2, ArrowRight } from 'lucide-react';
import { MockGame } from '../data/mock';
import { GameCard } from './GameCard';

interface GameRowProps {
  games: MockGame[];
  selectedGame: string;
  onSelectGame: (gameId: string) => void;
}

export const GameRow: React.FC<GameRowProps> = ({ games, selectedGame, onSelectGame }) => {
  return (
    <section id="games" className="py-6 md:py-8 max-w-7xl mx-auto px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wide text-white">
            CHỌN GAME BẠN MUỐN CHƠI
          </h2>
        </div>

        <button 
          onClick={() => onSelectGame('ALL')}
          className="group text-xs md:text-sm font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
        >
          <span>Xem tất cả game</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 6 Cards Grid (scrollable on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 overflow-x-auto pb-2">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isSelected={selectedGame.toLowerCase() === game.id.toLowerCase()}
            onSelect={onSelectGame}
          />
        ))}
      </div>
    </section>
  );
};
