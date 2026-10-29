import React from 'react';
import { Star, MessageSquareQuote, ArrowRight } from 'lucide-react';
import { MOCK_REVIEWS } from '../data/mock';

export const Testimonials: React.FC = () => {
  return (
    <section id="reviews" className="py-8 md:py-10 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wide text-white">
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
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* 5 Review Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-2">
        {MOCK_REVIEWS.map((rev) => (
          <div
            key={rev.id}
            className="rounded-2xl bg-[#15152E] border border-white/10 hover:border-purple-500/40 p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-purple select-none"
          >
            <div>
              {/* User Header */}
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/40 p-0.5"
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
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  {rev.gameName}
                </span>
              </div>

              {/* Content */}
              <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-4">
                "{rev.content}"
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
              <span>Đã xác thực đơn</span>
              <span className="text-emerald-400 font-semibold">100% Escrow</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
