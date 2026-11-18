import React, { useState } from 'react';
import { Gamepad2, Send, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const navigateTo = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0A0A0A] border-t border-[#2A2A2A] pt-12 pb-8 text-[#A3A3A3] text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-10">
          {/* Brand & Newsletter (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E11D2E] flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-wider text-white">
                INSTA<span className="text-[#E11D2E]">SQUAD</span>
              </span>
            </div>

            <p className="text-xs text-[#A3A3A3] max-w-sm leading-relaxed">
              Sàn thương mại dịch vụ thuê Companion chơi game C2C. Bảo vệ giao dịch bằng Ký quỹ Escrow và Sổ cái kép thời gian thực.
            </p>

            {/* Newsletter Input */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white block mb-2">
                Đăng ký nhận bản tin
              </span>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn..."
                  className="bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white placeholder-[#6B6B6B] flex-1 focus:outline-none focus:border-[#E11D2E]"
                />
                <button
                  type="submit"
                  className="bg-[#E11D2E] hover:bg-[#B91C1C] text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {subscribed ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{subscribed ? 'Đã gửi' : 'Gửi'}</span>
                </button>
              </form>
            </div>

            {/* Social Links */}
            <div className="pt-2 flex items-center space-x-2">
              {['Discord', 'Facebook', 'YouTube', 'TikTok'].map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-md bg-[#141414] hover:bg-[#1C1C1C] text-[#A3A3A3] hover:text-white border border-[#2A2A2A] cursor-pointer transition text-[11px]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Sản phẩm */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">
              Sản phẩm
            </h4>
            <ul className="space-y-2 text-[#A3A3A3]">
              <li><a href="#games" className="hover:text-white transition">Tìm đồng đội</a></li>
              <li><a href="#companions" className="hover:text-white transition">Sàn Companion</a></li>
              <li><a href="#games" className="hover:text-white transition">Danh mục Game</a></li>
              <li><a href="#community" className="hover:text-white transition">Cộng đồng & Đánh giá</a></li>
            </ul>
          </div>

          {/* Col 3: Quy chế */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">
              Quy chế
            </h4>
            <ul className="space-y-2 text-[#A3A3A3]">
              <li><a href="/chinh-sach-escrow" onClick={navigateTo('/chinh-sach-escrow')} className="hover:text-white transition">Ký quỹ Escrow</a></li>
              <li><a href="/chinh-sach-escrow" onClick={navigateTo('/chinh-sach-escrow')} className="hover:text-white transition">Chính sách hoàn tiền</a></li>
              <li><a href="/dieu-khoan-dich-vu" onClick={navigateTo('/dieu-khoan-dich-vu')} className="hover:text-white transition">Quy chuẩn ứng xử</a></li>
              <li><a href="/tin-tuc" onClick={navigateTo('/tin-tuc')} className="hover:text-white transition">Tin tức & Thông báo</a></li>
            </ul>
          </div>

          {/* Col 4: Hỗ trợ */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">
              Hỗ trợ
            </h4>
            <ul className="space-y-2 text-[#A3A3A3]">
              <li><a href="/chinh-sach-escrow#faq" onClick={navigateTo('/chinh-sach-escrow')} className="hover:text-white transition">Trung tâm trợ giúp (FAQ)</a></li>
              <li><a href="/quy-trinh-khieu-nai" onClick={navigateTo('/quy-trinh-khieu-nai')} className="hover:text-white transition">Quy trình giải quyết RMA</a></li>
              <li><a href="/huong-dan-nap-rut" onClick={navigateTo('/huong-dan-nap-rut')} className="hover:text-white transition">Hướng dẫn nạp/rút tiền</a></li>
              <li><a href="#why-us" className="hover:text-white transition">Hỗ trợ trực tuyến</a></li>
            </ul>
          </div>

          {/* Col 5: Pháp lý */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">
              Pháp lý
            </h4>
            <ul className="space-y-2 text-[#A3A3A3]">
              <li><a href="/dieu-khoan-dich-vu" onClick={navigateTo('/dieu-khoan-dich-vu')} className="hover:text-white transition">Điều khoản dịch vụ</a></li>
              <li><a href="/chinh-sach-escrow" onClick={navigateTo('/chinh-sach-escrow')} className="hover:text-white transition">Chính sách ký quỹ & hoàn tiền</a></li>
              <li><a href="/quy-trinh-khieu-nai" onClick={navigateTo('/quy-trinh-khieu-nai')} className="hover:text-white transition">Quy trình phân xử khiếu nại</a></li>
              <li><a href="/huong-dan-nap-rut" onClick={navigateTo('/huong-dan-nap-rut')} className="hover:text-white transition">Quy định nạp rút & kế toán</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#6B6B6B]">
          <p>© 2026 INSTASQUAD. Bản demo học thuật, không giữ tiền thật.</p>
          <div className="flex items-center space-x-4">
            <span className="text-[#22C55E]">✓ Ký quỹ Escrow thời gian thực</span>
            <span className="text-[#A3A3A3]">✓ Sổ cái kép bất biến</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
