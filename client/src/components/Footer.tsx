import React from 'react';
import { Gamepad2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070716] border-t border-white/10 pt-12 pb-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* 4 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          
          {/* Col 1: Brand & Slogan (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-pink-500 p-0.5 shadow-glow-purple">
                <div className="w-full h-full bg-[#0A0A1F] rounded-[10px] flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="font-black text-xl tracking-wider text-white">
                INSTA<span className="text-gradient-purple">SQUAD</span>
              </span>
            </div>

            <p className="text-sm font-extrabold italic uppercase tracking-wider text-purple-300">
              PLAY TOGETHER, WIN TOGETHER
            </p>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Nền tảng thương mại điện tử kết nối thuê Companion chơi game C2C hàng đầu. Bảo vệ quyền lợi tài chính đôi bên bằng cơ chế Ký quỹ Escrow và Sổ cái kép bất biến.
            </p>

            {/* Social Icons */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-2">
                Kết nối với chúng tôi
              </span>
              <div className="flex items-center space-x-2">
                {['Discord', 'Facebook', 'YouTube', 'TikTok', 'Instagram'].map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg bg-[#15152E] hover:bg-purple-900/40 text-slate-300 hover:text-white border border-white/5 hover:border-purple-500/40 cursor-pointer transition text-[11px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Col 2: Về chúng tôi */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase text-white tracking-wider">
              Về chúng tôi
            </h4>
            <ul className="space-y-2">
              <li><a href="#about" className="hover:text-purple-400 transition">Giới thiệu nền tảng</a></li>
              <li><a href="#about" className="hover:text-purple-400 transition">Tuyển dụng Companion</a></li>
              <li><a href="#about" className="hover:text-purple-400 transition">Tin tức & Sự kiện</a></li>
              <li><a href="#about" className="hover:text-purple-400 transition">Liên hệ truyền thông</a></li>
            </ul>
          </div>

          {/* Col 3: Hỗ trợ */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase text-white tracking-wider">
              Hỗ trợ
            </h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-purple-400 transition">Câu hỏi thường gặp (FAQ)</a></li>
              <li><a href="#guide" className="hover:text-purple-400 transition">Hướng dẫn thuê Companion</a></li>
              <li><a href="#guide" className="hover:text-purple-400 transition">Hướng dẫn nạp/rút tiền</a></li>
              <li><a href="#privacy" className="hover:text-purple-400 transition">Chính sách bảo mật dữ liệu</a></li>
            </ul>
          </div>

          {/* Col 4: Chính sách */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase text-white tracking-wider">
              Chính sách
            </h4>
            <ul className="space-y-2">
              <li><a href="#terms" className="hover:text-purple-400 transition">Điều khoản dịch vụ</a></li>
              <li><a href="#refund" className="hover:text-purple-400 transition">Chính sách ký quỹ & hoàn tiền</a></li>
              <li><a href="#rma" className="hover:text-purple-400 transition">Quy trình phân xử khiếu nại (RMA)</a></li>
              <li><a href="#standards" className="hover:text-purple-400 transition">Tiêu chuẩn cộng đồng</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 INSTASQUAD. All rights reserved. Đồ án môn học Thương mại Điện tử.</p>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-medium">✓ Zero-Trust Escrow Protected</span>
            <span className="text-purple-400 font-medium">✓ Double-Entry Balance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
