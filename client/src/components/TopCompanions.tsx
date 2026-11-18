import React, { useState, useMemo } from 'react';
import {
  Trophy,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  DollarSign,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { MockCompanion, MockGame } from '../data/mock';
import { CompanionCard } from './CompanionCard';
import { ErrorBoundary } from './common/ErrorBoundary';

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
  // State 5 tiêu chí lọc (FR-002, UC02)
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [priceRange, setPriceRange] = useState<string>('ALL'); // ALL, UNDER_100K, 100K_150K, OVER_150K
  const [timeSlot, setTimeSlot] = useState<string>('ALL'); // ALL, morning, afternoon, evening
  const [minTrust, setMinTrust] = useState<number>(0); // 0, 80, 90, 95
  const [sortBy, setSortBy] = useState<string>('rating'); // rating, price_asc, price_desc, trust_score, online, match_score
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Filter tabs: "ALL", then games
  const tabs = [
    { id: 'ALL', label: 'Tất cả game' },
    ...games.map((g) => ({ id: g.id, label: g.name })),
  ];

  const isGameMatch = (cGameId: string, cGameName: string, targetId: string) => {
    if (targetId === 'ALL') return true;
    const target = targetId.toLowerCase();
    const gid = (cGameId || '').toLowerCase();
    const gname = (cGameName || '').toLowerCase();
    if (gid === target) return true;
    if ((target === 'lol' || target === 'lmht') && (gid === 'lol' || gid === 'lmht')) return true;
    if (target === 'valorant' && gid === 'valorant') return true;
    if (target === 'tft' && gid === 'tft') return true;
    return gname.includes(target) || target.includes(gid);
  };

  // Lọc theo 5 tiêu chí (xử lý tiêu chí một phần UC02 Luồng 2a)
  const filteredCompanions = useMemo(() => {
    return companions.filter((comp) => {
      // 1. Tiêu chí Game
      if (!isGameMatch(comp.gameId, comp.gameName, selectedGame)) {
        return false;
      }

      // 2. Tiêu chí Rank
      if (selectedRank !== 'ALL') {
        const compTier = (comp.tier || '').toLowerCase();
        const targetRank = selectedRank.toLowerCase();
        if (!compTier.includes(targetRank)) {
          return false;
        }
      }

      // 3. Tiêu chí Giá theo giờ
      if (priceRange === 'UNDER_100K' && comp.hourlyRate >= 100000) {
        return false;
      }
      if (priceRange === '100K_150K' && (comp.hourlyRate < 100000 || comp.hourlyRate > 150000)) {
        return false;
      }
      if (priceRange === 'OVER_150K' && comp.hourlyRate <= 150000) {
        return false;
      }

      // 4. Tiêu chí Lịch rảnh (Khung giờ)
      if (timeSlot !== 'ALL') {
        const hasAvailableSlots = comp.availableSlots && comp.availableSlots.some((s) => s.status === 'AVAILABLE');
        if (!hasAvailableSlots && !comp.online) {
          return false;
        }
      }

      // 5. Tiêu chí TrustScore tối thiểu
      if (minTrust > 0 && (comp.trustScore || 80) < minTrust) {
        return false;
      }

      return true;
    });
  }, [companions, selectedGame, selectedRank, priceRange, timeSlot, minTrust]);

  // Sắp xếp
  const sortedCompanions = useMemo(() => {
    const list = [...filteredCompanions];
    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sortBy === 'trust_score') {
      list.sort((a, b) => (b.trustScore || 80) - (a.trustScore || 80));
    } else if (sortBy === 'online') {
      list.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
    } else if (sortBy === 'match_score') {
      list.sort((a, b) => (b.match_score || 80) - (a.match_score || 80));
    }
    return list;
  }, [filteredCompanions, sortBy]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(sortedCompanions.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedCompanions = useMemo(() => {
    const start = (currentPageSafe - 1) * pageSize;
    return sortedCompanions.slice(start, start + pageSize);
  }, [sortedCompanions, currentPageSafe, pageSize]);

  const handleResetFilters = () => {
    onSelectGame('ALL');
    setSelectedRank('ALL');
    setPriceRange('ALL');
    setTimeSlot('ALL');
    setMinTrust(0);
    setSortBy('rating');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedGame !== 'ALL' ||
    selectedRank !== 'ALL' ||
    priceRange !== 'ALL' ||
    timeSlot !== 'ALL' ||
    minTrust > 0 ||
    sortBy !== 'rating';

  return (
    <section id="companions" className="py-8 max-w-7xl mx-auto px-4">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-[#2A2A2A] pb-3">
        {/* Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/30 flex items-center justify-center text-[#E11D2E]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Tìm đồng đội chơi game
            </h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Đồng đội kỹ năng cao, xác minh bậc rank, eKYC và tỷ lệ hoàn thành đơn thật
            </p>
          </div>
        </div>

        {/* Filter Tab Horizontal Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {tabs.map((tab) => {
            const isActive = selectedGame.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectGame(tab.id);
                  setCurrentPage(1);
                }}
                className={`text-xs md:text-sm px-3.5 py-2 font-medium transition-colors whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? 'text-white font-bold border-b-2 border-[#E11D2E]'
                    : 'text-[#A3A3A3] hover:text-white border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5-Criteria Multi-Filter Panel (FR-002, UC02) */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#2A2A2A]/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFFFFF]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Bộ lọc nâng cao (5 tiêu chí)</span>
            <span className="text-[11px] text-[#A3A3A3] font-normal">
              ({sortedCompanions.length} kết quả)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-[#E11D2E] hover:text-[#B91C1C] transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Tiêu chí 1: Rank */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-[#A3A3A3] mb-1">
              <Award className="w-3 h-3 text-[#E11D2E]" />
              <span>Bậc xếp hạng (Rank)</span>
            </label>
            <select
              value={selectedRank}
              onChange={(e) => {
                setSelectedRank(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
            >
              <option value="ALL">Tất cả rank</option>
              <option value="Thách Đấu">Thách Đấu / Radiant</option>
              <option value="Cao Thủ">Cao Thủ / Immortal</option>
              <option value="Kim Cương">Kim Cương / Diamond</option>
              <option value="Bạch Kim">Bạch Kim / Platinum</option>
            </select>
          </div>

          {/* Tiêu chí 2: Mức giá */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-[#A3A3A3] mb-1">
              <DollarSign className="w-3 h-3 text-[#E11D2E]" />
              <span>Mức giá theo giờ</span>
            </label>
            <select
              value={priceRange}
              onChange={(e) => {
                setPriceRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
            >
              <option value="ALL">Mọi mức giá</option>
              <option value="UNDER_100K">Dưới 100.000đ/h</option>
              <option value="100K_150K">100.000đ - 150.000đ/h</option>
              <option value="OVER_150K">Trên 150.000đ/h</option>
            </select>
          </div>

          {/* Tiêu chí 3: Khung giờ rảnh */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-[#A3A3A3] mb-1">
              <Clock className="w-3 h-3 text-[#E11D2E]" />
              <span>Khung giờ rảnh</span>
            </label>
            <select
              value={timeSlot}
              onChange={(e) => {
                setTimeSlot(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
            >
              <option value="ALL">Tất cả khung giờ</option>
              <option value="morning">Sáng (06:00 - 12:00)</option>
              <option value="afternoon">Chiều (12:00 - 18:00)</option>
              <option value="evening">Tối (18:00 - 24:00)</option>
            </select>
          </div>

          {/* Tiêu chí 4: TrustScore tối thiểu */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-[#A3A3A3] mb-1">
              <ShieldCheck className="w-3 h-3 text-[#E11D2E]" />
              <span>TrustScore tối thiểu</span>
            </label>
            <select
              value={minTrust}
              onChange={(e) => {
                setMinTrust(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
            >
              <option value={0}>Tất cả điểm uy tín</option>
              <option value={80}>Từ 80 điểm trở lên</option>
              <option value={90}>Từ 90 điểm trở lên</option>
              <option value={95}>Từ 95 điểm trở lên</option>
            </select>
          </div>

          {/* Sắp xếp kết quả */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-[#A3A3A3] mb-1">
              <ArrowUpDown className="w-3 h-3 text-[#E11D2E]" />
              <span>Sắp xếp theo</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
            >
              <option value="rating">Đánh giá cao nhất</option>
              <option value="price_asc">Giá: Thấp đến cao</option>
              <option value="price_desc">Giá: Cao đến thấp</option>
              <option value="trust_score">TrustScore cao nhất</option>
              <option value="online">Đang trực tuyến</option>
              <option value="match_score">Gợi ý phù hợp nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid: 4 cols desktop, 2 cols tablet, 1 col mobile */}
      {paginatedCompanions.length > 0 ? (
        <>
          <ErrorBoundary fallbackTitle="Không thể tải danh sách Companion" fallbackMessage="Đã xảy ra lỗi khi hiển thị danh sách Companion. Vui lòng thử lại.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {paginatedCompanions.map((comp) => (
                <CompanionCard
                  key={comp.id}
                  companion={comp}
                  onBook={onBookCompanion}
                />
              ))}
            </div>
          </ErrorBoundary>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPageSafe === 1}
                className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#E11D2E] transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                      currentPageSafe === page
                        ? 'bg-[#E11D2E] text-white'
                        : 'bg-[#141414] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white hover:border-[#E11D2E]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPageSafe === totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#E11D2E] transition flex items-center gap-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Trạng thái trống (UC02 Luồng 4a) */
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#A3A3A3]">
            <SlidersHorizontal className="w-6 h-6 text-[#E11D2E]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Không tìm thấy đồng đội phù hợp
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-md mx-auto mb-4 leading-relaxed">
            Không tìm thấy đồng đội phù hợp với bộ lọc hiện tại. Vui lòng thử nới lỏng điều kiện tìm kiếm.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E11D2E] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xem tất cả companion</span>
          </button>
        </div>
      )}
    </section>
  );
};
