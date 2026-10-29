import React from 'react';
import { Hero } from '../components/Hero';
import { GameRow } from '../components/GameRow';
import { TopCompanions } from '../components/TopCompanions';
import { WhyChoose } from '../components/WhyChoose';
import { Testimonials } from '../components/Testimonials';
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

  return (
    <div className="space-y-4">
      {/* 1. Hero Section */}
      <Hero onCtaClick={handleScrollToCompanions} />

      {/* 2. Choose Game You Want To Play */}
      <GameRow
        games={games}
        selectedGame={selectedGame}
        onSelectGame={(gameId) => {
          onSelectGame(gameId);
          handleScrollToCompanions();
        }}
      />

      {/* 3. Top Companion by Game (Filter tabs + 12 cards) */}
      <TopCompanions
        companions={companions}
        games={games}
        selectedGame={selectedGame}
        onSelectGame={onSelectGame}
        onBookCompanion={onBookCompanion}
      />

      {/* 4. Why Choose INSTASQUAD */}
      <WhyChoose />

      {/* 5. Customer Testimonials */}
      <Testimonials />
    </div>
  );
};
