import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

interface NewsItem {
  news_id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  image_url: string;
  author: string;
  published_at: string;
}

export const NewsListPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.news) {
          setNews(data.data.news);
        }
      })
      .catch((err) => console.error('Lỗi tải tin tức:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDetail = (slug: string) => {
    window.history.pushState({}, '', `/tin-tuc/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = ['ALL', 'Hệ thống', 'Chính sách', 'Tính năng', 'Hỗ trợ'];

  const filteredNews = selectedCategory === 'ALL' 
    ? news 
    : news.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#E11D2E] selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-xs font-semibold text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ</span>
          </button>
          <span className="text-[11px] font-mono text-[#6B6B6B]">BẢN TIN CHÍNH THỨC • INSTASQUAD</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-bold text-[#E11D2E]">
            <Newspaper className="w-3.5 h-3.5" />
            <span>TIN TỨC &amp; THÔNG BÁO</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Trung tâm Thông cáo &amp; Cập nhật Vận hành
          </h1>
          <p className="text-sm text-[#A3A3A3] max-w-2xl">
            Các cập nhật mới nhất về chính sách ký quỹ Escrow, thuật toán xếp hạng TrustScore, quy định hoàn tiền và hoạt động cộng đồng eSports.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#E11D2E] text-white border-[#E11D2E]'
                  : 'bg-[#141414] text-[#A3A3A3] hover:text-white border-[#2A2A2A]'
              }`}
            >
              {cat === 'ALL' ? 'Tất cả chủ đề' : cat}
            </button>
          ))}
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#A3A3A3]">
            <p>Đang tải danh sách bài viết...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#A3A3A3] border border-dashed border-[#2A2A2A] rounded-xl">
            <p>Không có bài viết nào thuộc danh mục này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredNews.map((item) => (
              <article
                key={item.news_id}
                onClick={() => handleOpenDetail(item.slug)}
                className="group bg-[#141414] border border-[#2A2A2A] hover:border-[#E11D2E]/50 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-[#0A0A0A]">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 bg-[#E11D2E] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center text-[11px] text-[#6B6B6B] gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(item.published_at).toLocaleDateString('vi-VN')}</span>
                      <span>•</span>
                      <span>{item.author}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-[#E11D2E] transition-colors leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs text-[#A3A3A3] line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <span className="text-xs text-[#E11D2E] font-semibold inline-flex items-center gap-1.5 group-hover:gap-2 transition-all">
                    <span>Đọc toàn bộ bài viết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="text-center pt-8 border-t border-[#2A2A2A] text-xs text-[#6B6B6B]">
          <p>© 2026 INSTASQUAD. Bản demo học thuật, không giữ tiền thật.</p>
        </div>
      </div>
    </div>
  );
};
