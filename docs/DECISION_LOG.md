# INSTASQUAD — Sổ quyết định PO (PO Decision Log)

Tài liệu này ghi nhận và theo dõi toàn bộ **18 quyết định (D01 – D18)** từ sheet `PO_Decisions` trong file WBS nguồn `docs/source/INSTASQUAD_WBS_Detailed.xlsx`, kèm theo phân tích chi tiết, đề xuất kỹ thuật, chính sách demo an toàn và biên bản phê duyệt chính thức từ PO.

---

## 1. Cảnh báo mâu thuẫn nội bộ trong tài liệu WBS & Cách xử lý

> [!WARNING]
> **Chênh lệch giữa Milestone M1 và Danh mục PO_Decisions**:
> - Trong sheet `Milestones`, tiêu chí nghiệm thu của mốc **M1** ghi: *"Các quyết định D01–D15 ảnh hưởng đường tiền đã chốt hoặc feature được khóa/đánh dấu blocked..."*.
> - Tuy nhiên, trong sheet `PO_Decisions`, danh mục thực tế có **18 quyết định (D01–D18)**.
> - Ba quyết định bổ sung gồm:
>   - **D16**: SLA dưới 45 phút cho khiếu nại (BR-19) — *Mức độ: Trung bình*.
>   - **D17**: Chính sách sửa/xóa review (BR-22) — *Mức độ: Trung bình*.
>   - **D18**: Phục hồi lỗi ledger và người xử lý thủ công (BR-24) — *Mức độ: Rất cao*.
> - **Nghị quyết xử lý đã được duyệt**: Hệ thống đưa trọn vẹn cả **18 quyết định (D01–D18)** vào danh mục quản trị. Trong đó, quyết định **D18** (xử lý lỗi ledger) có mức độ *Rất cao*, ảnh hưởng trực tiếp đến an toàn tài chính nên được đưa vào nhóm `REQUIRED` bắt buộc phải chốt cùng nhóm D01–D15 trước khi triển khai đường tiền.

---

## 2. Bảng tổng hợp trạng thái phê duyệt (D01 – D18)

