import React from 'react';
import { UnifiedWorkflowSection } from '../components/UnifiedWorkflowSection';

const CANCEL_RULES = [
  { when: 'Từ 30 phút trở lên trước giờ hẹn', renter: '100%', companion: '0%', platform: '0%' },
  { when: 'Từ 10 đến dưới 30 phút', renter: '70%', companion: '30%', platform: '0%' },
  { when: 'Dưới 10 phút', renter: '0%', companion: '88%', platform: '12%' },
  { when: 'Phiên đã bắt đầu', renter: 'Không hủy được — dùng Báo sự cố', companion: '—', platform: '—' },
];

const LABELS = [
  { tag: 'REQUIRED', text: 'Đặt lịch, khóa slot, ký quỹ, sổ cái ghi kép, 180 giây, hủy 30/10 phút, nghiệm thu 15 phút, khiếu nại đóng băng, 88/12, đánh giá, TrustScore' },
  { tag: 'MOCKED', text: 'Cổng thanh toán (Payment Simulator / SePay sandbox), chi trả rút tiền, email' },
  { tag: 'DEMO_POLICY', text: 'Phạt hủy dưới 10 phút chia 88/12; phạt Companion 20%; lỗi dưới 80%; tự nghiệm thu; 24 giờ bổ sung chứng cứ; dịch vụ Trò chuyện & Giải trí' },
  { tag: 'DEFERRED', text: 'Ghi âm cuộc gọi; phát hành App Store / Google Play' },
];

/** /quy-trinh-thong-nhat — trình bày docs/UNIFIED_WORKFLOW.md cho người dùng cuối. */
export const UnifiedWorkflowPage: React.FC = () => (
  <div className="py-6 space-y-6">
    <UnifiedWorkflowSection />
    <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-4">
      <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-3" aria-labelledby="cancel-title">
        <h2 id="cancel-title" className="text-base font-bold text-white">Hủy trước giờ hẹn</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[420px]">
            <thead className="text-[#A3A3A3] border-b border-[#2A2A2A]">
              <tr><th className="py-2">Thời điểm hủy</th><th>Renter nhận lại</th><th>Companion</th><th>Nền tảng</th></tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-[#D4D4D4]">
              {CANCEL_RULES.map((r) => (
                <tr key={r.when}><td className="py-2 pr-2">{r.when}</td><td>{r.renter}</td><td>{r.companion}</td><td>{r.platform}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#737373]">Phí nền tảng = làm tròn xuống 12% tổng đơn; phần Companion = tổng − phí, nên không phát sinh hay mất tiền do làm tròn.</p>
      </section>
      <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-3" aria-labelledby="labels-title">
        <h2 id="labels-title" className="text-base font-bold text-white">Phần nào chạy thật, phần nào mô phỏng</h2>
        <ul className="space-y-2 text-xs text-[#D4D4D4]">
          {LABELS.map((l) => (
            <li key={l.tag} className="flex gap-2">
              <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 h-fit rounded bg-[#1F1F1F] text-white">{l.tag}</span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </div>
);
