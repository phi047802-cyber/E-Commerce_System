import React, { useState, useRef } from 'react';
import { Star, CheckCircle2, Clock, ShieldCheck, Volume2, Pause } from 'lucide-react';
import { MockCompanion } from '../data/mock';
import { Avatar } from './common/Avatar';
import { GameCover } from './common/GameCover';

interface CompanionCardProps {
  companion: MockCompanion;
  onBook: (companion: MockCompanion) => void;
}

export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, onBook }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availableSlotsCount = companion.availableSlots
    ? companion.availableSlots.filter((s) => s.status === 'AVAILABLE').length
    : 0;
  const hasAvailableSlots = availableSlotsCount > 0;

  const handleToggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!companion.audioBioUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(companion.audioBioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => setIsPlaying(false);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  // Huy hiệu thứ hạng (Thứ hạng theo tông màu sắc nét)
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-[#E11D2E] text-[#FFFFFF] font-black';
    if (rank === 2) return 'bg-[#1C1C1C] text-[#FFFFFF] border border-[#2A2A2A] font-bold';
    if (rank === 3) return 'bg-[#1C1C1C] text-[#A3A3A3] border border-[#2A2A2A] font-bold';
    return 'bg-[#141414] text-[#A3A3A3] border border-[#2A2A2A] font-medium';
  };

  const avatarSrc = companion.avatar || `/images/avatars/av0${((companion.rankIndex - 1) % 5) + 1}.jpg`;

  return (
    <div
      data-testid="companion-card"
      className="group relative rounded-xl overflow-hidden bg-[#141414] border border-[#2A2A2A] hover:border-[#E11D2E] transition-all duration-150 hover:-translate-y-0.5 flex flex-col justify-between p-3.5 select-none"
    >
      {/* Top Media: Key art backdrop + Center player avatar + Badges */}
      <div className="relative rounded-lg overflow-hidden h-40 w-full bg-[#1C1C1C] mb-3 flex items-center justify-center">
        {/* Game Cover Backdrop */}
        <GameCover
          gameId={companion.gameId}
          gameName={companion.gameName}
          className="absolute inset-0"
        />

        {/* Top Badges Row: Rank left & Game right */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${getRankBadgeClass(companion.rankIndex)}`}>
            #{companion.rankIndex}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0A0A0A]/85 text-[#A3A3A3] border border-[#2A2A2A] truncate max-w-[120px]">
            {companion.gameName}
          </span>
        </div>

        {/* Player Avatar */}
        <div className="relative z-10 flex flex-col items-center">
          <Avatar
            src={companion.avatar || avatarSrc}
            name={companion.name}
            size="lg"
            className="border-2 border-[#2A2A2A] group-hover:border-[#E11D2E] transition-colors shadow-lg"
          />
        </div>

        {/* Bottom Status Row: Online dot & Slot count */}
        <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between z-10 pointer-events-none text-[10px]">
          {/* Online green dot */}
          <div className="flex items-center gap-1.5 bg-[#0A0A0A]/85 px-2 py-0.5 rounded-full border border-[#2A2A2A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            <span className="font-medium text-[#22C55E]">Online</span>
          </div>

          {/* Slot availability */}
          {hasAvailableSlots ? (
            <div className="flex items-center gap-1 bg-[#0A0A0A]/85 px-2 py-0.5 rounded-full border border-[#2A2A2A] text-[#FFFFFF] font-medium">
              <Clock className="w-2.5 h-2.5 text-[#E11D2E]" />
              <span>{availableSlotsCount} slot rảnh</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#0A0A0A]/85 px-2 py-0.5 rounded-full border border-[#2A2A2A] text-[#6B6B6B]">
              <span>Chưa có lịch</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Name & Rating */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <h3
                className="font-bold text-sm text-[#FFFFFF] truncate group-hover:text-[#E11D2E] transition-colors"
                title={companion.name}
              >
                {companion.name}
              </h3>
              {companion.verified && (
                <span title="Đã xác minh kỹ năng">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                </span>
              )}
            </div>

            {/* Rating */}
            {companion.reviewCount > 0 ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-[#FACC15] shrink-0 bg-[#1C1C1C] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                <Star className="w-3 h-3 fill-[#FACC15]" />
                <span>{companion.rating.toFixed(1)}</span>
                <span className="text-[#6B6B6B] text-[10px]">({companion.reviewCount})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#A3A3A3] shrink-0 bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#2A2A2A]" title="Companion mới, chưa có đánh giá">
                <Star className="w-3 h-3 text-[#6B6B6B]" />
                <span>Mới</span>
              </div>
            )}
          </div>

          {/* Rank & Stats Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              className="text-[10px] font-semibold text-[#FFFFFF] bg-[#1C1C1C] border border-[#2A2A2A] px-2 py-0.5 rounded flex items-center gap-1"
              title={
                companion.rank_verification?.provider_status === 'VERIFIED_MOCK' || companion.rank_verification?.verified
                  ? 'Bậc rank đã được đối chiếu thành công qua hệ thống mô phỏng'
                  : 'Bậc rank do Companion tự khai báo, chưa qua đối chiếu'
              }
            >
              <span>{companion.tier}</span>
              {companion.rank_verification?.provider_status === 'VERIFIED_MOCK' || companion.rank_verification?.verified ? (
                <span className="text-[9px] text-[#22C55E] font-medium" title="Đã đối chiếu (mô phỏng)">
                  • Đã đối chiếu
                </span>
              ) : (
                <span className="text-[9px] text-[#A3A3A3] font-normal" title="Bậc rank khai báo">
                  • Khai báo
                </span>
              )}
            </span>

            {/* Tỷ lệ hoàn thành */}
            {companion.reviewCount > 0 || (companion.completionRate !== undefined && companion.completionRate > 0) ? (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  (companion.completionRate ?? 100) >= 90
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                }`}
                title="Tỷ lệ hoàn thành đơn thật từ DB"
              >
                Hoàn thành {(companion.completionRate ?? 100).toFixed(0)}%
              </span>
            ) : (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded border bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]"
                title="Companion mới, chưa có đơn nào hoàn thành"
              >
                Chưa có đơn
              </span>
            )}

            {/* TrustScore */}
            <span
              className="text-[10px] font-bold text-[#A3A3A3] bg-[#1C1C1C] border border-[#2A2A2A] px-1.5 py-0.5 rounded flex items-center gap-1"
              title="Điểm uy tín hệ thống (thang 0-100)"
            >
              <ShieldCheck className="w-3 h-3 text-[#E11D2E]" />
              <span>Uy tín {(companion.trustScore ?? 80).toFixed(0)}</span>
            </span>

            {/* eKYC Badge (FR-002, NFR-002) */}
            {(companion.is_kyc_verified || (companion as any).isKycVerified || companion.verification_status === 'VERIFIED') && (
              <span
                className="text-[10px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-1.5 py-0.5 rounded flex items-center gap-1"
                title="Đã xác thực danh tính eKYC"
              >
                <ShieldCheck className="w-3 h-3 text-[#3B82F6]" />
                <span>eKYC</span>
              </span>
            )}

            {/* Voice Intro Pill */}
            {companion.audioBioUrl && (
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer ${
                  isPlaying
                    ? 'bg-[#E11D2E]/20 text-[#E11D2E] border-[#E11D2E]'
                    : 'bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#22C55E] border-[#2A2A2A]'
                }`}
                title="Nghe đoạn ghi âm giọng nói của companion"
              >
                {isPlaying ? <Pause className="w-2.5 h-2.5 animate-pulse text-[#E11D2E]" /> : <Volume2 className="w-2.5 h-2.5 text-[#22C55E]" />}
                <span>{isPlaying ? 'Dừng' : 'Nghe giọng'}</span>
              </button>
            )}
          </div>

          {/* Match Score (FR-002, UC02) */}
          {typeof companion.match_score === 'number' && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[#A3A3A3]">Độ phù hợp:</span>
              <span className="font-bold text-[#22C55E]" title={companion.match_breakdown?.explanation || ''}>
                {companion.match_score}%
              </span>
            </div>
          )}

          {/* Quote */}
          {(() => {
            const cleanQuote = (companion.quote || '')
              .replace(/In-game:.*$/i, '')
              .replace(/\(Hồ sơ minh họa\)/g, '')
              .trim();
            if (!cleanQuote) return null;
            return (
              <p className="mt-2 text-[11px] text-[#A3A3A3] italic line-clamp-2 leading-relaxed">
                "{cleanQuote}"
              </p>
            );
          })()}
        </div>

        {/* 1-Line Price & 1-Line "Thuê ngay" Button (Yêu cầu 2e) */}
        <div className="mt-3 pt-2.5 border-t border-[#2A2A2A] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-[#6B6B6B] block leading-tight">Đơn giá:</span>
            <span className="text-xs font-bold text-[#FFFFFF] whitespace-nowrap">
              {companion.hourlyRate.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-[#A3A3A3]">đ/giờ</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onBook(companion)}
            className="px-3.5 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-[#FFFFFF] font-bold text-xs transition duration-150 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>Thuê ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
