import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { MockCompanion } from '../data/mock';

interface SlotBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  companion: MockCompanion | null;
  onBookSlot: (slotId: string) => Promise<void>;
  loading: boolean;
  userAvailableBalance: number;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
  isOpen,
  onClose,
  companion,
  onBookSlot,
  loading,
  userAvailableBalance,
}) => {
  if (!isOpen || !companion) return null;

  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  useEffect(() => {
    if (companion?.availableSlots && companion.availableSlots.length > 0) {
      const firstAvailable = companion.availableSlots.find(s => s.status === 'AVAILABLE') || companion.availableSlots[0];
      setSelectedSlotId(firstAvailable ? firstAvailable.slot_id : '');
    } else {
      setSelectedSlotId('');
    }
  }, [companion]);

  const hasEnoughBalance = userAvailableBalance >= companion.hourlyRate;
  const availableSlotsList = companion.availableSlots || [];
  const hasAvailableSlots = availableSlotsList.some(s => s.status === 'AVAILABLE');

  const handleConfirm = async () => {
    if (selectedSlotId && selectedSlotId !== 'mock-slot-1' && hasAvailableSlots) {
      await onBookSlot(selectedSlotId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1C1C1C]">
          <div className="flex items-center gap-3">
            <img
              src={companion.image}
              alt={companion.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/avatars/av02.jpg';
              }}
              className="w-12 h-12 rounded-xl object-cover border border-[#2A2A2A]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-white">{companion.name}</h3>
                <span className="text-[10px] bg-[#141414] text-[#A3A3A3] border border-[#2A2A2A] px-2 py-0.5 rounded font-mono">
                  {companion.tier}
                </span>
              </div>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                {companion.gameName} • {companion.hourlyRate.toLocaleString('vi-VN')} đ/giờ
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-[#22C55E] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                  <span>{companion.completionRate !== undefined ? `${companion.completionRate.toFixed(1)}%` : '100.0%'} hoàn thành</span>
                </span>
                <span className="text-[11px] font-semibold text-[#FACC15] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#FACC15]" />
                  <span>TrustScore: {companion.trustScore !== undefined ? companion.trustScore.toFixed(1) : '80.0'} đ</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
              <span>Chọn khung giờ rảnh từ cơ sở dữ liệu:</span>
            </label>

            {availableSlotsList.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {availableSlotsList.map((s) => {
                    const startObj = new Date(s.start_time);
                    const endObj = new Date(s.end_time);
                    const dateStr = startObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    const start = startObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const end = endObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const isSelected = selectedSlotId === s.slot_id;
                    const isAvailable = s.status === 'AVAILABLE';

                    return (
                      <button
                        key={s.slot_id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlotId(s.slot_id)}
                        className={`p-2.5 rounded-lg text-left border transition-colors text-xs flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-[#1C1C1C] border-[#E11D2E] text-white font-bold'
                            : isAvailable
                              ? 'bg-[#141414] border-[#2A2A2A] text-[#A3A3A3] hover:border-[#E11D2E]/40 cursor-pointer'
                              : 'bg-[#0A0A0A] border-[#2A2A2A]/40 text-[#6B6B6B] cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-[#A3A3A3] font-semibold">{dateStr}</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isAvailable
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-[#1C1C1C] text-[#6B6B6B]'
                          }`}>
                            {isAvailable ? 'Sẵn sàng' : s.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <Calendar className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />
                          <span className="font-semibold">{start} - {end}</span>
                        </div>
                        <div className="text-[10px] text-[#6B6B6B] font-mono">
                          ID: {s.slot_id}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#A3A3A3] italic">
                  * Khung giờ thật từ hệ thống. Khi đặt, slot sẽ được chuyển sang HELD (khóa 10 phút) để ký quỹ Escrow.
                </p>
              </div>
            ) : (
              <div className="bg-[#1C1C1C] border border-[#F59E0B]/30 rounded-xl p-4 text-xs text-[#A3A3A3] space-y-2">
                <div className="flex items-center gap-2 text-[#F59E0B] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Hiện chưa có khung giờ rảnh khả dụng</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  Companion này hiện chưa đăng ký khung giờ rảnh nào trên hệ thống hoặc các khung giờ đã được đặt hết. Vui lòng chọn Companion có slot khả dụng (ví dụ Bảo Ngọc - LMHT hoặc Tuấn Anh - VALORANT).
                </p>
              </div>
            )}
          </div>

          {/* Pricing & Escrow note */}
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#A3A3A3]">
              <span>Đơn giá thuê (1 giờ):</span>
              <span className="font-semibold text-white">{companion.hourlyRate.toLocaleString('vi-VN')} VND</span>
            </div>
            <div className="flex justify-between items-center text-[#A3A3A3]">
              <span>Phí ký quỹ Escrow:</span>
              <span className="font-semibold text-[#22C55E]">100% ({companion.hourlyRate.toLocaleString('vi-VN')} VND)</span>
            </div>
            <div className="pt-2 border-t border-[#2A2A2A] flex justify-between items-center font-bold text-white text-sm">
              <span>Tổng thanh toán tạm giữ:</span>
              <span className="text-[#E11D2E]">{companion.hourlyRate.toLocaleString('vi-VN')} VND</span>
            </div>
          </div>

          {/* Escrow Guarantee alert */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-xs text-[#A3A3A3]">
            <ShieldCheck className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-white">Bảo vệ an toàn:</strong> Tiền được phong tỏa vào quỹ ký quỹ Escrow, chỉ chuyển cho Companion sau khi bạn xác nhận hoàn tất phiên chơi.
            </p>
          </div>

          {!hasEnoughBalance && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-[#E11D2E] text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Số dư khả dụng ({userAvailableBalance.toLocaleString('vi-VN')} đ) không đủ để ký quỹ. Vui lòng nạp thêm.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2A2A2A] bg-[#1C1C1C] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#A3A3A3] hover:text-white bg-[#141414] hover:bg-[#2A2A2A] transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            disabled={loading || !hasAvailableSlots || !selectedSlotId || !hasEnoughBalance}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-[#E11D2E] hover:bg-[#B91C1C] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : !hasAvailableSlots ? (
              <span>Hết khung giờ rảnh</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận đặt & Giữ chỗ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
