import React from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Scale, 
  CreditCard, 
  HelpCircle
} from 'lucide-react';

export const EscrowPolicyPage: React.FC = () => {
  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#E11D2E] selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-xs font-semibold text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ</span>
          </button>
          <span className="text-[11px] font-mono text-[#6B6B6B]">VĂN BẢN QUY CHẾ • INSTASQUAD DOCS</span>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-bold text-[#22C55E]">
            <ShieldCheck className="w-4 h-4" />
            <span>CƠ CHẾ KÝ QUỸ ĐỘC LẬP &amp; SỔ CÁI BẤT BIẾN</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Chính sách Ký quỹ Escrow &amp; Hoàn tiền minh bạch
          </h1>
          <p className="text-sm text-[#A3A3A3] leading-relaxed max-w-3xl">
            Quy định chi tiết cơ chế bảo vệ giao dịch thuê bạn chơi game C2C giữa Renter (người thuê) và Companion (người đồng hành). Toàn bộ tiền cọc được giữ trong tài khoản ký quỹ độc lập, giải ngân theo nguyên tắc kế toán kép thời gian thực.
          </p>
        </div>

        {/* 1. Tổng quan 5 bước ký quỹ */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
            <Scale className="w-5 h-5 text-[#E11D2E]" />
            <h2 className="text-lg font-bold text-white">1. Vòng đời giao dịch và 5 chốt chặn an toàn</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-xl">
              <span className="text-xs font-mono text-[#3B82F6] font-bold">BƯỚC 01</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-2">Đặt đơn &amp; Ký quỹ</h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Renter chọn slot giờ hẹn. Số dư khả dụng chuyển vào ví Escrow, tạo bút toán ghi Nợ ví Renter và ghi Có ví Escrow.
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-xl">
              <span className="text-xs font-mono text-[#E11D2E] font-bold">BƯỚC 02</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-2">Phản hồi 180s</h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Companion có 180 giây phản hồi chấp nhận hoặc từ chối đơn. Nếu hết hạn, hệ thống tự hủy đơn và hoàn 100% tiền về ví Renter.
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-xl">
              <span className="text-xs font-mono text-[#A855F7] font-bold">BƯỚC 03</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-2">Phiên chơi game</h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Hai bên tham gia phòng Voice/Chat riêng. Companion bấm bắt đầu và kết thúc phiên chơi sau khi hoàn thành thời lượng đã đặt.
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-xl">
              <span className="text-xs font-mono text-[#22C55E] font-bold">BƯỚC 04</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-2">Nghiệm thu 15m</h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Renter bấm xác nhận hoàn tất. Nếu Renter không phản hồi sau 15 phút, hệ thống tự động nghiệm thu bảo vệ công sức của Companion.
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] p-4 rounded-xl">
              <span className="text-xs font-mono text-[#EAB308] font-bold">BƯỚC 05</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-2">Giải ngân 88/12</h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Tiền từ ví Escrow được phân chia tự động: 88% cộng vào ví khả dụng Companion, 12% ghi nhận doanh thu nền tảng.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Bảng ví dụ tính toán số tiền cụ thể cho đơn 200.000đ */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
            <CreditCard className="w-5 h-5 text-[#22C55E]" />
            <div>
              <h2 className="text-lg font-bold text-white">2. Bảng ví dụ số học thực tế (Đơn chuẩn 200.000 VND)</h2>
              <p className="text-xs text-[#A3A3A3] mt-0.5">Mọi phép tính tuân thủ làm tròn số nguyên đồng VND không phát sinh tiền lẻ</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#CCCCCC] border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-white uppercase text-[11px] font-bold bg-[#0A0A0A]">
                  <th className="py-3 px-4">Tình huống xử lý</th>
                  <th className="py-3 px-3">Mốc thời gian / Điều kiện</th>
                  <th className="py-3 px-3 text-right">Renter nhận</th>
                  <th className="py-3 px-3 text-right">Companion nhận</th>
                  <th className="py-3 px-3 text-right">Sàn INSTASQUAD</th>
                  <th className="py-3 px-4">Quy tắc áp dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                <tr className="hover:bg-[#1A1A1A]/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Ví dụ 1: Renter hủy sớm</td>
                  <td className="py-3.5 px-3">Trước giờ hẹn từ 30 phút trở lên (ví dụ: 45 phút)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#22C55E]">200.000đ (100%)</td>
                  <td className="py-3.5 px-3 text-right text-[#6B6B6B]">0đ (0%)</td>
                  <td className="py-3.5 px-3 text-right text-[#6B6B6B]">0đ (0%)</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] font-mono text-[10px]">CANCEL_GE_30M</span></td>
                </tr>
                <tr className="hover:bg-[#1A1A1A]/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Ví dụ 2: Renter hủy nhỡ giờ</td>
                  <td className="py-3.5 px-3">Trước giờ hẹn 10 – 29 phút (VD: 20 phút)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#F59E0B]">140.000đ (70%)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#F59E0B]">60.000đ (30%)</td>
                  <td className="py-3.5 px-3 text-right text-[#6B6B6B]">0đ (0%)</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-mono text-[10px]">CANCEL_10_30M</span></td>
                </tr>
                <tr className="hover:bg-[#1A1A1A]/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Ví dụ 3: Renter hủy gấp</td>
                  <td className="py-3.5 px-3">Dưới 10 phút trước giờ hẹn (VD: 5 phút)</td>
                  <td className="py-3.5 px-3 text-right text-[#EF4444] font-bold">0đ (Phạt 100%)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#22C55E]">176.000đ (88%)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#EAB308]">24.000đ (12%)</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono text-[10px]">D21_CANCEL_LT_10M</span></td>
                </tr>
                <tr className="hover:bg-[#1A1A1A]/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Ví dụ 4: Nghiệm thu thành công</td>
                  <td className="py-3.5 px-3">Renter bấm duyệt hoặc hết 15m auto-accept</td>
                  <td className="py-3.5 px-3 text-right text-[#6B6B6B]">Dịch vụ hoàn tất</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#22C55E]">176.000đ (88%)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#EAB308]">24.000đ (12%)</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] font-mono text-[10px]">SETTLEMENT_88_12</span></td>
                </tr>
                <tr className="hover:bg-[#1A1A1A]/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Ví dụ 5: Khiếu nại lỗi Companion</td>
                  <td className="py-3.5 px-3">CS Agent thẩm định lỗi Companion từ 80% trở lên</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#22C55E]">200.000đ (100%)</td>
                  <td className="py-3.5 px-3 text-right text-[#EF4444] font-bold">0đ + Phạt 40.000đ (20%)</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#EAB308]">40.000đ (Thu tiền phạt)</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-[#A855F7]/10 text-[#A855F7] font-mono text-[10px]">DISPUTE_FAULT_GE_80</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] text-xs text-[#A3A3A3] space-y-1">
            <p><strong>Cơ chế khấu trừ tiền phạt khiếu nại:</strong> Trường hợp Companion không đủ số dư khả dụng 40.000đ (ví dụ chỉ có 10.000đ trong ví), hệ thống sẽ trừ 10.000đ khả dụng và ghi nhận số âm 30.000đ dưới dạng nợ vi phạm. Khoản nợ này sẽ tự động được cấn trừ vào các đơn nhận thanh toán tiếp theo.</p>
          </div>
        </div>

        {/* 3. Trung tâm trợ giúp & FAQ */}
        <div id="faq" className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
            <HelpCircle className="w-5 h-5 text-[#FACC15]" />
            <h2 className="text-lg font-bold text-white">3. Các câu hỏi thường gặp (FAQ)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#A3A3A3]">
            <div className="space-y-1.5 p-4 rounded-xl bg-[#0A0A0A] border border-[#222]">
              <h4 className="font-bold text-white text-sm">Nếu Companion không lên mạng hoặc không trả lời đơn?</h4>
              <p className="leading-relaxed">Sau 180 giây kể từ khi Renter bấm đặt đơn, nếu Companion không ấn "Nhận đơn", đơn đặt lịch sẽ tự động hết hạn (EXPIRED) và 100% tiền ký quỹ được hoàn trả ngay lập tức về ví khả dụng của Renter.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#0A0A0A] border border-[#222]">
              <h4 className="font-bold text-white text-sm">Nếu Renter quên không bấm nghiệm thu sau khi chơi?</h4>
              <p className="leading-relaxed">Hệ thống kích hoạt cửa sổ nghiệm thu 15 phút. Nếu sau 15 phút Renter không phản hồi và không gửi khiếu nại, hệ thống tự động nghiệm thu (auto-accept) và giải ngân 88% cho Companion để bảo vệ quyền lợi chính đáng của người cung cấp dịch vụ.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#0A0A0A] border border-[#222]">
              <h4 className="font-bold text-white text-sm">Làm thế nào để khiếu nại nếu Companion có thái độ tiêu cực?</h4>
              <p className="leading-relaxed">Trong vòng 24 giờ sau phiên chơi, Renter có thể nhấn nút "Khiếu nại / Báo cáo sự cố". Tiền trong ví Escrow sẽ lập tức bị đóng băng (FROZEN). Renter và Companion tải lên ảnh chụp màn hình bằng chứng để CS Agent phân xử.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#0A0A0A] border border-[#222]">
              <h4 className="font-bold text-white text-sm">Tôi có thể rút tiền từ ví ra tài khoản ngân hàng không?</h4>
              <p className="leading-relaxed">Có. Người dùng có thể gửi yêu cầu rút tiền qua trang Quản lý ví. Hệ thống hỗ trợ mô phỏng đối soát ngân hàng tự động, ghi nhận bút toán kiểm toán đối ứng kép rõ ràng.</p>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center pt-4 pb-8 border-t border-[#2A2A2A] text-xs text-[#6B6B6B]">
          <p>© 2026 INSTASQUAD. Bản demo học thuật, không giữ tiền thật. Mọi giao dịch được mô phỏng theo chuẩn kế toán kép.</p>
        </div>
      </div>
    </div>
  );
};