| Decision ID | Chủ đề | Mức ảnh hưởng | Owner | WBS / BR | Phân loại | Trạng thái PO | Tóm tắt chính sách đã duyệt cho Demo |
|:---:|:---|:---:|:---|:---|:---:|:---:|:---|
| **D01** | Thời hạn giữ slot tạm (`held_until`) | Rất cao | PO + Tech Lead | `07.01.05`<br>`BR-02` | `REQUIRED` | **APPROVED** | Khóa tạm **10 phút**. Hết 10 phút tự động nhả slot về `AVAILABLE`. Không gia hạn khi thanh toán pending. |
| **D02** | Không phản hồi nghiệm thu trong 15 phút | Rất cao | PO | `09.01.09`<br>`BR-14;15` | `REQUIRED` | **APPROVED** | Bật **Auto-Accept sau 15 phút im lặng**, giải ngân 88/12, ghi nhận lý do `SYSTEM_AUTO_ACCEPT_TIMEOUT`. |
| **D03** | Phân bổ penalty khi Renter hủy < 10 phút | Rất cao | PO + Tài chính | `10.01.05`<br>`BR-12` | `REQUIRED` | **APPROVED** | Áp dụng tỷ lệ **88/12**: 88% số tiền phạt chuyển cho Companion, 12% ghi nhận doanh thu nền tảng. |
| **D04** | Penalty 20% khi Companion lỗi $\ge 80\%$ | Rất cao | PO + Tài chính | `10.02.06`<br>`BR-17` | `REQUIRED` | **APPROVED** | Chuyển 20% cho Renter bồi thường. Trừ vào ví khả dụng; nếu thiếu ghi nhận nợ phạt `PENALTY_DEBT`, **không làm âm ví**. |
| **D05** | Nhánh tranh chấp khi Companion lỗi < 80% | Rất cao | PO | `10.02.07`<br>`BR-18` | `REQUIRED` | **APPROVED** | Phân xử nhị phân theo sơ đồ BPMN: Lỗi < 80% coi như hoàn tất và **giải ngân 88/12** cho Companion. |
| **D06** | Hạn bổ sung chứng cứ khiếu nại | Cao | PO + CS | `10.02.04`<br>`BR-16;19` | `DEMO_POLICY` | **APPROVED** | Thời hạn bổ sung tối đa **24 giờ**. Hết hạn CS phán quyết dựa trên dữ liệu và log chat hiện có. |
| **D07** | Định nghĩa TrustScore & Chuẩn hóa | Rất cao | PO + BA | `11.01.05`<br>`BR-21` | `REQUIRED` | **APPROVED** | Quy đổi rating $1\text{--}5 \rightarrow 20\text{--}100$. Tính trên toàn bộ lịch sử (Lifetime). Mặc định tạo mới 80 điểm. Điểm $< 40$ tạm khóa. |
| **D08** | Giới hạn 10 giờ/ngày & Múi giờ | Cao | PO + Tech Lead | `06.01.10`<br>`BR-03` | `REQUIRED` | **APPROVED** | Múi giờ Việt Nam `Asia/Ho_Chi_Minh` (UTC+7). Tính từ 00:00 đến 23:59 theo ngày bắt đầu của slot. Trần 10 giờ/ngày. |
| **D09** | Cổng nạp tiền và mức độ tích hợp | Cao | PO + Tech Lead | `04.01.07`<br>`BR-07` | `DEMO_POLICY` | **APPROVED** | Sử dụng **Payment Simulator nội bộ**, mô phỏng VNPay/MoMo với UI chọn kịch bản và webhook callback có chữ ký HMAC mock. |
| **D10** | Chat/thoại & Cơ chế lưu chứng cứ | Cao | PO + Tech Lead | `04.01.08`<br>`BR-20;28` | `DEMO_POLICY` | **APPROVED** | Chat text qua **WebSocket cục bộ** (có regex filter chặn SĐT/URL/STK theo BR-20). Thoại chỉ mock metadata. Bằng chứng đính kèm ảnh nhỏ. |
| **D11** | Vòng đời rút tiền (`Withdrawal`) | Cao | PO + Tài chính | `12.01.01`<br>`BR-23` | `REQUIRED` | **APPROVED** | **Khóa/trừ số dư khả dụng ngay khi tạo yêu cầu**. Nếu Admin Reject thì Ledger tự động sinh bút toán hoàn trả lại ví. |
| **D12** | Hủy khi phiên chơi đã bắt đầu | Cao | PO + BA | `10.01.01`<br>`BR-13` | `REQUIRED` | **APPROVED** | **Khóa nút Hủy** khi `now >= start_time`. Mọi tranh chấp sau thời điểm này bắt buộc chuyển sang luồng Báo sự cố (RMA). |
| **D13** | Cơ sở tính 88/12 & Làm tròn số nguyên | Cao | PO + Tài chính | `07.01.04`<br>`BR-15` | `REQUIRED` | **APPROVED** | Làm tròn xuống doanh thu sàn: $\text{platform} = \lfloor \text{total} \times 0.12 \rfloor$, $\text{companion} = \text{total} - \text{platform}$. Bảo toàn $\sum \equiv 100\%$. |
| **D14** | Gap ERD: Session/Dispute/Evidence | Rất cao | Tech Lead + PO | `05.01.08`<br>`BR-28` | `REQUIRED` | **APPROVED** | Bổ sung chính thức vào Prisma Schema: `Session`, `ChatMessage`, `DisputeCase`, `DisputeEvidence`, `DisputeDecision`. |
| **D15** | Quyền phán quyết & Kiểm soát CS | Cao | PO + CS | `10.02.05`<br>`BR-16;17` | `REQUIRED` | **APPROVED** | Áp dụng phân quyền RBAC (`CS_AGENT`, `ADMIN`), bắt buộc nhập lý do phán quyết (`decision_reason`) và ghi audit log bất biến. |
| **D16** | Đo lường SLA khiếu nại (< 45 phút) | Trung bình | PO + CS/BA | `10.02.10`<br>`BR-19` | `DEMO_POLICY` | **APPROVED** | Hiển thị 2 chỉ số: Tổng thời gian giải quyết và Thời gian xử lý chủ động của CS trên Dashboard quản trị. |
| **D17** | Chính sách sửa/xóa Review | Trung bình | PO + BA | `11.01.02`<br>`BR-22` | `DEMO_POLICY` | **APPROVED** | **Review bất biến (Immutable)**. Mỗi người chỉ đánh giá 1 lần duy nhất cho mỗi booking; không cung cấp API sửa hoặc xóa. |
| **D18** | Phục hồi lỗi Ledger & Runbook kiểm toán | Rất cao | Tech Lead + PO | `08.01.06`<br>`BR-24` | `REQUIRED` | **APPROVED** | Rollback nguyên trạng trong `prisma.$transaction`, ghi log vào `LEDGER_AUDIT_ALERT`, cung cấp màn hình đối soát cho `AUDITOR`. |

---

## 3. Biên bản phê duyệt chính thức từ PO (Sign-off Log)

- **Thời điểm phê duyệt**: 2026-10-24
- **Người phê duyệt**: Product Owner (Người dùng) qua chỉ thị: *"f, phê duyệt hết"*.
- **Phạm vi hiệu lực**: Toàn bộ 18 quyết định (D01 – D18) đã được thông qua phương án an toàn và trở thành **Baseline kỹ thuật chính thức** cho giai đoạn thiết kế kiến trúc và mô hình dữ liệu (Milestone M2).
