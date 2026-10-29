import React, { useState } from 'react';
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

  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    companion.availableSlots && companion.availableSlots.length > 0
      ? companion.availableSlots[0].slot_id
      : 'mock-slot-1'
  );

  const hasEnoughBalance = userAvailableBalance >= companion.hourlyRate;

  const handleConfirm = async () => {
    if (selectedSlotId) {
      await onBookSlot(selectedSlotId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#15152E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#101026]">
          <div className="flex items-center gap-3">
            <img
              src={companion.image}
              alt={companion.name}
              className="w-12 h-12 rounded-2xl object-cover border border-purple-500/30"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white">{companion.name}</h3>
                <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full font-bold">
                  {companion.tier}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {companion.gameName} • {companion.hourlyRate.toLocaleString('vi-VN')} đ/giờ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Chọn khung giờ rảnh (Discrete Slot):</span>
            </label>

            {companion.availableSlots && companion.availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {companion.availableSlots.map((s) => {
                  const start = new Date(s.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const end = new Date(s.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const isSelected = selectedSlotId === s.slot_id;
                  const isAvailable = s.status === 'AVAILABLE';

                  return (
                    <button
                      key={s.slot_id}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlotId(s.slot_id)}
                      className={`p-2.5 rounded-xl text-left border transition text-xs flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-glow-purple'
                          : isAvailable
                            ? 'bg-[#0A0A1F] border-white/10 text-slate-300 hover:border-purple-500/50'
                            : 'bg-black/30 border-white/5 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>{start} - {end}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        {s.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#0A0A1F] border border-white/5 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Khung giờ nhanh 1 giờ tiếp theo</span>
                  <span className="text-emerald-400 font-bold">Khả dụng</span>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Companion này hỗ trợ nhận đơn tức thì. Khóa slot nguyên tử giữ chỗ 10 phút.
                </p>
              </div>
            )}
          </div>

          {/* Pricing & Escrow note */}
          <div className="bg-[#0e0e24] border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Đơn giá thuê (1 giờ):</span>
              <span className="font-semibold">{companion.hourlyRate.toLocaleString('vi-VN')} VND</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Phí ký quỹ Escrow:</span>
              <span className="font-semibold text-emerald-400">100% ({companion.hourlyRate.toLocaleString('vi-VN')} VND)</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-between items-center font-bold text-white text-sm">
              <span>Tổng thanh toán tạm giữ:</span>
              <span className="text-gradient-purple">{companion.hourlyRate.toLocaleString('vi-VN')} VND</span>
            </div>
          </div>

          {/* Escrow Guarantee alert */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Bảo vệ an toàn:</strong> Tiền được phong tỏa vào quỹ ký quỹ Escrow, chỉ chuyển cho Companion sau khi bạn xác nhận hoàn tất phiên chơi.
            </p>
          </div>

          {!hasEnoughBalance && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Số dư khả dụng ({userAvailableBalance.toLocaleString('vi-VN')} đ) không đủ để ký quỹ. Vui lòng nạp thêm.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-[#101026] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition"
          >
            Đóng
          </button>
          <button
            disabled={loading}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-primary hover:opacity-95 shadow-glow-purple transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <span>Đang xử lý...</span>
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
