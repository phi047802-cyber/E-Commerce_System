import React from 'react';
import { Trophy } from 'lucide-react';
import { MockCompanion, MockGame } from '../data/mock';
import { CompanionCard } from './CompanionCard';

interface TopCompanionsProps {
  companions: MockCompanion[];
  games: MockGame[];
  selectedGame: string;
  onSelectGame: (gameId: string) => void;
  onBookCompanion: (companion: MockCompanion) => void;
}

export const TopCompanions: React.FC<TopCompanionsProps> = ({
  companions,
  games,
  selectedGame,
  onSelectGame,
  onBookCompanion,
}) => {
  // Filter tabs: "ALL", then 6 games
  const tabs = [
    { id: 'ALL', label: 'Tất cả game' },
    ...games.map(g => ({ id: g.id, label: g.name }))
  ];

  // Filter companions according to selected game
  const filtered = selectedGame === 'ALL'
    ? companions
    : companions.filter(c => c.gameId.toLowerCase() === selectedGame.toLowerCase());

  return (
    <section id="companions" className="py-8 md:py-10 max-w-7xl mx-auto px-4">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              TOP COMPANION THEO GAME
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đồng đội kỹ năng cao, được cộng đồng đánh giá uy tín hàng đầu
            </p>
          </div>
        </div>

        {/* Filter Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {tabs.map((tab) => {
            const isActive = selectedGame.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                onClick={() => onSelectGame(tab.id)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-primary text-white shadow-glow-purple'
                    : 'bg-[#15152E] text-slate-300 hover:text-white hover:bg-[#1f1f42] border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 columns x 2 rows grid (12 cards on desktop) */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((comp) => (
            <CompanionCard
              key={comp.id}
              companion={comp}
              onBook={onBookCompanion}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#15152E] border border-white/10 rounded-2xl p-8 text-center text-slate-400 text-sm">
          Chưa có Companion nào trong danh mục này. Vui lòng chọn <button onClick={() => onSelectGame('ALL')} className="text-purple-400 underline font-semibold">Tất cả game</button>.
        </div>
      )}
    </section>
  );
};
