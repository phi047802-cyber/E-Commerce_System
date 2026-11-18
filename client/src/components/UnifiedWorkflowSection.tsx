import React from 'react';
import { Search, CalendarClock, Lock, Timer, Gamepad2, ClipboardCheck, Coins, Star, Smartphone, Monitor } from 'lucide-react';

/** 8 bước của quy trình thống nhất Web & Mobile (docs/UNIFIED_WORKFLOW.md). */
export const WORKFLOW_STEPS = [
  { n: 1, title: 'Tìm kiếm', rule: 'Game hoặc Trò chuyện & Giải trí; chỉ Companion đã xác minh, TrustScore ≥ 40', icon: Search },
  { n: 2, title: 'Đặt lịch & Giữ slot', rule: 'Mỗi slot chỉ 1 người giữ được (khóa DB), giữ chỗ 10 phút, giá chốt tại lúc đặt', icon: CalendarClock },
  { n: 3, title: 'Ký quỹ Escrow', rule: 'Tiền chuyển từ ví khả dụng sang ký quỹ qua sổ cái ghi kép', icon: Lock },
  { n: 4, title: 'Phản hồi 180 giây', rule: 'Companion từ chối hoặc quá hạn → hoàn 100% ngay', icon: Timer },
  { n: 5, title: 'Thực hiện phiên', rule: 'Phòng chat riêng, tự che SĐT/đường dẫn/số tài khoản', icon: Gamepad2 },
  { n: 6, title: 'Nghiệm thu 15 phút', rule: 'Hoàn tất, hoặc báo sự cố để đóng băng tiền chờ CS phán quyết', icon: ClipboardCheck },
  { n: 7, title: 'Giải ngân 88/12', rule: '88% Companion, 12% nền tảng; tổng luôn bảo toàn từng đồng', icon: Coins },
  { n: 8, title: 'Đánh giá & TrustScore', rule: 'Mỗi bên đánh giá 1 lần, không sửa; TrustScore cập nhật tự động', icon: Star },
];

export const UnifiedWorkflowSection: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <section className="max-w-7xl mx-auto px-4" aria-labelledby="unified-workflow-title">
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="unified-workflow-title" className="text-lg md:text-xl font-bold text-white">Một quy trình, mọi nền tảng</h2>
          <p className="text-xs text-[#A3A3A3] mt-1">Web và ứng dụng di động dùng chung một hệ thống, cùng quy tắc tiền và trạng thái đơn.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#A3A3A3]">
          <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Web</span>
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> iOS · Android</span>
        </div>
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {WORKFLOW_STEPS.map(({ n, title, rule, icon: Icon }) => (
          <li key={n} className="bg-[#0F0F0F] border border-[#1F1F1F] rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 shrink-0 rounded-full bg-[#E11D2E] text-white text-xs font-bold flex items-center justify-center">{n}</span>
              <Icon className="w-4 h-4 text-[#A3A3A3]" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-white">{title}</p>
            {!compact && <p className="text-[11px] leading-snug text-[#A3A3A3]">{rule}</p>}
          </li>
        ))}
      </ol>
      {compact && (
        <a
          href="/quy-trinh-thong-nhat"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/quy-trinh-thong-nhat');
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.scrollTo({ top: 0 });
          }}
          className="inline-block text-xs text-[#E11D2E] hover:underline"
        >
          Xem chi tiết quy tắc từng bước →
        </a>
      )}
    </div>
  </section>
);
