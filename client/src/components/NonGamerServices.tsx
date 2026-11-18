import React, { useEffect, useState } from 'react';
import { MessageCircleHeart, Film, Music, PartyPopper, Sparkles } from 'lucide-react';

interface SocialService {
  game_id: string;
  game_name: string;
  genre: string;
  description: string | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SOCIAL_TALK: MessageCircleHeart,
  SOCIAL_MOVIE: Film,
  SOCIAL_MUSIC: Music,
  SOCIAL_PARTY: PartyPopper,
};

/** Dịch vụ cho người không mê game (category SOCIAL, D35). Chọn dịch vụ → lọc danh sách Companion bên dưới. */
export const NonGamerServices: React.FC<{ onSelectService: (serviceId: string) => void; selected?: string; embedded?: boolean }> = ({ onSelectService, selected, embedded }) => {
  const [services, setServices] = useState<SocialService[]>([]);

  useEffect(() => {
    fetch('/api/games?category=SOCIAL')
      .then((r) => r.json())
      .then((d) => d.success && setServices(d.data))
      .catch(() => setServices([]));
  }, []);

  if (services.length === 0) return null;

  return (
    <section id="non-gamer" className={embedded ? 'w-full' : 'max-w-7xl mx-auto px-4'} aria-labelledby="non-gamer-title">
      <div className="space-y-3">
        <div>
          <h2 id="non-gamer-title" className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E11D2E]" aria-hidden="true" /> Không mê game? Trò chuyện & Giải trí
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-1">Người đồng hành trực tuyến theo giờ, tiền vẫn được giữ an toàn đến khi bạn hài lòng.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((s) => {
            const Icon = ICONS[s.game_id] || Sparkles;
            const active = selected === s.game_id;
            return (
              <button
                key={s.game_id}
                onClick={() => onSelectService(s.game_id)}
                aria-pressed={active}
                className={`text-left rounded-xl p-4 border transition ${active ? 'border-[#E11D2E] bg-[#E11D2E]/10' : 'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A]'}`}
              >
                <Icon className="w-6 h-6 text-[#E11D2E]" />
                <p className="mt-2 text-sm font-semibold text-white">{s.game_name}</p>
                <p className="mt-1 text-[11px] leading-snug text-[#A3A3A3] line-clamp-3">{s.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
