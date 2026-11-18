import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Scale, 
  Headphones, 
  Star,
  Newspaper,
  Calendar,
  ArrowRight
} from 'lucide-react';

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  summary: string;
  date: string;
  image: string;
  category: string;
}

const NEWS_LIST: NewsItem[] = [
  {
    id: 'news-1',
    slug: 'chinh-sach-huy-don-va-hoan-tien-bac-thang',
    title: 'Chính sách hủy đơn bậc thang và bảo vệ quyền lợi hai chiều',
    summary: 'Rõ ràng mốc 30 phút, 10-29 phút và phạt 100% dưới 10 phút chia 88/12 giữa Companion và sàn.',
    date: '05/11/2026',
    image: '/images/news/news-cancellation.webp',
    category: 'Chính sách',
  },
  {
    id: 'news-2',
    slug: 'co-che-ky-quy-escrow-va-so-cai-kep',
    title: 'Nâng cấp Engine Sổ cái kép & Cơ chế Ký quỹ Escrow tự động',
    summary: 'Quy định thời hạn Companion phản hồi đơn 180s và đối soát số dư cân bằng theo thời gian thực 24/7.',
    date: '04/11/2026',
    image: '/images/news/news-escrow.webp',
    category: 'Hệ thống',
  },
  {
    id: 'news-3',
    slug: 'thuat-toan-trustscore-va-ty-le-hoan-thanh',
    title: 'Hệ thống tính điểm uy tín TrustScore và tỷ lệ hoàn thành đơn minh bạch',
    summary: 'Bộ chỉ số mới giúp Renter đánh giá mức độ chuyên nghiệp và minh bạch trước khi bắt đầu phiên chơi.',
    date: '06/11/2026',
    image: '/images/news/news-trustscore.webp',
    category: 'Tính năng',
  },
];

const WHY_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Ký quỹ Escrow an toàn',
    desc: 'Tiền thuê được giữ trong ví ký quỹ Escrow và chỉ giải ngân sau khi bạn xác nhận nghiệm thu phiên chơi.',
  },
  {
    icon: Lock,
    title: 'Bảo vệ thông tin cá nhân',
    desc: 'Không tiết lộ số điện thoại hay tài khoản cá nhân. Mọi trao đổi diễn ra trên nền tảng an toàn.',
  },
  {
    icon: Scale,
    title: 'Hệ thống Sổ cái kép',
    desc: 'Toàn bộ giao dịch tuân thủ nguyên tắc kế toán kép, kiểm toán tự động cân bằng thời gian thực.',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ khiếu nại RMA',
    desc: 'Đội ngũ CS Agent túc trực giải quyết tranh chấp với bằng chứng hình ảnh và nhật ký minh bạch.',
  },
  {
    icon: Star,
    title: 'Đánh giá hai chiều công bằng',
    desc: 'Hệ thống điểm uy tín TrustScore và tỷ lệ hoàn thành đơn thật giúp duy trì cộng đồng văn minh.',
  },
];

export const NewsAndWhyChoose: React.FC = () => {
  const navigateTo = (path: string) => () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="why-us" className="py-8 max-w-7xl mx-auto px-4 space-y-10">
      {/* 1. Tin tức & thông báo (3 cards) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <Newspaper className="w-5 h-5 text-[#E11D2E]" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Tin tức & thông báo
              </h2>
              <p className="text-sm text-[#A3A3A3] mt-0.5">
                Cập nhật tính năng, sự kiện cộng đồng và hoạt động thể thao điện tử
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={navigateTo('/tin-tuc')}
            className="text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {NEWS_LIST.map((item) => (
            <article
              key={item.id}
              onClick={navigateTo(item.slug ? `/tin-tuc/${item.slug}` : '/tin-tuc')}
              className="group bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#E11D2E]/40 transition-colors flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden bg-[#0A0A0A]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-3 left-3 bg-[#E11D2E] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center text-[11px] text-[#6B6B6B] gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#E11D2E] transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#A3A3A3] line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <span className="text-xs text-[#E11D2E] font-medium inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                  Đọc tiếp <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 2. Vì sao chọn INSTASQUAD (5 điểm) */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Vì sao chọn INSTASQUAD?
          </h3>
          <p className="text-xs md:text-sm text-[#A3A3A3] mt-1">
            Nền tảng thương mại dịch vụ game đầu tiên cam kết bảo vệ tài chính đa chiều
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {WHY_POINTS.map((pt, i) => {
            const Icon = pt.icon;
            return (
              <div
                key={i}
                className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#E11D2E] mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    {pt.title}
                  </h4>
                  <p className="text-[11px] text-[#A3A3A3] leading-relaxed mt-1">
                    {pt.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2A2A2A]/50">
                  <span className="text-[10px] text-[#6B6B6B] font-mono">0{i + 1} / Chuẩn sàn</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
