import React from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { EscrowProcessSection } from '../components/EscrowProcessSection';
import { GameRow } from '../components/GameRow';
import { TrendingCompanions } from '../components/TrendingCompanions';
import { TopCompanions } from '../components/TopCompanions';
import { CommunityHub } from '../components/CommunityHub';
import { NewsAndWhyChoose } from '../components/NewsAndWhyChoose';
import { NonGamerServices } from '../components/NonGamerServices';
import { UnifiedWorkflowSection } from '../components/UnifiedWorkflowSection';
import { MockGame, MockCompanion } from '../data/mock';

interface HomePageProps {
  games: MockGame[];
  companions: MockCompanion[];
  selectedGame: string;
  onSelectGame: (gameId: string) => void;
  onBookCompanion: (companion: MockCompanion) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  games,
  companions,
  selectedGame,
  onSelectGame,
  onBookCompanion,
}) => {
  const handleScrollToCompanions = () => {
    const el = document.getElementById('companions');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToGames = () => {
    const el = document.getElementById('games');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home" className="space-y-6 w-full max-w-full overflow-hidden">
      {/* 1. Hero Slider (3 slides, 6s auto, arrows, dots, dark overlay) */}
      <div className="max-w-7xl mx-auto px-4 pt-3 sm:pt-4">
        <HeroSlider
          onCtaClick={handleScrollToCompanions}
          onExploreGames={handleScrollToGames}
        />
      </div>

      {/* 1.4. Quy trình thống nhất 8 bước Web & App (docs/UNIFIED_WORKFLOW.md) */}
      <UnifiedWorkflowSection compact />

      {/* 1.5. Escrow Mechanism Process (5 steps, 2 highlight cards) */}
      <EscrowProcessSection />

      {/* 2. Choose Game You Want To Play (Horizontal scroll with top-right round buttons) */}
      <GameRow
        games={games}
        companions={companions}
        selectedGame={selectedGame}
        onSelectGame={(gameId) => {
          onSelectGame(gameId);
          handleScrollToCompanions();
        }}
      />

      {/* 2.5. Dịch vụ cho người không mê game (D35) */}
      <NonGamerServices
        selected={selectedGame}
        onSelectService={(serviceId) => {
          onSelectGame(serviceId);
          handleScrollToCompanions();
        }}
      />

      {/* 3. Companion Đang Hot (Trending Now horizontal scroll) */}
      <TrendingCompanions
        companions={companions}
        onBookCompanion={onBookCompanion}
      />

      {/* 4. Top Companion Theo Game (Filter tabs with red underline + 4 cols grid) */}
      <TopCompanions
        companions={companions}
        games={games}
        selectedGame={selectedGame}
        onSelectGame={onSelectGame}
        onBookCompanion={onBookCompanion}
      />

      {/* 5. Community Hub (3 equal columns: Reviews, Online Companions, Top 5 TrustScore) */}
      <CommunityHub
        companions={companions}
        onBookCompanion={onBookCompanion}
      />

      {/* 6. News & Why Choose INSTASQUAD (3 news cards + 5 points) */}
      <NewsAndWhyChoose />
    </div>
  );
};
