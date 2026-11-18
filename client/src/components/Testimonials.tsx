import React from 'react';
import { Star, MessageSquareQuote, ArrowRight } from 'lucide-react';
import { MOCK_REVIEWS } from '../data/mock';

export const Testimonials: React.FC = () => {
  return (
    <section id="reviews" className="py-8 md:py-10 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold uppercase tracking-wide text-white">
              KHÁCH HÀNG NÓI GÌ VỀ CHÚNG TÔI?
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đánh giá thực tế từ các Renter sau khi hoàn tất phiên chơi
            </p>
          </div>
        </div>

        <a 
          href="#companions"
          className="group text-xs md:text-sm font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
        >
          <span>Xem tất cả đánh giá</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* 5 Review Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-2">
        {MOCK_REVIEWS.map((rev) => (
          <div
            key={rev.id}
            className="rounded-2xl bg-[#0D0D12] border border-white/[0.08] hover:border-purple-500/40 p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 select-none shadow-sm"
          >
            <div>
              {/* User Header with Consistent Gamer Avatar */}
              <div className="flex items-center space-x-2.5 mb-3">
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = '/images/avatars/av01.jpg';
                  }}
                  className="w-9 h-9 rounded-full object-cover border border-purple-500/40 p-0.5 bg-[#14141B]"
                />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    {rev.author}
                  </h3>
                  <span className="text-[10px] text-purple-300 font-medium">
                    {rev.role}
                  </span>
                </div>
              </div>

              {/* Rating & Game Badge */}
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <div className="flex items-center text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] truncate max-w-[100px]">
                  {rev.gameName}
                </span>
              </div>

              {/* Content */}
              <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-4">
                "{rev.content}"
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
              <span>Đã xác thực đơn</span>
              <span className="text-emerald-400 font-medium">100% Escrow</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

