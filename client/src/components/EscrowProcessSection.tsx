import React from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Gamepad2, 
  CheckCircle2, 
  Scale, 
  ArrowRight, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface EscrowProcessSectionProps {
  onLearnMore?: () => void;
}

export const EscrowProcessSection: React.FC<EscrowProcessSectionProps> = ({ onLearnMore }) => {
  const handleNavigateToPolicy = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      window.history.pushState({}, '', '/chinh-sach-escrow');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const steps = [
    {
      step: 1,
      title: 'Đặt đơn & Ký quỹ',
      time: 'Tức thì',
      desc: 'Renter chọn slot giờ hẹn. Tiền thuê được trừ từ ví và đưa vào trạng thái ký quỹ Escrow bảo vệ.',
      icon: CreditCard,
      color: '#3B82F6',
    },
    {
      step: 2,
      title: 'Companion phản hồi',
      time: 'Tối đa 180s',
      desc: 'Companion có 180 giây để nhận đơn. Nếu quá hạn không nhận, tiền ký quỹ tự động hoàn 100% cho Renter.',
      icon: Clock,
      color: '#E11D2E',
    },
    {
      step: 3,
      title: 'Phiên chơi game',
      time: 'Theo lịch đặt',
      desc: 'Hai bên vào phòng Voice/Chat riêng trên nền tảng để trao đổi và phối hợp tác chiến trong game.',
      icon: Gamepad2,
      color: '#A855F7',
    },
    {
      step: 4,
      title: 'Nghiệm thu dịch vụ',
      time: '15 phút cửa sổ',
      desc: 'Renter bấm xác nhận hoàn tất. Nếu Renter không phản hồi sau 15 phút, hệ thống tự động nghiệm thu.',
      icon: CheckCircle2,
      color: '#22C55E',
    },
    {
      step: 5,
      title: 'Giải ngân 88 / 12',
      time: 'Thời gian thực',
      desc: 'Sổ cái kép tự động hạch toán: 88% vào ví Companion, 12% doanh thu nền tảng, số dư luôn cân bằng tuyệt đối.',
      icon: Scale,
      color: '#EAB308',
    },
  ];

  return (
    <section id="escrow" className="py-10 max-w-7xl mx-auto px-4 space-y-8 select-none">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2A2A2A] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-semibold text-[#22C55E] mb-2">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <span>CƠ CHẾ KÝ QUỸ ĐỘC LẬP</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Quy trình vận hành Ký quỹ Escrow &amp; Sổ cái kép
          </h2>
          <p className="text-sm text-[#A3A3A3] mt-1 max-w-2xl">
            Tiền thuê được giữ an toàn trong ví ký quỹ độc lập từ lúc đặt đơn đến khi nghiệm thu thành công. Minh bạch số dư, chống quỵt đơn và bảo vệ quyền lợi cả hai chiều.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNavigateToPolicy}
          className="px-4 py-2.5 rounded-lg bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] hover:border-[#E11D2E]/50 text-xs font-bold transition flex items-center gap-2 cursor-pointer w-fit"
        >
          <span>Xem chính sách đầy đủ</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E11D2E]" />
        </button>
      </div>

      {/* 5-Step Process Track (Desktop horizontal, Mobile vertical) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="bg-[#141414] border border-[#2A2A2A] hover:border-[#383838] rounded-xl p-4 flex flex-col justify-between transition-all duration-200 relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
                    style={{ backgroundColor: `${item.color}25`, border: `1px solid ${item.color}60` }}
                  >
                    0{item.step}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1C1C1C] text-[#A3A3A3] border border-[#2A2A2A]">
                    {item.time}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                  <h3 className="text-xs font-bold text-white group-hover:text-[#E11D2E] transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Progress Indicator Dots */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-center leading-3 text-[10px] text-[#6B6B6B]">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Two Critical Policy Cards: Cancellation & Dispute */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Card 1: Hủy đơn bậc thang */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Chính sách hủy đơn bậc thang</h4>
              <p className="text-[11px] text-[#A3A3A3]">Bảo vệ quyền lợi thời gian và công sức chuẩn bị</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-[#CCCCCC]">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
              <span className="font-semibold text-white">Hủy trước giờ hẹn từ 30 phút trở lên:</span>
              <span className="font-bold text-[#22C55E]">Hoàn 100% cho Renter</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
              <span className="font-semibold text-white">Hủy trước giờ hẹn 10 – 29 phút:</span>
              <span className="font-bold text-[#F59E0B]">Hoàn 70% Renter • 30% Companion</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
              <span className="font-semibold text-white">Hủy gấp dưới 10 phút:</span>
              <span className="font-bold text-[#EF4444]">Khấu trừ 100% tiền ký quỹ để bồi thường</span>
            </div>
          </div>
        </div>

        {/* Card 2: Khiếu nại & Trọng tài RMA */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/20 text-[#A855F7]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Khiếu nại &amp; Đóng băng Escrow</h4>
              <p className="text-[11px] text-[#A3A3A3]">Bảo hộ trong vòng 24 giờ sau phiên chơi</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#A3A3A3] leading-relaxed">
            <p>
              • <strong className="text-white">Đóng băng tức thì:</strong> Khi Renter bấm khiếu nại, tiền ký quỹ lập tức chuyển sang trạng thái <code className="text-[#A855F7] bg-[#A855F7]/10 px-1 py-0.5 rounded">FROZEN</code>, ngăn chặn rút tiền tự động.
            </p>
            <p>
              • <strong className="text-white">Xử lý khách quan:</strong> CS Agent thụ lý kiểm tra bằng chứng hình ảnh và nhật ký tin nhắn trên hệ thống.
            </p>
            <p>
              • <strong className="text-white">Quyết định lỗi từ 80% trở lên:</strong> Renter được hoàn 100% tiền ký quỹ; Companion bị phạt 20% giá trị đơn trừ từ ví khả dụng (ghi nhận nợ <code className="text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded">PENALTY_DEBT</code> nếu số dư không đủ).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
