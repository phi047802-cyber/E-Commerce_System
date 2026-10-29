import React from 'react';
import { Star, CheckCircle2, Clock } from 'lucide-react';
import { MockCompanion } from '../data/mock';

interface CompanionCardProps {
  companion: MockCompanion;
  onBook: (companion: MockCompanion) => void;
}

export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, onBook }) => {
  // Rank badge colors: #1 Gold, #2 Silver, #3 Bronze, others Purple
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-slate-950 shadow-glow-amber';
    if (rank === 2) return 'bg-slate-300 text-slate-950';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-purple-900/80 text-purple-200 border border-purple-500/40';
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-[#15152E] border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-purple flex flex-col justify-between p-3.5 select-none">
      
      {/* Top Media Header */}
      <div className="relative rounded-xl overflow-hidden h-36 w-full bg-[#0e0e24] mb-3">
        {/* Companion Photo */}
        <img
          src={companion.image}
          alt={companion.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient dark bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#15152E] via-transparent to-black/40" />

        {/* Top Left Rank Badge (#1..#12) */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${getRankBadgeClass(companion.rankIndex)}`}>
          #{companion.rankIndex}
        </div>

        {/* Top Right Game Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A0A1F]/80 backdrop-blur-md text-purple-300 border border-purple-500/30">
          {companion.gameName}
        </div>

        {/* Online Status Dot */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[#0A0A1F]/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400">Online</span>
        </div>
      </div>

      {/* Main Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Name & Verification */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="font-bold text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                {companion.name}
              </h3>
              {companion.verified && (
                <span title="Companion đã xác thực">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20 flex-shrink-0" />
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 flex-shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{companion.rating.toFixed(1)}</span>
              <span className="text-slate-400 text-[10px]">({companion.reviewCount})</span>
            </div>
          </div>

          {/* Rank / Tier & Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-md">
              {companion.tier}
            </span>
            {companion.tags.map((t, idx) => (
              <span key={idx} className="text-[10px] text-slate-300 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md">
                {t}
              </span>
            ))}
          </div>

          {/* Quote */}
          <p className="mt-2 text-[11px] text-slate-300 italic line-clamp-2 leading-snug">
            "{companion.quote}"
          </p>
        </div>

        {/* Pricing & Booking CTA */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block leading-tight">Đơn giá:</span>
            <span className="text-xs font-extrabold text-emerald-400">
              {companion.hourlyRate.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-400">đ/h</span>
            </span>
          </div>

          <button
            onClick={() => onBook(companion)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-glow-purple transition-all active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>Đặt lịch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
