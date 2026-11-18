import React from 'react';
import { FileText, ArrowLeft, ShieldCheck, AlertTriangle, Users, Lock } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
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
          <span className="text-[11px] font-mono text-[#6B6B6B]">PHÁP LÝ &amp; QUY CHẾ • INSTASQUAD</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-bold text-[#E11D2E]">
            <FileText className="w-3.5 h-3.5" />
            <span>ĐIỀU KHOẢN DỊCH VỤ VÀ QUY CHUẨN ỨNG XỬ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Điều khoản Dịch vụ Nền tảng INSTASQUAD
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
            Áp dụng cho mọi thành viên tham gia giao dịch trên sàn thuê bạn cùng chơi game điện tử INSTASQUAD. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
          </p>
        </div>

        {/* Sections */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E11D2E]" />
              1. Mục đích và Phạm vi Dịch vụ
            </h2>
            <p className="text-[#CCCCCC]">
              INSTASQUAD là nền tảng thương mại điện tử dịch vụ kết nối người chơi game (Renter) với các game thủ có kỹ năng cao (Companion) trên cơ sở ngang hàng (C2C). Dịch vụ nhằm mục đích giải trí văn minh, hỗ trợ luyện tập kỹ năng và đàm thoại tôn trọng lẫn nhau.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              2. Ký quỹ Escrow và Phòng ngừa Giao dịch Ngầm
            </h2>
            <p className="text-[#CCCCCC]">
              Mọi giao dịch thuê bạn chơi bắt buộc phải thực hiện thông qua hệ thống Ký quỹ Escrow của INSTASQUAD để được đảm bảo quyền lợi và hỗ trợ phân xử khiếu nại.
            </p>
            <p className="text-[#CCCCCC]">
              <strong>Quy tắc chống lách sàn (Non-Circumvention):</strong> Thành viên không được trao đổi số điện thoại cá nhân, mã QR chuyển tiền ngoài hoặc hẹn chơi ngoài sàn nhằm trốn tránh phí dịch vụ. Mọi giao dịch ngoài sàn sẽ mất hoàn toàn quyền bảo hộ ký quỹ.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              3. Quy chuẩn Ứng xử trong Phòng Chơi (Code of Conduct)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-[#CCCCCC]">
              <li>Nghiêm cấm mọi hành vi quấy rối, ngôn từ thù địch, xúc phạm danh dự hoặc phân biệt đối xử trong phòng chat và voice.</li>
              <li>Nghiêm cấm sử dụng phần mềm gian lận (hack/cheat) gây ảnh hưởng đến kết quả và tài khoản của người khác.</li>
              <li>Companion có trách nhiệm đúng giờ, tác phong chuyên nghiệp và phối hợp tận tình trong suốt thời gian đã đặt.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#3B82F6]" />
              4. Xác minh Hồ sơ (eKYC) &amp; Bảo mật Dữ liệu
            </h2>
            <p className="text-[#CCCCCC]">
              Companion muốn mở tính năng nhận đơn phải hoàn thành thủ tục eKYC xác minh giấy tờ tùy thân. Ảnh CCCD/CMND được mã hóa bằng chuẩn AES-256-GCM trên máy chủ lưu trữ và chỉ có nhân sự kiểm duyệt được cấp quyền giải mã trong bộ nhớ.
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
