import React from 'react';
import { CreditCard, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from 'lucide-react';

export const PaymentGuidePage: React.FC = () => {
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
          <span className="text-[11px] font-mono text-[#6B6B6B]">HƯỚNG DẪN TÀI CHÍNH • INSTASQUAD</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-bold text-[#3B82F6]">
            <CreditCard className="w-3.5 h-3.5" />
            <span>NẠP RÚT TIỀN &amp; QUẢN LÝ VÍ SỐ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Hướng dẫn Nạp &amp; Rút tiền trên INSTASQUAD
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
            Quy trình nạp tiền vào ví khả dụng để đặt lịch và rút tiền thu nhập về tài khoản ngân hàng đối với Companion.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
          {/* Section 1: Nạp tiền */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-[#22C55E]" />
              1. Quy trình Nạp tiền vào Ví
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-1">
                <span className="text-xs font-mono text-[#22C55E] font-bold">BƯỚC 1</span>
                <h4 className="font-bold text-white">Chọn số tiền</h4>
                <p className="text-xs text-[#A3A3A3]">Chọn các mốc nạp nhanh (50.000đ, 100.000đ, 200.000đ, 500.000đ) hoặc nhập số tiền tùy chọn.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-1">
                <span className="text-xs font-mono text-[#22C55E] font-bold">BƯỚC 2</span>
                <h4 className="font-bold text-white">Quét mã QR Pay</h4>
                <p className="text-xs text-[#A3A3A3]">Hệ thống tạo mã VietQR kèm mã đơn hàng duy nhất để đảm bảo hạch toán chuẩn xác vào tài khoản của bạn.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-1">
                <span className="text-xs font-mono text-[#22C55E] font-bold">BƯỚC 3</span>
                <h4 className="font-bold text-white">Cộng ví tức thì</h4>
                <p className="text-xs text-[#A3A3A3]">Khi cổng thanh toán nhận giao dịch, webhook kích hoạt bút toán Sổ cái kép và số dư ví tăng lên ngay lập tức.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Rút tiền */}
          <section className="space-y-3 pt-4 border-t border-[#2A2A2A]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-[#3B82F6]" />
              2. Quy trình Rút tiền dành cho Companion
            </h2>
            <div className="space-y-2 text-[#CCCCCC]">
              <p>
                Companion có thu nhập từ các đơn hoàn thành có thể thực hiện rút tiền về tài khoản ngân hàng chính chủ bất kỳ lúc nào:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#A3A3A3]">
                <li><strong className="text-white">Điều kiện:</strong> Số dư khả dụng tối thiểu từ 50.000 VND và đã hoàn tất xác minh danh tính eKYC.</li>
                <li><strong className="text-white">Khóa số dư an toàn:</strong> Khi gửi lệnh rút, số tiền tương ứng được chuyển tạm thời sang trạng thái bảo lưu để tránh rút trùng lặp.</li>
                <li><strong className="text-white">Thời gian giải ngân:</strong> Hệ thống đối soát tự động xử lý trong vòng 1-5 phút (trong môi trường demo học thuật, giao dịch được mô phỏng đối ứng tức thì).</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Bất biến Sổ cái */}
          <section className="space-y-2 pt-4 border-t border-[#2A2A2A]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FACC15]" />
              3. Minh bạch Kế toán &amp; Kiểm toán Đối chiếu
            </h2>
            <p className="text-[#CCCCCC]">
              Mọi lệnh nạp và rút tiền đều được kiểm soát bởi Kiểm toán viên (Auditor) thông qua bảng cảnh báo bất thường thời gian thực. Bất kỳ lệnh nào không cân bằng Nợ/Có đều bị hệ thống phát hiện và tạm dừng xử lý ngay lập tức.
            </p>
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
