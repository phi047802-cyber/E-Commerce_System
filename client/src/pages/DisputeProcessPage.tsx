import React from 'react';
import { Scale, ArrowLeft, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';

export const DisputeProcessPage: React.FC = () => {
  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#E11D2E] selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-xs font-semibold text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ</span>
          </button>
          <span className="text-[11px] font-mono text-[#6B6B6B]">QUY TRÌNH HỖ TRỢ • RMA DISPUTE</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-bold text-[#A855F7]">
            <Scale className="w-3.5 h-3.5" />
            <span>QUY TRÌNH PHÂN XỬ KHIẾU NẠI &amp; BẢO HỘ RMA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Quy trình Giải quyết Khiếu nại &amp; Trọng tài Khách quan
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
            Cơ chế bảo vệ quyền lợi người dùng khi phát sinh tranh chấp về chất lượng dịch vụ, thái độ ứng xử hoặc sự cố kỹ thuật trong phiên chơi.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#A855F7]" />
              1. Khởi tạo Khiếu nại (Cửa sổ 24 Giờ)
            </h2>
            <p className="text-[#CCCCCC]">
              Sau khi phiên chơi kết thúc hoặc có sự cố, Renter có tối đa <strong>24 giờ</strong> để bấm nút "Báo cáo sự cố / Khiếu nại" từ trang chi tiết đơn hàng.
            </p>
            <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#222]">
              <p className="text-white font-semibold">Tác động tức thì đối với tiền ký quỹ:</p>
              <p className="text-[#A3A3A3] mt-1">
                Số tiền ký quỹ của đơn hàng ngay lập tức chuyển sang trạng thái <code className="text-[#A855F7] bg-[#A855F7]/10 px-1 py-0.5 rounded">FROZEN</code>. Mọi lệnh rút tiền từ đơn hàng này đều bị khóa tự động để bảo đảm nguồn hoàn trả.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#3B82F6]" />
              2. Cung cấp Chứng cứ Hai Chiều
            </h2>
            <p className="text-[#CCCCCC]">
              Cả hai bên (Renter và Companion) đều có quyền và nghĩa vụ tải lên chứng cứ:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#CCCCCC]">
              <li>Ảnh chụp màn hình kết quả trận đấu, bảng điểm, thời gian chơi thực tế.</li>
              <li>Nhật ký trao đổi trong phòng chat hoặc ảnh chụp màn hình phòng voice.</li>
              <li>Lời tường trình chi tiết diễn biến sự việc.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              3. Thẩm định và Chế tài Xử lý
            </h2>
            <p className="text-[#CCCCCC]">
              Đội ngũ Chăm sóc khách hàng (CS Agent) độc lập tiến hành đối soát chứng cứ theo nguyên tắc khách quan:
            </p>
            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="font-bold text-[#22C55E]">Lỗi Companion từ 80% trở lên:</span>
                <p className="text-[#CCCCCC] mt-1">
                  Renter được <strong>hoàn trả 100%</strong> tiền ký quỹ về ví khả dụng. Companion bị phạt <strong>20% giá trị đơn</strong> trừ trực tiếp từ ví khả dụng để ghi Có doanh thu vi phạm cho nền tảng. Nếu số dư ví không đủ, hệ thống ghi nợ <code className="text-[#EF4444]">PENALTY_DEBT</code> và cấn trừ tự động ở các đơn tiếp theo. Đồng thời, Companion bị trừ 10 điểm TrustScore.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="font-bold text-[#3B82F6]">Lỗi Renter / Không có lỗi Companion (0%):</span>
                <p className="text-[#CCCCCC] mt-1">
                  Đơn hàng được giải ngân bình thường theo tỷ lệ chuẩn <strong>88% cho Companion</strong> và <strong>12% cho sàn</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="font-bold text-[#F59E0B]">Lỗi một phần (1% đến 79%):</span>
                <p className="text-[#CCCCCC] mt-1">
                  CS Agent phân bổ tỷ lệ hoàn trả tương ứng cho Renter, phần còn lại được giải ngân cho Companion.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center pt-8 border-t border-[#2A2A2A] text-xs text-[#6B6B6B]">
          <p>© 2026 INSTASQUAD. Bản demo học thuật, không giữ tiền thật.</p>
        </div>
      </div>
    </div>
  );
};
