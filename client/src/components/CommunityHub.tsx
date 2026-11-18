import React from 'react';
import { Star, Users, MessageSquareQuote, Award } from 'lucide-react';
import { MockCompanion, MOCK_REVIEWS } from '../data/mock';
import { Avatar } from './common/Avatar';

interface CommunityHubProps {
  companions: MockCompanion[];
  onBookCompanion: (companion: MockCompanion) => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  companions,
  onBookCompanion,
}) => {
  // Column 1: Latest Reviews (take up to 3)
  const recentReviews = MOCK_REVIEWS.slice(0, 3);

  // Column 2: Online Companions (filter by online or fallback to first 4)
  const onlineCompanions = companions.filter((c) => c.online).slice(0, 4);
  const displayOnline = onlineCompanions.length > 0 ? onlineCompanions : companions.slice(0, 4);

  // Column 3: TrustScore Leaderboard (sort by trustScore descending, top 5)
  const topTrustLeaderboard = [...companions]
    .sort((a, b) => (b.trustScore || 100) - (a.trustScore || 100))
    .slice(0, 5);

  return (
    <section id="community" className="py-8 max-w-7xl mx-auto px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Cộng đồng INSTASQUAD
          </h2>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Đánh giá thực tế, đồng đội đang online và bảng xếp hạng uy tín thời gian thực
          </p>
        </div>
      </div>

      {/* 3 Equal Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Đánh giá mới nhất từ Renter */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-[#2A2A2A]">
              <MessageSquareQuote className="w-5 h-5 text-[#E11D2E]" />
              <h3 className="font-bold text-white text-base">Đánh giá mới nhất</h3>
            </div>

            <div className="space-y-3.5">
              {recentReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Avatar
                        src={rev.avatar || '/images/avatars/av01.jpg'}
                        name={rev.author}
                        size="sm"
                        className="border border-[#2A2A2A]"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{rev.author}</p>
                        <p className="text-[10px] text-[#A3A3A3]">{rev.gameName}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-[#FACC15]">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-[#FACC15]" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#A3A3A3] line-clamp-2 italic leading-relaxed">
                    "{rev.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-right">
            <span className="text-[11px] text-[#A3A3A3]">
              100% đánh giá sau khi hoàn tất phiên qua Escrow
            </span>
          </div>
        </div>

        {/* Column 2: Companion đang online */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A2A2A]">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#22C55E]" />
                <h3 className="font-bold text-white text-base">Companion đang online</h3>
              </div>
              <span className="flex items-center text-[11px] text-[#22C55E] font-medium gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                Sẵn sàng nhận đơn
              </span>
            </div>

            <div className="space-y-3">
              {displayOnline.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-2.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg hover:border-[#E11D2E]/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar
                        src={comp.avatar || '/images/avatars/av02.jpg'}
                        name={comp.name}
                        size="md"
                        className="border border-[#2A2A2A]"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#1C1C1C]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{comp.name}</p>
                      <p className="text-[11px] text-[#A3A3A3]">{comp.gameName} • {comp.tier}</p>
                      <p className="text-[11px] text-[#22C55E] font-semibold">
                        {comp.hourlyRate.toLocaleString('vi-VN')} đ/h
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onBookCompanion(comp)}
                    className="px-3 py-1.5 bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Xem
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-right">
            <span className="text-[11px] text-[#A3A3A3]">
              Phản hồi trong vòng 180 giây
            </span>
          </div>
        </div>

        {/* Column 3: Bảng xếp hạng TrustScore top 5 */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A2A2A]">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-[#FACC15]" />
                <h3 className="font-bold text-white text-base">Bảng xếp hạng uy tín</h3>
              </div>
              <span className="text-[11px] text-[#A3A3A3] font-mono">TOP 5</span>
            </div>

            <div className="space-y-2.5">
              {topTrustLeaderboard.map((comp, idx) => {
                const rankNum = idx + 1;
                const isTop1 = rankNum === 1;
                const isTop2 = rankNum === 2;
                const isTop3 = rankNum === 3;

                return (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isTop1
                            ? 'bg-[#FACC15] text-black font-extrabold'
                            : isTop2
                            ? 'bg-slate-300 text-black font-extrabold'
                            : isTop3
                            ? 'bg-amber-700 text-white font-bold'
                            : 'bg-[#2A2A2A] text-[#A3A3A3]'
                        }`}
                      >
                        {rankNum}
                      </span>
                      <Avatar
                        src={comp.avatar || '/images/avatars/av03.jpg'}
                        name={comp.name}
                        size="sm"
                        className="border border-[#2A2A2A]"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{comp.name}</p>
                        <p className="text-[10px] text-[#A3A3A3]">{comp.gameName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#E11D2E] font-mono" title="Điểm uy tín hệ thống (thang 0-100)">
                        Uy tín {comp.trustScore || 100}
                      </span>
                      <p className="text-[10px] text-[#22C55E]" title="Tỷ lệ hoàn thành đơn">
                        Hoàn thành {comp.completionRate || 100}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-right">
            <span className="text-[11px] text-[#A3A3A3]">
              Tính trên lịch sử hoàn tất và đánh giá Renter
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
