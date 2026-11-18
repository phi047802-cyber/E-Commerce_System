import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Tag, Share2, Check } from 'lucide-react';

interface NewsDetail {
  news_id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  author: string;
  published_at: string;
}

interface NewsDetailPageProps {
  slug: string;
}

export const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ slug }) => {
  const [article, setArticle] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/news/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.news) {
          setArticle(data.data.news);
        }
      })
      .catch((err) => console.error('Lỗi tải bài viết:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBackToNews = () => {
    window.history.pushState({}, '', '/tin-tuc');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-8">
        <p className="text-xs text-[#A3A3A3]">Đang tải nội dung bài viết...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-sm text-[#EF4444] font-semibold">Không tìm thấy bài viết yêu cầu.</p>
        <button
          type="button"
          onClick={handleBackToNews}
          className="px-4 py-2 rounded-lg bg-[#141414] border border-[#2A2A2A] text-xs font-semibold hover:text-white cursor-pointer"
        >
          Quay lại danh sách tin tức
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#E11D2E] selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <article className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <button
            type="button"
            onClick={handleBackToNews}
            className="flex items-center gap-2 text-xs font-semibold text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tất cả tin tức &amp; thông báo</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-xs text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép liên kết' : 'Chia sẻ'}</span>
          </button>
        </div>

        {/* Article Meta */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-xs font-bold text-[#E11D2E]">
            <Tag className="w-3.5 h-3.5" />
            <span>{article.category}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B6B6B] border-b border-[#2A2A2A] pb-4">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {article.author}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.published_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#141414]">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Summary Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border-l-4 border-[#E11D2E] text-xs sm:text-sm text-[#CCCCCC] leading-relaxed italic">
          {article.summary}
        </div>

        {/* Article Body Content */}
        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-[#A3A3A3] leading-relaxed space-y-4">
          {article.content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-base sm:text-lg font-bold text-white pt-3 pb-1 border-b border-[#2A2A2A]">
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('- ')) {
              const items = paragraph.split('\n');
              return (
                <ul key={idx} className="list-disc pl-5 space-y-1.5 text-[#CCCCCC]">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="text-[#CCCCCC]">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center pt-8 border-t border-[#2A2A2A] text-xs text-[#6B6B6B]">
          <p>© 2026 INSTASQUAD. Bản demo học thuật, không giữ tiền thật.</p>
        </div>
      </article>
    </div>
  );
};
